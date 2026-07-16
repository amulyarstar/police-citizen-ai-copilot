"use client";

import { useEffect, useState } from "react";

interface Meta {
  db: string;
  vectorstore: string;
  guardrails: string;
  llm: string;
  sensorEventCount: number;
}

const LABELS: Record<string, string> = {
  postgres: "Postgres (live)",
  sqlite: "SQLite (local dev fallback)",
  qdrant: "Qdrant (live)",
  memory: "In-memory (dev fallback)",
  enkrypt: "Enkrypt AI (live)",
  mock: "Mock shield (demo mode)",
  llm: "LLM extraction (live)",
  heuristic: "Heuristic extraction (demo mode)",
};

export function ModeBanner() {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  if (!meta) return null;

  const items: Array<[string, string]> = [
    ["Storage", LABELS[meta.db] ?? meta.db],
    ["Sensor search", LABELS[meta.vectorstore] ?? meta.vectorstore],
    ["Guardrails", LABELS[meta.guardrails] ?? meta.guardrails],
    ["Extraction", LABELS[meta.llm] ?? meta.llm],
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-800/10 bg-paper-100 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-700/70">
      <span className="font-semibold text-ink-800">System status</span>
      {items.map(([label, value]) => (
        <span key={label}>
          {label}: <span className="text-ink-900">{value}</span>
        </span>
      ))}
      <span className="ml-auto normal-case tracking-normal text-ink-700/50">
        {meta.sensorEventCount} simulated sensor events loaded
      </span>
    </div>
  );
}
