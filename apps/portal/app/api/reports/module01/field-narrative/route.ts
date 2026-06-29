import { NextResponse } from "next/server";

import { generateModule01FieldNarrative } from "@/lib/module01/module01FieldNarrative";

const fallbackModel = "mistral-nemo:12b";
const defaultTimeoutMs = 30000;

function normaliseGatewayBaseUrl(value: string) {
  const configured = value.replace(/\/+$/, "");
  return configured.endsWith("/v1") ? configured : `${configured}/v1`;
}

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 8)
    : [];
}

function numberValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid field narrative payload." }, { status: 400 });
  }

  const field = payload.field;
  if (field !== "roadmapNarrative") {
    return NextResponse.json({ status: "error", message: "Unsupported Module 01 field narrative." }, { status: 400 });
  }

  const facts = textArray(payload.facts);
  if (!facts.length) {
    return NextResponse.json({ status: "error", message: "At least one fact is required." }, { status: 400 });
  }

  const model = process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_AI_MODEL ?? fallbackModel;
  const gatewayBaseUrl = normaliseGatewayBaseUrl(process.env.AI_GATEWAY_BASE_URL ?? "https://ai2.opendatalake.com/v1");
  const apiKey = process.env.LOCAL_AI_API_KEY ?? "";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const generation = await generateModule01FieldNarrative({
    field,
    facts,
    maxWords: Math.min(numberValue(payload.max_words, 80), 140),
    style: payload.style === "executive" ? "executive" : "board",
    fallbackText: typeof payload.fallback === "string" ? payload.fallback : facts.join(" "),
    modelConfig: {
      gatewayBaseUrl,
      headers,
      model,
      timeoutMs: numberValue(payload.timeout_ms, defaultTimeoutMs),
    },
  });

  return NextResponse.json({
    status: generation.status === "fallback" ? "fallback" : "ready",
    field,
    narrative: generation.text,
    generation,
  });
}
