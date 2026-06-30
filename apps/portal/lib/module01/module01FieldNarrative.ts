import type { NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
import { validateModule01Narrative } from "@/lib/module01/module01NarrativeValidator";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type Module01FieldNarrativeField =
  | "boardScorecard.advisoryNarrative"
  | "roadmap.roadmapNarrative"
  | "overallAdvisory.helicopterView"
  | "aiReadinessGate.readinessNarrative"
  | "executiveSummary.summaryText"
  | "roadmapNarrative";

type Module01FieldNarrativeArgs = {
  field: Module01FieldNarrativeField;
  facts: string[];
  maxWords: number;
  style?: "board" | "executive";
  fallbackText: string;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
  fetchFn?: typeof fetch;
};

type Ai2FieldNarrativeResult = {
  status: "success" | "error" | "timeout";
  rawOutput: string;
  model: string;
  durationMs: number;
  error?: string;
  validationStatus?: string;
  rejectionReason?: string;
  fallbackUsed?: boolean;
  retrievalMode?: string;
  citationCount?: number;
};

const ai2DirectFieldNarrativeUrl = "https://ai2.opendatalake.com/api/reports/module01/field-narrative";
const ai2DirectGroundedGenerateUrl = "https://ai2.opendatalake.com/v1/grounded-generate";

function fieldNarrativeUrlFromGateway(gatewayBaseUrl: string) {
  try {
    const url = new URL(gatewayBaseUrl);
    url.pathname = "/api/reports/module01/field-narrative";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return gatewayBaseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "") + "/api/reports/module01/field-narrative";
  }
}

function groundedGenerateUrlFromGateway(gatewayBaseUrl: string) {
  try {
    const url = new URL(gatewayBaseUrl);
    url.pathname = "/v1/grounded-generate";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return gatewayBaseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "") + "/v1/grounded-generate";
  }
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls));
}

function shouldTryNextUrl(status: number) {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

function clientNameFromFacts(facts: string[]) {
  const joined = facts.join("\n");
  const match = joined.match(/\bClient\s*[:\-]\s*([^\n]+)/i);
  return match?.[1]?.trim();
}

function normalizeFieldName(field: Module01FieldNarrativeField) {
  return field === "roadmapNarrative" ? "roadmap.roadmapNarrative" : field;
}

function cleanFactForEndpoint(fact: string) {
  const cleaned = fact.trim().replace(/\s+/g, " ");
  const match = cleaned.match(/^([A-Za-z][A-Za-z0-9 &/%.-]{1,80})\s*:\s*(.+)$/);
  if (!match) return cleaned;
  const label = match[1].trim().toLowerCase();
  const value = match[2].trim();
  if (label === "client") return "";
  if (label === "board asks") return `leadership decisions include ${value}`;
  if (label === "target outcomes") return `target outcomes include ${value}`;
  if (label === "management order") return `management should ${value}`;
  if (label === "validated executive summary") return `the validated executive summary says ${value}`;
  if (label === "validated board scorecard narrative") return `the validated board scorecard narrative says ${value}`;
  if (label === "validated ai readiness narrative") return `the validated AI readiness narrative says ${value}`;
  return `${label} is ${value}`;
}

function fieldPrompt(field: Module01FieldNarrativeField) {
  const normalized = normalizeFieldName(field);
  const prompts: Record<string, string> = {
    "boardScorecard.advisoryNarrative": "Write one short board scorecard advisory narrative for a Module 01 AI assessment report. Use one paragraph only and explain the management implication.",
    "roadmap.roadmapNarrative": "Write one short roadmap narrative for a Module 01 AI assessment report. Use one paragraph only and describe sequencing logic.",
    "overallAdvisory.helicopterView": "Write one short helicopter-view narrative for a Module 01 AI assessment report. Use one paragraph only and synthesise the enterprise-level implication.",
    "aiReadinessGate.readinessNarrative": "Write one short AI readiness gate narrative for a Module 01 AI assessment report. Use one paragraph only and describe the readiness gate.",
    "executiveSummary.summaryText": "Write one short executive summary narrative for a Module 01 AI assessment report. Use one paragraph only and focus on the board-level message.",
  };
  return prompts[normalized] ?? "Write one short Module 01 assessment report narrative. Use one paragraph only.";
}

function fieldMaxSentences(field: Module01FieldNarrativeField, style?: "board" | "executive") {
  const normalized = normalizeFieldName(field);
  if (normalized === "overallAdvisory.helicopterView") return 3;
  if (normalized === "executiveSummary.summaryText") return 3;
  if (style === "executive") return 3;
  return 2;
}

function fieldRequestBody(args: Module01FieldNarrativeArgs) {
  return JSON.stringify({
    field: normalizeFieldName(args.field),
    client_name: clientNameFromFacts(args.facts),
    max_words: args.maxWords,
    style: args.style ?? "board",
    facts: args.facts.map(cleanFactForEndpoint).filter(Boolean),
  });
}

function boundedGroundedRequestBody(args: Module01FieldNarrativeArgs) {
  const maxWords = Math.max(40, Math.min(args.maxWords, 140));
  return JSON.stringify({
    task_type: "module01_field_narrative",
    knowledge_pack_id: "module01-ai-assessment-reporting",
    retrieval_mode: "hybrid",
    field: normalizeFieldName(args.field),
    client_name: clientNameFromFacts(args.facts),
    question_or_prompt: fieldPrompt(args.field),
    facts: args.facts.map(cleanFactForEndpoint).filter(Boolean).slice(0, 5),
    max_chunks: 3,
    require_citations: true,
    model: args.modelConfig.model,
    output_contract: {
      kind: "field_narrative",
      max_words: maxWords,
      max_sentences: fieldMaxSentences(args.field, args.style),
    },
  });
}

type Ai2JsonBody = {
  narrative?: string;
  choices?: Array<{ message?: { content?: string }; text?: string }>;
  answer?: string;
  content?: string;
  message?: string;
  response?: string;
  field_validation?: {
    status?: string;
    rejection_reason?: string;
    fallback_used?: boolean;
  };
  retrieval_metadata?: {
    retrieval_mode?: string;
  };
  citations?: unknown[];
};

async function readAi2Response(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { rawOutput: await response.text() };
  }
  const body = await response.json() as string | Ai2JsonBody;
  if (typeof body === "string") return { rawOutput: body };
  return {
    rawOutput: body.narrative
      ?? body.choices?.[0]?.message?.content
      ?? body.choices?.[0]?.text
      ?? body.answer
      ?? body.content
      ?? body.response
      ?? body.message
      ?? "",
    validationStatus: body.field_validation?.status,
    rejectionReason: body.field_validation?.rejection_reason,
    fallbackUsed: body.field_validation?.fallback_used,
    retrievalMode: body.retrieval_metadata?.retrieval_mode,
    citationCount: Array.isArray(body.citations) ? body.citations.length : undefined,
  };
}

async function callAi2FieldNarrative(args: Module01FieldNarrativeArgs): Promise<Ai2FieldNarrativeResult> {
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), args.modelConfig.timeoutMs ?? 30000);
  const fetchImpl = args.fetchFn ?? fetch;
  const urls = uniqueUrls([
    groundedGenerateUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectGroundedGenerateUrl,
    fieldNarrativeUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectFieldNarrativeUrl,
  ]);

  try {
    let lastStatus = 0;
    for (const url of urls) {
      const isGroundedGenerate = url.includes("/v1/grounded-generate");
      const response = await fetchImpl(url, {
        method: "POST",
        headers: args.modelConfig.headers,
        body: isGroundedGenerate ? boundedGroundedRequestBody(args) : fieldRequestBody(args),
        cache: "no-store",
        signal: abortController.signal,
      });
      lastStatus = response.status;
      if (!response.ok) {
        if (shouldTryNextUrl(response.status)) continue;
        break;
      }
      return {
        status: "success",
        ...await readAi2Response(response),
        model: args.modelConfig.model,
        durationMs: Date.now() - startedAt,
      };
    }
    return {
      status: "error",
      rawOutput: "",
      model: args.modelConfig.model,
      durationMs: Date.now() - startedAt,
      error: `Field narrative gateway returned ${lastStatus}.`,
    };
  } catch (error) {
    const timeoutHit = error instanceof DOMException && error.name === "AbortError";
    return {
      status: timeoutHit ? "timeout" : "error",
      rawOutput: "",
      model: args.modelConfig.model,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "field_narrative_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildModule01FieldNarrativeFallback(facts: string[], fallbackText: string) {
  return fallbackText.trim() || facts.slice(0, 3).join(" ");
}

function validateFieldText(
  text: string,
  args: Module01FieldNarrativeArgs,
  maxWords: number,
) {
  return validateModule01Narrative(text, {
    fieldName: normalizeFieldName(args.field),
    maxWords,
    minWords: 20,
    requiredFactsSupplied: args.facts.length > 0,
    allowedClientNames: [clientNameFromFacts(args.facts) ?? ""],
  });
}

function sanitizeFieldText(rawOutput: string, fallbackText: string, maxWords: number) {
  const sanitized = sanitizePlainTextField(rawOutput, {
    fallbackText,
    maxWords,
    maxCharacters: Math.max(360, maxWords * 8),
  });
  return {
    sanitized,
    text: sanitized.status === "fallback_required" ? rawOutput : sanitized.text,
  };
}

function retryFacts(facts: string[], reason: string) {
  return [
    `Previous output was rejected: ${reason}.`,
    "Rewrite one controlled paragraph. Do not use raw label stitching. Do not repeat lists. Finish every phrase.",
    ...facts,
  ];
}

export async function generateModule01FieldNarrative(args: Module01FieldNarrativeArgs): Promise<NarrativeFieldGeneration> {
  const maxWords = Math.max(40, Math.min(args.maxWords, 140));
  const fallbackText = buildModule01FieldNarrativeFallback(args.facts, args.fallbackText);
  const result = await callAi2FieldNarrative({ ...args, maxWords });

  if (result.status !== "success") {
    return {
      text: fallbackText,
      status: "fallback",
      model: result.model,
      durationMs: result.durationMs,
      validationStatus: "gateway_failure",
      retryAttempted: false,
      fallbackUsed: true,
      responseLength: fallbackText.length,
      rawResponseLength: 0,
      sanitizedResponseLength: fallbackText.length,
      generatedAt: new Date().toISOString(),
      rejectionReason: result.error ?? result.status,
      ai2FieldValidationStatus: result.validationStatus,
      ai2RejectionReason: result.rejectionReason,
      ai2FallbackUsed: result.fallbackUsed,
      ai2RetrievalMode: result.retrievalMode,
      ai2CitationCount: result.citationCount,
    };
  }

  const { sanitized, text } = sanitizeFieldText(result.rawOutput, fallbackText, maxWords);
  const validation = validateFieldText(text, args, maxWords);

  if (!validation.valid) {
    const retryResult = await callAi2FieldNarrative({
      ...args,
      facts: retryFacts(args.facts, validation.reason ?? "invalid_field_narrative"),
      maxWords,
    });
    if (retryResult.status === "success") {
      const retrySanitized = sanitizeFieldText(retryResult.rawOutput, fallbackText, maxWords);
      const retryValidation = validateFieldText(retrySanitized.text, args, maxWords);
      if (retryValidation.valid) {
        return {
          text: retrySanitized.text,
          status: retrySanitized.sanitized.status === "clean" ? "ai_enriched" : "sanitized",
          model: retryResult.model,
          durationMs: result.durationMs + retryResult.durationMs,
          validationStatus: "valid",
          retryAttempted: true,
          fallbackUsed: false,
          responseLength: retrySanitized.text.length,
          rawResponseLength: retryResult.rawOutput.length,
          sanitizedResponseLength: retrySanitized.text.length,
          generatedAt: new Date().toISOString(),
          rawOutputPreview: retryResult.rawOutput.slice(0, 160),
          sanitizedOutputPreview: retrySanitized.text.slice(0, 160),
          rejectionReason: validation.reason,
          ai2FieldValidationStatus: retryResult.validationStatus,
          ai2RejectionReason: retryResult.rejectionReason,
          ai2FallbackUsed: retryResult.fallbackUsed,
          ai2RetrievalMode: retryResult.retrievalMode,
          ai2CitationCount: retryResult.citationCount,
        };
      }
      return {
        text: fallbackText,
        status: "fallback",
        model: retryResult.model,
        durationMs: result.durationMs + retryResult.durationMs,
        validationStatus: "rejected",
        retryAttempted: true,
        fallbackUsed: true,
        responseLength: fallbackText.length,
        rawResponseLength: retryResult.rawOutput.length,
        sanitizedResponseLength: fallbackText.length,
        generatedAt: new Date().toISOString(),
        rawOutputPreview: retryResult.rawOutput.slice(0, 160),
        rejectionReason: retryValidation.reason ?? validation.reason ?? "invalid_field_narrative",
        ai2FieldValidationStatus: retryResult.validationStatus,
        ai2RejectionReason: retryResult.rejectionReason,
        ai2FallbackUsed: retryResult.fallbackUsed,
        ai2RetrievalMode: retryResult.retrievalMode,
        ai2CitationCount: retryResult.citationCount,
      };
    }
    return {
      text: fallbackText,
      status: "fallback",
      model: result.model,
      durationMs: result.durationMs + retryResult.durationMs,
      validationStatus: "rejected",
      retryAttempted: true,
      fallbackUsed: true,
      responseLength: fallbackText.length,
      rawResponseLength: result.rawOutput.length,
      sanitizedResponseLength: fallbackText.length,
      generatedAt: new Date().toISOString(),
      rawOutputPreview: result.rawOutput.slice(0, 160),
      rejectionReason: validation.reason ?? sanitized.rejectionReason ?? "invalid_field_narrative",
      ai2FieldValidationStatus: result.validationStatus,
      ai2RejectionReason: result.rejectionReason,
      ai2FallbackUsed: result.fallbackUsed,
      ai2RetrievalMode: result.retrievalMode,
      ai2CitationCount: result.citationCount,
    };
  }

  return {
    text,
    status: sanitized.status === "clean" ? "ai_enriched" : "sanitized",
    model: result.model,
    durationMs: result.durationMs,
    validationStatus: "valid",
    retryAttempted: false,
    fallbackUsed: false,
    responseLength: text.length,
    rawResponseLength: result.rawOutput.length,
    sanitizedResponseLength: text.length,
    generatedAt: new Date().toISOString(),
    rawOutputPreview: result.rawOutput.slice(0, 160),
    sanitizedOutputPreview: text.slice(0, 160),
    ai2FieldValidationStatus: result.validationStatus,
    ai2RejectionReason: result.rejectionReason,
    ai2FallbackUsed: result.fallbackUsed,
    ai2RetrievalMode: result.retrievalMode,
    ai2CitationCount: result.citationCount,
  };
}
