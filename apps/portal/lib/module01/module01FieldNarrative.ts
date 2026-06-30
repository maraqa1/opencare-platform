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
  if (/^(Previous output was rejected|Rewrite one controlled paragraph)/i.test(cleaned)) return "";
  const match = cleaned.match(/^([A-Za-z][A-Za-z0-9 &/%.-]{1,80})\s*:\s*(.+)$/);
  if (!match) return cleaned;
  const label = match[1].trim().toLowerCase();
  const value = match[2]
    .trim()
    .replace(/\s+score\s+\d+(?:\.\d+)?\s+gap\s+\d+(?:\.\d+)?/gi, "")
    .replace(/\s+score\s+\d+(?:\.\d+)?\s*\/\s*4,?\s*gap\s+\d+(?:\.\d+)?/gi, "");
  const proseValue = value.replace(/\s*;\s*/g, ", ").replace(/[.]+$/g, "");
  if (label === "client") return "";
  if (label === "overall score") return `score indicates a ${proseValue} out of 4 early-stage maturity baseline that requires management action`;
  if (label === "overall gap") return `remaining maturity gap of ${proseValue} shows that remediation should be governed as a board-level priority`;
  if (label === "maturity band") return `maturity band is ${proseValue}`;
  if (label === "evidence coverage") return `evidence posture includes ${proseValue}`;
  if (label === "evidence coverage percent") return `evidence posture includes ${proseValue}% evidence coverage`;
  if (label === "weighted evidence confidence percent") return `weighted evidence confidence is ${proseValue}% and should temper board confidence in the baseline`;
  if (label === "strongest domains") return `stronger foundations are ${proseValue}`;
  if (label === "weakest domains") return `largest gaps sit in ${proseValue}`;
  if (label === "critical domains") return `critical management attention should focus on ${proseValue}`;
  if (label === "priority domains") return `priority domain remediation covers ${proseValue}`;
  if (label === "critical gaps") return `critical gaps require management controls in the priority domains`;
  if (label === "business domain") return `business context covers ${proseValue}`;
  if (label === "deterministic critical domains") return `critical management domains include ${proseValue}`;
  if (label === "top root causes") return `root causes include ${proseValue}`;
  if (label === "board decisions") return `board decisions include ${proseValue}`;
  if (label === "roadmap priorities") return `roadmap priorities include ${proseValue}`;
  if (label === "owner types") return `accountable owners include ${proseValue}`;
  if (label === "board asks") return `leadership decisions include ${proseValue}`;
  if (label === "target outcomes") return `target outcomes include ${proseValue}`;
  if (label === "management order") return `management should ${proseValue}, with analytics and AI scaling held behind a readiness gate`;
  if (label === "validated executive summary") return `the validated executive summary says ${proseValue}`;
  if (label === "validated board scorecard narrative") return `the validated board scorecard narrative says ${proseValue}`;
  if (label === "validated ai readiness narrative") return `the validated AI readiness narrative says ${proseValue}`;
  return `${label} is ${proseValue}`;
}

function fieldPrompt(field: Module01FieldNarrativeField) {
  const normalized = normalizeFieldName(field);
  const prompts: Record<string, string> = {
    "boardScorecard.advisoryNarrative": "Write one short board scorecard advisory narrative for a Module 01 AI assessment report. Use one paragraph only. Include score meaning, evidence posture or evidence coverage, management implication, and the decision required.",
    "roadmap.roadmapNarrative": "Write one short roadmap narrative for a Module 01 AI assessment report. Use one paragraph only. Include sequencing logic, owners, evidence certification, priority domains, and a control/readiness gate before scaling.",
    "overallAdvisory.helicopterView": "Write one short helicopter-view narrative for a Module 01 AI assessment report. Use one paragraph only. Include an overall management conclusion and synthesise the enterprise-level implication.",
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
  const facts = args.facts.map(cleanFactForEndpoint).filter(Boolean).slice(0, 6);
  return JSON.stringify({
    field: normalizeFieldName(args.field),
    client_name: clientNameFromFacts(args.facts),
    max_words: args.maxWords,
    style: args.style ?? "board",
    facts,
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
    fieldNarrativeUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectFieldNarrativeUrl,
    groundedGenerateUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectGroundedGenerateUrl,
  ]);

  try {
    let lastStatus = 0;
    let lastError = "";
    for (const url of urls) {
      const isGroundedGenerate = url.includes("/v1/grounded-generate");
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: args.modelConfig.headers,
          body: isGroundedGenerate ? boundedGroundedRequestBody(args) : fieldRequestBody(args),
          cache: "no-store",
          signal: abortController.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        lastError = error instanceof Error ? error.message : "field_narrative_fetch_error";
        continue;
      }
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
      error: lastStatus > 0 ? `Field narrative gateway returned ${lastStatus}.` : lastError || "Field narrative gateway was unreachable.",
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

function factValue(facts: string[], labels: string[]) {
  const wanted = new Set(labels.map((label) => label.toLowerCase()));
  for (const fact of facts) {
    const match = fact.trim().match(/^([A-Za-z][A-Za-z0-9 &/%.-]{1,80})\s*:\s*(.+)$/);
    if (match && wanted.has(match[1].trim().toLowerCase())) {
      return match[2].trim().replace(/\s*;\s*/g, ", ").replace(/[.]+$/g, "");
    }
  }
  return "";
}

export function buildModule01FieldNarrativeFallback(
  facts: string[],
  fallbackText: string,
  field: Module01FieldNarrativeField = "executiveSummary.summaryText",
) {
  const suppliedFallback = fallbackText.trim();
  if (suppliedFallback) return suppliedFallback;

  const client = clientNameFromFacts(facts) ?? "The client";
  const score = factValue(facts, ["overall score"]);
  const evidence = factValue(facts, ["evidence coverage", "evidence coverage percent"]);
  const priority = factValue(facts, ["priority domains", "critical domains", "weakest domains"]) || "the priority domains";
  const owners = factValue(facts, ["owner types"]) || "accountable owners";
  const decision = factValue(facts, ["board asks", "management order"]) || "approve owner assignment, evidence certification and controlled remediation";
  const scorePhrase = score ? `a ${score} maturity baseline` : "the current maturity baseline";
  const evidencePhrase = evidence ? `the evidence posture of ${evidence}` : "the available evidence posture";

  if (normalizeFieldName(field) === "roadmap.roadmapNarrative") {
    return `${client} should sequence the roadmap by confirming ${owners} and evidence certification first, then remediating ${priority} through named actions, and only then scaling analytics and AI through a control/readiness gate. This keeps execution tied to ownership, evidence quality and management accountability.`;
  }
  if (normalizeFieldName(field) === "boardScorecard.advisoryNarrative") {
    return `${client} should read the board scorecard as a readiness signal based on ${scorePhrase} and ${evidencePhrase}. The management implication is to treat priority gaps as owned remediation work, with the decision required to ${decision} before scaling AI-enabled reporting.`;
  }
  if (normalizeFieldName(field) === "overallAdvisory.helicopterView") {
    return `${client} has a clear management conclusion from Module 01: the enterprise should strengthen ownership, evidence quality and ${priority} before scaling analytics or AI. This keeps the advisory posture practical, evidence-led and governed through accountable decisions.`;
  }
  return `${client} has enough Module 01 diagnostic evidence to move from assessment into controlled execution. Management should confirm accountable owners, certify evidence, remediate ${priority}, and keep analytics or AI scaling behind a readiness gate until controls are operating.`;
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
  void reason;
  return facts;
}

export async function generateModule01FieldNarrative(args: Module01FieldNarrativeArgs): Promise<NarrativeFieldGeneration> {
  const maxWords = Math.max(40, Math.min(args.maxWords, 140));
  const fallbackText = buildModule01FieldNarrativeFallback(args.facts, args.fallbackText, args.field);
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
