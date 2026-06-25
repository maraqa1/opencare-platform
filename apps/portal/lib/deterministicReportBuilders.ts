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
  overallAdvisoryNarrative: string;
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
    overallAdvisory: {
      helicopterView: string;
      advisoryConclusion: string;
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

function domainRemediationFocus(domainName: string) {
  const name = domainName.toLowerCase();
  if (name.includes("quality") || name.includes("master")) {
    return {
      decision: "Approve a data-quality recovery sprint for the critical data elements behind priority reports and AI candidates.",
      owner: "Data Quality Lead with business data owners",
      action: "Stand up issue logging, validation rules, root-cause analysis, and monthly defect closure reporting.",
      evidence: "Quality rules, exception reports, owner sign-off, data-quality dashboard, and remediation log.",
      outcome: "Certified quality controls for the sources used in management reporting and AI-readiness decisions.",
    };
  }
  if (name.includes("source") || name.includes("flow")) {
    return {
      decision: "Mandate a source-system inventory and flow certification before new reporting or AI use cases are approved.",
      owner: "Data Architecture Lead with system owners",
      action: "Document critical sources, interfaces, refresh cadence, data contracts, and unsupported manual exchanges.",
      evidence: "Source catalogue, interface map, lineage record, refresh SLA, and accountable system-owner confirmation.",
      outcome: "Trusted source-to-report traceability for the priority decision flows.",
    };
  }
  if (name.includes("strategy") || name.includes("business value")) {
    return {
      decision: "Confirm the data strategy outcomes and investment choices before sequencing initiatives.",
      owner: "Executive sponsor with Data Strategy Lead",
      action: "Define strategic outcomes, value cases, prioritisation criteria, funding route, and decision cadence.",
      evidence: "Strategy-on-a-page, value case register, prioritisation criteria, funding decision log, and initiative shortlist.",
      outcome: "A value-led data strategy that can feed the DMO design and delivery roadmap.",
    };
  }
  if (name.includes("execution") || name.includes("roadmap") || name.includes("value measurement")) {
    return {
      decision: "Convert the diagnostic gaps into an approved benefits-led delivery backlog.",
      owner: "Transformation PMO with Data Council sponsorship",
      action: "Prioritise initiatives by value, risk, dependency, and evidence readiness; assign milestones and benefit measures.",
      evidence: "Approved roadmap, initiative charters, benefit cases, dependency log, and steering cadence.",
      outcome: "A sequenced 90-day and 12-month plan that can be governed and measured.",
    };
  }
  if (name.includes("people") || name.includes("capabil") || name.includes("training")) {
    return {
      decision: "Approve a role-based capability plan for owners, stewards, analysts, and AI users.",
      owner: "Capability Lead with HR and Data Governance Office",
      action: "Map capability gaps, define role-based learning paths, and link training to operating responsibilities.",
      evidence: "Capability matrix, training plan, attendance records, role descriptions, and adoption measures.",
      outcome: "Sustainable operation of the data governance and AI-readiness model.",
    };
  }
  if (name.includes("governance") || name.includes("operating model")) {
    return {
      decision: "Confirm decision rights, data-owner accountability, and escalation routes for the highest-risk domains.",
      owner: "Executive sponsor and Data Governance Office",
      action: "Approve RACI, council cadence, policy ownership, issue escalation, and evidence approval workflow.",
      evidence: "Council terms of reference, RACI, policy register, decision log, and issue-escalation record.",
      outcome: "Clear accountability for definitions, quality, access, and remediation decisions.",
    };
  }
  if (name.includes("metadata") || name.includes("catalogue") || name.includes("lineage")) {
    return {
      decision: "Require metadata and lineage evidence for priority reports, data products, and AI candidates.",
      owner: "Metadata and Lineage Lead",
      action: "Capture business definitions, owners, systems of record, transformations, report usage, and lineage gaps.",
      evidence: "Data catalogue entries, glossary approvals, lineage maps, and report-to-source traceability.",
      outcome: "Evidence-backed definitions and lineage for management and AI-readiness decisions.",
    };
  }
  if (name.includes("artificial intelligence") || name.includes("use cases")) {
    return {
      decision: "Gate AI use cases until data quality, privacy, lineage, owner approval, and model-risk controls are evidenced.",
      owner: "AI Governance Lead with Data Council approval",
      action: "Classify AI candidates into proceed, pilot with controls, or hold; document controls and human approval points.",
      evidence: "AI use-case register, risk assessment, privacy review, model-control checklist, and approval record.",
      outcome: "Controlled AI adoption without relying on unverified data or unsupported model outputs.",
    };
  }
  if (name.includes("architecture") || name.includes("infrastructure") || name.includes("tools") || name.includes("platform")) {
    return {
      decision: "Define the target data platform path and stop tool decisions from outrunning governance readiness.",
      owner: "Enterprise/Data Architect with IT leadership",
      action: "Map current platforms, integration patterns, control gaps, target architecture, and near-term enabling investments.",
      evidence: "Architecture baseline, target-state blueprint, integration standards, control mapping, and investment backlog.",
      outcome: "A platform roadmap that supports governed reporting, analytics, and AI enablement.",
    };
  }
  if (name.includes("report") || name.includes("dashboard") || name.includes("analytics")) {
    return {
      decision: "Rationalise management dashboards around certified definitions, owners, and reporting cadence.",
      owner: "BI/Product Owner with business performance leads",
      action: "Identify critical reports, remove duplicates, certify KPI definitions, and publish report ownership rules.",
      evidence: "Certified KPI dictionary, report inventory, usage analytics, dashboard owner map, and release log.",
      outcome: "Trusted dashboards that can be used as evidence in executive decisions.",
    };
  }
  if (name.includes("privacy") || name.includes("security") || name.includes("compliance")) {
    return {
      decision: "Embed privacy, security, and auditability controls into the data and AI delivery gate.",
      owner: "Privacy/Security Lead with compliance stakeholders",
      action: "Review sensitive data handling, access controls, retention, audit trail, and AI-use restrictions.",
      evidence: "Control assessment, access review, privacy impact review, retention rules, and audit log evidence.",
      outcome: "Reduced regulatory and operational risk before scaling data products or AI workflows.",
    };
  }
  return {
    decision: "Confirm the management decision needed to close the domain gap.",
    owner: "Assigned domain owner",
    action: "Define target state, required evidence, milestone plan, and escalation route.",
    evidence: "Owner confirmation, approved action plan, evidence artifact, and closure record.",
    outcome: "A controlled domain improvement plan that can be tracked through governance cadence.",
  };
}

function domainActionRecommendation(domain: DiagnosticReportRequest["topGapDomains"][number]) {
  const focus = domainRemediationFocus(domain.nameEn);
  const score = formatScore(domain.avgScore);
  const gap = domain.avgGap === null ? "not calculated" : domain.avgGap.toFixed(1);
  return [
    `${domain.nameEn}: score ${score} / 4, gap ${gap}.`,
    `Decision: ${focus.decision}`,
    `Owner: ${focus.owner}.`,
    `Next 30 days: ${focus.action}`,
    `Evidence required: ${focus.evidence}`,
    `Success measure: ${focus.outcome}`,
  ].join(" ");
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
    overallAdvisoryNarrative:
      `The helicopter view is that ${client} has enough evidence to move from diagnostic discussion into controlled execution, but not enough maturity to scale data and AI autonomously. The report sections point to one advisory conclusion: strengthen ownership, quality, source traceability, and roadmap discipline first, then use those controls to sequence reporting, analytics, and AI use cases. Management should treat ${weakest} as the first wave of intervention because these domains determine whether board reporting can be trusted, whether AI candidates can be approved, and whether benefits can be measured. The recommended posture is therefore pragmatic: proceed with governed reporting and human-approved AI support, pilot more advanced analytics only where evidence is certified, and hold sensitive automation until the control environment is demonstrably operating.`,
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
    domainActionPlan: payload.topGapDomains.slice(0, 5).map(domainActionRecommendation),
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
      overallAdvisory: {
        helicopterView: report.overallAdvisoryNarrative,
        advisoryConclusion: report.boardMessage,
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
