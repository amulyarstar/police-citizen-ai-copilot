import { Agent } from "@mastra/core/agent";
import { complaintProcessorTool } from "../tools/complaintProcessor";
import { spatialCorrelationTool } from "../tools/spatialCorrelation";
import { discrepancyAnalyticsTool } from "../tools/discrepancyAnalytics";
import { emergencyDispatchTool } from "../tools/emergencyDispatch";
import { documentIngestionTool } from "../tools/documentIngestion";

function defaultModel(): string {
  if (process.env.MASTRA_MODEL) return process.env.MASTRA_MODEL;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic/claude-sonnet-4-6";
  return "openai/gpt-4o-mini";
}

// PRD 5.3: "Evaluates intent and context, then routes each request to the
// correct specialized tool." The production request path in this app
// (src/lib/pipeline.ts) calls the five tools directly in a fixed sequence
// rather than letting an LLM choose the order — a citizen complaint always
// needs the same five steps in the same order, so a deterministic pipeline is
// more predictable and cheaper than an agentic router for that path. This
// Agent definition is what you'd point a conversational interface (e.g. "ask
// the copilot about case #123") or `mastra dev` Studio at, where genuinely
// open-ended routing across the same tools is useful. Both share the exact
// same tool implementations, so there's no logic duplicated between them.
export const supervisorAgent = new Agent({
  id: "police-citizen-supervisor",
  name: "Police & Citizen Supervisor Agent",
  instructions: `You are the routing agent for a police/citizen incident copilot.
You have five tools: complaint-processor (structures raw complaint text),
spatial-temporal-correlation (finds nearby sensor data), discrepancy-analytics
(flags contradictions between report and sensors), emergency-response-routing
(prepares — never executes — a dispatch recommendation), and
document-ingestion (chunks uploaded evidence text).

You never call emergency-response-routing's output as if a dispatch has
happened — it only prepares a recommendation for a human officer. If asked
about a case, use the tools needed to answer accurately rather than guessing.`,
  model: defaultModel(),
  tools: {
    complaintProcessorTool,
    spatialCorrelationTool,
    discrepancyAnalyticsTool,
    emergencyDispatchTool,
    documentIngestionTool,
  },
});
