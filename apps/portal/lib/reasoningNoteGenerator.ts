import { callLocalLlm } from "@/lib/localLlmClient";
import { buildReasoningNotesPrompt } from "@/lib/promptContracts";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type GenerateReasoningNotesArgs = {
  task: string;
  facts: string;
  fallbackText: string;
  maxWords: number;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
};

export async function generateReasoningNotes(args: GenerateReasoningNotesArgs) {
  const prompt = buildReasoningNotesPrompt({
    task: args.task,
    facts: args.facts,
    maxWords: args.maxWords,
  });
  const result = await callLocalLlm({
    taskMode: "reasoning_notes",
    prompt,
    modelConfig: args.modelConfig,
  });
  if (result.status !== "success") {
    return { text: args.fallbackText, status: "fallback" as const, durationMs: result.durationMs };
  }
  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText: args.fallbackText,
    maxWords: args.maxWords,
  });
  return {
    text: sanitized.status === "fallback_required" ? args.fallbackText : sanitized.text,
    status: sanitized.status === "fallback_required" ? "fallback" as const : "ai_enriched" as const,
    durationMs: result.durationMs,
  };
}
