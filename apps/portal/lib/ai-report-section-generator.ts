export type ReportSectionSource = "llm" | "fallback";

export type ReportSectionSchema = Record<string, "string" | "string[]">;

export type ReportSectionMetadata = {
  source: ReportSectionSource;
  attempts: number;
  validJson: boolean;
  repaired?: boolean;
  error?: string;
};

export type ReportSectionResult = {
  sectionName: string;
  content: Record<string, unknown>;
  metadata: ReportSectionMetadata;
};

type ReportSectionModelConfig = {
  gatewayBaseUrl: string;
  headers: Record<string, string>;
  model: string;
  timeoutMs: number;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};

type GenerateReportSectionArgs = {
  sectionName: string;
  sectionSchema: ReportSectionSchema;
  diagnosticData: unknown;
  customerContext: unknown;
  previousSections?: unknown;
  modelConfig: ReportSectionModelConfig;
  fallback: Record<string, unknown>;
};

class SectionTimeoutError extends Error {
  constructor(sectionName: string) {
    super(`Local AI section generation timed out for ${sectionName}.`);
    this.name = "SectionTimeoutError";
  }
}

function cleanSectionText(value: string) {
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textValue(value: unknown) {
  if (typeof value === "string") {
    return cleanSectionText(value);
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return cleanSectionText(JSON.stringify(value));
}

export function extractJsonObject(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new SyntaxError("Model response did not contain a valid JSON object.");
  }
}

function validateAndNormaliseSection(
  parsed: Record<string, unknown>,
  schema: ReportSectionSchema,
) {
  const normalised: Record<string, unknown> = {};
  const errors: string[] = [];

  Object.entries(schema).forEach(([key, expectedType]) => {
    const value = parsed[key];
    if (expectedType === "string") {
      if (typeof value !== "string") {
        errors.push(`${key} must be a string`);
      }
      normalised[key] = textValue(value);
      return;
    }

    if (!Array.isArray(value)) {
      errors.push(`${key} must be an array of strings`);
      normalised[key] = [];
      return;
    }

    normalised[key] = value.map((item) => textValue(item)).filter(Boolean);
  });

  if (errors.length > 0) {
    throw new TypeError(errors.join("; "));
  }

  return normalised;
}

function strictJsonInstruction() {
  return [
    "Return ONLY valid JSON.",
    "Do not return Markdown.",
    "Do not wrap the JSON in code fences.",
    "Do not include commentary.",
    "Do not include explanations outside the JSON.",
    "The first character must be {.",
    "The last character must be }.",
    "All keys must match the provided schema.",
    "If information is missing, use an empty string or an empty array according to the schema.",
    "Do not invent facts, metrics, dates, organisations, evidence counts, or domain scores.",
  ].join(" ");
}

function buildMessages(args: GenerateReportSectionArgs, validationError?: string) {
  const retryInstruction = validationError
    ? `The previous response failed validation: ${validationError}. Return corrected JSON only.`
    : "";

  return [
    {
      role: "system",
      content: [
        "You are a senior data and AI strategy consultant writing one section of an executive diagnostic report.",
        strictJsonInstruction(),
        "Use a concise, board-ready tone.",
        "Use only the diagnostic data and customer context supplied for this section.",
        retryInstruction,
      ].filter(Boolean).join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `Generate the ${args.sectionName} section only.`,
        sectionName: args.sectionName,
        sectionSchema: args.sectionSchema,
        customerContext: args.customerContext,
        diagnosticData: args.diagnosticData,
        previousSections: args.previousSections ?? null,
      }),
    },
  ];
}

async function callSectionModel(
  args: GenerateReportSectionArgs,
  validationError?: string,
) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, args.modelConfig.timeoutMs);

  try {
    const response = await fetch(`${args.modelConfig.gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      headers: args.modelConfig.headers,
      signal: abortController.signal,
      body: JSON.stringify({
        model: args.modelConfig.model,
        temperature: args.modelConfig.temperature ?? 0.1,
        top_p: args.modelConfig.topP ?? 0.9,
        max_tokens: args.modelConfig.maxTokens ?? 500,
        response_format: { type: "json_object" },
        format: "json",
        messages: buildMessages(args, validationError),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `Local AI section generation failed at the gateway (${response.status}).`;
      try {
        const body = await response.json() as { error?: { message?: string }; detail?: string; message?: string };
        message = body.error?.message || body.detail || body.message || message;
      } catch {
        // Keep the generic gateway status message when the body is not JSON.
      }
      throw new Error(message);
    }

    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content ?? "{}";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SectionTimeoutError(args.sectionName);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateReportSection(args: GenerateReportSectionArgs): Promise<ReportSectionResult> {
  let lastError = "";
  let attempts = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;
    try {
      const content = await callSectionModel(args, lastError || undefined);
      const parsed = extractJsonObject(content);
      const normalised = validateAndNormaliseSection(parsed, args.sectionSchema);
      return {
        sectionName: args.sectionName,
        content: normalised,
        metadata: {
          source: "llm",
          attempts: attempt,
          validJson: true,
          repaired: attempt > 1,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown section generation error.";
      if (error instanceof SectionTimeoutError) {
        break;
      }
    }
  }

  return {
    sectionName: args.sectionName,
    content: args.fallback,
    metadata: {
      source: "fallback",
      attempts,
      validJson: true,
      error: lastError || "Local AI did not return a valid section.",
    },
  };
}
