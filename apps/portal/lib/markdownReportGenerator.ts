import type { DiagnosticReportRequest, GeneratedConsultingReport } from "@/lib/deterministicReportBuilders";
import { contextLabel, evidenceCoveragePct, formatScore } from "@/lib/deterministicReportBuilders";
import { estimateTokens } from "@/lib/mistralNemoInteractionPolicy";

const ai2DirectChatUrl = "https://ai2.opendatalake.com/api/chat";

type GenerateMarkdownReportArgs = {
  payload: DiagnosticReportRequest;
  deterministicReport: GeneratedConsultingReport;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs: number;
    enableLlmMarkdown?: boolean;
  };
};

export type MarkdownReportGeneration = {
  markdown: string;
  source: "llm" | "fallback";
  model: string;
  durationMs: number;
  error?: string;
  inputTokenEstimate: number;
};

function buildDeterministicMarkdown(payload: DiagnosticReportRequest, report: GeneratedConsultingReport) {
  return [
    "# Data & AI Capability Diagnostic",
    "",
    "## Executive summary",
    report.executiveSummary,
    "",
    "## Headline assessment",
    report.headlineAssessment,
    "",
    "## Board decisions required",
    ...report.boardAsks.map((ask) => `- ${ask}`),
    "",
    "## Material findings",
    ...report.materialFindings.map((finding) => `- ${finding}`),
    "",
    "## Priority gap register",
    ...report.priorityGapRegister.map((gap) => `- ${gap}`),
    "",
    "## 90-day roadmap",
    ...report.ninetyDayPlan.map((step) => `- ${step}`),
    "",
    "## AI readiness gate",
    report.aiReadinessGate,
    "",
    "### Proceed",
    ...report.aiGateProceed.map((item) => `- ${item}`),
    "",
    "### Pilot with controls",
    ...report.aiGatePilotWithControls.map((item) => `- ${item}`),
    "",
    "### Hold",
    ...report.aiGateHold.map((item) => `- ${item}`),
    "",
    "## Recommended next steps",
    ...report.nextSteps.map((step) => `- ${step}`),
    "",
    `<!-- Deterministic fallback generated for ${contextLabel(payload, "customerName", "the organisation")} -->`,
  ].join("\n");
}

function buildMarkdownPrompt(payload: DiagnosticReportRequest) {
  const evidencePct = evidenceCoveragePct(payload);
  const topGapDomains = payload.topGapDomains.slice(0, 5).map((domain) => ({
    domain: domain.nameEn,
    score: domain.avgScore,
    gap: domain.avgGap,
  }));
  const priorityGaps = payload.priorityGaps.slice(0, 8).map((gap) => ({
    question: gap.question,
    domain: gap.domain,
    score: gap.score,
    gap: gap.gap,
    evidenceStrength: gap.evidenceStrength,
    actionPlan: gap.actionPlan,
  }));
  const gartner = (payload.gartnerPillars ?? []).slice(0, 7).map((pillar) => ({
    name: pillar.name,
    score: pillar.score,
    gap: pillar.gap,
    priority: pillar.priority,
    action: pillar.managementAction,
  }));

  return [
    "You are a senior data and AI advisory partner writing an executive diagnostic report in Markdown.",
    "",
    "Return Markdown only.",
    "Do not return JSON.",
    "Do not use Markdown tables.",
    "Do not wrap the answer in a code fence.",
    "Do not include commentary before or after the report.",
    "Use only the supplied facts.",
    "Do not invent client facts, acronyms, regulations, scores, dates, obligations, or source systems.",
    "Do not create an acronym for the customer unless one is explicitly supplied.",
    "If the overall score is below 2.0, describe the maturity as ad hoc or early-stage, not moderate.",
    "Do not copy the workbook as a table or question list. Synthesize the implications.",
    "Every section must explain what the finding means for management decisions.",
    "Use a premium consulting tone: concise, board-ready, specific, and action-oriented.",
    "Write around 700 to 950 words.",
    "",
    "Writing standard:",
    "- Start with the commercial and operating implication, then cite the supporting score pattern.",
    "- Use short paragraphs and executive bullets, not tables.",
    "- For each priority gap, state the decision required, accountable owner type, and expected remediation outcome.",
    "- For the Domain action plan, do not write generic recommendations. For each weak domain, include: management decision, accountable owner type, first 30-day action, evidence required, and success measure.",
    "- Domain actions must be specific to the domain. Data quality actions should mention rules, defects, owners, and remediation; data-source actions should mention inventory, lineage, refresh cadence, and system-owner confirmation; roadmap actions should mention sequencing, benefits, dependencies, and governance cadence.",
    "- Make the AI readiness gate practical: what can proceed now, what needs controls, and what must be held.",
    "- Make the 90-day roadmap specific enough for a steering committee to approve.",
    "",
    "Required Markdown structure:",
    "# Data & AI Capability Diagnostic",
    "## Executive summary",
    "## Readiness position and management attention",
    "## Board decisions required",
    "## Material findings",
    "## Domain action plan",
    "## Priority gap register",
    "## 90-day roadmap",
    "## AI readiness gate",
    "### Proceed",
    "### Pilot with controls",
    "### Hold",
    "## Recommended next steps",
    "",
    "Facts:",
    JSON.stringify({
      customerContext: payload.customerContext ?? {},
      overallScore: payload.overallScore,
      overallGap: payload.overallGap,
      scoredQuestions: `${payload.scoredQuestions}/${payload.totalQuestions}`,
      evidenceBackedItems: `${payload.evidenceBackedItems}/${payload.totalQuestions}`,
      evidenceCoveragePct: evidencePct,
      maturityScale: "0 to 4, where 4 is maximum maturity",
      topGapDomains,
      strongestDomains: payload.strongestDomains.slice(0, 3),
      priorityGaps,
      gartnerPillars: gartner,
      requiredAIReadinessPosition:
        "Proceed with governed descriptive diagnostics and human-approved AI reporting; pilot forecasting, classification, and summarisation only with confirmed data quality, privacy, lineage, and model-risk controls; hold autonomous decisions and sensitive generative AI workflows.",
    }),
  ].join("\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeInventedCustomerAcronym(markdown: string, payload: DiagnosticReportRequest) {
  const customerName = contextLabel(payload, "customerName", "").trim();
  if (!customerName || customerName.length < 5) {
    return markdown;
  }

  const customerPattern = new RegExp(`${escapeRegExp(customerName)}\\s*\\(([A-Z]{2,8})\\)`, "g");
  const acronyms = new Set<string>();
  let cleaned = markdown.replace(customerPattern, (_match, acronym: string) => {
    acronyms.add(acronym);
    return customerName;
  });

  acronyms.forEach((acronym) => {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(acronym)}\\b`, "g"), customerName);
  });

  return cleaned;
}

function convertMarkdownTables(markdown: string) {
  const lines = markdown.split("\n");
  const converted: string[] = [];
  let inTable = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (inTable && converted.at(-1) !== "") {
        converted.push("");
      }
      inTable = false;
      converted.push(line);
      return;
    }

    inTable = true;
    if (/^\|?[\s:|-]+\|?$/.test(trimmed)) {
      return;
    }

    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length === 0) {
      return;
    }

    if (cells.some((cell) => /^(question|domain|score|gap|evidence|action)$/i.test(cell))) {
      return;
    }

    converted.push(`- ${cells.join(" - ")}`);
  });

  return converted.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

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

function shouldTryNativeChat(status: number) {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

function isAi2Url(url: string) {
  try {
    return new URL(url).hostname.toLowerCase() === "ai2.opendatalake.com";
  } catch {
    return url.toLowerCase().includes("ai2.opendatalake.com");
  }
}

function sanitizeMarkdown(raw: string, payload: DiagnosticReportRequest) {
  let markdown = raw
    .replace(/```(?:markdown|md)?/gi, "")
    .replace(/```/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  const firstHeading = markdown.search(/^#\s+/m);
  if (firstHeading > 0) {
    markdown = markdown.slice(firstHeading).trim();
  }
  markdown = stripEchoedPromptOrJson(markdown);

  if (!markdown.startsWith("#")) {
    throw new Error("Markdown report did not start with a report heading.");
  }
  markdown = removeInventedCustomerAcronym(markdown, payload);
  markdown = convertMarkdownTables(markdown);
  markdown = stripEchoedPromptOrJson(markdown);
  if (/^\s*[\[{]/.test(markdown) || /^\s*["']?(customerContext|overallScore|topGapDomains|priorityGaps|gartnerPillars)["']?\s*:/m.test(markdown)) {
    throw new Error("Markdown report contains JSON-like output.");
  }
  if (markdown.length < 700) {
    throw new Error("Markdown report is too short to use as an executive report.");
  }

  return markdown;
}

function stripEchoedPromptOrJson(markdown: string) {
  let cleaned = markdown;
  const cutPatterns = [
    /\n\s*Facts:\s*[\[{]/i,
    /\n\s*```(?:json)?\s*[\[{]/i,
    /\n\s*[\[{]\s*"customerContext"\s*:/i,
    /\n\s*"customerContext"\s*:/i,
  ];

  for (const pattern of cutPatterns) {
    const match = pattern.exec(cleaned);
    if (match?.index && match.index > 300) {
      cleaned = cleaned.slice(0, match.index).trim();
    }
  }

  return cleaned
    .split("\n")
    .filter((line) => !/^\s*["']?(overallScore|overallGap|scoredQuestions|evidenceBackedItems|topGapDomains|priorityGaps|gartnerPillars)["']?\s*:/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unwrapPossibleJsonText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      answer?: string;
      content?: string;
      message?: string;
      response?: string;
    };
    return parsed.choices?.[0]?.message?.content
      ?? parsed.choices?.[0]?.text
      ?? parsed.answer
      ?? parsed.content
      ?? parsed.response
      ?? parsed.message
      ?? value;
  } catch {
    return value;
  }
}

async function readMarkdownResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as string | {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      answer?: string;
      content?: string;
      message?: string;
      response?: string;
    };
    if (typeof body === "string") {
      return unwrapPossibleJsonText(body);
    }
    const content = body.choices?.[0]?.message?.content
      ?? body.choices?.[0]?.text
      ?? body.answer
      ?? body.content
      ?? body.response
      ?? body.message
      ?? "";
    return unwrapPossibleJsonText(content);
  }
  return unwrapPossibleJsonText(await response.text());
}

async function fetchMarkdownContent(
  url: string,
  init: Omit<RequestInit, "signal">,
  timeoutMs: number,
): Promise<{ ok: true; status: number; markdown: string } | { ok: false; status: number; markdown: "" }> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: abortController.signal,
    });
    if (!response.ok) {
      return { ok: false, status: response.status, markdown: "" };
    }
    const markdown = await readMarkdownResponse(response);
    return { ok: true, status: response.status, markdown };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Local AI markdown report timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function nativeChatRequest(prompt: string, headers: Record<string, string>): Omit<RequestInit, "signal"> {
  return {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
    cache: "no-store",
  };
}

export async function generateMarkdownReport(args: GenerateMarkdownReportArgs): Promise<MarkdownReportGeneration> {
  const prompt = buildMarkdownPrompt(args.payload);
  const inputTokenEstimate = estimateTokens(prompt);
  const startedAt = Date.now();
  const fallbackMarkdown = buildDeterministicMarkdown(args.payload, args.deterministicReport);

  if (!args.modelConfig.enableLlmMarkdown) {
    return {
      markdown: fallbackMarkdown,
      source: "fallback",
      model: args.modelConfig.model,
      durationMs: Date.now() - startedAt,
      inputTokenEstimate,
    };
  }

  try {
    const openAiResponse = await fetchMarkdownContent(`${args.modelConfig.gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      headers: args.modelConfig.headers,
      body: JSON.stringify({
        model: args.modelConfig.model,
        response_format: "markdown",
        strict_json: false,
        temperature: 0.2,
        top_p: 0.75,
        max_tokens: 2600,
        num_predict: 2600,
        options: {
          temperature: 0.2,
          top_p: 0.75,
          repeat_penalty: 1.08,
          num_ctx: 8192,
          num_predict: 2600,
          stop: ["```"],
        },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    }, args.modelConfig.timeoutMs);

    let response = openAiResponse;
    if (!openAiResponse.ok && shouldTryNativeChat(openAiResponse.status)) {
      response = await fetchMarkdownContent(
        nativeChatUrlFromGateway(args.modelConfig.gatewayBaseUrl),
        nativeChatRequest(prompt, args.modelConfig.headers),
        args.modelConfig.timeoutMs,
      );
    }

    if (!response.ok && shouldTryNativeChat(response.status) && !isAi2Url(args.modelConfig.gatewayBaseUrl)) {
      response = await fetchMarkdownContent(
        ai2DirectChatUrl,
        nativeChatRequest(prompt, args.modelConfig.headers),
        args.modelConfig.timeoutMs,
      );
    }

    if (!response.ok) {
      throw new Error(`Local AI markdown report failed at the gateway (${response.status}).`);
    }

    const markdown = sanitizeMarkdown(response.markdown, args.payload);
    return {
      markdown,
      source: "llm",
      model: args.modelConfig.model,
      durationMs: Date.now() - startedAt,
      inputTokenEstimate,
    };
  } catch (error) {
    return {
      markdown: fallbackMarkdown,
      source: "fallback",
      model: args.modelConfig.model,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Markdown report generation failed.",
      inputTokenEstimate,
    };
  }
}
