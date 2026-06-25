import {
  buildDeterministicReport,
  buildStructuredReport,
  contextLabel,
  type DiagnosticReportRequest,
  type GeneratedConsultingReport,
} from "@/lib/deterministicReportBuilders";
import { generateNarrativeField, type NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
import { validateFlatDiagnosticReport, validateStructuredDiagnosticReport } from "@/lib/reportSchemaValidator";

type ReportAssemblerConfig = {
  gatewayBaseUrl: string;
  headers: Record<string, string>;
  model: string;
  reportMode: "deterministic" | "narrative_enrichment" | "json_section";
  enableFieldEnrichment: boolean;
  fieldTimeoutMs: number;
  maxFieldWords: number;
  concurrency: number;
};

type FieldConfig = {
  fieldPath: string;
  fallbackText: string;
  facts: string;
  maxWords: number;
  apply: (report: GeneratedConsultingReport, text: string) => GeneratedConsultingReport;
};

export type AssembledDiagnosticReport = {
  report: GeneratedConsultingReport;
  structuredReport: ReturnType<typeof buildStructuredReport>;
  generationMetadata: {
    model: string;
    mode: "deterministic" | "narrative_enrichment";
    fields: Record<string, NarrativeFieldGeneration>;
  };
  fallbackFields: string[];
  enrichedFields: string[];
};

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

function buildFacts(payload: DiagnosticReportRequest) {
  return [
    `Client: ${contextLabel(payload, "customerName", "the organisation")}`,
    `Business domain: ${contextLabel(payload, "businessDomain", "the stated business domain")}`,
    `Operating scope: ${contextLabel(payload, "operatingScope", "the assessed operating scope")}`,
    `Overall maturity: ${payload.overallScore ?? "not scored"} / 4`,
    `Overall gap: ${payload.overallGap ?? "not calculated"}`,
    `Questions scored: ${payload.scoredQuestions}/${payload.totalQuestions}`,
    `Evidence-backed items: ${payload.evidenceBackedItems}/${payload.totalQuestions}`,
    `Top gap domains: ${payload.topGapDomains.slice(0, 4).map((domain) => domain.nameEn).join(", ") || "not loaded"}`,
    `Strategic priorities: ${contextLabel(payload, "strategicPriorities", "not supplied")}`,
    `Pain points: ${contextLabel(payload, "currentPainPoints", "not supplied")}`,
  ].join("\n");
}

function fieldConfigs(payload: DiagnosticReportRequest, report: GeneratedConsultingReport, maxFieldWords: number): FieldConfig[] {
  const facts = buildFacts(payload);
  return [
    {
      fieldPath: "boardScorecard.advisoryNarrative",
      fallbackText: report.boardScorecardNarrative,
      facts,
      maxWords: Math.min(maxFieldWords + 40, 220),
      apply: (current, text) => ({ ...current, boardScorecardNarrative: text }),
    },
    {
      fieldPath: "overallAdvisory.helicopterView",
      fallbackText: report.overallAdvisoryNarrative,
      facts,
      maxWords: Math.min(maxFieldWords + 80, 260),
      apply: (current, text) => ({ ...current, overallAdvisoryNarrative: text }),
    },
    {
      fieldPath: "executiveSummary.summaryText",
      fallbackText: report.executiveSummary,
      facts,
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, executiveSummary: text }),
    },
    {
      fieldPath: "aiReadinessGate.readinessNarrative",
      fallbackText: report.aiReadinessGate,
      facts,
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, aiReadinessGate: text }),
    },
    {
      fieldPath: "capabilityDiagnosis.diagnosisNarrative",
      fallbackText: report.headlineAssessment,
      facts,
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, headlineAssessment: text }),
    },
    {
      fieldPath: "roadmap.roadmapNarrative",
      fallbackText: report.roadmapPhases.join(" "),
      facts,
      maxWords: Math.min(maxFieldWords, 90),
      apply: (current, text) => ({ ...current, roadmapPhases: [text, ...current.roadmapPhases.slice(1)] }),
    },
    {
      fieldPath: "recommendedNextSteps.closingNarrative",
      fallbackText: report.nextSteps[0],
      facts,
      maxWords: Math.min(maxFieldWords, 80),
      apply: (current, text) => ({ ...current, nextSteps: [text, ...current.nextSteps.slice(1)] }),
    },
  ];
}

export async function assembleDiagnosticReport(
  payload: DiagnosticReportRequest,
  config: ReportAssemblerConfig,
): Promise<AssembledDiagnosticReport> {
  let report = buildDeterministicReport(payload);
  const fields: Record<string, NarrativeFieldGeneration> = {};
  const canUseNarrativeModel = config.reportMode === "narrative_enrichment";
  const mode = canUseNarrativeModel ? "narrative_enrichment" : "deterministic";

  if (canUseNarrativeModel) {
    const configs = fieldConfigs(payload, report, config.maxFieldWords)
      .filter((field) => field.fieldPath === "boardScorecard.advisoryNarrative" || config.enableFieldEnrichment);
    const generations = await runWithConcurrency(configs, config.concurrency, async (field) => ({
      field,
      generation: await generateNarrativeField({
        fieldPath: field.fieldPath,
        facts: field.facts,
        maxWords: field.maxWords,
        fallbackText: field.fallbackText,
        modelConfig: {
          gatewayBaseUrl: config.gatewayBaseUrl,
          headers: config.headers,
          model: config.model,
          timeoutMs: config.fieldTimeoutMs,
        },
      }),
    }));

    generations.forEach(({ field, generation }) => {
      fields[field.fieldPath] = generation;
      if (generation.status !== "fallback") {
        report = field.apply(report, generation.text);
      }
    });
  }

  if (!validateFlatDiagnosticReport(report)) {
    report = buildDeterministicReport(payload);
  }

  const structuredReport = buildStructuredReport(payload, report, mode, config.model);
  if (!validateStructuredDiagnosticReport(structuredReport)) {
    throw new Error("Deterministic diagnostic report schema validation failed.");
  }

  const fallbackFields = Object.entries(fields)
    .filter(([, field]) => field.status === "fallback")
    .map(([fieldPath]) => fieldPath);
  const enrichedFields = Object.entries(fields)
    .filter(([, field]) => field.status === "ai_enriched" || field.status === "sanitized")
    .map(([fieldPath]) => fieldPath);

  return {
    report,
    structuredReport,
    generationMetadata: {
      model: config.model,
      mode,
      fields,
    },
    fallbackFields,
    enrichedFields,
  };
}
