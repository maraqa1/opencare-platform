export const diagnosticStrategyHandoffStorageKey = "opencare:data-ai-diagnostic:latest";

type HandoffPriority = "Critical" | "High" | "Medium" | "Watch" | "Unknown";
type HandoffSeverity = "Critical" | "High" | "Medium" | "Low" | "Unknown";

export type DiagnosticStrategyHandoff = {
  handoffVersion: "1.0";
  sourceModule: "data-ai-capability-diagnostic";
  generatedAt: string;

  customerContext: {
    organisationName?: string;
    sector?: string;
    domain?: string;
    geography?: string;
    reportPurpose?: string;
    audience?: string;
  };

  assessmentSummary: {
    overallMaturity: number | null;
    maturityLabel: string | null;
    readinessScorePct: number | null;
    questionsScored: number;
    totalQuestions: number;
    domainsAssessed: number;
    totalDomains: number;
    evidenceBackedResponses: number;
    totalResponses: number;
    evidenceCoveragePct: number | null;
  };

  domainSummaries: Array<{
    domainId: string;
    domainName: string;
    score: number | null;
    gap: number | null;
    priority: HandoffPriority;
    evidenceCoveragePct?: number | null;
    recommendedAction?: string;
  }>;

  gartnerSummaries: Array<{
    pillarName: string;
    score: number | null;
    gap: number | null;
    priority: HandoffPriority;
    decisionQuestion?: string;
    managementAction?: string;
    mappedDomains: string[];
  }>;

  priorityGaps: Array<{
    question: string;
    domain: string;
    score: number | null;
    gap: number | null;
    evidence: string | null;
    action: string;
    severity: HandoffSeverity;
  }>;

  aiReadinessGate: {
    thesis?: string;
    proceed: string[];
    pilotWithControls: string[];
    hold: string[];
  };

  recommendedActions: string[];

  strategyInputs: {
    strategicPrioritiesFromDiagnostic: string[];
    capabilityGapsToClose: string[];
    governanceImplications: string[];
    platformImplications: string[];
    operatingModelImplications: string[];
    first90DayFocus: string[];
  };

  rawGeneratedReport?: unknown;
};

type GeneratedReportLike = {
  readinessThesis?: unknown;
  aiReadinessGate?: unknown;
  aiGateProceed?: unknown;
  aiGatePilotWithControls?: unknown;
  aiGateHold?: unknown;
  recommendedDecisions?: unknown;
  nextSteps?: unknown;
  materialFindings?: unknown;
  domainActionPlan?: unknown;
  priorityGapRegister?: unknown;
  gartnerPillarAssessment?: unknown;
  ninetyDayPlan?: unknown;
  roadmapPhases?: unknown;
  risks?: unknown;
  boardAsks?: unknown;
};

export type DiagnosticStrategyHandoffInput = {
  generatedAt?: string;
  customerContext?: {
    customerName?: string;
    organisationName?: string;
    businessDomain?: string;
    sector?: string;
    domain?: string;
    operatingScope?: string;
    geography?: string;
    strategicPriorities?: string;
    currentPainPoints?: string;
    reportPurpose?: string;
    targetAudience?: string;
    audience?: string;
  };
  overallMaturity?: number | null;
  overallScore?: number | null;
  overallGap?: number | null;
  maturityLabel?: string | null;
  readinessScorePct?: number | null;
  questionsScored?: number;
  totalQuestions?: number;
  domainsAssessed?: number;
  totalDomains?: number;
  evidenceBackedResponses?: number;
  evidenceBackedItems?: number;
  totalResponses?: number;
  evidenceCoveragePct?: number | null;
  domainSummaries?: Array<{
    id?: string | number;
    domainId?: string | number;
    nameEn?: string;
    domainName?: string;
    avgScore?: number | null;
    score?: number | null;
    avgGap?: number | null;
    gap?: number | null;
    priority?: string | null;
    evidenceCoveragePct?: number | null;
    recommendedAction?: string;
  }>;
  gartnerSummaries?: Array<{
    name?: string;
    pillarName?: string;
    avgScore?: number | null;
    score?: number | null;
    avgGap?: number | null;
    gap?: number | null;
    priority?: string | null;
    decisionQuestion?: string;
    managementAction?: string;
    mappedDomains?: string[];
    domainIds?: Array<string | number>;
  }>;
  priorityGaps?: Array<{
    question?: string;
    domain?: string;
    score?: number | null;
    gap?: number | null;
    evidence?: string | null;
    evidenceStrength?: string | null;
    evidenceAvailable?: string | null;
    action?: string;
    actionPlan?: string;
    severity?: string | null;
    priority?: string | null;
  }>;
  generatedReport?: GeneratedReportLike | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integerOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function uniqueText(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normaliseHandoffPriority(value: unknown): HandoffPriority {
  const normalized = typeof value === "string" ? value.toLowerCase().replace(/[\s_-]+/g, "") : "";
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "watch" || normalized === "low") return "Watch";
  return "Unknown";
}

function priorityFromGap(gap: number | null): HandoffPriority {
  if (gap === null) return "Unknown";
  if (gap >= 2.5) return "Critical";
  if (gap >= 1.5) return "High";
  if (gap >= 0.75) return "Medium";
  return "Watch";
}

function severityFromPriority(value: unknown, gap: number | null): HandoffSeverity {
  const explicitPriority = normaliseHandoffPriority(value);
  const priority = explicitPriority === "Unknown" ? priorityFromGap(gap) : explicitPriority;
  if (priority === "Critical") return "Critical";
  if (priority === "High") return "High";
  if (priority === "Medium") return "Medium";
  if (priority === "Watch") return "Low";
  return "Unknown";
}

function arrayFromReport(...values: unknown[]): string[] {
  return uniqueText(values.flatMap((value) => textList(value)));
}

function multilineTextList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(/\r?\n|[;•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildDiagnosticStrategyHandoff(input: DiagnosticStrategyHandoffInput): DiagnosticStrategyHandoff {
  const generatedReport = input.generatedReport ?? undefined;
  const totalQuestions = integerOrZero(input.totalQuestions);
  const questionsScored = integerOrZero(input.questionsScored);
  const evidenceBackedResponses = integerOrZero(input.evidenceBackedResponses ?? input.evidenceBackedItems);
  const totalResponses = integerOrZero(input.totalResponses ?? input.totalQuestions);
  const overallMaturity = finiteNumber(input.overallMaturity ?? input.overallScore);
  const readinessScorePct = finiteNumber(input.readinessScorePct);
  const evidenceCoveragePct = finiteNumber(input.evidenceCoveragePct);

  const domainSummaries = (input.domainSummaries ?? []).map((domain) => {
    const score = finiteNumber(domain.score ?? domain.avgScore);
    const gap = finiteNumber(domain.gap ?? domain.avgGap);
    const priority = normaliseHandoffPriority(domain.priority) === "Unknown"
      ? priorityFromGap(gap)
      : normaliseHandoffPriority(domain.priority);
    return {
      domainId: String(domain.domainId ?? domain.id ?? ""),
      domainName: textOrEmpty(domain.domainName ?? domain.nameEn),
      score,
      gap,
      priority,
      evidenceCoveragePct: finiteNumber(domain.evidenceCoveragePct),
      recommendedAction: optionalText(domain.recommendedAction),
    };
  });

  const gartnerSummaries = (input.gartnerSummaries ?? []).map((pillar) => {
    const score = finiteNumber(pillar.score ?? pillar.avgScore);
    const gap = finiteNumber(pillar.gap ?? pillar.avgGap);
    const priority = normaliseHandoffPriority(pillar.priority) === "Unknown"
      ? priorityFromGap(gap)
      : normaliseHandoffPriority(pillar.priority);
    return {
      pillarName: textOrEmpty(pillar.pillarName ?? pillar.name),
      score,
      gap,
      priority,
      decisionQuestion: optionalText(pillar.decisionQuestion),
      managementAction: optionalText(pillar.managementAction),
      mappedDomains: textList(pillar.mappedDomains),
    };
  });

  const priorityGaps = (input.priorityGaps ?? []).map((gapItem) => {
    const gap = finiteNumber(gapItem.gap);
    return {
      question: textOrEmpty(gapItem.question),
      domain: textOrEmpty(gapItem.domain),
      score: finiteNumber(gapItem.score),
      gap,
      evidence: optionalText(gapItem.evidence ?? gapItem.evidenceAvailable ?? gapItem.evidenceStrength) ?? null,
      action: textOrEmpty(gapItem.action ?? gapItem.actionPlan),
      severity: severityFromPriority(gapItem.severity ?? gapItem.priority, gap),
    };
  });

  const strategicPriorities = uniqueText([
    ...multilineTextList(input.customerContext?.strategicPriorities),
    ...multilineTextList(input.customerContext?.reportPurpose),
  ]);
  const capabilityGaps = arrayFromReport(
    generatedReport?.materialFindings,
    generatedReport?.domainActionPlan,
    generatedReport?.priorityGapRegister,
    priorityGaps.map((item) => [item.domain, item.question, item.action].filter(Boolean).join(" | ")),
  );
  const governanceImplications = arrayFromReport(
    generatedReport?.recommendedDecisions,
    generatedReport?.boardAsks,
    gartnerSummaries.map((item) => item.managementAction ?? ""),
  );
  const platformImplications = arrayFromReport(generatedReport?.risks);
  const operatingModelImplications = arrayFromReport(
    generatedReport?.nextSteps,
    multilineTextList(input.customerContext?.currentPainPoints),
  );
  const first90DayFocus = arrayFromReport(generatedReport?.ninetyDayPlan, generatedReport?.roadmapPhases);

  return {
    handoffVersion: "1.0",
    sourceModule: "data-ai-capability-diagnostic",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    customerContext: {
      organisationName: optionalText(input.customerContext?.organisationName ?? input.customerContext?.customerName),
      sector: optionalText(input.customerContext?.sector),
      domain: optionalText(input.customerContext?.domain ?? input.customerContext?.businessDomain),
      geography: optionalText(input.customerContext?.geography ?? input.customerContext?.operatingScope),
      reportPurpose: optionalText(input.customerContext?.reportPurpose),
      audience: optionalText(input.customerContext?.audience ?? input.customerContext?.targetAudience),
    },
    assessmentSummary: {
      overallMaturity,
      maturityLabel: optionalText(input.maturityLabel) ?? null,
      readinessScorePct,
      questionsScored,
      totalQuestions,
      domainsAssessed: integerOrZero(input.domainsAssessed),
      totalDomains: integerOrZero(input.totalDomains),
      evidenceBackedResponses,
      totalResponses,
      evidenceCoveragePct,
    },
    domainSummaries,
    gartnerSummaries,
    priorityGaps,
    aiReadinessGate: {
      thesis: optionalText(generatedReport?.readinessThesis ?? generatedReport?.aiReadinessGate),
      proceed: textList(generatedReport?.aiGateProceed),
      pilotWithControls: textList(generatedReport?.aiGatePilotWithControls),
      hold: textList(generatedReport?.aiGateHold),
    },
    recommendedActions: arrayFromReport(generatedReport?.recommendedDecisions, generatedReport?.nextSteps),
    strategyInputs: {
      strategicPrioritiesFromDiagnostic: uniqueText(strategicPriorities),
      capabilityGapsToClose: capabilityGaps,
      governanceImplications,
      platformImplications,
      operatingModelImplications,
      first90DayFocus,
    },
    rawGeneratedReport: generatedReport,
  };
}

function localStorageOrNull(): Storage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function saveLatestDiagnosticStrategyHandoff(handoff: DiagnosticStrategyHandoff): void {
  // TODO: Replace local demo persistence with POST /api/data-ai-diagnostic/runs.
  localStorageOrNull()?.setItem(diagnosticStrategyHandoffStorageKey, JSON.stringify(handoff));
}

export function loadLatestDiagnosticStrategyHandoff(): DiagnosticStrategyHandoff | null {
  // TODO: Replace local demo read with GET /api/data-ai-diagnostic/runs/latest.
  const raw = localStorageOrNull()?.getItem(diagnosticStrategyHandoffStorageKey);
  if (!raw) {
    return null;
  }
  try {
    const payload = JSON.parse(raw) as unknown;
    return validateDiagnosticStrategyHandoff(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function clearLatestDiagnosticStrategyHandoff(): void {
  localStorageOrNull()?.removeItem(diagnosticStrategyHandoffStorageKey);
}

export function validateDiagnosticStrategyHandoff(payload: unknown): payload is DiagnosticStrategyHandoff {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const handoff = payload as Partial<DiagnosticStrategyHandoff>;
  return (
    handoff.handoffVersion === "1.0" &&
    handoff.sourceModule === "data-ai-capability-diagnostic" &&
    typeof handoff.generatedAt === "string" &&
    !!handoff.assessmentSummary &&
    typeof handoff.assessmentSummary === "object" &&
    Array.isArray(handoff.domainSummaries) &&
    Array.isArray(handoff.gartnerSummaries) &&
    Array.isArray(handoff.priorityGaps) &&
    !!handoff.aiReadinessGate &&
    typeof handoff.aiReadinessGate === "object" &&
    Array.isArray(handoff.recommendedActions) &&
    !!handoff.strategyInputs &&
    typeof handoff.strategyInputs === "object"
  );
}

// TODO: Add GET /api/data-ai-diagnostic/runs/:id/strategy-input when backend diagnostic runs exist.
