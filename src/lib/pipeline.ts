import { getRepository } from "@/lib/db";
import { getGuardrailShield } from "@/lib/guardrails";
import { complaintProcessorTool } from "@/mastra/tools/complaintProcessor";
import { spatialCorrelationTool } from "@/mastra/tools/spatialCorrelation";
import { discrepancyAnalyticsTool } from "@/mastra/tools/discrepancyAnalytics";
import { emergencyDispatchTool } from "@/mastra/tools/emergencyDispatch";
import type { CaseRecord, CaseStatus, StructuredComplaint, CorrelationResult, DiscrepancyResult } from "@/lib/types";

// Mastra's Tool.execute(inputData, context) always takes a context argument;
// we're calling tools directly (outside an agent loop) so there's no
// meaningful execution context to pass — this just satisfies the signature.
// The framework's own return type is a broad union (result | ValidationError |
// void) meant for the agent-loop caller to branch on; we know these tools
// always return their declared outputSchema shape when called this way, so we
// assert the concrete type at each call site instead of threading that union
// through the whole pipeline.
async function runTool<TOut>(tool: { execute?: (input: any, ctx: any) => Promise<any> }, input: any): Promise<TOut> {
  if (!tool.execute) throw new Error("Tool has no execute function");
  return (await tool.execute(input, {})) as TOut;
}

// This function is the deterministic equivalent of the PRD's "Mastra Workflow
// Engine ↔ Supervisor Agent" request path (see mastra/agents/supervisor.ts for
// why a fixed pipeline is used here instead of native Mastra workflow
// suspend/resume — short version: durability on serverless without a hosted
// workflow-snapshot store). Every step writes to the same audit_log table
// whether it's running against Postgres+Qdrant+Enkrypt or the local/mock
// fallbacks, so the trail looks identical in both modes.
export async function runComplaintPipeline(params: {
  citizenId: string;
  rawText: string;
  localityId: string;
}): Promise<{ case: CaseRecord; blocked: boolean; blockReason?: string }> {
  const repo = await getRepository();
  const guardrails = await getGuardrailShield();
  const submittedAtIso = new Date().toISOString();

  const caseRecord = await repo.createCase({ citizenId: params.citizenId, rawText: params.rawText });
  await repo.appendAudit({
    caseId: caseRecord.id,
    eventType: "case_submitted",
    actorId: params.citizenId,
    payload: { localityId: params.localityId, guardrailMode: guardrails.mode() },
  });

  // 1. Enkrypt AI Input Shield equivalent
  const inputCheck = await guardrails.checkInput(params.rawText);
  if (!inputCheck.allowed) {
    await repo.appendAudit({
      caseId: caseRecord.id,
      eventType: "guardrail_input_blocked",
      actorId: "system",
      payload: { reason: inputCheck.reason, mode: inputCheck.mode },
    });
    const blocked = await repo.updateCase(caseRecord.id, { status: "closed" });
    return { case: blocked, blocked: true, blockReason: inputCheck.reason };
  }

  await repo.updateCase(caseRecord.id, { status: "processing" });

  // 2. Complaint Processor Tool
  const structured = await runTool<StructuredComplaint>(complaintProcessorTool, {
    rawText: inputCheck.sanitizedText,
    localityId: params.localityId,
    submittedAtIso,
  });
  await repo.appendAudit({
    caseId: caseRecord.id,
    eventType: "complaint_structured",
    actorId: "system",
    payload: structured as unknown as Record<string, unknown>,
  });
  await repo.updateCase(caseRecord.id, { structuredComplaint: structured });

  // 3. Spatial-Temporal Log Correlation Tool
  const correlation = await runTool<CorrelationResult>(spatialCorrelationTool, {
    latitude: structured.latitude,
    longitude: structured.longitude,
    reportedTime: structured.reportedTime,
  });
  await repo.appendAudit({
    caseId: caseRecord.id,
    eventType: "correlation_run",
    actorId: "system",
    payload: { matchCount: correlation.matchedEvents.length, radiusMeters: correlation.searchRadiusMeters },
  });
  await repo.updateCase(caseRecord.id, { correlation });

  // 4. Discrepancy Analytics Tool
  const discrepancy = await runTool<DiscrepancyResult>(discrepancyAnalyticsTool, {
    incidentType: structured.incidentType,
    matchedEvents: correlation.matchedEvents,
    searchRadiusMeters: correlation.searchRadiusMeters,
    searchWindowMinutes: correlation.searchWindowMinutes,
  });
  await repo.appendAudit({
    caseId: caseRecord.id,
    eventType: "discrepancy_flagged",
    actorId: "system",
    payload: discrepancy as unknown as Record<string, unknown>,
  });
  await repo.updateCase(caseRecord.id, { discrepancy });

  // 5. Emergency Response Routing Tool — prepares a recommendation only.
  const dispatchRec = await runTool<{ recommendDispatch: boolean; recommendationReason: string; confirmationTimeoutMinutes: number }>(
    emergencyDispatchTool,
    {
      incidentType: structured.incidentType,
      urgency: structured.urgency,
      reportedLocationText: structured.reportedLocationText,
      discrepancyVerdict: discrepancy.verdictLabel,
    }
  );

  let nextStatus: CaseStatus = "under_review";
  if (dispatchRec.recommendDispatch) {
    nextStatus = "dispatch_pending";
    await repo.appendAudit({
      caseId: caseRecord.id,
      eventType: "dispatch_requested",
      actorId: "system",
      payload: dispatchRec as unknown as Record<string, unknown>,
    });
  }
  const finalCase = await repo.updateCase(caseRecord.id, {
    status: nextStatus,
    dispatchRequested: dispatchRec.recommendDispatch,
  });

  // 6. Enkrypt AI Output Shield equivalent — redact PII before anything reaches
  // a dashboard or citizen-facing status page.
  const outputCheck = await guardrails.checkOutput({ narrative: structured.narrative });
  if (outputCheck.piiEntitiesFound.length > 0) {
    await repo.appendAudit({
      caseId: caseRecord.id,
      eventType: "guardrail_output_redacted",
      actorId: "system",
      payload: { entities: outputCheck.piiEntitiesFound, mode: outputCheck.mode },
    });
  }

  return { case: finalCase, blocked: false };
}
