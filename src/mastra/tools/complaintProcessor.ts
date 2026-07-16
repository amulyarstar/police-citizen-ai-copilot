import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractComplaintFields } from "@/lib/llm/structureComplaint";
import { localityById } from "@/lib/localities";
import type { StructuredComplaint } from "@/lib/types";

export const complaintProcessorTool = createTool({
  id: "complaint-processor",
  description:
    "Structures a raw citizen complaint into a legal template: incident type, resolved timestamp, urgency, and coordinates.",
  inputSchema: z.object({
    rawText: z.string().min(1),
    localityId: z.string(),
    submittedAtIso: z.string(),
  }),
  outputSchema: z.object({
    incidentType: z.string(),
    reportedTime: z.string(),
    reportedLocationText: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    narrative: z.string(),
    urgency: z.string(),
    extractionMode: z.string(),
  }),
  execute: async (inputData) => {
    const { rawText, localityId, submittedAtIso } = inputData;
    const locality = localityById(localityId);
    if (!locality) throw new Error(`Unknown locality: ${localityId}`);

    const extracted = await extractComplaintFields(rawText, submittedAtIso);

    const structured: StructuredComplaint = {
      incidentType: extracted.incidentType,
      reportedTime: extracted.reportedTime,
      reportedLocationText: locality.name,
      latitude: locality.latitude,
      longitude: locality.longitude,
      narrative: extracted.cleanedNarrative,
      urgency: extracted.urgency,
      extractionMode: extracted.extractionMode,
    };
    return structured;
  },
});
