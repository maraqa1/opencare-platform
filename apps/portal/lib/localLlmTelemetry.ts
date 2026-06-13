import type { LocalLlmTaskMode } from "@/lib/mistralNemoInteractionPolicy";

export type LocalLlmTelemetryEvent = {
  taskMode: LocalLlmTaskMode;
  fieldPath?: string;
  model: string;
  inputTokenEstimate: number;
  outputTokenEstimate?: number;
  firstByteMs?: number | null;
  totalMs: number;
  status: "success" | "timeout" | "blocked" | "error" | "fallback";
  timeout: boolean;
  fallbackUsed: boolean;
  rawOutputPreview?: string;
  sanitizedOutputPreview?: string;
  rejectionReason?: string;
};

export function preview(value: string, maxLength = 160) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.slice(0, maxLength);
}

export function logLocalLlmTelemetry(event: LocalLlmTelemetryEvent) {
  if (process.env.LOCAL_LLM_TELEMETRY === "false") {
    return;
  }
  console.info("[local-llm]", JSON.stringify(event));
}
