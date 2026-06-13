export type DiagnosticReportRequest = {
  customerContext?: {
    customerName?: string;
    businessDomain?: string;
    operatingScope?: string;
    strategicPriorities?: string;
    currentPainPoints?: string;
    targetAudience?: string;
    reportPurpose?: string;
  };
  overallScore: number | null;
  overallGap: number | null;
  scoredQuestions: number;
  totalQuestions: number;
  evidenceBackedItems: number;
  topGapDomains: Array<{
    nameEn: string;
    avgScore: number | null;
    avgGap: number | null;
    scored: number;
    total: number;
  }>;
  strongestDomains: Array<{
    nameEn: string;
    avgScore: number | null;
    scored: number;
    total: number;
  }>;
  gartnerPillars?: Array<{
    name: string;
    score: number | null;
    gap: number | null;
    priority: string;
    scored: number;
    total: number;
    evidenceCoveragePct: number;
    mappedDomains: string[];
    decisionQuestion: string;
    managementAction: string;
  }>;
  priorityGaps: Array<{
    question: string;
    domain: string;
    score: number | null;
    gap: number | null;
    evidenceStrength: string;
    actionPlan: string;
  }>;
};

export type GeneratedConsultingReport = {
  executiveSummary: string;
  headlineAssessment: string;
  readinessThesis: string;
  boardMessage: string;
  boardAsks: string[];
  gartnerPillarAssessment: string[];
  materialFindings: string[];
  domainActionPlan: string[];
  priorityGapRegister: string[];
  recommendedDecisions: string[];
  ninetyDayPlan: string[];
  roadmapPhases: string[];
  aiReadinessGate: string;
  aiGateProceed: string[];
  aiGatePilotWithControls: string[];
  aiGateHold: string[];
  risks: string[];
  nextSteps: string[];
};

export type StructuredDiagnosticReport = {
  reportId: string;
  generationMode: "deterministic" | "narrative_enrichment";
  model: string;
  sections: {
    executiveSummary: {
      summaryText: string;
      maturityScore: number | null;
      scoredQuestions: string;
      evidenceCoveragePct: number | null;
    };
    boardAsks: Array<{
      ask: string;
      shortRationale: string;
    }>;
    aiReadinessGate: {
      readinessNarrative: string;
      proceed: string[];
      pilotWithControls: string[];
      hold: string[];
    };
    capabilityDiagnosis: {
      diagnosisNarrative: string;
      materialFindings: string[];
      domainActionPlan: string[];
    };
    ndmoDmoAlignment: {
      alignmentNarrative: string;
      pillarAssessment: string[];
    };
    dataSources: {
      dataSourceNarrative: string;
      status: "confirmed" | "assumed" | "missing" | "unknown";
    };
    useCasePortfolio: Array<{
      id: string;
      name: string;
      analyticsType: "descriptive" | "diagnostic" | "predictive" | "prescriptive" | "generative" | "automation";
      complexity: "low" | "medium" | "high";
      valueNarrative: string;
      dataSourceStatus: "confirmed" | "assumed" | "missing" | "unknown";
    }>;
    roadmap: {
      roadmapNarrative: string;
      phases: string[];
      ninetyDayPlan: string[];
    };
    risksAndDependencies: {
      riskNarrative: string;
      risks: string[];
    };
    recommendedNextSteps: {
      closingNarrative: string;
      nextSteps: string[];
    };
  };
};

export function contextLabel(
  payload: DiagnosticReportRequest,
  key: keyof NonNullable<DiagnosticReportRequest["customerContext"]>,
  fallback: string,
) {
  const value = payload.customerContext?.[key]?.trim();
  return value || fallback;
}

export function formatScore(value: number | null) {
  return value === null ? "not scored" : value.toFixed(1);
}

export function evidenceCoveragePct(payload: DiagnosticReportRequest) {
  return payload.totalQuestions > 0
    ? Math.round((payload.evidenceBackedItems / payload.totalQuestions) * 100)
    : null;
}

function gapDomainNames(payload: DiagnosticReportRequest) {
  return payload.topGapDomains
    .slice(0, 4)
    .map((domain) => domain.nameEn)
    .filter(Boolean);
}

export function buildDeterministicReport(payload: DiagnosticReportRequest): GeneratedConsultingReport {
  const client = contextLabel(payload, "customerName", "the organisation");
  const domain = contextLabel(payload, "businessDomain", "the stated business domain");
  const scope = contextLabel(payload, "operatingScope", "the assessed operating scope");
  const audience = contextLabel(payload, "targetAudience", "the executive audience");
  const priorities = contextLabel(payload, "strategicPriorities", "the stated strategic priorities");
  const painPoints = contextLabel(payload, "currentPainPoints", "the stated operating pain points");
  const score = formatScore(payload.overallScore);
  const evidencePct = evidenceCoveragePct(payload);
  const readinessPct = payload.overallScore === null ? null : Math.round((payload.overallScore / 4) * 100);
  const gaps = gapDomainNames(payload);
  const weakest = gaps.length > 0 ? gaps.join(", ") : "the lowest-scoring domains";
  const gartnerActions = (payload.gartnerPillars ?? [])
    .slice()
    .sort((left, right) => (right.gap ?? -1) - (left.gap ?? -1))
    .slice(0, 4)
    .map((pillar) => `${pillar.name}: ${pillar.priority} priority - ${pillar.managementAction}`);
  const priorityGapActions = payload.priorityGaps
    .slice(0, 5)
    .map((gap) => `${gap.domain}: ${gap.question} - ${gap.actionPlan || "assign an owner and remediation action"}`);

  return {
    executiveSummary:
      `${client} is assessed at ${score} / 4 maturity across ${payload.scoredQuestions}/${payload.totalQuestions} scored questions for ${domain}. The evidence posture is ${evidencePct === null ? "not calculated" : `${evidencePct}% evidence-backed`}, with material gaps concentrated in ${weakest}. The immediate executive implication is to treat the baseline as decision-useful but provisional where evidence is incomplete, then move quickly from assessment to owned remediation.`,
    headlineAssessment:
      `The diagnostic indicates an early-stage capability profile for ${scope}. Current priorities are ${priorities}, but the operating pain points - ${painPoints} - show that governance, ownership, evidence quality, and roadmap discipline need to be strengthened before advanced AI use cases are scaled.`,
    readinessThesis:
      "Proceed with governed descriptive diagnostics, dashboard rationalisation, and human-approved AI reporting. Pilot predictive or generative use cases only where source quality, privacy, lineage, ownership, and model-risk controls are evidenced. Hold autonomous decisioning and sensitive AI workflows until the control environment is certified.",
    boardMessage:
      `${audience} should approve the diagnostic baseline, assign accountable owners for the highest gaps, and gate AI use cases through evidence-backed readiness controls.`,
    boardAsks: [
      "Approve baseline: confirm the diagnostic as the working baseline for data and AI capability improvement.",
      "Assign owners: nominate accountable owners for the priority domains and unresolved evidence gaps.",
      "Gate use cases: require every AI candidate to show data quality, privacy, lineage, and owner sign-off before pilot approval.",
    ],
    gartnerPillarAssessment: gartnerActions.length > 0 ? gartnerActions : [
      "Strategy and value: confirm the data ambition and business outcomes before prioritising initiatives.",
      "Governance and operating model: assign decision rights, data owners, and issue escalation routes.",
      "Data management foundations: certify definitions, lineage, quality controls, and evidence before AI scaling.",
    ],
    materialFindings: [
      `Overall maturity is ${score} / 4, indicating that the organisation is not yet operating at a controlled, repeatable data capability level.`,
      `Evidence coverage is ${evidencePct === null ? "not available" : `${evidencePct}%`}; unevidenced responses should be validated before board approval.`,
      `Priority gaps are concentrated in ${weakest}, which should drive the first remediation backlog.`,
      `The current readiness score is ${readinessPct === null ? "not available" : `${readinessPct}%`}, so AI adoption should be gated rather than broad-based.`,
    ],
    domainActionPlan: payload.topGapDomains.slice(0, 5).map((gap) =>
      `${gap.nameEn}: score ${formatScore(gap.avgScore)} / 4 - assign owner, confirm evidence, define target state, and add remediation milestones.`,
    ),
    priorityGapRegister: priorityGapActions,
    recommendedDecisions: [
      "Confirm the diagnostic baseline and evidence exceptions in the next steering session.",
      "Approve a 90-day remediation backlog focused on ownership, data quality, metadata, lineage, and roadmap controls.",
      "Nominate a data governance sponsor and working group to certify definitions, sources, and reports.",
      "Gate AI pilots until each candidate has an owner, approved data source, privacy review, and measurable success criteria.",
    ],
    ninetyDayPlan: [
      "Days 0-30: mobilise governance, validate evidence, confirm owners, and lock the priority gap register.",
      "Days 31-60: close critical data quality, metadata, lineage, and reporting control gaps.",
      "Days 61-90: certify AI-ready use cases, approve the roadmap, and prepare the DMO operating model inputs.",
    ],
    roadmapPhases: [
      "Mobilise and validate: turn the diagnostic into an approved baseline and owner map.",
      "Remediate and certify: close critical evidence, quality, and governance gaps.",
      "Scale with controls: sequence initiatives and AI use cases through readiness gates.",
    ],
    aiReadinessGate:
      "AI should be handled through a controlled gate. Descriptive reporting and AI-assisted report drafting may proceed with human approval; forecasting, classification, and summarisation require confirmed controls; autonomous decisions and sensitive generative workflows should be held.",
    aiGateProceed: [
      "Management dashboards and evidence-backed diagnostic reporting with accountable owners.",
      "AI-assisted report drafting where outputs are reviewed and approved by humans.",
    ],
    aiGatePilotWithControls: [
      "Forecasting and classification where data quality, privacy, and lineage are confirmed.",
      "Summarisation of approved evidence packs with audit trail and owner sign-off.",
    ],
    aiGateHold: [
      "Autonomous decisions affecting services, finance, compliance, or people.",
      "Sensitive generative AI workflows without source controls, audit trail, or accountable approval.",
    ],
    risks: [
      "Evidence risk: provisional scores may be challenged unless supporting evidence is captured and certified.",
      "Ownership risk: gaps will persist if data owners and remediation owners are not formally assigned.",
      "AI risk: premature use-case scaling could create unreliable outputs if quality and privacy controls are weak.",
      "Delivery risk: roadmap benefits may not materialise without sequencing, funding, and governance cadence.",
    ],
    nextSteps: [
      "Review and approve the diagnostic baseline with the steering group.",
      "Convert the top gaps into a prioritised 90-day action backlog.",
      "Use the diagnostic handoff as the evidence input for the Data Strategy Builder module.",
    ],
  };
}

export function buildStructuredReport(
  payload: DiagnosticReportRequest,
  report: GeneratedConsultingReport,
  generationMode: "deterministic" | "narrative_enrichment",
  model: string,
): StructuredDiagnosticReport {
  const evidencePct = evidenceCoveragePct(payload);
  return {
    reportId: `data-ai-diagnostic-${Date.now()}`,
    generationMode,
    model,
    sections: {
      executiveSummary: {
        summaryText: report.executiveSummary,
        maturityScore: payload.overallScore,
        scoredQuestions: `${payload.scoredQuestions}/${payload.totalQuestions}`,
        evidenceCoveragePct: evidencePct,
      },
      boardAsks: report.boardAsks.map((ask) => ({
        ask,
        shortRationale: "This decision converts diagnostic evidence into accountable action.",
      })),
      aiReadinessGate: {
        readinessNarrative: report.aiReadinessGate,
        proceed: report.aiGateProceed,
        pilotWithControls: report.aiGatePilotWithControls,
        hold: report.aiGateHold,
      },
      capabilityDiagnosis: {
        diagnosisNarrative: report.headlineAssessment,
        materialFindings: report.materialFindings,
        domainActionPlan: report.domainActionPlan,
      },
      ndmoDmoAlignment: {
        alignmentNarrative: "The diagnostic baseline should inform DMO design, governance controls, data ownership, and readiness gates before certification work proceeds.",
        pillarAssessment: report.gartnerPillarAssessment,
      },
      dataSources: {
        dataSourceNarrative: "Source evidence should be certified before report automation or AI use-case scaling.",
        status: payload.evidenceBackedItems > 0 ? "assumed" : "unknown",
      },
      useCasePortfolio: [
        {
          id: "uc-executive-reporting",
          name: "Executive reporting rationalisation",
          analyticsType: "descriptive",
          complexity: "medium",
          valueNarrative: "Create trusted management reporting from governed definitions and source ownership.",
          dataSourceStatus: payload.evidenceBackedItems > 0 ? "assumed" : "unknown",
        },
        {
          id: "uc-data-quality-improvement",
          name: "Data quality improvement",
          analyticsType: "diagnostic",
          complexity: "medium",
          valueNarrative: "Identify and close quality gaps that weaken decision confidence and AI readiness.",
          dataSourceStatus: "assumed",
        },
        {
          id: "uc-ai-assisted-reporting",
          name: "AI-assisted reporting with human approval",
          analyticsType: "generative",
          complexity: "high",
          valueNarrative: "Use controlled AI drafting only where evidence, ownership, and review controls are in place.",
          dataSourceStatus: "assumed",
        },
      ],
      roadmap: {
        roadmapNarrative: "The first 90 days should turn the diagnostic into ownership, evidence certification, and a sequenced remediation backlog.",
        phases: report.roadmapPhases,
        ninetyDayPlan: report.ninetyDayPlan,
      },
      risksAndDependencies: {
        riskNarrative: "The main delivery risks are evidence quality, ownership clarity, and premature AI scaling before controls are certified.",
        risks: report.risks,
      },
      recommendedNextSteps: {
        closingNarrative: "The next step is to approve the baseline and hand the evidence into data strategy design.",
        nextSteps: report.nextSteps,
      },
    },
  };
}
