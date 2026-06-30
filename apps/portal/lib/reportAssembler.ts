import {
  buildDeterministicReport,
  buildStructuredReport,
  type DiagnosticReportRequest,
  type GeneratedConsultingReport,
} from "@/lib/deterministicReportBuilders";
import { buildModule01Facts } from "@/lib/module01/module01FactsBuilder";
import type { Module01LocalLlmClient } from "@/lib/module01/module01NarrativeGenerator";
import { generateModule01FieldNarrative } from "@/lib/module01/module01FieldNarrative";
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
  promptFieldPath?: string;
  fallbackText: string;
  facts: Record<string, unknown> | string;
  fieldNarrativeFacts?: string[];
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
const priorityAiFieldPaths = new Set([
  "boardScorecard.advisoryNarrative",
  "roadmap.roadmapNarrative",
]);

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

function joinList(values: unknown[], fallback = "none supplied") {
  const cleaned = values
    .map((value) => typeof value === "string" ? value : JSON.stringify(value))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.join("; ") : fallback;
}

function domainList(domains: Array<Record<string, unknown>>, fallback = "none supplied") {
  const cleaned = domains
    .map((domain) => {
      const name = domain.domain ?? domain.nameEn ?? domain.name;
      const score = domain.score ?? domain.avgScore;
      const gap = domain.gap ?? domain.avgGap;
      return `${name}${score !== undefined && score !== null ? ` score ${score}` : ""}${gap !== undefined && gap !== null ? ` gap ${gap}` : ""}`;
    })
    .filter((value) => value && !value.startsWith("undefined"));
  return cleaned.length > 0 ? cleaned.join("; ") : fallback;
}

function maturityBandFromScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return "baseline not classified";
  if (score < 1.5) return "early-stage maturity";
  if (score < 2.5) return "developing maturity";
  if (score < 3.5) return "managed maturity";
  return "advanced maturity";
}

function safeSequencingPromptText(value: string) {
  return value
    .replace(/\broadmap\b/gi, "delivery plan")
    .replace(/\bDMO\b/g, "data office");
}

function roadmapFactsText(facts: Module01Facts, report: GeneratedConsultingReport) {
  const evidence = evidenceSummary(facts.materialFindingsFacts.evidenceItems)
    .map((item) => `${item.evidenceId}${item.domain ? ` ${item.domain}` : ""}${item.evidenceStrength ? ` ${item.evidenceStrength}` : ""}`);
  return safeSequencingPromptText([
    `Client - ${facts.roadmapFacts.clientName}`,
    `Sequence - ${joinList(report.roadmapPhases)}`,
    `Priority domains - ${domainList(facts.roadmapFacts.topPriorityDomains as Array<Record<string, unknown>>)}`,
    `Critical gaps - ${domainList(facts.boardScorecardFacts.topPriorityDomains as Array<Record<string, unknown>>)}`,
    "Owner types - Executive sponsor; Data Governance Lead; Data Quality Lead; Data Architecture Lead; Transformation PMO",
    `Evidence items - ${joinList(evidence)}`,
    `Target outcomes - ${joinList(report.ninetyDayPlan)}`,
  ].join("\n"));
}

function roadmapFieldNarrativeFacts(facts: Module01Facts, report: GeneratedConsultingReport) {
  return [
    `Client: ${facts.roadmapFacts.clientName}`,
    `Priority domains: ${safeSequencingPromptText(domainList(facts.roadmapFacts.topPriorityDomains as Array<Record<string, unknown>>))}`,
    `Critical gaps: management controls are weakest in the priority domains above.`,
    "Management order: confirm accountable owners and evidence first; remediate the largest gaps second; scale only through controls third.",
    "Owner types: Executive sponsor; Data Governance Lead; Data Quality Lead; Data Architecture Lead; Transformation PMO.",
    `Target outcomes: ${safeSequencingPromptText(joinList(report.ninetyDayPlan))}`,
  ];
}

function roadmapFieldFallback(facts: Module01Facts) {
  const domainNames = (facts.roadmapFacts.topPriorityDomains as Array<Record<string, unknown>>)
    .slice(0, 3)
    .map((domain) => String(domain.domain ?? domain.nameEn ?? domain.name ?? "").toLowerCase());
  const foundationNames = domainNames.map((name) => {
    if (name.includes("tool") || name.includes("platform")) return "platform integration";
    if (name.includes("execution") || name.includes("roadmap")) return "roadmap execution";
    if (name.includes("architecture")) return "data architecture";
    if (name.includes("quality") || name.includes("master")) return "data quality and master data";
    if (name.includes("source") || name.includes("flow")) return "source ownership and data flows";
    if (name.includes("governance")) return "decision rights and governance";
    return name || "priority data foundation";
  });
  const foundations = Array.from(new Set(foundationNames)).slice(0, 3).join(", ");
  return `The 90-day roadmap should be sequenced around the three weakest foundations: ${foundations || "platform integration, roadmap execution and data architecture"}. Executive sponsors and domain owners should first validate evidence status and confirm Data Council decision rights, then remediate the priority domains through named owners and evidence sign-off. Analytics and AI scaling should remain behind a readiness gate until the control environment proves that source ownership, platform integration, delivery governance and data architecture are operating reliably.`;
}

function boardFieldNarrativeFacts(facts: Module01Facts, report: GeneratedConsultingReport) {
  const maturityBand = String(facts.boardScorecardFacts.maturityBand ?? "").includes("Not provided")
    ? maturityBandFromScore(facts.boardScorecardFacts.overallMaturity)
    : facts.boardScorecardFacts.maturityBand;
  const weightedConfidence = facts.boardScorecardFacts.evidenceWeightedConfidencePct;
  return [
    `Client: ${facts.boardScorecardFacts.clientName}`,
    `Overall score: ${facts.boardScorecardFacts.overallMaturity}`,
    `Board asks: ${joinList(report.boardAsks)}`,
    `Evidence coverage percent: ${facts.boardScorecardFacts.evidenceCoveragePct}`,
    `Weighted evidence confidence percent: ${weightedConfidence ?? "not calculated"}`,
    `Critical domains: ${domainList(facts.boardScorecardFacts.topPriorityDomains as Array<Record<string, unknown>>)}`,
    `Overall gap: ${facts.boardScorecardFacts.overallGap}`,
    `Maturity band: ${maturityBand}`,
    `Evidence coverage: ${facts.boardScorecardFacts.evidenceBacked}`,
    `Strongest domains: ${domainList(facts.boardScorecardFacts.strongestDomains as Array<Record<string, unknown>>)}`,
    `Weakest domains: ${domainList(facts.boardScorecardFacts.weakestDomains as Array<Record<string, unknown>>)}`,
  ];
}

function overallFactsText(
  facts: Module01Facts,
  validatedReport: GeneratedConsultingReport,
) {
  return [
    `Client: ${facts.overallSynthesisFacts.clientName}`,
    `Business domain: ${facts.overallSynthesisFacts.businessDomain}`,
    `Validated executive summary: ${textSnippet(validatedReport.executiveSummary, 260)}`,
    `Validated board scorecard narrative: ${textSnippet(validatedReport.boardScorecardNarrative, 260)}`,
    `Validated AI readiness narrative: ${textSnippet(validatedReport.aiReadinessGate, 240)}`,
    `Deterministic critical domains: ${joinList(facts.overallSynthesisFacts.criticalDomains as unknown[])}`,
    `Top root causes: ${joinList(facts.overallSynthesisFacts.topRootCauses as unknown[])}`,
    `Board decisions: ${joinList(validatedReport.boardAsks)}`,
    `Roadmap priorities: ${joinList(validatedReport.roadmapPhases.slice(0, 3).map((phase) => textSnippet(phase, 160)))}`,
  ].join("\n");
}

function overallFieldNarrativeFacts(
  facts: Module01Facts,
  validatedReport: GeneratedConsultingReport,
) {
  return overallFactsText(facts, validatedReport)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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
      fieldNarrativeFacts: boardFieldNarrativeFacts(facts, report),
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
      promptFieldPath: "ninetyDaySequencingNarrative",
      fallbackText: roadmapFieldFallback(facts),
      facts: roadmapFactsText(facts, report),
      fieldNarrativeFacts: roadmapFieldNarrativeFacts(facts, report),
      maxWords: Math.min(maxFieldWords, 100),
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
    facts: overallFactsText(facts, validatedReport),
    fieldNarrativeFacts: overallFieldNarrativeFacts(facts, validatedReport),
    maxWords: Math.min(maxFieldWords, 120),
    apply: (current, text) => ({ ...current, overallAdvisoryNarrative: text }),
  };
}

async function generateNarrativeField(
  field: FieldConfig,
  config: ReportAssemblerConfig,
): Promise<{ field: FieldConfig; generation: NarrativeFieldGeneration }> {
  const criticalFieldTimeoutMs = config.fieldTimeoutMs;
  if (field.fieldNarrativeFacts?.length) {
    return {
      field,
      generation: await generateModule01FieldNarrative({
        field: field.fieldPath as Parameters<typeof generateModule01FieldNarrative>[0]["field"],
        facts: field.fieldNarrativeFacts,
        maxWords: field.maxWords,
        style: "board",
        fallbackText: field.fallbackText,
        modelConfig: {
          gatewayBaseUrl: config.gatewayBaseUrl,
          headers: config.headers,
          model: config.model,
          timeoutMs: criticalFieldTimeoutMs,
        },
      }),
    };
  }

  return {
    field,
    generation: {
      text: field.fallbackText,
      status: "fallback",
      model: config.model,
      durationMs: 0,
      validationStatus: "missing_facts",
      retryAttempted: false,
      fallbackUsed: true,
      responseLength: field.fallbackText.length,
      rawResponseLength: 0,
      sanitizedResponseLength: field.fallbackText.length,
      generatedAt: new Date().toISOString(),
      rejectionReason: "missing_field_narrative_facts",
    },
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
      .filter((field) => field.fieldPath === "boardScorecard.advisoryNarrative" || (config.enableFieldEnrichment && priorityAiFieldPaths.has(field.fieldPath)))
      .sort((left, right) => {
        if (left.fieldPath === "roadmap.roadmapNarrative") return -1;
        if (right.fieldPath === "roadmap.roadmapNarrative") return 1;
        return 0;
      });
    const generations = await runWithConcurrency(configs, config.concurrency, (field) => generateNarrativeField(field, config));

    generations.forEach(({ field, generation }) => {
      fields[field.fieldPath] = generation;
      report = field.apply(report, generation.status === "fallback" ? field.fallbackText : generation.text);
    });

    if (config.enableFieldEnrichment) {
      const overallField = overallAdvisoryFieldConfig(module01Facts, deterministicReport, report, config.maxFieldWords);
      const { generation } = await generateNarrativeField(overallField, config);
      fields[overallField.fieldPath] = generation;
      report = overallField.apply(report, generation.status === "fallback" ? overallField.fallbackText : generation.text);
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
