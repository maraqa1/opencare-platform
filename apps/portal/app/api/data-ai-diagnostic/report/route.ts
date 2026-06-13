import { NextResponse } from "next/server";

import {
  generateReportSection,
  type ReportSectionMetadata,
  type ReportSectionResult,
  type ReportSectionSchema,
} from "@/lib/ai-report-section-generator";

type DiagnosticReportRequest = {
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

const fallbackModel = "llama3.2:3b";
const defaultGatewayTimeoutMs = 180000;
const defaultSectionTimeoutMs = 25000;
const defaultSectionConcurrency = 2;

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => cleanReportText(textValue(item))).filter(Boolean);
}

function cleanReportText(value: string) {
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normaliseReport(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      executiveSummary: textValue(value),
      headlineAssessment: "",
      readinessThesis: "",
      boardMessage: "",
      boardAsks: [],
      gartnerPillarAssessment: [],
      materialFindings: [],
      domainActionPlan: [],
      priorityGapRegister: [],
      recommendedDecisions: [],
      ninetyDayPlan: [],
      roadmapPhases: [],
      aiReadinessGate: "",
      aiGateProceed: [],
      aiGatePilotWithControls: [],
      aiGateHold: [],
      risks: [],
      nextSteps: [],
    };
  }
  const report = value as Record<string, unknown>;
  return {
    executiveSummary: cleanReportText(textValue(report.executiveSummary)),
    headlineAssessment: cleanReportText(textValue(report.headlineAssessment)),
    readinessThesis: cleanReportText(textValue(report.readinessThesis)),
    boardMessage: cleanReportText(textValue(report.boardMessage)),
    boardAsks: stringList(report.boardAsks),
    gartnerPillarAssessment: stringList(report.gartnerPillarAssessment),
    materialFindings: stringList(report.materialFindings),
    domainActionPlan: stringList(report.domainActionPlan),
    priorityGapRegister: stringList(report.priorityGapRegister),
    recommendedDecisions: stringList(report.recommendedDecisions),
    ninetyDayPlan: stringList(report.ninetyDayPlan),
    roadmapPhases: stringList(report.roadmapPhases),
    aiReadinessGate: cleanReportText(textValue(report.aiReadinessGate)),
    aiGateProceed: stringList(report.aiGateProceed),
    aiGatePilotWithControls: stringList(report.aiGatePilotWithControls),
    aiGateHold: stringList(report.aiGateHold),
    risks: stringList(report.risks),
    nextSteps: stringList(report.nextSteps),
  };
}

function completeReport(value: unknown, payload: DiagnosticReportRequest, reason: string) {
  const deterministic = normaliseReport(buildDeterministicReport(payload, reason));
  const generated = normaliseReport(value);
  const pickList = (
    generatedList: string[],
    deterministicList: string[],
    minimumLength: number,
  ) => generatedList.length >= minimumLength ? generatedList : deterministicList;

  return {
    executiveSummary: deterministic.executiveSummary,
    headlineAssessment: generated.headlineAssessment || deterministic.headlineAssessment,
    readinessThesis: deterministic.readinessThesis,
    boardMessage: generated.boardMessage || deterministic.boardMessage,
    boardAsks: pickList(generated.boardAsks, deterministic.boardAsks, 3),
    gartnerPillarAssessment: pickList(generated.gartnerPillarAssessment, deterministic.gartnerPillarAssessment, 3),
    materialFindings: pickList(generated.materialFindings, deterministic.materialFindings, 3),
    domainActionPlan: pickList(generated.domainActionPlan, deterministic.domainActionPlan, 3),
    priorityGapRegister: pickList(generated.priorityGapRegister, deterministic.priorityGapRegister, 3),
    recommendedDecisions: pickList(generated.recommendedDecisions, deterministic.recommendedDecisions, 3),
    ninetyDayPlan: pickList(generated.ninetyDayPlan, deterministic.ninetyDayPlan, 3),
    roadmapPhases: pickList(generated.roadmapPhases, deterministic.roadmapPhases, 3),
    aiReadinessGate: deterministic.aiReadinessGate,
    aiGateProceed: pickList(generated.aiGateProceed, deterministic.aiGateProceed, 2),
    aiGatePilotWithControls: pickList(generated.aiGatePilotWithControls, deterministic.aiGatePilotWithControls, 2),
    aiGateHold: pickList(generated.aiGateHold, deterministic.aiGateHold, 2),
    risks: pickList(generated.risks, deterministic.risks, 3),
    nextSteps: pickList(generated.nextSteps, deterministic.nextSteps, 3),
  };
}

function contextLabel(payload: DiagnosticReportRequest, key: keyof NonNullable<DiagnosticReportRequest["customerContext"]>, fallback: string) {
  const value = payload.customerContext?.[key]?.trim();
  return value || fallback;
}

function formatScore(value: number | null) {
  return value === null ? "not scored" : value.toFixed(1);
}

function gapDomainNames(payload: DiagnosticReportRequest) {
  return payload.topGapDomains
    .slice(0, 4)
    .map((domain) => domain.nameEn)
    .filter(Boolean);
}

function buildDeterministicReport(payload: DiagnosticReportRequest, reason: string) {
  const client = contextLabel(payload, "customerName", "the organisation");
  const domain = contextLabel(payload, "businessDomain", "the stated business domain");
  const scope = contextLabel(payload, "operatingScope", "the assessed operating scope");
  const audience = contextLabel(payload, "targetAudience", "the executive audience");
  const priorities = contextLabel(payload, "strategicPriorities", "the stated strategic priorities");
  const painPoints = contextLabel(payload, "currentPainPoints", "the stated operating pain points");
  const score = formatScore(payload.overallScore);
  const evidencePct = payload.totalQuestions > 0
    ? Math.round((payload.evidenceBackedItems / payload.totalQuestions) * 100)
    : null;
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
      `Proceed with governed descriptive diagnostics, dashboard rationalisation, and human-approved AI reporting. Pilot predictive or generative use cases only where source quality, privacy, lineage, ownership, and model-risk controls are evidenced. Hold autonomous decisioning and sensitive AI workflows until the control environment is certified.`,
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
    fallbackReason: reason,
  };
}

type NormalisedReport = ReturnType<typeof normaliseReport>;

type ReportSectionConfig = {
  sectionName: string;
  sectionSchema: ReportSectionSchema;
  maxTokens: number;
  fallback: (report: NormalisedReport) => Record<string, unknown>;
  diagnosticData: (payload: DiagnosticReportRequest) => unknown;
};

type GenerationMetadata = {
  model: string;
  mode: "section_by_section";
  sections: Record<string, ReportSectionMetadata>;
};

const reportSectionConfigs: ReportSectionConfig[] = [
  {
    sectionName: "executiveSummary",
    maxTokens: 420,
    sectionSchema: {
      executiveSummary: "string",
      headlineAssessment: "string",
      readinessThesis: "string",
      boardMessage: "string",
    },
    fallback: (report) => ({
      executiveSummary: report.executiveSummary,
      headlineAssessment: report.headlineAssessment,
      readinessThesis: report.readinessThesis,
      boardMessage: report.boardMessage,
    }),
    diagnosticData: (payload) => ({
      overallScore: payload.overallScore,
      overallGap: payload.overallGap,
      scoredQuestions: payload.scoredQuestions,
      totalQuestions: payload.totalQuestions,
      evidenceBackedItems: payload.evidenceBackedItems,
      topGapDomains: payload.topGapDomains.slice(0, 4),
      strongestDomains: payload.strongestDomains.slice(0, 3),
    }),
  },
  {
    sectionName: "boardAsks",
    maxTokens: 360,
    sectionSchema: {
      boardAsks: "string[]",
      recommendedDecisions: "string[]",
    },
    fallback: (report) => ({
      boardAsks: report.boardAsks,
      recommendedDecisions: report.recommendedDecisions,
    }),
    diagnosticData: (payload) => ({
      topGapDomains: payload.topGapDomains.slice(0, 5),
      priorityGaps: payload.priorityGaps.slice(0, 5),
      gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
    }),
  },
  {
    sectionName: "aiReadinessGate",
    maxTokens: 420,
    sectionSchema: {
      aiReadinessGate: "string",
      aiGateProceed: "string[]",
      aiGatePilotWithControls: "string[]",
      aiGateHold: "string[]",
    },
    fallback: (report) => ({
      aiReadinessGate: report.aiReadinessGate,
      aiGateProceed: report.aiGateProceed,
      aiGatePilotWithControls: report.aiGatePilotWithControls,
      aiGateHold: report.aiGateHold,
    }),
    diagnosticData: (payload) => ({
      overallScore: payload.overallScore,
      evidenceBackedItems: payload.evidenceBackedItems,
      totalQuestions: payload.totalQuestions,
      priorityGaps: payload.priorityGaps.slice(0, 6),
      topGapDomains: payload.topGapDomains.slice(0, 5),
    }),
  },
  {
    sectionName: "ndmoAlignment",
    maxTokens: 340,
    sectionSchema: {
      gartnerPillarAssessment: "string[]",
      materialFindings: "string[]",
    },
    fallback: (report) => ({
      gartnerPillarAssessment: report.gartnerPillarAssessment,
      materialFindings: report.materialFindings,
    }),
    diagnosticData: (payload) => ({
      gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
      topGapDomains: payload.topGapDomains.slice(0, 5),
    }),
  },
  {
    sectionName: "capabilityDiagnosis",
    maxTokens: 380,
    sectionSchema: {
      materialFindings: "string[]",
      domainActionPlan: "string[]",
    },
    fallback: (report) => ({
      materialFindings: report.materialFindings,
      domainActionPlan: report.domainActionPlan,
    }),
    diagnosticData: (payload) => ({
      topGapDomains: payload.topGapDomains.slice(0, 6),
      strongestDomains: payload.strongestDomains.slice(0, 3),
      priorityGaps: payload.priorityGaps.slice(0, 5),
    }),
  },
  {
    sectionName: "dataSourceFindings",
    maxTokens: 340,
    sectionSchema: {
      priorityGapRegister: "string[]",
      risks: "string[]",
    },
    fallback: (report) => ({
      priorityGapRegister: report.priorityGapRegister,
      risks: report.risks,
    }),
    diagnosticData: (payload) => ({
      priorityGaps: payload.priorityGaps.slice(0, 8),
      topGapDomains: payload.topGapDomains.slice(0, 4),
      evidenceBackedItems: payload.evidenceBackedItems,
      totalQuestions: payload.totalQuestions,
    }),
  },
  {
    sectionName: "useCasePortfolio",
    maxTokens: 340,
    sectionSchema: {
      aiGateProceed: "string[]",
      aiGatePilotWithControls: "string[]",
      aiGateHold: "string[]",
    },
    fallback: (report) => ({
      aiGateProceed: report.aiGateProceed,
      aiGatePilotWithControls: report.aiGatePilotWithControls,
      aiGateHold: report.aiGateHold,
    }),
    diagnosticData: (payload) => ({
      overallScore: payload.overallScore,
      topGapDomains: payload.topGapDomains.slice(0, 5),
      priorityGaps: payload.priorityGaps.slice(0, 6),
    }),
  },
  {
    sectionName: "priorityRoadmap",
    maxTokens: 360,
    sectionSchema: {
      ninetyDayPlan: "string[]",
      roadmapPhases: "string[]",
    },
    fallback: (report) => ({
      ninetyDayPlan: report.ninetyDayPlan,
      roadmapPhases: report.roadmapPhases,
    }),
    diagnosticData: (payload) => ({
      topGapDomains: payload.topGapDomains.slice(0, 6),
      priorityGaps: payload.priorityGaps.slice(0, 8),
      gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
    }),
  },
  {
    sectionName: "risksAndDependencies",
    maxTokens: 320,
    sectionSchema: {
      risks: "string[]",
    },
    fallback: (report) => ({
      risks: report.risks,
    }),
    diagnosticData: (payload) => ({
      overallScore: payload.overallScore,
      evidenceBackedItems: payload.evidenceBackedItems,
      totalQuestions: payload.totalQuestions,
      topGapDomains: payload.topGapDomains.slice(0, 5),
      priorityGaps: payload.priorityGaps.slice(0, 6),
    }),
  },
  {
    sectionName: "recommendedNextSteps",
    maxTokens: 300,
    sectionSchema: {
      nextSteps: "string[]",
    },
    fallback: (report) => ({
      nextSteps: report.nextSteps,
    }),
    diagnosticData: (payload) => ({
      topGapDomains: payload.topGapDomains.slice(0, 4),
      priorityGaps: payload.priorityGaps.slice(0, 5),
      gartnerPillars: payload.gartnerPillars?.slice(0, 4) ?? [],
    }),
  },
];

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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
}

function mergeReportSections(
  deterministic: NormalisedReport,
  sectionResults: ReportSectionResult[],
  payload: DiagnosticReportRequest,
) {
  const generated = sectionResults.reduce<Record<string, unknown>>((merged, section) => ({
    ...merged,
    ...section.content,
  }), {});

  return completeReport(
    {
      ...deterministic,
      ...generated,
    },
    payload,
    "Local AI generated report sections independently. Evidence-critical sections were normalised against the captured diagnostic payload.",
  );
}

function buildGenerationMetadata(model: string, sectionResults: ReportSectionResult[]): GenerationMetadata {
  return {
    model,
    mode: "section_by_section",
    sections: sectionResults.reduce<Record<string, ReportSectionMetadata>>((sections, section) => ({
      ...sections,
      [section.sectionName]: section.metadata,
    }), {}),
  };
}

export async function POST(request: Request) {
  let payload: DiagnosticReportRequest;
  try {
    payload = (await request.json()) as DiagnosticReportRequest;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid report request payload.",
      },
      { status: 400 },
    );
  }
  const model = process.env.LOCAL_AI_MODEL ?? fallbackModel;
  const configuredGatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL ?? "http://local-ai-gateway:8080/v1").replace(/\/+$/, "");
  const gatewayBaseUrl = configuredGatewayBaseUrl.endsWith("/v1")
    ? configuredGatewayBaseUrl
    : `${configuredGatewayBaseUrl}/v1`;
  const apiKey = process.env.LOCAL_AI_API_KEY ?? "";
  const configuredTimeoutMs = Number(process.env.LOCAL_AI_REPORT_TIMEOUT_MS ?? defaultGatewayTimeoutMs);
  const gatewayTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : defaultGatewayTimeoutMs;
  const configuredSectionTimeoutMs = Number(process.env.LOCAL_AI_REPORT_SECTION_TIMEOUT_MS ?? defaultSectionTimeoutMs);
  const sectionTimeoutMs = Number.isFinite(configuredSectionTimeoutMs) && configuredSectionTimeoutMs > 0
    ? configuredSectionTimeoutMs
    : defaultSectionTimeoutMs;
  const configuredSectionConcurrency = Number(process.env.LOCAL_AI_REPORT_SECTION_CONCURRENCY ?? defaultSectionConcurrency);
  const sectionConcurrency = Number.isFinite(configuredSectionConcurrency) && configuredSectionConcurrency > 0
    ? Math.max(1, Math.min(Math.floor(configuredSectionConcurrency), reportSectionConfigs.length))
    : defaultSectionConcurrency;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  const reportDiagnostic = {
    ...payload,
    topGapDomains: payload.topGapDomains.slice(0, 6),
    strongestDomains: payload.strongestDomains.slice(0, 3),
    gartnerPillars: payload.gartnerPillars?.slice(0, 7) ?? [],
    priorityGaps: payload.priorityGaps.slice(0, 6),
  };

  const deterministic = normaliseReport(buildDeterministicReport(
    reportDiagnostic,
    "Section-level deterministic fallback generated from captured diagnostic evidence.",
  ));
  let sectionResults: ReportSectionResult[];
  try {
    sectionResults = await runWithConcurrency(
      reportSectionConfigs,
      sectionConcurrency,
      (section) => generateReportSection({
        sectionName: section.sectionName,
        sectionSchema: section.sectionSchema,
        customerContext: reportDiagnostic.customerContext ?? {},
        diagnosticData: section.diagnosticData(reportDiagnostic),
        previousSections: {
          executiveSummary: deterministic.executiveSummary,
          headlineAssessment: deterministic.headlineAssessment,
        },
        fallback: section.fallback(deterministic),
        modelConfig: {
          gatewayBaseUrl,
          headers,
          model,
          timeoutMs: Math.min(sectionTimeoutMs, gatewayTimeoutMs),
          temperature: 0.1,
          topP: 0.9,
          maxTokens: section.maxTokens,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to reach the local AI gateway from the portal server.",
        details: [error instanceof Error ? error.message : "Unknown local AI gateway connection error."],
        model,
        gateway: gatewayBaseUrl,
      },
      { status: 502 },
    );
  }

  const report = mergeReportSections(deterministic, sectionResults, reportDiagnostic);
  const generationMetadata = buildGenerationMetadata(model, sectionResults);
  const fallbackSections = sectionResults
    .filter((section) => section.metadata.source === "fallback")
    .map((section) => section.sectionName);
  const repairedSections = sectionResults
    .filter((section) => section.metadata.repaired)
    .map((section) => section.sectionName);

  return NextResponse.json({
    status: "ready",
    report,
    model,
    repaired: fallbackSections.length > 0 || repairedSections.length > 0,
    fallback: fallbackSections.length === sectionResults.length,
    sectionFallbacks: fallbackSections,
    repairedSections,
    generationMetadata,
    message: fallbackSections.length > 0
      ? "Some report sections used deterministic fallback because the local model did not return valid JSON."
      : "Report generated section-by-section with validated local AI JSON.",
  });
}
