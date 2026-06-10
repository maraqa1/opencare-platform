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

  const payload = (await request.json()) as DiagnosticReportRequest;
  const model = process.env.OPENAI_MODEL ?? fallbackModel;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

  const body = (await response.json()) as OpenAiChatResponse;
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
