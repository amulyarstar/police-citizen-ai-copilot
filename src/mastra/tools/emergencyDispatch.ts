import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// PRD 5.4 / 6: this tool's only job is to REQUEST a dispatch and describe why.
// It never calls a real dispatch system. Actual execution is gated behind an
// explicit officer confirmation on the Officer Dashboard (see
// app/api/cases/[id]/confirm-dispatch/route.ts), which is the only code path
// allowed to flip a case into "dispatch_confirmed" and is what gets logged to
// the immutable audit trail. This tool exists so the recommendation itself —
// what's being requested and why — is produced by the same auditable pipeline
// as everything else, not bolted on separately.
export const emergencyDispatchTool = createTool({
  id: "emergency-response-routing",
  description:
    "Prepares an emergency dispatch recommendation for officer review. Does not contact any real dispatch system — requires explicit human confirmation.",
  inputSchema: z.object({
    incidentType: z.string(),
    urgency: z.string(),
    reportedLocationText: z.string(),
    discrepancyVerdict: z.string(),
  }),
  outputSchema: z.object({
    recommendDispatch: z.boolean(),
    recommendationReason: z.string(),
    confirmationTimeoutMinutes: z.number(),
  }),
  execute: async (inputData) => {
    const { incidentType, urgency, reportedLocationText, discrepancyVerdict } = inputData;

    const recommendDispatch = urgency === "emergency" || urgency === "high";

    // PRD 6.1: "confirmation requests carry a timeout window scaled to urgency."
    const confirmationTimeoutMinutes = urgency === "emergency" ? 5 : urgency === "high" ? 15 : 60;

    const reasonParts = [
      `Reported as ${urgency} urgency ${incidentType.replace("_", " ")} near ${reportedLocationText}.`,
    ];
    if (discrepancyVerdict === "significant_discrepancy") {
      reasonParts.push(
        "Note: sensor correlation flagged a significant discrepancy — review before confirming dispatch."
      );
    }

    return {
      recommendDispatch,
      recommendationReason: reasonParts.join(" "),
      confirmationTimeoutMinutes,
    };
  },
});
