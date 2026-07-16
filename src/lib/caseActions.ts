import { getRepository } from "@/lib/db";
import type { CaseRecord } from "@/lib/types";

// PRD 6: "The workflow engine blocks execution until an officer explicitly
// confirms via the dashboard... This confirmation is logged to PostgreSQL."
// These three functions are the ONLY code paths in the app that can move a
// case out of "dispatch_pending" — there is no automatic/timeout-based path
// to "dispatch_confirmed" anywhere else in the codebase.

export async function confirmDispatch(caseId: string, officerId: string): Promise<CaseRecord> {
  const repo = await getRepository();
  const existing = await repo.getCase(caseId);
  if (!existing) throw new Error("Case not found");
  if (existing.status !== "dispatch_pending") {
    throw new Error(`Case is in status "${existing.status}", not awaiting dispatch confirmation`);
  }
  const updated = await repo.updateCase(caseId, { status: "dispatch_confirmed" });
  await repo.appendAudit({
    caseId,
    eventType: "dispatch_confirmed",
    actorId: officerId,
    payload: { confirmedAt: new Date().toISOString() },
  });
  return updated;
}

export async function declineDispatch(caseId: string, officerId: string, reason?: string): Promise<CaseRecord> {
  const repo = await getRepository();
  const existing = await repo.getCase(caseId);
  if (!existing) throw new Error("Case not found");
  const updated = await repo.updateCase(caseId, { status: "dispatch_declined" });
  await repo.appendAudit({
    caseId,
    eventType: "dispatch_declined",
    actorId: officerId,
    payload: { reason: reason ?? null },
  });
  return updated;
}

export async function escalateDispatch(caseId: string, escalatedToId: string): Promise<CaseRecord> {
  const repo = await getRepository();
  const existing = await repo.getCase(caseId);
  if (!existing) throw new Error("Case not found");
  const updated = await repo.updateCase(caseId, { status: "dispatch_escalated" });
  await repo.appendAudit({
    caseId,
    eventType: "dispatch_escalated",
    actorId: escalatedToId,
    payload: { escalatedAt: new Date().toISOString(), reason: "confirmation timeout" },
  });
  return updated;
}
