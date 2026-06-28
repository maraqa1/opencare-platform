import { callLocalLlm } from "@/lib/localLlmClient";
import { buildModule01NarrativePrompt, buildModule01RetryPrompt } from "@/lib/module01/module01NarrativePrompts";
import { validateModule01Narrative } from "@/lib/module01/module01NarrativeValidator";
import type { NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type GenerateModule01NarrativeArgs = {
  fieldName: string;
  facts: Record<string, unknown> | string;
  maxWords: number;
  fallbackText: string;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
};

function clientNameFromFacts(facts: Record<string, unknown> | string) {
  if (typeof facts === "string") {
    const match = facts.match(/Client:\s*([^\n]+)/i);
    return match?.[1]?.trim();
  }
  const value = facts.clientName;
  return typeof value === "string" ? value : undefined;
}

function logNarrative(event: Record<string, unknown>) {
  console.info("module01_ai_narrative", JSON.stringify(event));
}

async function callAndValidate(args: GenerateModule01NarrativeArgs, prompt: string, retryAttempted: boolean) {
  const startedAt = Date.now();
  const result = await callLocalLlm({
    taskMode: "narrative_field",
    fieldPath: args.fieldName,
    prompt,
    modelConfig: {
      ...args.modelConfig,
      maxWords: args.maxWords,
    },
  });

  if (result.status !== "success") {
    logNarrative({
      field_name: args.fieldName,
      model: result.model,
      prompt_length: prompt.length,
      facts_length: typeof args.facts === "string" ? args.facts.length : JSON.stringify(args.facts).length,
      response_length: 0,
      latency_ms: Date.now() - startedAt,
      validation_status: "gateway_failure",
      fallback_used: true,
      rejection_reason: result.error ?? result.status,
      retry_attempted: retryAttempted,
    });
    return { valid: false as const, reason: result.error ?? result.status, text: "" };
  }

  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText: args.fallbackText,
    maxWords: args.maxWords,
    maxCharacters: Math.max(400, args.maxWords * 9),
  });
  const text = sanitized.status === "fallback_required" ? result.rawOutput : sanitized.text;
  const validation = validateModule01Narrative(text, {
    fieldName: args.fieldName,
    maxWords: args.maxWords,
    requiredFactsSupplied: true,
    allowedClientNames: [clientNameFromFacts(args.facts) ?? ""],
  });

  logNarrative({
    field_name: args.fieldName,
    model: result.model,
    prompt_length: prompt.length,
    facts_length: typeof args.facts === "string" ? args.facts.length : JSON.stringify(args.facts).length,
    response_length: result.rawOutput.length,
    latency_ms: Date.now() - startedAt,
    validation_status: validation.valid ? "valid" : "rejected",
    fallback_used: !validation.valid,
    rejection_reason: validation.reason,
    retry_attempted: retryAttempted,
  });

  if (!validation.valid) {
    return { valid: false as const, reason: validation.reason ?? "invalid_output", text };
  }
  return { valid: true as const, text, sanitizedStatus: sanitized.status, model: result.model, durationMs: result.durationMs };
}

export async function generateModule01NarrativeField(args: GenerateModule01NarrativeArgs): Promise<NarrativeFieldGeneration> {
  const prompt = buildModule01NarrativePrompt({
    fieldName: args.fieldName,
    facts: args.facts,
    maxWords: args.maxWords,
  });
  const first = await callAndValidate(args, prompt, false);
  if (first.valid) {
    return {
      text: first.text,
      status: first.sanitizedStatus === "clean" ? "ai_enriched" : "sanitized",
      model: first.model,
      durationMs: first.durationMs,
      sanitizedOutputPreview: first.text.slice(0, 160),
    };
  }

  const retryPrompt = buildModule01RetryPrompt({
    fieldName: args.fieldName,
    facts: args.facts,
    maxWords: args.maxWords,
    reason: first.reason,
  });
  const retry = await callAndValidate(args, retryPrompt, true);
  if (retry.valid) {
    return {
      text: retry.text,
      status: retry.sanitizedStatus === "clean" ? "ai_enriched" : "sanitized",
      model: retry.model,
      durationMs: retry.durationMs,
      sanitizedOutputPreview: retry.text.slice(0, 160),
    };
  }

  return {
    text: args.fallbackText,
    status: "fallback",
    model: args.modelConfig.model,
    durationMs: 0,
    rejectionReason: retry.reason,
  };
}

