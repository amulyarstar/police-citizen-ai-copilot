import type { GuardrailInputResult, GuardrailOutputResult } from "@/lib/types";
import type { GuardrailShield } from "./index";
import { MockShield } from "./mock";

// Real Enkrypt AI Guardrails integration — POST /guardrails/detect.
// Docs: https://docs.enkryptai.com
// If the call fails for any reason (network, auth, unexpected shape) we fall
// back to the mock shield rather than letting a guardrail outage take down
// complaint intake. That fallback is logged, never silent in the audit trail.
export class EnkryptShield implements GuardrailShield {
  private baseUrl: string;
  private fallback = new MockShield();

  constructor(private apiKey: string, baseUrl?: string) {
    this.baseUrl = baseUrl ?? "https://api.enkryptai.com";
  }

  mode(): "enkrypt" {
    return "enkrypt";
  }

  private async detect(text: string) {
    const res = await fetch(`${this.baseUrl}/guardrails/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this.apiKey },
      body: JSON.stringify({
        text,
        detectors: {
          injection_attack: { enabled: true },
          toxicity: { enabled: true },
          nsfw: { enabled: true },
          pii: {
            enabled: true,
            entities: ["pii", "secrets", "ip_address", "url", "email_address", "phone_number", "location"],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Enkrypt AI detect failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async checkInput(text: string): Promise<GuardrailInputResult> {
    try {
      const data = await this.detect(text);
      const injectionScore = Number(data?.details?.injection_attack?.attack ?? 0);
      const blocked = data?.summary?.injection_attack === 1 || injectionScore > 0.5;
      return {
        allowed: !blocked,
        reason: blocked ? "Enkrypt AI input shield flagged a possible prompt injection" : undefined,
        sanitizedText: data?.details?.pii?.text ?? text,
        mode: "enkrypt",
        injectionScore,
      };
    } catch (err) {
      console.warn("[guardrails] Enkrypt input check failed, falling back to mock shield:", err);
      return this.fallback.checkInput(text);
    }
  }

  async checkOutput(payload: Record<string, unknown>): Promise<GuardrailOutputResult> {
    try {
      const text = JSON.stringify(payload);
      const data = await this.detect(text);
      const entities = Object.keys(data?.details?.pii?.entities ?? {}).filter(
        (k) => Object.keys(data.details.pii.entities[k] ?? {}).length > 0
      );
      const redactedText: string = data?.details?.pii?.text ?? text;
      return {
        redactedPayload: JSON.parse(redactedText),
        piiEntitiesFound: entities,
        mode: "enkrypt",
      };
    } catch (err) {
      console.warn("[guardrails] Enkrypt output check failed, falling back to mock shield:", err);
      return this.fallback.checkOutput(payload);
    }
  }
}
