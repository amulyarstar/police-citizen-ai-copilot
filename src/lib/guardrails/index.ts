import type { GuardrailInputResult, GuardrailOutputResult } from "@/lib/types";

export interface GuardrailShield {
  checkInput(text: string): Promise<GuardrailInputResult>;
  checkOutput(payload: Record<string, unknown>): Promise<GuardrailOutputResult>;
  mode(): "enkrypt" | "mock";
}

let _shield: GuardrailShield | null = null;

export async function getGuardrailShield(): Promise<GuardrailShield> {
  if (_shield) return _shield;
  if (process.env.ENKRYPT_API_KEY) {
    const { EnkryptShield } = await import("./enkrypt");
    _shield = new EnkryptShield(process.env.ENKRYPT_API_KEY, process.env.ENKRYPT_BASE_URL);
  } else {
    const { MockShield } = await import("./mock");
    _shield = new MockShield();
  }
  return _shield;
}
