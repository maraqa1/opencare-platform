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
};

const ai2DirectFieldNarrativeUrl = "https://ai2.opendatalake.com/api/reports/module01/field-narrative";

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

function fieldRequestBody(args: Module01FieldNarrativeArgs) {
  return JSON.stringify({
    field: normalizeFieldName(args.field),
    client_name: clientNameFromFacts(args.facts),
    max_words: args.maxWords,
    style: args.style ?? "board",
    facts: args.facts.map(cleanFactForEndpoint).filter(Boolean),
  });
}

async function readAi2Text(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }
  const body = await response.json() as string | {
    narrative?: string;
    choices?: Array<{ message?: { content?: string }; text?: string }>;
    answer?: string;
    content?: string;
    message?: string;
    response?: string;
  };
  if (typeof body === "string") return body;
  return body.narrative
    ?? body.choices?.[0]?.message?.content
    ?? body.choices?.[0]?.text
    ?? body.answer
    ?? body.content
    ?? body.response
    ?? body.message
    ?? "";
}

async function callAi2FieldNarrative(args: Module01FieldNarrativeArgs): Promise<Ai2FieldNarrativeResult> {
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), args.modelConfig.timeoutMs ?? 30000);
  const fetchImpl = args.fetchFn ?? fetch;
  const urls = uniqueUrls([
    fieldNarrativeUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectFieldNarrativeUrl,
  ]);

  try {
    let lastStatus = 0;
    for (const url of urls) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: args.modelConfig.headers,
        body: fieldRequestBody(args),
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
        rawOutput: await readAi2Text(response),
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
    };
  }

  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText,
    maxWords,
    maxCharacters: Math.max(360, maxWords * 8),
  });
  const text = sanitized.status === "fallback_required" ? result.rawOutput : sanitized.text;
  const validation = validateModule01Narrative(text, {
    fieldName: normalizeFieldName(args.field),
    maxWords,
    minWords: 20,
    requiredFactsSupplied: args.facts.length > 0,
    allowedClientNames: [clientNameFromFacts(args.facts) ?? ""],
  });

  if (!validation.valid) {
    return {
      text: fallbackText,
      status: "fallback",
      model: result.model,
      durationMs: result.durationMs,
      validationStatus: "rejected",
      retryAttempted: false,
      fallbackUsed: true,
      responseLength: fallbackText.length,
      rawResponseLength: result.rawOutput.length,
      sanitizedResponseLength: fallbackText.length,
      generatedAt: new Date().toISOString(),
      rawOutputPreview: result.rawOutput.slice(0, 160),
      rejectionReason: validation.reason ?? sanitized.rejectionReason ?? "invalid_field_narrative",
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
  };
}
