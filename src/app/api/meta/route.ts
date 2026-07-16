import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";
import { getVectorStore } from "@/lib/vectorstore";
import { getGuardrailShield } from "@/lib/guardrails";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getRepository();
  const store = await getVectorStore();
  const guardrails = await getGuardrailShield();
  const llmMode = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY ? "llm" : "heuristic";

  return NextResponse.json({
    db: repo.backend(),
    vectorstore: store.backend(),
    guardrails: guardrails.mode(),
    llm: llmMode,
    sensorEventCount: await store.count(),
  });
}
