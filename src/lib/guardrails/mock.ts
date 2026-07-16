import type { GuardrailInputResult, GuardrailOutputResult } from "@/lib/types";
import type { GuardrailShield } from "./index";

// Deliberately simple, deterministic, dependency-free stand-in for Enkrypt AI's
// real input/output shields (see enkrypt.ts). This exists purely so the app is
// demoable with zero external accounts. It is NOT a substitute for a real
// guardrail service in front of anything handling actual citizen PII —
// see PITCH_NOTES.md, "what we'd change before this touches real data."

const INJECTION_MARKERS = [
  "ignore previous instructions",
  "ignore all previous",
  "disregard the above",
  "you are now",
  "system prompt",
  "act as if",
  "new instructions:",
];

const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "EMAIL_ADDRESS", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { label: "PHONE_NUMBER", regex: /\b(?:\+?\d{1,3}[-.\s]?)?\d{10}\b/g },
  { label: "AADHAAR_LIKE", regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { label: "CREDIT_CARD", regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g },
];

export class MockShield implements GuardrailShield {
  mode(): "mock" {
    return "mock";
  }

  async checkInput(text: string): Promise<GuardrailInputResult> {
    const lower = text.toLowerCase();
    const hit = INJECTION_MARKERS.find((marker) => lower.includes(marker));
    if (hit) {
      return {
        allowed: false,
        reason: `Potential prompt injection pattern detected ("${hit}")`,
        sanitizedText: text,
        mode: "mock",
        injectionScore: 0.9,
      };
    }
    return { allowed: true, sanitizedText: text, mode: "mock", injectionScore: 0.02 };
  }

  async checkOutput(payload: Record<string, unknown>): Promise<GuardrailOutputResult> {
    let text = JSON.stringify(payload);
    const found = new Set<string>();
    for (const { label, regex } of PATTERNS) {
      if (regex.test(text)) {
        found.add(label);
        text = text.replace(regex, `<${label}>`);
      }
    }
    return {
      redactedPayload: JSON.parse(text),
      piiEntitiesFound: Array.from(found),
      mode: "mock",
    };
  }
}
