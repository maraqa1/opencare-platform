import type { DiagnosticReportRequest, GeneratedConsultingReport } from "@/lib/deterministicReportBuilders";
import { contextLabel, evidenceCoveragePct, formatScore } from "@/lib/deterministicReportBuilders";
import { estimateTokens } from "@/lib/mistralNemoInteractionPolicy";

type GenerateMarkdownReportArgs = {
  payload: DiagnosticReportRequest;
  deterministicReport: GeneratedConsultingReport;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs: number;
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
    "You are writing a consulting-grade executive report in Markdown.",
    "",
    "Return Markdown only.",
    "Do not return JSON.",
    "Do not wrap the answer in a code fence.",
    "Do not include commentary before or after the report.",
    "Use only the supplied facts.",
    "Do not invent client facts, regulations, scores, dates, obligations, or source systems.",
    "Use a premium consulting tone: concise, board-ready, specific, and action-oriented.",
    "Write around 900 to 1200 words.",
    "",
    "Required Markdown structure:",
    "# Data & AI Capability Diagnostic",
    "## Executive summary",
    "## Readiness position and management attention",
    "## Board decisions required",
    "## Material findings",
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

function sanitizeMarkdown(raw: string) {
  let markdown = raw
    .replace(/```(?:markdown|md)?/gi, "")
    .replace(/```/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  const firstHeading = markdown.search(/^#\s+/m);
  if (firstHeading > 0) {
    markdown = markdown.slice(firstHeading).trim();
  }

  if (!markdown.startsWith("#")) {
    throw new Error("Markdown report did not start with a report heading.");
  }
  if (markdown.includes("{") && markdown.includes("}")) {
    throw new Error("Markdown report contains JSON-like output.");
  }
  if (markdown.length < 700) {
    throw new Error("Markdown report is too short to use as an executive report.");
  }

  return markdown;
}

async function readMarkdownResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      answer?: string;
      content?: string;
      message?: string;
    };
    return body.choices?.[0]?.message?.content
      ?? body.choices?.[0]?.text
      ?? body.answer
      ?? body.content
      ?? body.message
      ?? "";
  }
  return response.text();
}

export async function generateMarkdownReport(args: GenerateMarkdownReportArgs): Promise<MarkdownReportGeneration> {
  const prompt = buildMarkdownPrompt(args.payload);
  const inputTokenEstimate = estimateTokens(prompt);
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), args.modelConfig.timeoutMs);
  const fallbackMarkdown = buildDeterministicMarkdown(args.payload, args.deterministicReport);

  try {
    const response = await fetch(`${args.modelConfig.gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      headers: args.modelConfig.headers,
      signal: abortController.signal,
      body: JSON.stringify({
        model: args.modelConfig.model,
        response_format: "markdown",
        strict_json: false,
        temperature: 0.2,
        top_p: 0.75,
        max_tokens: 1600,
        num_predict: 1600,
        options: {
          temperature: 0.2,
          top_p: 0.75,
          repeat_penalty: 1.08,
          num_ctx: 8192,
          num_predict: 1600,
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
    });

    if (!response.ok) {
      throw new Error(`Local AI markdown report failed at the gateway (${response.status}).`);
    }

    const markdown = sanitizeMarkdown(await readMarkdownResponse(response));
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
  } finally {
    clearTimeout(timeout);
  }
}
