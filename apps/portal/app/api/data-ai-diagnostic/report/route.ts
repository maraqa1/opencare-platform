import { NextResponse } from "next/server";

type DiagnosticReportRequest = {
  customerContext?: {
    customerName?: string;
    businessDomain?: string;
    operatingScope?: string;
    strategicPriorities?: string;
    currentPainPoints?: string;
    targetAudience?: string;
    reportPurpose?: string;
  };
  overallScore: number | null;
  overallGap: number | null;
  scoredQuestions: number;
  totalQuestions: number;
  evidenceBackedItems: number;
  topGapDomains: Array<{
    nameEn: string;
    avgScore: number | null;
    avgGap: number | null;
    scored: number;
    total: number;
  }>;
  strongestDomains: Array<{
    nameEn: string;
    avgScore: number | null;
    scored: number;
    total: number;
  }>;
  gartnerPillars?: Array<{
    name: string;
    score: number | null;
    gap: number | null;
    priority: string;
    scored: number;
    total: number;
    evidenceCoveragePct: number;
    mappedDomains: string[];
    decisionQuestion: string;
    managementAction: string;
  }>;
  priorityGaps: Array<{
    question: string;
    domain: string;
    score: number | null;
    gap: number | null;
    evidenceStrength: string;
    actionPlan: string;
  }>;
};

type LocalAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
  detail?: string;
  message?: string;
};

const fallbackModel = "llama3.2:3b";
const defaultGatewayTimeoutMs = 180000;

class LocalAiTimeoutError extends Error {
  constructor() {
    super("Local AI gateway timed out.");
    this.name = "LocalAiTimeoutError";
  }
}

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => cleanReportText(textValue(item))).filter(Boolean);
}

function cleanReportText(value: string) {
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normaliseReport(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      executiveSummary: textValue(value),
      headlineAssessment: "",
      readinessThesis: "",
      boardMessage: "",
      boardAsks: [],
      gartnerPillarAssessment: [],
      materialFindings: [],
      domainActionPlan: [],
      priorityGapRegister: [],
      recommendedDecisions: [],
      ninetyDayPlan: [],
      roadmapPhases: [],
      aiReadinessGate: "",
      aiGateProceed: [],
      aiGatePilotWithControls: [],
      aiGateHold: [],
      risks: [],
      nextSteps: [],
    };
  }
  const report = value as Record<string, unknown>;
  return {
    executiveSummary: cleanReportText(textValue(report.executiveSummary)),
    headlineAssessment: cleanReportText(textValue(report.headlineAssessment)),
    readinessThesis: cleanReportText(textValue(report.readinessThesis)),
    boardMessage: cleanReportText(textValue(report.boardMessage)),
    boardAsks: stringList(report.boardAsks),
    gartnerPillarAssessment: stringList(report.gartnerPillarAssessment),
    materialFindings: stringList(report.materialFindings),
    domainActionPlan: stringList(report.domainActionPlan),
    priorityGapRegister: stringList(report.priorityGapRegister),
    recommendedDecisions: stringList(report.recommendedDecisions),
    ninetyDayPlan: stringList(report.ninetyDayPlan),
    roadmapPhases: stringList(report.roadmapPhases),
    aiReadinessGate: cleanReportText(textValue(report.aiReadinessGate)),
    aiGateProceed: stringList(report.aiGateProceed),
    aiGatePilotWithControls: stringList(report.aiGatePilotWithControls),
    aiGateHold: stringList(report.aiGateHold),
    risks: stringList(report.risks),
    nextSteps: stringList(report.nextSteps),
  };
}

function isCompleteReport(report: ReturnType<typeof normaliseReport>) {
  return Boolean(
    report.executiveSummary &&
    report.headlineAssessment &&
    report.readinessThesis &&
    report.boardMessage &&
    report.boardAsks.length >= 3 &&
    report.materialFindings.length >= 3 &&
    report.domainActionPlan.length >= 3 &&
    report.recommendedDecisions.length >= 3 &&
    report.ninetyDayPlan.length >= 3 &&
    report.aiGateProceed.length >= 2 &&
    report.aiGatePilotWithControls.length >= 2 &&
    report.aiGateHold.length >= 2 &&
    report.nextSteps.length >= 3
  );
}

function completeReport(value: unknown, payload: DiagnosticReportRequest, reason: string) {
  const deterministic = normaliseReport(buildDeterministicReport(payload, reason));
  const generated = normaliseReport(value);
  const pickList = (
    generatedList: string[],
    deterministicList: string[],
    minimumLength: number,
  ) => generatedList.length >= minimumLength ? generatedList : deterministicList;

  return {
    executiveSummary: deterministic.executiveSummary,
    headlineAssessment: generated.headlineAssessment || deterministic.headlineAssessment,
    readinessThesis: deterministic.readinessThesis,
    boardMessage: generated.boardMessage || deterministic.boardMessage,
    boardAsks: pickList(generated.boardAsks, deterministic.boardAsks, 3),
    gartnerPillarAssessment: pickList(generated.gartnerPillarAssessment, deterministic.gartnerPillarAssessment, 3),
    materialFindings: pickList(generated.materialFindings, deterministic.materialFindings, 3),
    domainActionPlan: pickList(generated.domainActionPlan, deterministic.domainActionPlan, 3),
    priorityGapRegister: pickList(generated.priorityGapRegister, deterministic.priorityGapRegister, 3),
    recommendedDecisions: pickList(generated.recommendedDecisions, deterministic.recommendedDecisions, 3),
    ninetyDayPlan: pickList(generated.ninetyDayPlan, deterministic.ninetyDayPlan, 3),
    roadmapPhases: pickList(generated.roadmapPhases, deterministic.roadmapPhases, 3),
    aiReadinessGate: deterministic.aiReadinessGate,
    aiGateProceed: pickList(generated.aiGateProceed, deterministic.aiGateProceed, 2),
    aiGatePilotWithControls: pickList(generated.aiGatePilotWithControls, deterministic.aiGatePilotWithControls, 2),
    aiGateHold: pickList(generated.aiGateHold, deterministic.aiGateHold, 2),
    risks: pickList(generated.risks, deterministic.risks, 3),
    nextSteps: pickList(generated.nextSteps, deterministic.nextSteps, 3),
  };
}

function extractJsonPayload(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new SyntaxError("Model response did not contain valid report JSON.");
  }
}

function contextLabel(payload: DiagnosticReportRequest, key: keyof NonNullable<DiagnosticReportRequest["customerContext"]>, fallback: string) {
  const value = payload.customerContext?.[key]?.trim();
  return value || fallback;
}

function formatScore(value: number | null) {
  return value === null ? "not scored" : value.toFixed(1);
}

function gapDomainNames(payload: DiagnosticReportRequest) {
  return payload.topGapDomains
    .slice(0, 4)
    .map((domain) => domain.nameEn)
    .filter(Boolean);
}

function buildDeterministicReport(payload: DiagnosticReportRequest, reason: string) {
  const client = contextLabel(payload, "customerName", "the organisation");
  const domain = contextLabel(payload, "businessDomain", "the stated business domain");
  const scope = contextLabel(payload, "operatingScope", "the assessed operating scope");
  const audience = contextLabel(payload, "targetAudience", "the executive audience");
  const priorities = contextLabel(payload, "strategicPriorities", "the stated strategic priorities");
  const painPoints = contextLabel(payload, "currentPainPoints", "the stated operating pain points");
  const score = formatScore(payload.overallScore);
  const evidencePct = payload.totalQuestions > 0
    ? Math.round((payload.evidenceBackedItems / payload.totalQuestions) * 100)
    : null;
  const readinessPct = payload.overallScore === null ? null : Math.round((payload.overallScore / 4) * 100);
  const gaps = gapDomainNames(payload);
  const weakest = gaps.length > 0 ? gaps.join(", ") : "the lowest-scoring domains";
  const gartnerActions = (payload.gartnerPillars ?? [])
    .slice()
    .sort((left, right) => (right.gap ?? -1) - (left.gap ?? -1))
    .slice(0, 4)
    .map((pillar) => `${pillar.name}: ${pillar.priority} priority - ${pillar.managementAction}`);
  const priorityGapActions = payload.priorityGaps
    .slice(0, 5)
    .map((gap) => `${gap.domain}: ${gap.question} - ${gap.actionPlan || "assign an owner and remediation action"}`);

  return {
    executiveSummary:
      `${client} is assessed at ${score} / 4 maturity across ${payload.scoredQuestions}/${payload.totalQuestions} scored questions for ${domain}. The evidence posture is ${evidencePct === null ? "not calculated" : `${evidencePct}% evidence-backed`}, with material gaps concentrated in ${weakest}. The immediate executive implication is to treat the baseline as decision-useful but provisional where evidence is incomplete, then move quickly from assessment to owned remediation.`,
    headlineAssessment:
      `The diagnostic indicates an early-stage capability profile for ${scope}. Current priorities are ${priorities}, but the operating pain points - ${painPoints} - show that governance, ownership, evidence quality, and roadmap discipline need to be strengthened before advanced AI use cases are scaled.`,
    readinessThesis:
      `Proceed with governed descriptive diagnostics, dashboard rationalisation, and human-approved AI reporting. Pilot predictive or generative use cases only where source quality, privacy, lineage, ownership, and model-risk controls are evidenced. Hold autonomous decisioning and sensitive AI workflows until the control environment is certified.`,
    boardMessage:
      `${audience} should approve the diagnostic baseline, assign accountable owners for the highest gaps, and gate AI use cases through evidence-backed readiness controls.`,
    boardAsks: [
      "Approve baseline: confirm the diagnostic as the working baseline for data and AI capability improvement.",
      "Assign owners: nominate accountable owners for the priority domains and unresolved evidence gaps.",
      "Gate use cases: require every AI candidate to show data quality, privacy, lineage, and owner sign-off before pilot approval.",
    ],
    gartnerPillarAssessment: gartnerActions.length > 0 ? gartnerActions : [
      "Strategy and value: confirm the data ambition and business outcomes before prioritising initiatives.",
      "Governance and operating model: assign decision rights, data owners, and issue escalation routes.",
      "Data management foundations: certify definitions, lineage, quality controls, and evidence before AI scaling.",
    ],
    materialFindings: [
      `Overall maturity is ${score} / 4, indicating that the organisation is not yet operating at a controlled, repeatable data capability level.`,
      `Evidence coverage is ${evidencePct === null ? "not available" : `${evidencePct}%`}; unevidenced responses should be validated before board approval.`,
      `Priority gaps are concentrated in ${weakest}, which should drive the first remediation backlog.`,
      `The current readiness score is ${readinessPct === null ? "not available" : `${readinessPct}%`}, so AI adoption should be gated rather than broad-based.`,
    ],
    domainActionPlan: payload.topGapDomains.slice(0, 5).map((gap) =>
      `${gap.nameEn}: score ${formatScore(gap.avgScore)} / 4 - assign owner, confirm evidence, define target state, and add remediation milestones.`,
    ),
    priorityGapRegister: priorityGapActions,
    recommendedDecisions: [
      "Confirm the diagnostic baseline and evidence exceptions in the next steering session.",
      "Approve a 90-day remediation backlog focused on ownership, data quality, metadata, lineage, and roadmap controls.",
      "Nominate a data governance sponsor and working group to certify definitions, sources, and reports.",
      "Gate AI pilots until each candidate has an owner, approved data source, privacy review, and measurable success criteria.",
    ],
    ninetyDayPlan: [
      "Days 0-30: mobilise governance, validate evidence, confirm owners, and lock the priority gap register.",
      "Days 31-60: close critical data quality, metadata, lineage, and reporting control gaps.",
      "Days 61-90: certify AI-ready use cases, approve the roadmap, and prepare the DMO operating model inputs.",
    ],
    roadmapPhases: [
      "Mobilise and validate: turn the diagnostic into an approved baseline and owner map.",
      "Remediate and certify: close critical evidence, quality, and governance gaps.",
      "Scale with controls: sequence initiatives and AI use cases through readiness gates.",
    ],
    aiReadinessGate:
      "AI should be handled through a controlled gate. Descriptive reporting and AI-assisted report drafting may proceed with human approval; forecasting, classification, and summarisation require confirmed controls; autonomous decisions and sensitive generative workflows should be held.",
    aiGateProceed: [
      "Management dashboards and evidence-backed diagnostic reporting with accountable owners.",
      "AI-assisted report drafting where outputs are reviewed and approved by humans.",
    ],
    aiGatePilotWithControls: [
      "Forecasting and classification where data quality, privacy, and lineage are confirmed.",
      "Summarisation of approved evidence packs with audit trail and owner sign-off.",
    ],
    aiGateHold: [
      "Autonomous decisions affecting services, finance, compliance, or people.",
      "Sensitive generative AI workflows without source controls, audit trail, or accountable approval.",
    ],
    risks: [
      "Evidence risk: provisional scores may be challenged unless supporting evidence is captured and certified.",
      "Ownership risk: gaps will persist if data owners and remediation owners are not formally assigned.",
      "AI risk: premature use-case scaling could create unreliable outputs if quality and privacy controls are weak.",
      "Delivery risk: roadmap benefits may not materialise without sequencing, funding, and governance cadence.",
    ],
    nextSteps: [
      "Review and approve the diagnostic baseline with the steering group.",
      "Convert the top gaps into a prioritised 90-day action backlog.",
      "Use the diagnostic handoff as the evidence input for the Data Strategy Builder module.",
    ],
    fallbackReason: reason,
  };
}

function deterministicReportResponse(payload: DiagnosticReportRequest, model: string, reason: string) {
  return NextResponse.json({
    status: "ready",
    report: normaliseReport(buildDeterministicReport(payload, reason)),
    model: `${model} - deterministic advisory fallback`,
    fallback: true,
    message: reason,
  });
}

function localAiErrorMessage(body: LocalAiChatResponse, status: number) {
  return (
    body.error?.message ||
    body.detail ||
    body.message ||
    `Local AI report generation failed at the gateway (${status}).`
  );
}

function isAbortError(error: unknown) {
  return error instanceof LocalAiTimeoutError || (error instanceof DOMException && error.name === "AbortError");
}

export async function POST(request: Request) {
  let payload: DiagnosticReportRequest;
  try {
    payload = (await request.json()) as DiagnosticReportRequest;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid report request payload.",
      },
      { status: 400 },
    );
  }
  const model = process.env.LOCAL_AI_MODEL ?? fallbackModel;
  const configuredGatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL ?? "http://local-ai-gateway:8080/v1").replace(/\/+$/, "");
  const gatewayBaseUrl = configuredGatewayBaseUrl.endsWith("/v1")
    ? configuredGatewayBaseUrl
    : `${configuredGatewayBaseUrl}/v1`;
  const apiKey = process.env.LOCAL_AI_API_KEY ?? "";
  const configuredTimeoutMs = Number(process.env.LOCAL_AI_REPORT_TIMEOUT_MS ?? defaultGatewayTimeoutMs);
  const gatewayTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : defaultGatewayTimeoutMs;
  const abortController = new AbortController();
  let rejectOnTimeout: ((reason?: unknown) => void) | null = null;
  const gatewayDeadline = new Promise<never>((_, reject) => {
    rejectOnTimeout = reject;
  });
  const timeout = setTimeout(() => {
    abortController.abort();
    rejectOnTimeout?.(new LocalAiTimeoutError());
  }, gatewayTimeoutMs);
  const clearGatewayTimeout = () => {
    clearTimeout(timeout);
    rejectOnTimeout = null;
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  const reportDiagnostic = {
    ...payload,
    topGapDomains: payload.topGapDomains.slice(0, 6),
    strongestDomains: payload.strongestDomains.slice(0, 3),
    gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
    priorityGaps: payload.priorityGaps.slice(0, 6),
  };

  let response: Response;
  try {
    response = await Promise.race([
      fetch(`${gatewayBaseUrl}/chat/completions`, {
        method: "POST",
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 900,
          messages: [
            {
              role: "system",
              content:
                [
                  "You are a senior data and AI strategy consultant preparing a consulting-grade executive diagnostic report.",
                  "Return only valid JSON. Do not include Markdown fences.",
                  "Tailor every paragraph to the supplied customer name, business domain, operating scope, priorities, pain points, report audience, and report purpose.",
                  "Never mention fixed sample customers, sample acronyms, or advisory-firm names unless those exact words are supplied in customerContext.",
                  "Do not invent customer facts, dates, evidence counts, domain scores, or metrics beyond the supplied diagnostic payload.",
                  "The maturity scoring scale is 0 to 4, where 4 is maximum maturity.",
                  "Use a board-ready tone: direct, evidence-led, action-oriented, and specific enough for a steering committee.",
                  "Keep the response concise enough for a first-pass executive report. Prefer short paragraphs and compact bullets.",
                  "When Gartner pillar data is supplied, include the weakest pillars and convert them into management actions.",
                  "Use evidence language carefully: if evidence is weak or missing, call the score provisional.",
                  "AI readiness rule: proceed only with governed descriptive diagnostics and human-approved AI reporting unless data quality, privacy, lineage, and model-risk controls are sufficient.",
                ].join(" "),
            },
            {
              role: "user",
              content: JSON.stringify({
                task: "Generate a concise consulting-grade Data and AI capability diagnostic report narrative for a board-pack page.",
                contextInstructions:
                  "Use customerContext.customerName as the client name. Use customerContext.businessDomain and operatingScope to make the recommendations domain-specific. If a context field is blank, state that the report needs that context rather than guessing it. Frame recommendations in the language of the intended audience and report purpose.",
                scoringScale: "0 to 4 maturity scale; 4 is the maximum score.",
                requiredShape: {
                  executiveSummary: "One concise paragraph stating maturity, evidence posture, and executive implication.",
                  headlineAssessment: "One short board-ready paragraph explaining the maturity profile.",
                  readinessThesis: "One short AI readiness thesis: proceed, pilot with controls, and hold.",
                  boardMessage: "One sentence suitable for a steering committee slide.",
                  boardAsks: [
                    "Approve baseline - one sentence",
                    "Assign owners - one sentence",
                    "Gate use cases - one sentence",
                  ],
                  gartnerPillarAssessment: ["3-4 bullets; pillar | implication | management action"],
                  materialFindings: ["3-4 bullets; highest-signal findings only"],
                  domainActionPlan: ["3-5 bullets; domain | signal | action"],
                  priorityGapRegister: ["3-5 bullets; gap | domain | evidence | action"],
                  recommendedDecisions: ["3-4 decisions required from leadership"],
                  ninetyDayPlan: ["3 bullets: Days 0-30, Days 31-60, Days 61-90"],
                  roadmapPhases: ["3 short phase statements"],
                  aiReadinessGate: "One short paragraph summarising proceed / pilot / hold posture.",
                  aiGateProceed: ["2 use-case categories that can proceed with human approval"],
                  aiGatePilotWithControls: ["2 use-case categories that require controls before pilot"],
                  aiGateHold: ["2 use-case categories that should not proceed yet"],
                  risks: ["3-4 risks with management consequence and mitigation"],
                  nextSteps: ["3 immediate next steps for the next steering session"],
                },
                diagnostic: reportDiagnostic,
              }),
            },
          ],
        }),
        cache: "no-store",
      }),
      gatewayDeadline,
    ]);
  } catch (error) {
    clearGatewayTimeout();
    if (isAbortError(error)) {
      return deterministicReportResponse(
        reportDiagnostic,
        model,
        `Local AI report generation timed out after ${Math.round(gatewayTimeoutMs / 1000)} seconds. A deterministic advisory fallback was generated from the captured diagnostic evidence.`,
      );
    }
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to reach the local AI gateway from the portal server.",
        details: [error instanceof Error ? error.message : "Unknown local AI gateway connection error."],
        model,
        gateway: gatewayBaseUrl,
      },
      { status: 502 },
    );
  }

  let body: LocalAiChatResponse;
  try {
    body = (await Promise.race([response.json(), gatewayDeadline])) as LocalAiChatResponse;
    clearGatewayTimeout();
  } catch (error) {
    clearGatewayTimeout();
    if (isAbortError(error)) {
      return deterministicReportResponse(
        reportDiagnostic,
        model,
        `Local AI report generation timed out after ${Math.round(gatewayTimeoutMs / 1000)} seconds while reading the model response. A deterministic advisory fallback was generated from the captured diagnostic evidence.`,
      );
    }
    return NextResponse.json(
      {
        status: "error",
        message: `Local AI gateway returned a non-JSON response (${response.status}).`,
      },
      { status: response.status },
    );
  }
  if (!response.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: localAiErrorMessage(body, response.status),
        details: [
          `Gateway: ${gatewayBaseUrl}`,
          `Chat completions URL: ${gatewayBaseUrl}/chat/completions`,
          `Model: ${model}`,
          `Gateway status: ${response.status}`,
        ],
      },
      { status: response.status },
    );
  }

  const content = body.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsedReport = extractJsonPayload(content);
    const report = completeReport(
      parsedReport,
      reportDiagnostic,
      "Local AI generated a structured advisory report. Evidence-critical sections were normalised against the captured diagnostic payload.",
    );
    return NextResponse.json({
      status: "ready",
      report,
      model,
      repaired: !isCompleteReport(normaliseReport(parsedReport)),
    });
  } catch (error) {
    return deterministicReportResponse(
      reportDiagnostic,
      model,
      [
        "Local AI returned narrative text instead of the required JSON report schema.",
        "A complete deterministic advisory report was generated from the captured diagnostic evidence.",
        error instanceof Error ? error.message : "Invalid local AI report payload.",
      ].join(" "),
    );
  }
}
