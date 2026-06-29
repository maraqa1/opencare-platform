import type { NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
import { validateModule01Narrative } from "@/lib/module01/module01NarrativeValidator";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type Module01FieldNarrativeField = "roadmapNarrative";

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

const ai2DirectChatUrl = "https://ai2.opendatalake.com/api/chat";

function nativeChatUrlFromGateway(gatewayBaseUrl: string) {
  try {
    const url = new URL(gatewayBaseUrl);
    url.pathname = "/api/chat";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return gatewayBaseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "") + "/api/chat";
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

function buildFieldPrompt(args: Pick<Module01FieldNarrativeArgs, "facts" | "maxWords" | "style">) {
  return [
    "Write one short management paragraph for a board-ready data and AI diagnostic.",
    "You are not chatting with the user.",
    "Return plain text only.",
    "No JSON, headings, bullets, numbering, markdown, tables, phases, deliverables, templates, or full report sections.",
    "Do not use template, deliverable, or operating-model language.",
    "Use only the facts below. Do not invent systems, evidence IDs, owners, dates, scores, use cases, or regulatory claims.",
    `Maximum ${args.maxWords} words.`,
    `Tone: ${args.style ?? "board"}.`,
    "",
    "Task: Explain why management should start with ownership and evidence, then remediate the largest gaps, then scale only through controls.",
    "",
    "Facts:",
    ...args.facts.slice(0, 8).map((fact) => `Fact: ${fact}`),
    "",
    "Write the paragraph only.",
  ].join("\n");
}

function fieldRequestBody(prompt: string, args: Module01FieldNarrativeArgs) {
  const numPredict = Math.max(80, Math.min(args.maxWords * 3, 180));
  return JSON.stringify({
    model: args.modelConfig.model,
    temperature: 0.1,
    top_p: 0.7,
    max_tokens: numPredict,
    num_predict: numPredict,
    options: {
      temperature: 0.1,
      top_p: 0.7,
      repeat_penalty: 1.2,
      num_ctx: 2048,
      num_predict: numPredict,
      stop: ["```", "\n#", "\n##", "{", "}", "|", "\n-", "\n1.", "\nDeliverable", "Deliverable", "\nField:", "\nFacts:"],
    },
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
}

async function readAi2Text(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }
  const body = await response.json() as string | {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
    answer?: string;
    content?: string;
    message?: string;
    response?: string;
  };
  if (typeof body === "string") return body;
  return body.choices?.[0]?.message?.content
    ?? body.choices?.[0]?.text
    ?? body.answer
    ?? body.content
    ?? body.response
    ?? body.message
    ?? "";
}

async function callAi2FieldNarrative(args: Module01FieldNarrativeArgs, prompt: string): Promise<Ai2FieldNarrativeResult> {
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), args.modelConfig.timeoutMs ?? 30000);
  const fetchImpl = args.fetchFn ?? fetch;
  const urls = uniqueUrls([
    nativeChatUrlFromGateway(args.modelConfig.gatewayBaseUrl),
    ai2DirectChatUrl,
  ]);

  try {
    let lastStatus = 0;
    for (const url of urls) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: args.modelConfig.headers,
        body: fieldRequestBody(prompt, args),
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
  const prompt = buildFieldPrompt({ facts: args.facts, maxWords, style: args.style });
  const result = await callAi2FieldNarrative({ ...args, maxWords }, prompt);

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
    fieldName: args.field,
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
