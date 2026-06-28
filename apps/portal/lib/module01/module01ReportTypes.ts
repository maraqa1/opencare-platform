export type Module01NarrativeSource = "ai2" | "fallback" | "deterministic";
export type Module01ValidationStatus = "valid" | "fallback" | "rejected";

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
  reportHeader: {
    reportId: string;
    clientName: string;
    businessDomain: string;
    audience: string;
    purpose: string;
    generatedAt: string;
  };
  executiveSummary: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
  };
  clientContext: Record<string, unknown>;
  overallMaturity: {
    score: number | null;
    maturityBand: string;
    questionsScored: string;
    evidenceCoveragePct: number | null;
  };
  domainHeatmap: Module01DomainScore[];
  criticalGaps: Module01DomainScore[];
  rootCauses: string[];
  materialFindings: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
  };
  domainActionPlan: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
  };
  aiReadinessGate: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
    proceed: string[];
    pilotWithControls: string[];
    hold: string[];
  };
  candidateUseCases: Array<Record<string, unknown>>;
  roadmap90Day: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
    actions: string[];
  };
  roadmap12Month: string[];
  boardDecisions: {
    deterministicFacts: Record<string, unknown>;
    narrative: Module01AiNarrativeField;
    decisions: string[];
  };
  evidenceAppendix: Module01EvidenceItem[];
  aiNarratives: Record<string, Module01AiNarrativeField>;
  generationMetadata: {
    model: string;
    mode: "deterministic" | "narrative_enrichment";
    validationSummary: {
      aiFields: number;
      fallbackFields: number;
      rejectedFields: number;
    };
  };
};

