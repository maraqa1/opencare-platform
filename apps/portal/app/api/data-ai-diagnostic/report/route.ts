import { NextResponse } from "next/server";

import { assembleDiagnosticReport } from "@/lib/reportAssembler";
import type { DiagnosticReportRequest } from "@/lib/deterministicReportBuilders";
import { generateMarkdownReport } from "@/lib/markdownReportGenerator";
import { getIndustryProfile, isIndustryProfileId } from "@/lib/module01/module01IndustryProfiles";
import { streamModule01Json } from "@/lib/module01/module01JsonStream";
import { normaliseFunctions, functionalQuestions, FUNCTION_CATALOGUE_VERSION } from "@/lib/module01/module01FunctionalDomains";

const fallbackModel = "mistral-nemo:12b";
const defaultGatewayTimeoutMs = 55000;
const defaultFieldTimeoutMs = 28000;
const defaultMarkdownReportTimeoutMs = 10000;
const defaultEnrichmentConcurrency = 2;
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

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normaliseReportPayload(raw: unknown): DiagnosticReportRequest {
  const payload = (raw ?? {}) as Record<string, unknown>;
  const topGapDomains = Array.isArray(payload.topGapDomains) ? payload.topGapDomains : [];
  const strongestDomains = Array.isArray(payload.strongestDomains) ? payload.strongestDomains : [];
  const gartnerPillars = Array.isArray(payload.gartnerPillars) ? payload.gartnerPillars : [];
  const priorityGaps = Array.isArray(payload.priorityGaps) ? payload.priorityGaps : [];
  let industryProfile: DiagnosticReportRequest["industryProfile"];
  if (payload.industryProfile !== undefined) {
    const profile = payload.industryProfile as Record<string, unknown> | null;
    if (!profile || !isIndustryProfileId(profile.id)) throw new Error("Invalid industry profile ID.");
    const canonical = getIndustryProfile(profile.id);
    if (profile.version !== canonical.version) throw new Error("Invalid industry profile version.");
    industryProfile = { id: canonical.id, version: canonical.version, labelEn: canonical.labelEn, labelAr: canonical.labelAr };
  }

  let selectedFunctions: string[] = [];
  if (payload.selectedFunctions !== undefined) {
    if (!industryProfile || !Array.isArray(payload.selectedFunctions)) throw new Error("Functional scope requires a valid industry and an array of function IDs.");
    selectedFunctions = normaliseFunctions(industryProfile.id, payload.selectedFunctions);
    if (selectedFunctions.length !== payload.selectedFunctions.length) throw new Error("Invalid or duplicate functional scope for the selected industry.");
    if (payload.functionCatalogueVersion !== FUNCTION_CATALOGUE_VERSION) throw new Error("Invalid functional catalogue version. Reload the assessment.");
  }
  const functionQuestionIds = new Set(industryProfile ? functionalQuestions(industryProfile.id, selectedFunctions).map((q) => q.id) : []);
  const seenFunctionQuestions = new Set<string>();
  for (const rawResponse of Array.isArray(payload.responses) ? payload.responses : []) {
    const id = rawResponse && typeof rawResponse === "object" ? rawResponse.questionId : undefined;
    if (typeof id !== "string" || !id.startsWith("fn_")) continue;
    if (!functionQuestionIds.has(id)) throw new Error("Functional response is outside the selected assessment scope.");
    if (seenFunctionQuestions.has(id)) throw new Error("Duplicate functional question response.");
    seenFunctionQuestions.add(id);
  }
  return {
    ...(industryProfile ? { industryProfile } : {}),
    selectedFunctions, functionCatalogueVersion: FUNCTION_CATALOGUE_VERSION,
    ...(Array.isArray(payload.responses) ? { responses: payload.responses } : {}),
    ...(payload.evidence !== undefined ? { evidence: payload.evidence } : {}),
    discovery: payload.discovery as DiagnosticReportRequest["discovery"],
    customerContext: payload.customerContext as DiagnosticReportRequest["customerContext"],
    overallScore: nullableNumber(payload.overallScore),
    overallGap: nullableNumber(payload.overallGap),
    scoredQuestions: finiteNumber(payload.scoredQuestions),
    totalQuestions: finiteNumber(payload.totalQuestions),
    evidenceBackedItems: finiteNumber(payload.evidenceBackedItems),
    evidenceStrengthCounts: payload.evidenceStrengthCounts as DiagnosticReportRequest["evidenceStrengthCounts"],
    evidenceWeightedConfidencePct: nullableNumber(payload.evidenceWeightedConfidencePct),
    topGapDomains: topGapDomains.map((entry) => {
      const domain = (entry ?? {}) as Record<string, unknown>;
      return {
        nameEn: textValue(domain.nameEn, textValue(domain.domain, "Unnamed domain")),
        avgScore: domain.avgScore === null ? null : nullableNumber(domain.avgScore ?? domain.score),
        avgGap: domain.avgGap === null ? null : nullableNumber(domain.avgGap ?? domain.gap),
        scored: finiteNumber(domain.scored),
        total: finiteNumber(domain.total),
      };
    }),
    strongestDomains: strongestDomains.map((entry) => {
      const domain = (entry ?? {}) as Record<string, unknown>;
      return {
        nameEn: textValue(domain.nameEn, textValue(domain.domain, "Unnamed domain")),
        avgScore: domain.avgScore === null ? null : nullableNumber(domain.avgScore ?? domain.score),
        scored: finiteNumber(domain.scored),
        total: finiteNumber(domain.total),
      };
    }),
    gartnerPillars: gartnerPillars.map((entry) => {
      const pillar = (entry ?? {}) as Record<string, unknown>;
      return {
        name: textValue(pillar.name, textValue(pillar.pillar, "Unnamed pillar")),
        score: nullableNumber(pillar.score),
        gap: nullableNumber(pillar.gap),
        priority: textValue(pillar.priority, "Needs review"),
        scored: finiteNumber(pillar.scored),
        total: finiteNumber(pillar.total),
        evidenceCoveragePct: finiteNumber(pillar.evidenceCoveragePct),
        mappedDomains: Array.isArray(pillar.mappedDomains)
          ? pillar.mappedDomains.filter((item): item is string => typeof item === "string")
          : [],
        decisionQuestion: textValue(pillar.decisionQuestion, "What decision is required?"),
        managementAction: textValue(pillar.managementAction, textValue(pillar.action, "Assign owner and confirm remediation action.")),
      };
    }),
    priorityGaps: priorityGaps.map((entry) => {
      const gap = (entry ?? {}) as Record<string, unknown>;
      return {
        question: textValue(gap.question, "Unspecified gap question"),
        domain: textValue(gap.domain, "Unspecified domain"),
        score: nullableNumber(gap.score),
        gap: nullableNumber(gap.gap),
        evidenceStrength: textValue(gap.evidenceStrength, textValue(gap.evidence, "Not supplied")),
        actionPlan: textValue(gap.actionPlan, textValue(gap.action, "Assign owner and confirm remediation action.")),
      };
    }),
  };
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
    payload = normaliseReportPayload(await request.json());
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
  const markdownTimeoutMs = Math.min(
    numberEnv("LOCAL_LLM_MARKDOWN_REPORT_TIMEOUT_MS", defaultMarkdownReportTimeoutMs),
    Math.max(gatewayTimeoutMs, defaultMarkdownReportTimeoutMs),
  );
  const concurrency = Math.max(
    1,
    Math.min(numberEnv("LOCAL_LLM_ENRICHMENT_CONCURRENCY", defaultEnrichmentConcurrency), 2),
  );
  const maxFieldWords = Math.max(40, Math.min(numberEnv("LOCAL_LLM_MAX_FIELD_WORDS", defaultMaxFieldWords), 180));
  const reportMode = reportModeEnv();
  const enableFieldEnrichment = booleanEnv("LOCAL_LLM_ENABLE_FIELD_ENRICHMENT", true);
  const enableLlmMarkdown = booleanEnv("LOCAL_LLM_ENABLE_MARKDOWN_GENERATION", false);

  if (reportMode === "json_section") {
    return NextResponse.json(
      {
        status: "error",
        message: "json_section mode is disabled for mistral-nemo:12b in production. Use narrative_enrichment or deterministic.",
      },
      { status: 400 },
    );
  }

  const streaming = request.headers.get("x-module01-stream") === "1";
  const run = async (signal?: AbortSignal) => {
   try {
    const trimmedPayload = trimPayload(payload);
    const assembled = await assembleDiagnosticReport(trimmedPayload, {
      gatewayBaseUrl,
      headers,
      model,
      reportMode,
      enableFieldEnrichment,
      fieldTimeoutMs: streaming ? Math.min(numberEnv("LOCAL_LLM_STREAM_FIELD_TIMEOUT_MS", 100000), 110000) : fieldTimeoutMs,
      maxFieldWords,
      concurrency: streaming ? 1 : concurrency,
      reportTimeoutMs: streaming ? 300000 : Math.max(1, Math.min(gatewayTimeoutMs, 55000) - (enableLlmMarkdown ? markdownTimeoutMs : 0)),
      signal,
    });
    const markdownReport = await generateMarkdownReport({
      payload: trimmedPayload,
      deterministicReport: assembled.report,
      modelConfig: {
        gatewayBaseUrl,
        headers,
        model,
        timeoutMs: markdownTimeoutMs,
        enableLlmMarkdown: enableLlmMarkdown && !signal?.aborted,
      },
    });
    const generationMetadata = {
      ...assembled.generationMetadata,
      markdownReport: {
        source: markdownReport.source,
        model: markdownReport.model,
        durationMs: markdownReport.durationMs,
        error: markdownReport.error,
        inputTokenEstimate: markdownReport.inputTokenEstimate,
      },
    };

    return NextResponse.json({
      status: "ready",
      report: assembled.report,
      structuredReport: assembled.structuredReport,
      markdownReport: markdownReport.markdown,
      markdownReportSource: markdownReport.source,
      markdownReportMetadata: generationMetadata.markdownReport,
      model,
      repaired: assembled.fallbackFields.length > 0 || markdownReport.source === "fallback",
      fallback: markdownReport.source === "fallback",
      fieldFallbacks: assembled.fallbackFields,
      enrichedFields: assembled.enrichedFields,
      generationMetadata,
      message: markdownReport.source === "llm"
        ? "AI2 generated the Markdown consulting report. Deterministic JSON was retained for validation and Module 02 handoff."
        : assembled.fallbackFields.length > 0
        ? `Report JSON was built deterministically. Optional narrative fallback fields: ${assembled.fallbackFields.join(", ")}.`
        : assembled.enrichedFields.length > 0
          ? "Report JSON was built deterministically and selected narrative fields were safely enriched by the local model."
          : markdownReport.error
            ? `Deterministic Markdown report generated locally after AI2 output validation. The portal retained a board-ready diagnostic report and ignored invalid model output. ${markdownReport.error}`.trim()
            : "Deterministic Markdown report generated locally. Full AI Markdown generation is disabled by LOCAL_LLM_ENABLE_MARKDOWN_GENERATION.",
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
  };
  return streaming ? streamModule01Json(run, request.signal) : run(request.signal);
}
