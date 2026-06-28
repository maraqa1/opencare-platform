import {
  buildDeterministicReport,
  buildStructuredReport,
  type DiagnosticReportRequest,
  type GeneratedConsultingReport,
} from "@/lib/deterministicReportBuilders";
import { buildModule01Facts } from "@/lib/module01/module01FactsBuilder";
import {
  generateModule01NarrativeField,
  type Module01LocalLlmClient,
} from "@/lib/module01/module01NarrativeGenerator";
import type { NarrativeFieldGeneration } from "@/lib/narrativeFieldGenerator";
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
  llmClient?: Module01LocalLlmClient;
};

type FieldConfig = {
  fieldPath: string;
  fallbackText: string;
  facts: Record<string, unknown>;
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

type Module01Facts = ReturnType<typeof buildModule01Facts>;

function textSnippet(value: string, maxCharacters = 360) {
  return value.length <= maxCharacters ? value : `${value.slice(0, maxCharacters).trim()}...`;
}

function evidenceSummary(evidenceItems: Record<string, unknown>) {
  return Object.entries(evidenceItems)
    .slice(0, 5)
    .map(([evidenceId, item]) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        evidenceId,
        domain: record.domain,
        evidenceStrength: record.evidenceStrength ?? record.evidence_strength,
      };
    });
}

function firstPassFieldConfigs(facts: Module01Facts, report: GeneratedConsultingReport, maxFieldWords: number): FieldConfig[] {
  return [
    {
      fieldPath: "boardScorecard.advisoryNarrative",
      fallbackText: report.boardScorecardNarrative,
      facts: {
        ...facts.boardScorecardFacts,
        boardAsks: report.boardAsks,
      },
      maxWords: Math.min(maxFieldWords, 120),
      apply: (current, text) => ({ ...current, boardScorecardNarrative: text }),
    },
    {
      fieldPath: "executiveSummary.summaryText",
      fallbackText: report.executiveSummary,
      facts: facts.executiveSummaryFacts,
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, executiveSummary: text }),
    },
    {
      fieldPath: "aiReadinessGate.readinessNarrative",
      fallbackText: report.aiReadinessGate,
      facts: facts.aiReadinessFacts,
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, aiReadinessGate: text }),
    },
    {
      fieldPath: "capabilityDiagnosis.diagnosisNarrative",
      fallbackText: report.headlineAssessment,
      facts: {
        ...facts.materialFindingsFacts,
        domainActionPlan: facts.domainActionPlanFacts,
      },
      maxWords: maxFieldWords,
      apply: (current, text) => ({ ...current, headlineAssessment: text }),
    },
    {
      fieldPath: "roadmap.roadmapNarrative",
      fallbackText: report.roadmapPhases.join(" "),
      facts: {
        ...facts.roadmapFacts,
        deterministic90DayPhases: report.roadmapPhases,
        criticalGaps: facts.boardScorecardFacts.topPriorityDomains,
        ownerTypes: [
          "Executive sponsor",
          "Data Governance Lead",
          "Data Quality Lead",
          "Data Architecture Lead",
          "Transformation PMO",
        ],
        keyEvidenceItems: evidenceSummary(facts.materialFindingsFacts.evidenceItems),
        targetOutcomes: report.ninetyDayPlan,
      },
      maxWords: Math.min(maxFieldWords, 110),
      apply: (current, text) => ({ ...current, roadmapPhases: [text, ...current.roadmapPhases.slice(1)] }),
    },
    {
      fieldPath: "recommendedNextSteps.closingNarrative",
      fallbackText: report.nextSteps[0],
      facts: facts.boardDecisionsFacts,
      maxWords: Math.min(maxFieldWords, 80),
      apply: (current, text) => ({ ...current, nextSteps: [text, ...current.nextSteps.slice(1)] }),
    },
  ];
}

function overallAdvisoryFieldConfig(
  facts: Module01Facts,
  deterministicReport: GeneratedConsultingReport,
  validatedReport: GeneratedConsultingReport,
  maxFieldWords: number,
): FieldConfig {
  return {
    fieldPath: "overallAdvisory.helicopterView",
    fallbackText: deterministicReport.overallAdvisoryNarrative,
    facts: {
      ...facts.overallSynthesisFacts,
      deterministicFacts: {
        overallMaturity: facts.executiveSummaryFacts.overallMaturity,
        evidenceCoveragePct: facts.executiveSummaryFacts.evidenceCoveragePct,
        criticalDomains: facts.executiveSummaryFacts.criticalDomains,
        topPriorityDomains: facts.boardScorecardFacts.topPriorityDomains,
      },
      validatedNarratives: {
        executiveSummary: textSnippet(validatedReport.executiveSummary),
        boardScorecardNarrative: textSnippet(validatedReport.boardScorecardNarrative),
        aiReadinessGate: textSnippet(validatedReport.aiReadinessGate),
      },
      roadmapPriorities: validatedReport.roadmapPhases.slice(0, 3).map((phase) => textSnippet(phase, 180)),
      boardDecisions: validatedReport.boardAsks,
    },
    maxWords: Math.min(maxFieldWords + 20, 140),
    apply: (current, text) => ({ ...current, overallAdvisoryNarrative: text }),
  };
}

async function generateNarrativeField(
  field: FieldConfig,
  config: ReportAssemblerConfig,
): Promise<{ field: FieldConfig; generation: NarrativeFieldGeneration }> {
  return {
    field,
    generation: await generateModule01NarrativeField({
      fieldName: field.fieldPath,
      facts: field.facts,
      maxWords: field.maxWords,
      fallbackText: field.fallbackText,
      modelConfig: {
        gatewayBaseUrl: config.gatewayBaseUrl,
        headers: config.headers,
        model: config.model,
        timeoutMs: config.fieldTimeoutMs,
      },
      llmClient: config.llmClient,
    }),
  };
}

export async function assembleDiagnosticReport(
  payload: DiagnosticReportRequest,
  config: ReportAssemblerConfig,
): Promise<AssembledDiagnosticReport> {
  const deterministicReport = buildDeterministicReport(payload);
  const module01Facts = buildModule01Facts(payload);
  let report = deterministicReport;
  const fields: Record<string, NarrativeFieldGeneration> = {};
  const canUseNarrativeModel = config.reportMode === "narrative_enrichment";
  const mode = canUseNarrativeModel ? "narrative_enrichment" : "deterministic";

  if (canUseNarrativeModel) {
    const configs = firstPassFieldConfigs(module01Facts, report, config.maxFieldWords)
      .filter((field) => field.fieldPath === "boardScorecard.advisoryNarrative" || config.enableFieldEnrichment);
    const generations = await runWithConcurrency(configs, config.concurrency, (field) => generateNarrativeField(field, config));

    generations.forEach(({ field, generation }) => {
      fields[field.fieldPath] = generation;
      if (generation.status !== "fallback") {
        report = field.apply(report, generation.text);
      }
    });

    if (config.enableFieldEnrichment) {
      const overallField = overallAdvisoryFieldConfig(module01Facts, deterministicReport, report, config.maxFieldWords);
      const { generation } = await generateNarrativeField(overallField, config);
      fields[overallField.fieldPath] = generation;
      if (generation.status !== "fallback") {
        report = overallField.apply(report, generation.text);
      }
    }
  }

  if (!validateFlatDiagnosticReport(report)) {
    report = deterministicReport;
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
