import { NextResponse } from "next/server";

type DiagnosticReportRequest = {
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
              "You are a senior data and AI strategy consultant. Return only valid JSON. Write concise, board-ready report language. Do not invent metrics beyond the supplied diagnostic payload. The maturity scoring scale is 0 to 4, where 4 is the maximum maturity score.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate a consulting-grade Data and AI capability diagnostic report narrative.",
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
      report: JSON.parse(content),
      model,
    });
  } catch {
    return NextResponse.json({
      status: "ready",
      report: {
        executiveSummary: content,
        boardMessage: "Generated as narrative text because the model response was not JSON.",
        materialFindings: [],
        recommendedDecisions: [],
        ninetyDayPlan: [],
        aiReadinessGate: "",
        risks: [],
      },
      model,
    });
  }
}
