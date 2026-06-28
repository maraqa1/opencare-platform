import { callLocalLlm } from "@/lib/localLlmClient";
import { buildModule01NarrativePrompt, buildModule01RetryPrompt } from "@/lib/module01/module01NarrativePrompts";
import { validateModule01Narrative } from "@/lib/module01/module01NarrativeValidator";
import type { NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

export type Module01LocalLlmClient = typeof callLocalLlm;

type GenerateModule01NarrativeArgs = {
  fieldName: string;
  facts: Record<string, unknown> | string;
  maxWords: number;
  fallbackText?: string;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
  llmClient?: Module01LocalLlmClient;
};

function clientNameFromFacts(facts: Record<string, unknown> | string) {
  if (typeof facts === "string") {
    const match = facts.match(/Client\s*[:\-]\s*([^\n]+)/i);
    return match?.[1]?.trim();
  }
  const value = facts.clientName;
  return typeof value === "string" ? value : undefined;
}

function factsLength(facts: Record<string, unknown> | string) {
  return typeof facts === "string" ? facts.length : JSON.stringify(facts).length;
}

function factsHaveUsefulContext(facts: Record<string, unknown> | string) {
  const missing = "Not provided in diagnostic input.";
  if (typeof facts === "string") {
    const trimmed = facts.trim();
    return Boolean(trimmed && trimmed !== missing && !trimmed.includes("SECTION_CONTEXT_MISSING"));
  }
  return Object.values(facts).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() && value.trim() !== missing;
    if (Array.isArray(value)) return value.length > 0 && !value.every((item) => item === missing);
    return true;
  });
}

function stringValuesFromUnknown(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.flatMap(stringValuesFromUnknown);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(stringValuesFromUnknown);
  return [];
}

function allowedValuesFromFacts(facts: Record<string, unknown> | string) {
  if (typeof facts === "string") {
    return {
      evidenceIds: facts.match(/\bEVID(?:[-_ ][A-Z0-9-]+|[0-9][A-Z0-9-]*)\b/gi) ?? [],
      systems: [],
      useCases: [],
    };
  }
  const allValues = stringValuesFromUnknown(facts);
  return {
    evidenceIds: allValues.filter((value) => /^EVID(?:[-_ ][A-Z0-9-]+|[0-9][A-Z0-9-]*)$/i.test(value)),
    systems: allValues.filter((value) => /\b(System|Platform|CRM|ERP|PMS|EAM|SCADA|Warehouse|Lakehouse)\b/i.test(value)),
    useCases: allValues.filter((value) => /\b(Use Case|Forecasting|Prediction|Classification|Automation|Assistant|Copilot|reporting|analytics)\b/i.test(value)),
  };
}

export function buildModule01DeterministicNarrativeFallback({
  fieldName,
  facts,
  fallbackText,
}: {
  fieldName: string;
  facts: Record<string, unknown> | string;
  fallbackText?: string;
}) {
  if (!factsHaveUsefulContext(facts)) {
    return "SECTION_CONTEXT_MISSING";
  }
  if (fallbackText?.trim()) {
    return fallbackText.trim();
  }

  const clientName = clientNameFromFacts(facts) ?? "the assessed organisation";
  if (typeof facts === "string") {
    return `${clientName} has enough diagnostic context for ${fieldName}. The board should use the deterministic score pattern, priority gaps and available evidence to confirm owners, approve the immediate remediation backlog and keep AI use cases gated until data quality, lineage and accountability are clear.`;
  }

  const maturity = facts.overallMaturity ?? facts.score ?? "not scored";
  const domains = Array.isArray(facts.topPriorityDomains)
    ? facts.topPriorityDomains
      .map((domain) => typeof domain === "string" ? domain : (domain as Record<string, unknown>).domain)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ")
    : "";
  const useCases = Array.isArray(facts.useCases)
    ? facts.useCases
      .map((useCase) => typeof useCase === "string" ? useCase : (useCase as Record<string, unknown>).name)
      .filter(Boolean)
      .slice(0, 2)
      .join(", ")
    : "";
  const domainPhrase = domains ? ` Priority domains are ${domains}.` : "";
  const useCasePhrase = useCases ? ` Candidate use cases include ${useCases}, subject to readiness controls.` : "";
  return `${clientName} has a deterministic Module 01 maturity baseline of ${maturity}. The advisory priority is to confirm accountable owners, close evidence-backed gaps and sequence the first remediation wave through governance.${domainPhrase}${useCasePhrase}`;
}

function logNarrative(event: Record<string, unknown>) {
  console.info("module01_ai_narrative", JSON.stringify(event));
}

async function callAndValidate(args: GenerateModule01NarrativeArgs, prompt: string, retryAttempted: boolean) {
  const startedAt = Date.now();
  const fallbackText = buildModule01DeterministicNarrativeFallback(args);
  const llmClient = args.llmClient ?? callLocalLlm;
  const result = await llmClient({
    taskMode: "narrative_field",
    fieldPath: args.fieldName,
    prompt,
    modelConfig: {
      ...args.modelConfig,
      maxWords: args.maxWords,
    },
  });

  if (result.status !== "success") {
    const durationMs = Date.now() - startedAt;
    logNarrative({
      field_name: args.fieldName,
      model: result.model,
      prompt_length: prompt.length,
      facts_length: factsLength(args.facts),
      response_length: 0,
      latency_ms: durationMs,
      validation_status: "gateway_failure",
      fallback_used: true,
      rejection_reason: result.error ?? result.status,
      retry_attempted: retryAttempted,
    });
    return {
      valid: false as const,
      reason: result.error ?? result.status,
      text: "",
      model: result.model,
      durationMs,
      responseLength: 0,
      validationStatus: "gateway_failure" as const,
      retryAttempted,
    };
  }

  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText,
    maxWords: args.maxWords,
    maxCharacters: Math.max(400, args.maxWords * 9),
  });
  const text = sanitized.status === "fallback_required" ? result.rawOutput : sanitized.text;
  const allowedValues = allowedValuesFromFacts(args.facts);
  const validation = validateModule01Narrative(text, {
    fieldName: args.fieldName,
    maxWords: args.maxWords,
    requiredFactsSupplied: true,
    allowedClientNames: [clientNameFromFacts(args.facts) ?? ""],
    allowedEvidenceIds: allowedValues.evidenceIds,
    allowedSystems: allowedValues.systems,
    allowedUseCases: allowedValues.useCases,
  });

  const durationMs = Date.now() - startedAt;
  const validationStatus = validation.valid ? "valid" as const : "rejected" as const;
  logNarrative({
    field_name: args.fieldName,
    model: result.model,
    prompt_length: prompt.length,
    facts_length: factsLength(args.facts),
    response_length: result.rawOutput.length,
    latency_ms: durationMs,
    validation_status: validationStatus,
    fallback_used: !validation.valid,
    rejection_reason: validation.reason,
    retry_attempted: retryAttempted,
  });

  if (!validation.valid) {
    return {
      valid: false as const,
      reason: validation.reason ?? "invalid_output",
      text,
      model: result.model,
      durationMs,
      responseLength: result.rawOutput.length,
      validationStatus,
      retryAttempted,
    };
  }
  return {
    valid: true as const,
    text,
    sanitizedStatus: sanitized.status,
    model: result.model,
    durationMs: result.durationMs,
    responseLength: result.rawOutput.length,
    validationStatus,
    retryAttempted,
  };
}

export async function generateModule01NarrativeField(args: GenerateModule01NarrativeArgs): Promise<NarrativeFieldGeneration> {
  const fallbackText = buildModule01DeterministicNarrativeFallback(args);
  if (fallbackText === "SECTION_CONTEXT_MISSING") {
    return {
      text: fallbackText,
      status: "fallback",
      model: args.modelConfig.model,
      durationMs: 0,
      validationStatus: "missing_facts",
      retryAttempted: false,
      fallbackUsed: true,
      responseLength: 0,
      generatedAt: new Date().toISOString(),
      rejectionReason: "missing_facts",
    };
  }

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
      validationStatus: first.validationStatus,
      retryAttempted: first.retryAttempted,
      fallbackUsed: false,
      responseLength: first.responseLength,
      generatedAt: new Date().toISOString(),
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
      validationStatus: retry.validationStatus,
      retryAttempted: true,
      fallbackUsed: false,
      responseLength: retry.responseLength,
      generatedAt: new Date().toISOString(),
      sanitizedOutputPreview: retry.text.slice(0, 160),
    };
  }

  return {
    text: fallbackText,
    status: "fallback",
    model: args.modelConfig.model,
    durationMs: retry.durationMs,
    validationStatus: retry.validationStatus ?? "fallback",
    retryAttempted: true,
    fallbackUsed: true,
    responseLength: retry.responseLength,
    generatedAt: new Date().toISOString(),
    rejectionReason: retry.reason,
  };
}
