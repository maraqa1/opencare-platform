import { NextResponse } from "next/server";

import { assembleDiagnosticReport } from "@/lib/reportAssembler";
import type { DiagnosticReportRequest } from "@/lib/deterministicReportBuilders";

const fallbackModel = "mistral-nemo:12b";
const defaultGatewayTimeoutMs = 180000;
const defaultFieldTimeoutMs = 30000;
const defaultEnrichmentConcurrency = 1;
const defaultMaxFieldWords = 120;

function normaliseGatewayBaseUrl(value: string) {
  const configured = value.replace(/\/+$/, "");
  return configured.endsWith("/v1") ? configured : `${configured}/v1`;
}

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function reportModeEnv() {
  const value = process.env.LOCAL_LLM_REPORT_MODE;
  if (value === "deterministic" || value === "narrative_enrichment" || value === "json_section") {
    return value;
  }
  return "narrative_enrichment";
}

function trimPayload(payload: DiagnosticReportRequest): DiagnosticReportRequest {
  return {
    ...payload,
    topGapDomains: payload.topGapDomains.slice(0, 6),
    strongestDomains: payload.strongestDomains.slice(0, 3),
    gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
    priorityGaps: payload.priorityGaps.slice(0, 10),
  };
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

  const model = process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_AI_MODEL ?? fallbackModel;
  const gatewayBaseUrl = normaliseGatewayBaseUrl(process.env.AI_GATEWAY_BASE_URL ?? "http://local-ai-gateway:8080/v1");
  const apiKey = process.env.LOCAL_AI_API_KEY ?? "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  const gatewayTimeoutMs = numberEnv("LOCAL_AI_REPORT_TIMEOUT_MS", defaultGatewayTimeoutMs);
  const fieldTimeoutMs = Math.min(numberEnv("LOCAL_LLM_FIELD_TIMEOUT_MS", defaultFieldTimeoutMs), gatewayTimeoutMs);
  const concurrency = Math.max(
    1,
    Math.min(numberEnv("LOCAL_LLM_ENRICHMENT_CONCURRENCY", defaultEnrichmentConcurrency), 2),
  );
  const maxFieldWords = Math.max(40, Math.min(numberEnv("LOCAL_LLM_MAX_FIELD_WORDS", defaultMaxFieldWords), 180));
  const reportMode = reportModeEnv();
  const enableFieldEnrichment = booleanEnv("LOCAL_LLM_ENABLE_FIELD_ENRICHMENT", true);

  if (reportMode === "json_section") {
    return NextResponse.json(
      {
        status: "error",
        message: "json_section mode is disabled for mistral-nemo:12b in production. Use narrative_enrichment or deterministic.",
      },
      { status: 400 },
    );
  }

  try {
    const assembled = await assembleDiagnosticReport(trimPayload(payload), {
      gatewayBaseUrl,
      headers,
      model,
      reportMode,
      enableFieldEnrichment,
      fieldTimeoutMs,
      maxFieldWords,
      concurrency,
    });

    return NextResponse.json({
      status: "ready",
      report: assembled.report,
      structuredReport: assembled.structuredReport,
      model,
      repaired: assembled.fallbackFields.length > 0,
      fallback: assembled.generationMetadata.mode === "deterministic",
      fieldFallbacks: assembled.fallbackFields,
      enrichedFields: assembled.enrichedFields,
      generationMetadata: assembled.generationMetadata,
      message: assembled.fallbackFields.length > 0
        ? "Report JSON was built deterministically. Some optional narrative fields used deterministic fallback because local LLM enrichment was unavailable or invalid."
        : assembled.enrichedFields.length > 0
          ? "Report JSON was built deterministically and selected narrative fields were safely enriched by the local model."
          : "Report JSON was built deterministically without local model enrichment.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to assemble a valid diagnostic report.",
        details: [error instanceof Error ? error.message : "Unknown report assembly error."],
      },
      { status: 500 },
    );
  }
}
