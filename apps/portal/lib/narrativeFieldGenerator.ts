import { callLocalLlm } from "@/lib/localLlmClient";
import { preview } from "@/lib/localLlmTelemetry";
import type { LocalLlmTaskMode } from "@/lib/mistralNemoInteractionPolicy";
import { buildNarrativeFieldPrompt } from "@/lib/promptContracts";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type GenerateNarrativeFieldArgs = {
  fieldPath: string;
  facts: string;
  maxWords: number;
  fallbackText: string;
  taskMode?: LocalLlmTaskMode;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
};

export type NarrativeFieldGeneration = {
  text: string;
  status: "ai_enriched" | "sanitized" | "fallback";
  model: string;
  durationMs: number;
  validationStatus?: "valid" | "rejected" | "gateway_failure" | "missing_facts" | "fallback";
  retryAttempted?: boolean;
  fallbackUsed?: boolean;
  responseLength?: number;
  generatedAt?: string;
  rawOutputPreview?: string;
  sanitizedOutputPreview?: string;
  rejectionReason?: string;
};

export async function generateNarrativeField(args: GenerateNarrativeFieldArgs): Promise<NarrativeFieldGeneration> {
  const prompt = buildNarrativeFieldPrompt({
    fieldPath: args.fieldPath,
    facts: args.facts,
    maxWords: args.maxWords,
  });
  const result = await callLocalLlm({
    taskMode: args.taskMode ?? "narrative_field",
    fieldPath: args.fieldPath,
    prompt,
    modelConfig: {
      ...args.modelConfig,
      maxWords: args.maxWords,
    },
  });

  if (result.status !== "success") {
    return {
      text: args.fallbackText,
      status: "fallback",
      model: result.model,
      durationMs: result.durationMs,
      rejectionReason: result.error ?? result.status,
    };
  }

  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText: args.fallbackText,
    maxWords: args.maxWords,
    maxCharacters: Math.max(400, args.maxWords * 9),
  });

  if (sanitized.status === "fallback_required") {
    return {
      text: args.fallbackText,
      status: "fallback",
      model: result.model,
      durationMs: result.durationMs,
      rawOutputPreview: preview(result.rawOutput),
      rejectionReason: sanitized.rejectionReason,
    };
  }

  return {
    text: sanitized.text,
    status: sanitized.status === "clean" ? "ai_enriched" : "sanitized",
    model: result.model,
    durationMs: result.durationMs,
    rawOutputPreview: preview(result.rawOutput),
    sanitizedOutputPreview: preview(sanitized.text),
  };
}
