export type Module01NarrativeSource = "ai2" | "fallback" | "deterministic";
export type Module01ValidationStatus = "valid" | "fallback" | "rejected" | "not_requested";

export type Module01AiNarrativeField = {
  fieldName: string;
  text: string;
  source: Module01NarrativeSource;
  validationStatus: Module01ValidationStatus;
  fallbackUsed: boolean;
  model: string;
  generatedAt: string;
  rejectionReason?: string;
  retryAttempted?: boolean;
};

export type Module01NarrativeValidationMetadata = {
  validationStatus: Module01ValidationStatus;
  fallbackUsed: boolean;
  rejectionReason?: string;
  retryAttempted?: boolean;
};

export type Module01NarrativeSlot<TFacts extends Record<string, unknown> = Record<string, unknown>> = {
  deterministicFacts: Readonly<TFacts>;
  aiNarrative: Module01AiNarrativeField | null;
  fallbackNarrative: string;
  renderedText: string;
  validationMetadata: Module01NarrativeValidationMetadata;
};

export type Module01EvidenceItem = {
  evidenceId: string;
  domain?: string;
  question?: string;
  evidenceStrength?: string;
  evidenceAvailable?: string;
};

export type Module01DomainScore = {
  domain: string;
  score: number | null;
  gap: number | null;
  priority: string;
  rootCauseRank?: number | null;
};

export type Module01StructuredReport = {
  readonly reportHeader: {
    reportId: string;
    clientName: string;
    businessDomain: string;
    audience: string;
    purpose: string;
    generatedAt: string;
  };
  readonly executiveSummary: Module01NarrativeSlot & {
    readonly boardMessage?: string;
  };
  readonly clientContext: Readonly<Record<string, unknown>>;
  readonly overallMaturity: {
    score: number | null;
    maturityBand: string;
    questionsScored: string;
    evidenceCoveragePct: number | null;
  };
  readonly domainHeatmap: readonly Module01DomainScore[];
  readonly criticalGaps: readonly Module01DomainScore[];
  readonly rootCauses: readonly string[];
  readonly materialFindings: Module01NarrativeSlot & {
    readonly findings: readonly string[];
  };
  readonly domainActionPlan: Module01NarrativeSlot & {
    readonly actions: readonly string[];
  };
  readonly aiReadinessGate: Module01NarrativeSlot & {
    proceed: string[];
    pilotWithControls: string[];
    hold: string[];
  };
  readonly candidateUseCases: readonly Readonly<Record<string, unknown>>[];
  readonly roadmap90Day: Module01NarrativeSlot & {
    actions: string[];
  };
  readonly roadmap12Month: readonly string[];
  readonly boardDecisions: Module01NarrativeSlot & {
    decisions: string[];
  };
  readonly evidenceAppendix: readonly Module01EvidenceItem[];
  readonly aiNarratives: Readonly<Record<string, Module01AiNarrativeField>>;
  readonly generationMetadata: {
    model: string;
    mode: "deterministic" | "narrative_enrichment";
    renderedFromStructuredModel: true;
    validationSummary: {
      aiFields: number;
      fallbackFields: number;
      rejectedFields: number;
    };
  };
};
