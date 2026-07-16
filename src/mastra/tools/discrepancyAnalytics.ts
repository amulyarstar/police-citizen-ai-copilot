import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Implements PRD section 6.1: confidence_score is derived from four factors
// (time gap, location gap, type consistency, sensor reliability) so that
// low-quality or ambiguous sensor data lowers confidence rather than
// producing a falsely certain flag. This is a prioritization aid for human
// reviewers, not a verdict — it never asserts the citizen is lying, and
// absence of any nearby sensor data is treated as "insufficient data",
// not as evidence against the report.
//
// Important design correction (found via live testing, see PITCH_NOTES.md
// "problems faced"): a sensor with NO specific classification — e.g. a motion
// sensor that just saw ordinary pedestrian activity — is genuinely ambiguous.
// It doesn't confirm the report, but a generic sensor also can't positively
// rule out something like a theft. Scoring that as "corroborated" (an earlier
// version of this file did, via a blended confidence formula) overclaims what
// the sensor actually establishes. Only an EXPLICIT matching classification
// counts as corroboration; an explicit MISMATCHED classification counts as a
// discrepancy; "no classification" is insufficient_data, regardless of how
// close in time/space it is.

const matchedEventSchema = z.object({
  id: z.string(),
  sensorType: z.string(),
  incidentTypeHint: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),
  reliability: z.number(),
  description: z.string(),
  distanceMeters: z.number(),
  timeGapMinutes: z.number(),
});

export const discrepancyAnalyticsTool = createTool({
  id: "discrepancy-analytics",
  description:
    "Cross-references the citizen-reported timeline against correlated sensor telemetry and computes a discrepancy confidence score.",
  inputSchema: z.object({
    incidentType: z.string(),
    matchedEvents: z.array(matchedEventSchema),
    searchRadiusMeters: z.number(),
    searchWindowMinutes: z.number(),
  }),
  outputSchema: z.object({
    confidenceScore: z.number(),
    factors: z.object({
      timeGapScore: z.number(),
      locationGapScore: z.number(),
      typeConsistencyScore: z.number(),
      sensorReliabilityScore: z.number(),
    }),
    verdictLabel: z.enum(["corroborated", "minor_discrepancy", "significant_discrepancy", "insufficient_data"]),
    explanation: z.string(),
  }),
  execute: async (inputData) => {
    const { incidentType, matchedEvents, searchRadiusMeters, searchWindowMinutes } = inputData;

    if (matchedEvents.length === 0) {
      return {
        confidenceScore: 0,
        factors: { timeGapScore: 0, locationGapScore: 0, typeConsistencyScore: 0, sensorReliabilityScore: 0 },
        verdictLabel: "insufficient_data" as const,
        explanation:
          "No municipal sensors recorded any activity within 500m and the reported time window. This is common — most incidents happen outside sensor coverage — so it does not corroborate or contradict the report.",
      };
    }

    // Rank by relevance (how close + how reliable), independent of whether the
    // event happens to match or mismatch the reported type — we want to reason
    // from the most meaningful sensor, not the one that flatters a verdict.
    const scored = matchedEvents.map((e) => {
      const timeGapScore = clamp01(1 - e.timeGapMinutes / searchWindowMinutes);
      const locationGapScore = clamp01(1 - e.distanceMeters / searchRadiusMeters);
      const typeConsistencyScore = e.incidentTypeHint === incidentType ? 1 : e.incidentTypeHint === "none" ? 0.5 : 0;
      const sensorReliabilityScore = e.reliability;
      const relevance = ((timeGapScore + locationGapScore) / 2) * sensorReliabilityScore;
      return { e, timeGapScore, locationGapScore, typeConsistencyScore, sensorReliabilityScore, relevance };
    });
    scored.sort((a, b) => b.relevance - a.relevance);
    const best = scored[0];

    const factors = {
      timeGapScore: round2(best.timeGapScore),
      locationGapScore: round2(best.locationGapScore),
      typeConsistencyScore: round2(best.typeConsistencyScore),
      sensorReliabilityScore: round2(best.sensorReliabilityScore),
    };
    const readableType = incidentType.replace(/_/g, " ");

    let verdictLabel: "corroborated" | "minor_discrepancy" | "significant_discrepancy" | "insufficient_data";
    let confidenceScore: number;
    let explanation: string;

    if (best.relevance < 0.35) {
      verdictLabel = "insufficient_data";
      confidenceScore = round2(best.relevance);
      explanation = `The nearest sensor data ("${best.e.description}") is too far in time or distance, or too unreliable, to meaningfully compare against the report.`;
    } else if (best.typeConsistencyScore === 1) {
      verdictLabel = "corroborated";
      confidenceScore = round2(best.relevance);
      explanation = `Sensor data ("${best.e.description}", ${best.e.distanceMeters}m away, ${best.e.timeGapMinutes}min gap) is consistent with the reported ${readableType}.`;
    } else if (best.typeConsistencyScore === 0.5) {
      verdictLabel = "insufficient_data";
      confidenceScore = round2(best.relevance * 0.6);
      explanation = `A sensor was active nearby ("${best.e.description}") but didn't specifically classify what it recorded, so it can neither confirm nor contradict the report.`;
    } else {
      confidenceScore = round2(best.relevance);
      verdictLabel = confidenceScore >= 0.55 ? "significant_discrepancy" : "minor_discrepancy";
      explanation = `Sensor data close in time and location ("${best.e.description}", ${best.e.distanceMeters}m away, ${best.e.timeGapMinutes}min gap) points to something other than the reported ${readableType}. Worth a reviewer's attention before dispatch decisions are finalized.`;
    }

    return { confidenceScore, factors, verdictLabel, explanation };
  },
});

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
