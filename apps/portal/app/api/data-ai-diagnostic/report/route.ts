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
  priorityGaps: Array<{
    question: string;
    domain: string;
    score: number | null;
    gap: number | null;
    evidenceStrength: string;
    actionPlan: string;
  }>;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const fallbackModel = "gpt-4o-mini";

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
      boardMessage: "",
      materialFindings: [],
      recommendedDecisions: [],
      ninetyDayPlan: [],
      aiReadinessGate: "",
      risks: [],
    };
  }
  const report = value as Record<string, unknown>;
  return {
    executiveSummary: textValue(report.executiveSummary),
    boardMessage: textValue(report.boardMessage),
    materialFindings: stringList(report.materialFindings),
    recommendedDecisions: stringList(report.recommendedDecisions),
    ninetyDayPlan: stringList(report.ninetyDayPlan),
    aiReadinessGate: textValue(report.aiReadinessGate),
    risks: stringList(report.risks),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        status: "missing_key",
        message: "OPENAI_API_KEY is not configured for the portal server runtime.",
      },
      { status: 503 },
    );
  }

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
  const model = process.env.OPENAI_MODEL ?? fallbackModel;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior data and AI strategy consultant. Return only valid JSON. Write concise, board-ready report language. Tailor the report to the supplied customer, business domain, operating scope, priorities, pain points, audience, and report purpose. Do not invent customer facts or metrics beyond the supplied diagnostic payload. The maturity scoring scale is 0 to 4, where 4 is the maximum maturity score.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate a consulting-grade Data and AI capability diagnostic report narrative.",
              contextInstructions:
                "Use the customer context to make the report domain-specific. If a context field is blank, do not guess it. Frame recommendations in the language of the customer domain and intended audience.",
              scoringScale: "0 to 4 maturity scale; 4 is the maximum score.",
              requiredShape: {
                executiveSummary: "string",
                boardMessage: "string",
                materialFindings: ["string"],
                recommendedDecisions: ["string"],
                ninetyDayPlan: ["string"],
                aiReadinessGate: "string",
                risks: ["string"],
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
        message: "Unable to reach OpenAI from the portal server.",
      },
      { status: 502 },
    );
  }

  let body: OpenAiChatResponse;
  try {
    body = (await response.json()) as OpenAiChatResponse;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: `OpenAI returned a non-JSON response (${response.status}).`,
      },
      { status: response.status },
    );
  }
  if (!response.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: body.error?.message ?? "OpenAI report generation failed.",
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
        materialFindings: [],
        recommendedDecisions: [],
        ninetyDayPlan: [],
        aiReadinessGate: "",
        risks: [],
      }),
      model,
    });
  }
}
