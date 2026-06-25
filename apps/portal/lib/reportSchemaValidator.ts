import type { GeneratedConsultingReport, StructuredDiagnosticReport } from "@/lib/deterministicReportBuilders";

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasList(value: unknown, minimum = 1) {
  return Array.isArray(value) && value.length >= minimum && value.every(hasText);
}

export function validateFlatDiagnosticReport(report: GeneratedConsultingReport) {
  return Boolean(
    hasText(report.executiveSummary) &&
    hasText(report.overallAdvisoryNarrative) &&
    hasText(report.boardScorecardNarrative) &&
    hasText(report.headlineAssessment) &&
    hasText(report.readinessThesis) &&
    hasText(report.boardMessage) &&
    hasList(report.boardAsks, 3) &&
    hasList(report.materialFindings, 3) &&
    hasList(report.domainActionPlan, 1) &&
    hasList(report.recommendedDecisions, 3) &&
    hasList(report.ninetyDayPlan, 3) &&
    hasText(report.aiReadinessGate) &&
    hasList(report.aiGateProceed, 2) &&
    hasList(report.aiGatePilotWithControls, 2) &&
    hasList(report.aiGateHold, 2) &&
    hasList(report.risks, 3) &&
    hasList(report.nextSteps, 3)
  );
}

export function validateStructuredDiagnosticReport(report: StructuredDiagnosticReport) {
  const analyticsTypes = new Set(["descriptive", "diagnostic", "predictive", "prescriptive", "generative", "automation"]);
  const complexity = new Set(["low", "medium", "high"]);
  const sourceStatuses = new Set(["confirmed", "assumed", "missing", "unknown"]);
  return Boolean(
    hasText(report.reportId) &&
    (report.generationMode === "deterministic" || report.generationMode === "narrative_enrichment") &&
    hasText(report.model) &&
    hasText(report.sections.executiveSummary.summaryText) &&
    hasText(report.sections.overallAdvisory.helicopterView) &&
    hasText(report.sections.overallAdvisory.advisoryConclusion) &&
    hasText(report.sections.boardScorecard.advisoryNarrative) &&
    report.sections.useCasePortfolio.every((useCase) =>
      hasText(useCase.id) &&
      analyticsTypes.has(useCase.analyticsType) &&
      complexity.has(useCase.complexity) &&
      sourceStatuses.has(useCase.dataSourceStatus),
    ) &&
    sourceStatuses.has(report.sections.dataSources.status)
  );
}
