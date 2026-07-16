import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// PRD 5.4: chunks and serializes unstructured uploaded evidence (PDFs, images).
// Round 1 scope note: the extraction step below handles already-extracted text
// (e.g. from OCR run upstream). Wiring an actual file-upload UI + OCR pipeline
// is deferred — see PITCH_NOTES.md "what's next" — but the chunking contract
// this tool exposes doesn't change when that lands, so nothing downstream needs
// to be rewritten.
export const documentIngestionTool = createTool({
  id: "document-ingestion",
  description: "Chunks extracted evidence document text into passages for downstream correlation/search.",
  inputSchema: z.object({
    documentText: z.string(),
    maxChunkChars: z.number().default(800),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({ index: z.number(), text: z.string() })),
  }),
  execute: async (inputData) => {
    const { documentText, maxChunkChars } = inputData;
    const words = documentText.split(/\s+/);
    const chunks: Array<{ index: number; text: string }> = [];
    let current: string[] = [];
    let currentLen = 0;
    let index = 0;

    for (const word of words) {
      if (currentLen + word.length + 1 > maxChunkChars && current.length > 0) {
        chunks.push({ index: index++, text: current.join(" ") });
        current = [];
        currentLen = 0;
      }
      current.push(word);
      currentLen += word.length + 1;
    }
    if (current.length > 0) chunks.push({ index: index++, text: current.join(" ") });

    return { chunks };
  },
});
