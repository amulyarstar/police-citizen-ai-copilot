import { z } from "zod";
import { Agent } from "@mastra/core/agent";
import type { IncidentType } from "@/lib/types";

const extractionSchema = z.object({
  incidentType: z.enum([
    "theft",
    "assault",
    "vandalism",
    "noise_disturbance",
    "traffic_incident",
    "suspicious_activity",
    "domestic_dispute",
    "fire_hazard",
    "other",
  ]),
  reportedTime: z
    .string()
    .describe(
      "The ISO 8601 timestamp the citizen says the incident happened, resolved against the submission time. If no time is mentioned, use the submission time."
    ),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  cleanedNarrative: z.string().describe("The complaint narrative, lightly cleaned up, same facts, no embellishment."),
});

export type ExtractedFields = z.infer<typeof extractionSchema>;

function hasLlmKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function defaultModel(): string {
  if (process.env.MASTRA_MODEL) return process.env.MASTRA_MODEL;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic/claude-sonnet-4-6";
  return "openai/gpt-4o-mini";
}

let _agent: Agent | null = null;
function getComplaintAgent(): Agent {
  if (_agent) return _agent;
  _agent = new Agent({
    id: "complaint-processor-agent",
    name: "Complaint Processor Agent",
    instructions: `You structure raw citizen incident reports into a legal complaint template.
Classify the incident type, resolve any relative time reference (e.g. "last night", "around 9pm")
into an absolute ISO timestamp using the provided submission time as the anchor, judge urgency
honestly (emergency only for active, ongoing threats to life or safety), and lightly clean up the
narrative without adding facts that weren't stated. Never invent details.`,
    model: defaultModel(),
  });
  return _agent;
}

/**
 * Structures a raw citizen complaint. Uses a real Mastra Agent when an LLM API key is
 * configured; otherwise falls back to a deterministic heuristic parser so the app is
 * fully demoable with zero external accounts (see README "Demo mode" section).
 */
export async function extractComplaintFields(
  rawText: string,
  submittedAtIso: string
): Promise<ExtractedFields & { extractionMode: "llm" | "heuristic" }> {
  if (hasLlmKey()) {
    try {
      const agent = getComplaintAgent();
      const result = await agent.generate(
        `Submission time: ${submittedAtIso}\n\nCitizen report:\n"""${rawText}"""`,
        { structuredOutput: { schema: extractionSchema, errorStrategy: "fallback", fallbackValue: heuristicExtract(rawText, submittedAtIso) } }
      );
      return { ...result.object, extractionMode: "llm" };
    } catch (err) {
      console.warn("[llm] Mastra agent extraction failed, falling back to heuristic parser:", err);
      return { ...heuristicExtract(rawText, submittedAtIso), extractionMode: "heuristic" };
    }
  }
  return { ...heuristicExtract(rawText, submittedAtIso), extractionMode: "heuristic" };
}

const TYPE_KEYWORDS: Array<[IncidentType, string[]]> = [
  ["assault", ["assault", "hit me", "attacked", "punched", "beaten", "fight"]],
  ["theft", ["stole", "theft", "robbed", "robbery", "pickpocket", "snatched", "burglary"]],
  ["vandalism", ["vandal", "graffiti", "broke my", "smashed", "damaged property"]],
  ["noise_disturbance", ["loud music", "noise", "party next door", "disturbance"]],
  ["traffic_incident", ["accident", "collision", "hit and run", "traffic"]],
  ["domestic_dispute", ["domestic", "husband", "wife", "neighbor dispute"]],
  ["fire_hazard", ["fire", "smoke", "burning"]],
  ["suspicious_activity", ["suspicious", "loitering", "prowler", "following me"]],
];

const URGENCY_KEYWORDS: Array<[ExtractedFields["urgency"], string[]]> = [
  ["emergency", ["right now", "happening now", "help now", "in danger", "emergency", "actively"]],
  ["high", ["urgent", "scared", "threatened", "weapon", "bleeding"]],
  ["low", ["fyi", "just for record", "no rush", "not urgent"]],
];

function heuristicExtract(rawText: string, submittedAtIso: string): ExtractedFields {
  const lower = rawText.toLowerCase();

  let incidentType: IncidentType = "other";
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) {
      incidentType = type;
      break;
    }
  }

  let urgency: ExtractedFields["urgency"] = "medium";
  for (const [level, keywords] of URGENCY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) {
      urgency = level;
      break;
    }
  }

  const reportedTime = resolveRelativeTime(lower, submittedAtIso);

  return {
    incidentType,
    reportedTime,
    urgency,
    cleanedNarrative: rawText.trim(),
  };
}

function resolveRelativeTime(lower: string, submittedAtIso: string): string {
  const submitted = new Date(submittedAtIso);
  const clone = (d: Date) => new Date(d.getTime());

  if (lower.includes("last night")) {
    const d = clone(submitted);
    d.setDate(d.getDate() - (d.getHours() < 12 ? 1 : 0));
    d.setHours(21, 0, 0, 0);
    return d.toISOString();
  }
  if (lower.includes("this morning")) {
    const d = clone(submitted);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  }
  if (lower.includes("yesterday")) {
    const d = clone(submitted);
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  const hourMatch = lower.match(/(\d{1,2})\s?(am|pm)/);
  if (hourMatch) {
    const d = clone(submitted);
    let hour = parseInt(hourMatch[1], 10) % 12;
    if (hourMatch[2] === "pm") hour += 12;
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  return submittedAtIso;
}
