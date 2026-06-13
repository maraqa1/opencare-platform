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
  return value.map((item) => textValue(item)).filter(Boolean);
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
    executiveSummary: textValue(report.executiveSummary),
    headlineAssessment: textValue(report.headlineAssessment),
    readinessThesis: textValue(report.readinessThesis),
    boardMessage: textValue(report.boardMessage),
    boardAsks: stringList(report.boardAsks),
    gartnerPillarAssessment: stringList(report.gartnerPillarAssessment),
    materialFindings: stringList(report.materialFindings),
    domainActionPlan: stringList(report.domainActionPlan),
    priorityGapRegister: stringList(report.priorityGapRegister),
    recommendedDecisions: stringList(report.recommendedDecisions),
    ninetyDayPlan: stringList(report.ninetyDayPlan),
    roadmapPhases: stringList(report.roadmapPhases),
    aiReadinessGate: textValue(report.aiReadinessGate),
    aiGateProceed: stringList(report.aiGateProceed),
    aiGatePilotWithControls: stringList(report.aiGatePilotWithControls),
    aiGateHold: stringList(report.aiGateHold),
    risks: stringList(report.risks),
    nextSteps: stringList(report.nextSteps),
  };
}

function localAiErrorMessage(body: LocalAiChatResponse, status: number) {
  return (
    body.error?.message ||
    body.detail ||
    body.message ||
    `Local AI report generation failed at the gateway (${status}).`
  );
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
  const gatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL ?? "http://local-ai-gateway:8080/v1").replace(/\/+$/, "");
  const apiKey = process.env.LOCAL_AI_API_KEY ?? "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(`${gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
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
                "Structure the narrative like an executive deck: cover message, KPI scorecard interpretation, headline assessment, board asks, heatmap interpretation, action plan, gap register, 90-day roadmap, AI readiness gate, and next steps.",
                "When Gartner pillar data is supplied, include a Gartner-aligned 7-pillar assessment that names the weakest pillars and converts them into board-level actions.",
                "Use evidence language carefully: if evidence is weak or missing, call the score provisional.",
                "AI readiness rule: proceed only with governed descriptive diagnostics and human-approved AI reporting unless data quality, privacy, lineage, and model-risk controls are sufficient.",
              ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate a consulting-grade Data and AI capability diagnostic report narrative that can populate a board-pack style report page.",
              contextInstructions:
                "Use customerContext.customerName as the client name. Use customerContext.businessDomain and operatingScope to make the recommendations domain-specific. If a context field is blank, state that the report needs that context rather than guessing it. Frame recommendations in the language of the intended audience and report purpose.",
              scoringScale: "0 to 4 maturity scale; 4 is the maximum score.",
              requiredShape: {
                executiveSummary: "One concise paragraph stating overall maturity, confidence/evidence posture, and executive implication.",
                headlineAssessment: "One board-ready paragraph explaining what the maturity profile means for the customer's business domain.",
                readinessThesis: "One clear AI readiness thesis: what can proceed, what must be gated, and why.",
                boardMessage: "One sentence suitable for a steering committee slide.",
                boardAsks: [
                  "Approve baseline - one sentence",
                  "Assign owners - one sentence",
                  "Gate use cases - one sentence",
                ],
                gartnerPillarAssessment: ["5-7 bullets; each names a Gartner pillar, score pattern, implication, and management action"],
                materialFindings: ["5-7 bullets; highest-signal findings only"],
                domainActionPlan: ["5-8 bullets; domain | score/gap signal | recommended action"],
                priorityGapRegister: ["5-8 bullets; gap | domain | evidence posture | required action"],
                recommendedDecisions: ["4-6 decisions required from leadership"],
                ninetyDayPlan: ["3 bullets: Days 0-30, Days 31-60, Days 61-90"],
                roadmapPhases: ["3 phase statements with accountable management intent"],
                aiReadinessGate: "One paragraph summarising proceed / pilot with controls / hold posture.",
                aiGateProceed: ["2-4 use-case categories that can proceed with human approval"],
                aiGatePilotWithControls: ["2-4 use-case categories that require controls before pilot"],
                aiGateHold: ["2-4 use-case categories that should not proceed yet"],
                risks: ["5-7 risks with management consequence and mitigation"],
                nextSteps: ["3 immediate next steps for the next steering session"],
              },
              diagnostic: payload,
            }),
          },
        ],
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to reach the local AI gateway from the portal server.",
      },
      { status: 502 },
    );
  }

  let body: LocalAiChatResponse;
  try {
    body = (await response.json()) as LocalAiChatResponse;
  } catch {
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
      },
      { status: response.status },
    );
  }

  const content = body.choices?.[0]?.message?.content ?? "{}";
  try {
    return NextResponse.json({
      status: "ready",
      report: normaliseReport(JSON.parse(content)),
      model,
    });
  } catch {
    return NextResponse.json({
      status: "ready",
      report: normaliseReport({
        executiveSummary: content,
        boardMessage: "Generated as narrative text because the model response was not JSON.",
        headlineAssessment: "",
        readinessThesis: "",
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
      }),
      model,
    });
  }
}
