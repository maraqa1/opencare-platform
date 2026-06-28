"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";

import {
  dataAiDiagnosticDomains,
  dataAiDiagnosticQuestions,
  dataAiReportPrompts,
  type DataAiDiagnosticQuestion,
} from "@/lib/data-ai-diagnostic";
import {
  buildDiagnosticStrategyHandoff,
  clearLatestDiagnosticStrategyHandoff,
  saveLatestDiagnosticStrategyHandoff,
} from "@/lib/data-ai-diagnostic-handoff";

type ActiveTab = "capture" | "dashboard" | "gartner" | "gaps" | "report" | "evidence";

type QuestionState = {
  score: number | null;
  evidenceStrength: EvidenceStrength;
  evidenceAvailable: string;
  notes: string;
  actionPlan: string;
};

type EvidenceStrength = "none" | "interview" | "documented" | "system" | "audited";

type CustomerContext = {
  customerName: string;
  businessDomain: string;
  operatingScope: string;
  strategicPriorities: string;
  currentPainPoints: string;
  targetAudience: string;
  reportPurpose: string;
};

type SeedProfileId = "nawah-real-estate" | "hayat-health-network" | "amana-utilities-group";
type SeedDatasetLevel = "interview-light" | "evidence-enriched" | "board-ready";

type DiagnosticSeedProfile = {
  id: SeedProfileId;
  label: string;
  sector: string;
  context: CustomerContext;
  domainScores: Record<number, number>;
  domainEvidence: Record<number, string>;
  domainActions: Record<number, string>;
};

type GeneratedConsultingReport = {
  executiveSummary?: string;
  overallAdvisoryNarrative?: string;
  boardScorecardNarrative?: string;
  headlineAssessment?: string;
  readinessThesis?: string;
  boardMessage?: string;
  boardAsks?: string[];
  gartnerPillarAssessment?: string[];
  materialFindings?: string[];
  domainActionPlan?: string[];
  priorityGapRegister?: string[];
  recommendedDecisions?: string[];
  ninetyDayPlan?: string[];
  roadmapPhases?: string[];
  aiReadinessGate?: string;
  aiGateProceed?: string[];
  aiGatePilotWithControls?: string[];
  aiGateHold?: string[];
  risks?: string[];
  nextSteps?: string[];
};

type DiagnosticReportApiResponse = {
  status?: string;
  message?: string;
  report?: GeneratedConsultingReport;
  markdownReport?: string;
  markdownReportSource?: "llm" | "fallback";
  markdownReportMetadata?: {
    source?: "llm" | "fallback";
    model?: string;
    durationMs?: number;
    error?: string;
    inputTokenEstimate?: number;
  };
  model?: string;
  gateway?: string;
  details?: string[];
  fallback?: boolean;
  repaired?: boolean;
  sectionFallbacks?: string[];
  repairedSections?: string[];
  fieldFallbacks?: string[];
  enrichedFields?: string[];
  generationMetadata?: {
    mode?: string;
    fields?: Record<string, {
      status?: string;
      model?: string;
      durationMs?: number;
      rejectionReason?: string;
    }>;
    markdownReport?: {
      source?: "llm" | "fallback";
      model?: string;
      durationMs?: number;
      error?: string;
      inputTokenEstimate?: number;
    };
    sections?: Record<string, {
      source?: string;
      attempts?: number;
      validJson?: boolean;
      repaired?: boolean;
      error?: string;
    }>;
  };
};

type MarkdownBlock =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

type DomainSummary = {
  id: number;
  nameEn: string;
  nameAr: string;
  total: number;
  scored: number;
  avgScore: number | null;
  avgGap: number | null;
  priority: "critical" | "high" | "medium" | "watch" | "not_scored";
};

type GartnerPillar = {
  id: number;
  name: string;
  shortName: string;
  description: string;
  domainIds: number[];
  decisionQuestion: string;
  managementAction: string;
};

type GartnerPillarSummary = GartnerPillar & {
  total: number;
  scored: number;
  avgScore: number | null;
  avgGap: number | null;
  evidenceBacked: number;
  evidenceCoveragePct: number;
  priority: DomainSummary["priority"];
};

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: "capture", label: "Data capture" },
  { id: "dashboard", label: "Maturity dashboard" },
  { id: "gartner", label: "Gartner 7 pillars" },
  { id: "gaps", label: "Gap matrix" },
  { id: "report", label: "AI report" },
  { id: "evidence", label: "Evidence model" },
];

const gartnerPillars = [
  {
    id: 1,
    name: "Strategy & Business Outcomes",
    shortName: "Strategy",
    description: "Connect data, analytics, and AI work to measurable business outcomes, funded priorities, and executive decisions.",
    domainIds: [1, 13],
    decisionQuestion: "Are data and AI initiatives tied to value, ownership, roadmap, and benefits measurement?",
    managementAction: "Confirm executive sponsorship, value cases, funding route, and benefits tracking.",
  },
  {
    id: 2,
    name: "Governance & Operating Model",
    shortName: "Governance",
    description: "Define decision rights, policy, ownership, stewardship, risk controls, and accountable operating cadence.",
    domainIds: [2, 10],
    decisionQuestion: "Are ownership, policy, privacy, security, and decision rights clear enough to scale safely?",
    managementAction: "Stand up data council cadence, RACI, policy controls, and approval workflows.",
  },
  {
    id: 3,
    name: "Data Management & Quality",
    shortName: "Data quality",
    description: "Control critical data, quality, master data, metadata, lineage, source flows, and evidence of trust.",
    domainIds: [4, 5, 11],
    decisionQuestion: "Can the organisation prove the data is complete, understood, traceable, and fit for use?",
    managementAction: "Prioritise critical data elements, DQ rules, lineage, catalogue, and issue management.",
  },
  {
    id: 4,
    name: "Architecture & Platforms",
    shortName: "Architecture",
    description: "Provide scalable architecture, integration, platforms, tooling, and runtime foundations for analytics and AI.",
    domainIds: [3, 8],
    decisionQuestion: "Can the platform support governed ingestion, modelling, analytics, AI runtime, and operational scale?",
    managementAction: "Confirm target architecture, integration pattern, tooling standards, and platform roadmap.",
  },
  {
    id: 5,
    name: "Analytics, AI & Decisioning",
    shortName: "Analytics & AI",
    description: "Turn governed data into dashboards, diagnostics, predictions, AI use cases, and human-approved decisions.",
    domainIds: [6, 7],
    decisionQuestion: "Which dashboards, models, and AI use cases can proceed now, pilot with controls, or hold?",
    managementAction: "Create the AI use-case gate, model-risk controls, dashboard certification, and decision logs.",
  },
  {
    id: 6,
    name: "People, Skills & Adoption",
    shortName: "People",
    description: "Build data literacy, operating roles, change adoption, training impact, and sustained behavioural change.",
    domainIds: [9, 12],
    decisionQuestion: "Do teams have the roles, skills, incentives, and training evidence needed to operate the model?",
    managementAction: "Map roles, training needs, champions, adoption plan, and capability transfer evidence.",
  },
  {
    id: 7,
    name: "Execution, Risk & Continuous Improvement",
    shortName: "Execution",
    description: "Manage delivery, risk, remediation, audit evidence, value realisation, and continuous improvement loops.",
    domainIds: [13, 2, 10],
    decisionQuestion: "Is there a repeatable mechanism to close gaps, escalate risks, and prove value improvement?",
    managementAction: "Create action queue, risk escalation, benefits review, and quarterly maturity refresh.",
  },
] satisfies GartnerPillar[];

const priorityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  watch: "Watch",
  not_scored: "Needs data",
} satisfies Record<DomainSummary["priority"], string>;

const scoreOptions = [
  { value: null, label: "No data", shortLabel: "NA", description: "No score assigned yet." },
  { value: 0, label: "0 - absent", shortLabel: "0", description: "No capability exists, or no evidence can be produced." },
  { value: 1, label: "1 - ad hoc", shortLabel: "1", description: "Informal, person-dependent, or interview-only practice." },
  { value: 2, label: "2 - defined", shortLabel: "2", description: "Documented or partially implemented, but inconsistent adoption." },
  { value: 3, label: "3 - managed", shortLabel: "3", description: "Implemented, repeatable, owner-led, and supported by evidence." },
  { value: 4, label: "4 - optimised", shortLabel: "4", description: "Governed, measured, reviewed, and continuously improved." },
] satisfies Array<{ value: number | null; label: string; shortLabel: string; description: string }>;

const evidenceStrengthOptions = [
  { value: "none", label: "No evidence", cap: 1, description: "No artifact or confirmation is available." },
  { value: "interview", label: "Interview only", cap: 2, description: "Claim or workshop response without an approved artifact." },
  { value: "documented", label: "Documented", cap: 3, description: "Approved policy, procedure, plan, RACI, or report sample." },
  { value: "system", label: "System evidence", cap: 4, description: "Dashboard, platform record, lineage, workflow, or telemetry evidence." },
  { value: "audited", label: "Audited", cap: 4, description: "Evidence has review history, controls, audit trail, or measured outcomes." },
] satisfies Array<{ value: EvidenceStrength; label: string; cap: number; description: string }>;

const emptyCustomerContext = {
  customerName: "",
  businessDomain: "",
  operatingScope: "",
  strategicPriorities: "",
  currentPainPoints: "",
  targetAudience: "",
  reportPurpose: "",
} satisfies CustomerContext;

const seedDatasetOptions = [
  {
    id: "interview-light",
    label: "Interview-light dataset",
    description: "Lower evidence depth, interview notes, weaker ownership proof, and more ad hoc scores.",
    scoreShift: -1,
    evidenceCap: "interview",
  },
  {
    id: "evidence-enriched",
    label: "Evidence-enriched dataset",
    description: "Balanced score pattern with documented evidence, named data domains, and actionable remediation notes.",
    scoreShift: 0,
    evidenceCap: "system",
  },
  {
    id: "board-ready",
    label: "Board-ready evidence pack",
    description: "Richer evidence wording, better governance artefacts, and stronger board-reporting readiness.",
    scoreShift: 1,
    evidenceCap: "audited",
  },
] satisfies Array<{
  id: SeedDatasetLevel;
  label: string;
  description: string;
  scoreShift: -1 | 0 | 1;
  evidenceCap: EvidenceStrength;
}>;

const seedProfiles = [
  {
    id: "nawah-real-estate",
    label: "Nawah Real Estate Investment Company",
    sector: "Real estate investment and development",
    context: {
      customerName: "Nawah Real Estate Investment Company",
      businessDomain: "real estate investment and development",
      operatingScope:
        "Privately held real estate investor and developer covering income-generating commercial and residential assets, active development projects, SPVs, investment, asset management, leasing, finance, and IT.",
      strategicPriorities:
        "Improve investment portfolio visibility, strengthen project and capex performance reporting, certify executive portfolio dashboards, and introduce governed AI use cases for occupancy, leasing, valuation, and asset risk insight.",
      currentPainPoints:
        "Asset, lease, tenant, capex, and project data are fragmented across PMS, CRM, ERP, and project controls; no unified asset or tenant identifier; reporting relies on Excel handovers; data ownership and Data Council cadence are not yet embedded.",
      targetAudience: "Board, Investment Committee, CEO, CFO, CIO, Head of Asset Management, Head of Development, proposed Data Council, and DMO Lead.",
      reportPurpose:
        "Establish a diagnostic baseline, prioritise 90-day DMO activation gaps, and define which analytics and AI use cases may proceed, pilot under controls, or be held.",
    },
    domainScores: {
      1: 2,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 2,
      7: 1,
      8: 1,
      9: 1,
      10: 2,
      11: 1,
      12: 1,
      13: 1,
    },
    domainEvidence: {
      1: "portfolio KPI workshop notes, draft investment reporting value map, and partially approved analytics priorities",
      2: "draft Data Council charter, informal asset data owner nominations, and unresolved decision-rights matrix",
      3: "PMS, ERP, CRM, project-controls, valuation, and treasury system list with incomplete interface evidence",
      4: "sample lease and asset extracts showing duplicate tenant records, missing unit IDs, and unresolved reconciliation defects",
      5: "draft KPI glossary for occupancy, NOI, IRR, yield, and capex, but limited lineage evidence",
      6: "executive portfolio dashboard prototype, Excel reconciliation samples, and competing KPI definitions",
      7: "candidate AI use-case list for occupancy, leasing, valuation, and risk insight without approved model-risk gate",
      8: "BI prototype, manual data extracts, and target reporting-layer options not yet approved",
      9: "proposed data owner and steward role list with limited adoption evidence",
      10: "access matrix and privacy checklist drafts for portfolio reporting datasets",
      11: "partial source inventory covering PMS, ERP, CRM, project controls, BIM, valuation, and treasury",
      12: "training needs notes for investment analysts, asset managers, finance users, and stewards",
      13: "stalled BI initiative lessons, draft 90-day backlog, and benefits tracking not yet approved",
    },
    domainActions: {
      1: "Confirm portfolio reporting outcomes, value cases, and investment committee decision metrics before sequencing DMO initiatives.",
      2: "Approve Data Council cadence, assign asset, lease, tenant, project, and investment data owners, and publish decision rights.",
      3: "Document current-state architecture and target reporting layer for PMS, ERP, CRM, and project controls integration.",
      4: "Create critical data element rules for asset, lease, tenant, valuation, capex, and project cost records.",
      5: "Publish KPI glossary and source-to-report lineage for occupancy, NOI, IRR, yield, and capex metrics.",
      6: "Certify one executive portfolio dashboard and retire competing Excel-based versions through controlled change.",
      7: "Gate AI candidates by business value, data readiness, lineage, explainability, model risk, and human review.",
      8: "Prioritise governed integration for the highest-volume PMS, ERP, CRM, and project-control handovers.",
      9: "Activate business data owner and steward responsibilities through a practical DMO operating cadence.",
      10: "Embed access, privacy, retention, and sensitive-data restrictions into reporting and AI use-case approval.",
      11: "Complete the source inventory with owners, refresh cadence, integration pattern, known issues, and reconciliation status.",
      12: "Create role-based enablement for portfolio analysts, asset managers, finance teams, and appointed data stewards.",
      13: "Convert gaps into a funded 0-30, 31-60, and 61-90 day DMO roadmap with owners and benefits tracking.",
    },
  },
  {
    id: "hayat-health-network",
    label: "Hayat Health Services Network",
    sector: "private healthcare operations",
    context: {
      customerName: "Hayat Health Services Network",
      businessDomain: "private healthcare operations and patient services",
      operatingScope:
        "Multi-site healthcare provider covering outpatient clinics, diagnostics, patient access, revenue cycle, pharmacy, workforce operations, finance, and IT.",
      strategicPriorities:
        "Improve patient access visibility, reduce revenue leakage, strengthen clinical and operational reporting, and pilot governed AI for demand forecasting, coding review, and patient-flow insight.",
      currentPainPoints:
        "Patient, appointment, claim, physician, and service-line data are split across HIS, CRM, billing, laboratory, pharmacy, and finance systems; definitions vary across sites; dashboard trust is inconsistent.",
      targetAudience: "Board, CEO, COO, CFO, Chief Medical Officer, CIO, Revenue Cycle Director, Operations Directors, Data Council, and DMO Lead.",
      reportPurpose:
        "Create a diagnostic baseline for data governance, operational reporting, and AI readiness across patient access, clinical operations, finance, and revenue-cycle decisions.",
    },
    domainScores: {
      1: 2,
      2: 2,
      3: 1,
      4: 1,
      5: 1,
      6: 2,
      7: 1,
      8: 2,
      9: 2,
      10: 2,
      11: 1,
      12: 2,
      13: 1,
    },
    domainEvidence: {
      1: "patient access KPI map, revenue-cycle improvement objectives, and draft service-line analytics priorities",
      2: "governance forum minutes, informal data ownership list, and unresolved cross-site KPI approval workflow",
      3: "HIS, CRM, billing, lab, pharmacy, and finance system landscape with partial integration evidence",
      4: "duplicate patient samples, appointment-status inconsistencies, and claim coding defect examples",
      5: "draft glossary for no-show rate, denial rate, average wait time, patient episode, and service-line margin",
      6: "operations dashboard extracts, manual reconciliation workbooks, and inconsistent site-level KPI definitions",
      7: "AI candidate list for demand forecasting, coding review, no-show prediction, and patient-flow support",
      8: "BI workspace, billing extracts, HIS reports, and early data-mart design notes",
      9: "role matrix for data owners, analysts, revenue-cycle SMEs, and operations champions",
      10: "privacy and access-control checklists for patient and claims datasets",
      11: "partial source inventory covering HIS, billing, CRM, lab, pharmacy, workforce, and finance",
      12: "training plan notes for analysts, operations managers, and data stewards",
      13: "improvement backlog and unresolved dependencies across patient access, revenue cycle, and reporting",
    },
    domainActions: {
      1: "Prioritise data initiatives around patient access, revenue-cycle leakage, clinical operations, and service-line profitability.",
      2: "Confirm Data Council authority for patient, appointment, claim, physician, and service-line definitions.",
      3: "Map source-to-report architecture across HIS, billing, CRM, lab, pharmacy, workforce, and finance.",
      4: "Stand up quality rules for patient identity, appointment status, claim code, service line, and physician master data.",
      5: "Publish KPI glossary and lineage for patient access, no-show, denial, wait-time, and margin indicators.",
      6: "Certify operational dashboards with owners, refresh cadence, and reconciliation rules across sites.",
      7: "Apply AI readiness gates before demand forecasting, coding review, no-show prediction, or patient-flow pilots.",
      8: "Define the governed reporting layer and retire unsupported manual extracts in priority workflows.",
      9: "Name accountable data owners and operational stewards for each high-value domain.",
      10: "Apply privacy, access, retention, and human-review controls to patient and claim data products.",
      11: "Complete the source inventory and refresh cadence for systems feeding board and operations dashboards.",
      12: "Train analysts, stewards, and operations leaders on definitions, evidence, and dashboard certification.",
      13: "Create a benefits-led 90-day roadmap tied to access, denial reduction, and reporting trust outcomes.",
    },
  },
  {
    id: "amana-utilities-group",
    label: "Amana Utilities Operations Group",
    sector: "utilities and municipal operations",
    context: {
      customerName: "Amana Utilities Operations Group",
      businessDomain: "utilities, field operations, and municipal service delivery",
      operatingScope:
        "Regional utilities operator covering network assets, field maintenance, customer service, outage response, contractors, billing, finance, and operational control rooms.",
      strategicPriorities:
        "Improve asset reliability, outage response visibility, contractor performance, customer-service reporting, and governed AI for work-order prioritisation and demand forecasting.",
      currentPainPoints:
        "Asset, meter, work-order, outage, contractor, customer, and billing data are fragmented across EAM, GIS, SCADA, CRM, billing, and field-service platforms; lineage and ownership are weak.",
      targetAudience: "Board, CEO, COO, CFO, CIO, Network Operations, Customer Service, Field Maintenance, Data Council, and DMO Lead.",
      reportPurpose:
        "Assess data and AI capability for operational reliability, customer service, asset reporting, and controlled analytics use-case activation.",
    },
    domainScores: {
      1: 2,
      2: 1,
      3: 2,
      4: 1,
      5: 1,
      6: 2,
      7: 1,
      8: 2,
      9: 1,
      10: 2,
      11: 1,
      12: 1,
      13: 1,
    },
    domainEvidence: {
      1: "asset reliability objectives, outage KPI targets, and draft operational analytics value cases",
      2: "informal owner nominations for asset, outage, meter, work-order, and customer data",
      3: "EAM, GIS, SCADA, CRM, billing, and field-service architecture sketches with partial interface mapping",
      4: "asset hierarchy defects, meter-location mismatches, and work-order closure inconsistencies",
      5: "draft glossary for outage duration, response SLA, asset class, contractor productivity, and billing exceptions",
      6: "control-room reports, field-service dashboards, and Excel reconciliations for SLA and outage indicators",
      7: "candidate analytics for work-order priority, outage prediction, demand forecasting, and contractor performance",
      8: "BI workspace, operational data extracts, and integration backlog for EAM, GIS, SCADA, and CRM",
      9: "draft operating model for data owners, dispatch analysts, field supervisors, and stewards",
      10: "access matrix and operational data security review notes",
      11: "partial inventory of EAM, GIS, SCADA, CRM, billing, and contractor data flows",
      12: "training needs for field supervisors, analysts, and data stewards",
      13: "roadmap backlog with unresolved dependency and benefits tracking gaps",
    },
    domainActions: {
      1: "Prioritise data work around asset reliability, outage response, customer service, contractor productivity, and billing trust.",
      2: "Approve ownership for asset, outage, meter, work-order, customer, contractor, and billing data.",
      3: "Map target architecture across EAM, GIS, SCADA, CRM, billing, and field-service workflows.",
      4: "Define quality rules for asset hierarchy, meter location, outage event, work-order closure, and SLA records.",
      5: "Publish operational glossary and source lineage for reliability, SLA, contractor, and billing indicators.",
      6: "Certify control-room and executive operations dashboards with refresh cadence and reconciliation rules.",
      7: "Gate AI candidates for work-order priority, outage prediction, demand forecasting, and contractor risk.",
      8: "Sequence integration fixes for EAM, GIS, SCADA, CRM, billing, and field-service data flows.",
      9: "Activate steward roles across network operations, customer service, field maintenance, finance, and IT.",
      10: "Embed security, access, audit, and human-review controls into operational analytics workflows.",
      11: "Complete source inventory and lineage for priority outage, asset, customer, and billing reports.",
      12: "Train operations analysts and stewards on definitions, evidence standards, and dashboard certification.",
      13: "Convert reliability and customer-service gaps into a funded 90-day roadmap with measurable benefits.",
    },
  },
] satisfies DiagnosticSeedProfile[];

function initialState() {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => [
      question.id,
      {
        score: question.score,
        evidenceStrength: "none",
        evidenceAvailable: question.evidenceAvailable,
        notes: question.notes,
        actionPlan: question.actionPlan,
      } satisfies QuestionState,
    ]),
  ) as Record<string, QuestionState>;
}

function evidenceStrengthForScore(score: number): EvidenceStrength {
  if (score >= 4) return "audited";
  if (score >= 3) return "system";
  if (score >= 2) return "documented";
  if (score >= 1) return "interview";
  return "none";
}

function evidenceRank(value: EvidenceStrength) {
  return evidenceStrengthOptions.findIndex((option) => option.value === value);
}

function capEvidenceStrength(value: EvidenceStrength, cap: EvidenceStrength) {
  return evidenceRank(value) > evidenceRank(cap) ? cap : value;
}

function seedScoreForQuestion(profile: DiagnosticSeedProfile, dataset: typeof seedDatasetOptions[number], question: DataAiDiagnosticQuestion) {
  const base = profile.domainScores[question.domainId] ?? 1;
  const variation = question.number % 7 === 0 ? -1 : question.number % 6 === 0 ? 1 : 0;
  const score = base + dataset.scoreShift + variation;
  return Math.max(0, Math.min(4, score));
}

function evidenceStrengthForSeed(score: number, dataset: typeof seedDatasetOptions[number]) {
  return capEvidenceStrength(evidenceStrengthForScore(score), dataset.evidenceCap);
}

function seededEvidenceForQuestion(
  profile: DiagnosticSeedProfile,
  dataset: typeof seedDatasetOptions[number],
  question: DataAiDiagnosticQuestion,
  score: number,
) {
  const domainEvidence = profile.domainEvidence[question.domainId] ?? "workshop notes and open evidence requests";
  if (dataset.id === "interview-light") {
    return `Interview seed: ${domainEvidence}. Evidence is mostly workshop-confirmed and still needs approved artefacts for ${question.domainEn}. Required evidence: ${question.evidenceRequired}.`;
  }
  if (dataset.id === "board-ready") {
    return `Board-ready seed: ${domainEvidence}, owner sign-off, dated evidence register entry, and steering-review trace. Score ${score}/4 reflects the available evidence for ${question.domainEn}. Required evidence: ${question.evidenceRequired}.`;
  }
  return `Evidence-enriched seed: ${domainEvidence}, draft owner confirmation, sample artefact, and remediation note for ${question.domainEn}. Required evidence: ${question.evidenceRequired}.`;
}

function seededActionByDomain(domainName: string) {
  const name = domainName.toLowerCase();
  if (name.includes("quality") || name.includes("master")) {
    return "Assign a data-quality owner, define critical data elements, publish validation rules, and track defect remediation through monthly governance.";
  }
  if (name.includes("source") || name.includes("flow")) {
    return "Create the critical-source inventory, confirm system owners, document refresh cadence, and map source-to-report lineage for priority decisions.";
  }
  if (name.includes("execution") || name.includes("roadmap") || name.includes("value measurement")) {
    return "Convert the gap into a benefits-led roadmap with initiative owners, dependency log, funding route, milestones, and steering review cadence.";
  }
  if (name.includes("strategy") || name.includes("business value")) {
    return "Confirm strategic data outcomes, value cases, prioritisation criteria, and the decision route for funding and sequencing initiatives.";
  }
  if (name.includes("people") || name.includes("capabil") || name.includes("training")) {
    return "Define role-based capability paths for owners, stewards, analysts, and AI users, then link training evidence to operating responsibilities.";
  }
  if (name.includes("governance") || name.includes("operating model")) {
    return "Approve data-council decision rights, RACI, policy ownership, issue escalation, and evidence approval workflow.";
  }
  if (name.includes("metadata") || name.includes("catalogue") || name.includes("lineage")) {
    return "Create glossary entries, catalogue priority datasets, map lineage, and certify ownership for high-value reports and data products.";
  }
  if (name.includes("artificial intelligence") || name.includes("use cases")) {
    return "Gate AI candidates by data quality, privacy, lineage, owner approval, model-risk controls, and human review requirements.";
  }
  if (name.includes("architecture") || name.includes("infrastructure") || name.includes("tools") || name.includes("platform")) {
    return "Document current platforms, integration patterns, target architecture, control gaps, and enabling investments for governed analytics.";
  }
  if (name.includes("report") || name.includes("dashboard") || name.includes("analytics")) {
    return "Rationalise dashboards around certified KPI definitions, report owners, release controls, and executive usage evidence.";
  }
  if (name.includes("privacy") || name.includes("security") || name.includes("compliance")) {
    return "Embed privacy, access, retention, auditability, and AI-use restrictions into the data and AI delivery gate.";
  }
  return "Assign an accountable owner, confirm required evidence, define target state, and track closure through the governance cadence.";
}

function seededActionForQuestion(profile: DiagnosticSeedProfile, dataset: typeof seedDatasetOptions[number], question: DataAiDiagnosticQuestion, score: number) {
  const gap = Math.max(question.target - score, 0);
  const action = profile.domainActions[question.domainId] ?? seededActionByDomain(question.domainEn);
  const datasetPrefix =
    dataset.id === "interview-light"
      ? "Confirm evidence and ownership first:"
      : dataset.id === "board-ready"
        ? "Move from diagnostic to governed execution:"
        : "Prioritise the next remediation wave:";
  if (gap >= 2) {
    return `${datasetPrefix} ${action}`;
  }
  if (gap === 1) {
    return `${datasetPrefix} strengthen evidence completeness for ${question.domainEn}, confirm accountable sign-off, and move the control from defined to managed maturity.`;
  }
  return `${datasetPrefix} maintain evidence, monitor benefits, and review ${question.domainEn} in the next assessment cycle.`;
}

function seededState(profile: DiagnosticSeedProfile, dataset: typeof seedDatasetOptions[number]) {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => {
      const score = seedScoreForQuestion(profile, dataset, question);
      return [
        question.id,
        {
          score,
          evidenceStrength: evidenceStrengthForSeed(score, dataset),
          evidenceAvailable: seededEvidenceForQuestion(profile, dataset, question, score),
          notes: `${dataset.label} for ${profile.label}. Replace with validated interview notes, artefact links, and owner approvals before production use.`,
          actionPlan: seededActionForQuestion(profile, dataset, question, score),
        } satisfies QuestionState,
      ];
    }),
  ) as Record<string, QuestionState>;
}

function scoreGap(question: DataAiDiagnosticQuestion, state: QuestionState) {
  if (state.score === null) {
    return null;
  }
  return Math.max(question.target - state.score, 0);
}

function priorityForGap(gap: number | null): DomainSummary["priority"] {
  if (gap === null) return "not_scored";
  if (gap >= 3) return "critical";
  if (gap >= 2) return "high";
  if (gap >= 1) return "medium";
  return "watch";
}

function formatScore(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normaliseGeneratedReport(report: unknown): GeneratedConsultingReport {
  if (!report || typeof report !== "object") {
    return {};
  }
  const candidate = report as Record<string, unknown>;
  return {
    executiveSummary: asText(candidate.executiveSummary),
    overallAdvisoryNarrative: asText(candidate.overallAdvisoryNarrative),
    boardScorecardNarrative: asText(candidate.boardScorecardNarrative),
    headlineAssessment: asText(candidate.headlineAssessment),
    readinessThesis: asText(candidate.readinessThesis),
    boardMessage: asText(candidate.boardMessage),
    boardAsks: asStringList(candidate.boardAsks),
    gartnerPillarAssessment: asStringList(candidate.gartnerPillarAssessment),
    materialFindings: asStringList(candidate.materialFindings),
    domainActionPlan: asStringList(candidate.domainActionPlan),
    priorityGapRegister: asStringList(candidate.priorityGapRegister),
    recommendedDecisions: asStringList(candidate.recommendedDecisions),
    ninetyDayPlan: asStringList(candidate.ninetyDayPlan),
    roadmapPhases: asStringList(candidate.roadmapPhases),
    aiReadinessGate: asText(candidate.aiReadinessGate),
    aiGateProceed: asStringList(candidate.aiGateProceed),
    aiGatePilotWithControls: asStringList(candidate.aiGatePilotWithControls),
    aiGateHold: asStringList(candidate.aiGateHold),
    risks: asStringList(candidate.risks),
    nextSteps: asStringList(candidate.nextSteps),
  };
}

function scoreWidth(value: number | null) {
  if (value === null) return "0%";
  return `${Math.max(0, Math.min(100, (value / 4) * 100))}%`;
}

function buildDomainSummaries(stateByQuestion: Record<string, QuestionState>): DomainSummary[] {
  return dataAiDiagnosticDomains.map((domain) => {
    const questions = dataAiDiagnosticQuestions.filter((question) => question.domainId === domain.id);
    const scored = questions.filter((question) => stateByQuestion[question.id]?.score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) / scored.length
        : null;
    const avgGap =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) / scored.length
        : null;
    return {
      ...domain,
      total: questions.length,
      scored: scored.length,
      avgScore,
      avgGap,
      priority: priorityForGap(avgGap),
    };
  });
}

function buildGartnerPillarSummaries(stateByQuestion: Record<string, QuestionState>): GartnerPillarSummary[] {
  return gartnerPillars.map((pillar) => {
    const questions = dataAiDiagnosticQuestions.filter((question) => pillar.domainIds.includes(question.domainId));
    const scored = questions.filter((question) => stateByQuestion[question.id]?.score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) / scored.length
        : null;
    const avgGap =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) / scored.length
        : null;
    const evidenceBacked = questions.filter((question) => {
      const state = stateByQuestion[question.id];
      return state?.score !== null && state.evidenceStrength !== "none" && state.evidenceAvailable.trim();
    }).length;
    return {
      ...pillar,
      total: questions.length,
      scored: scored.length,
      avgScore,
      avgGap,
      evidenceBacked,
      evidenceCoveragePct: questions.length ? Math.round((evidenceBacked / questions.length) * 100) : 0,
      priority: priorityForGap(avgGap),
    };
  });
}

function statusForQuestion(question: DataAiDiagnosticQuestion, state: QuestionState) {
  return priorityForGap(scoreGap(question, state));
}

function evidenceCap(strength: EvidenceStrength) {
  return evidenceStrengthOptions.find((option) => option.value === strength)?.cap ?? 1;
}

function evidenceWarning(state: QuestionState) {
  if (state.score === null) {
    return "";
  }
  const cap = evidenceCap(state.evidenceStrength);
  if (state.score > cap) {
    return `Evidence strength usually supports a maximum score of ${cap}. Add stronger evidence or lower the score.`;
  }
  if (state.score >= 3 && !state.evidenceAvailable.trim()) {
    return "Scores 3-4 should include the specific evidence artifact, owner confirmation, or system record.";
  }
  return "";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function maturityLabel(value: number | null) {
  if (value === null) return "Not assessed";
  if (value < 1) return "Absent";
  if (value < 2) return "Ad hoc";
  if (value < 3) return "Defined";
  if (value < 3.6) return "Managed";
  return "Optimised";
}

function maturityProfilePhrase(value: number | null) {
  const label = maturityLabel(value).toLowerCase();
  if (label === "ad hoc" || label === "absent" || label === "optimised") {
    return `an ${label}`;
  }
  return `a ${label}`;
}

function domainActionForSummary(summary: DomainSummary) {
  const name = summary.nameEn.toLowerCase();
  const gap = summary.avgGap === null ? "unknown gap" : `${summary.avgGap.toFixed(1)} gap`;
  const prefix = `${summary.nameEn} (${gap}):`;

  if (summary.priority === "not_scored") {
    return `${prefix} capture baseline score, evidence note, evidence strength, and accountable owner before this domain is used in the report.`;
  }
  if (name.includes("quality") || name.includes("master")) {
    return `${prefix} appoint data-quality owner, define critical data elements, publish validation rules, log defects, and track monthly remediation closure.`;
  }
  if (name.includes("source") || name.includes("flow")) {
    return `${prefix} certify critical source inventory, system owners, refresh cadence, lineage, and unsupported manual exchanges before approving new reporting or AI use cases.`;
  }
  if (name.includes("strategy") || name.includes("business value")) {
    return `${prefix} confirm strategic data outcomes, value cases, prioritisation criteria, and the decision route for funding and sequencing initiatives.`;
  }
  if (name.includes("execution") || name.includes("roadmap") || name.includes("value measurement")) {
    return `${prefix} convert gaps into a benefits-led roadmap with initiative owners, dependencies, milestones, funding route, and steering committee cadence.`;
  }
  if (name.includes("people") || name.includes("capabil") || name.includes("training")) {
    return `${prefix} define role-based capability paths for owners, stewards, analysts, and AI users, tied to operating responsibilities.`;
  }
  if (name.includes("governance") || name.includes("operating model")) {
    return `${prefix} approve data-council decision rights, RACI, policy ownership, issue escalation, and evidence approval workflow.`;
  }
  if (name.includes("metadata") || name.includes("catalogue") || name.includes("lineage")) {
    return `${prefix} create glossary entries, catalogue priority datasets, map source-to-report lineage, and certify ownership for high-value reports.`;
  }
  if (name.includes("artificial intelligence") || name.includes("use cases")) {
    return `${prefix} gate AI candidates by data quality, privacy, lineage, owner approval, model-risk controls, and human review requirements.`;
  }
  if (name.includes("architecture") || name.includes("infrastructure") || name.includes("tools") || name.includes("platform")) {
    return `${prefix} document current platforms, integration patterns, target architecture, control gaps, and enabling investments for governed analytics.`;
  }
  if (name.includes("report") || name.includes("dashboard") || name.includes("analytics")) {
    return `${prefix} rationalise dashboards around certified KPI definitions, report owners, release controls, and executive usage evidence.`;
  }
  if (name.includes("privacy") || name.includes("security") || name.includes("compliance")) {
    return `${prefix} embed privacy, access, retention, auditability, and AI-use restrictions into the delivery gate.`;
  }
  if (summary.priority === "critical") {
    return `${prefix} secure executive owner, recover evidence, define target state, and track weekly closure until the domain exits critical status.`;
  }
  if (summary.priority === "high") {
    return `${prefix} assign domain owner, close control gaps in the 90-day plan, and report progress through the data council.`;
  }
  if (summary.priority === "medium") {
    return `${prefix} strengthen evidence, standardise operating cadence, and confirm quarterly improvement targets.`;
  }
  return `${prefix} maintain evidence, monitor exceptions, and confirm control health during quarterly review.`;
}

function readinessThesis(value: number | null) {
  if (value === null) {
    return "Readiness cannot be confirmed until assessment scores and evidence are captured.";
  }
  if (value < 2) {
    return "The organisation is not yet ready to scale predictive or generative AI beyond tightly controlled advisory use cases.";
  }
  if (value < 3) {
    return "The organisation can proceed with governed reporting and selected diagnostic analytics while closing data quality, evidence, and ownership gaps.";
  }
  return "The organisation can progress selected AI use cases through formal model governance, provided risk controls and evidence remain active.";
}

function parseMarkdownReport(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let pendingList: { type: "ul" | "ol"; items: string[] } | null = null;
  const cleanMarkdown = markdown
    .replace(/<!--\s*opencare:evidence[\s\S]*?-->/gi, "")
    .replace(/<!--\s*opencare:evidence[\s\S]*$/gi, "")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, "\"")
    .replace(/\u00e2\u20ac\u009d/g, "\"")
    .replace(/\u00c2\u00a0/g, " ");

  const flushList = () => {
    if (pendingList?.items.length) {
      blocks.push(pendingList);
    }
    pendingList = null;
  };

  cleanMarkdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("<!--")) {
      flushList();
      return;
    }

    if (line.startsWith("|")) {
      if (/^\|?[\s:|-]+\|?$/.test(line)) {
        return;
      }
      if (pendingList?.type !== "ul") {
        flushList();
        pendingList = { type: "ul", items: [] };
      }
      const tableText = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(" - ");
      if (tableText) {
        pendingList.items.push(tableText);
      }
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (pendingList?.type !== "ol") {
        flushList();
        pendingList = { type: "ol", items: [] };
      }
      pendingList.items.push(orderedMatch[1]);
      return;
    }

    if (line.startsWith("- ")) {
      if (pendingList?.type !== "ul") {
        flushList();
        pendingList = { type: "ul", items: [] };
      }
      pendingList.items.push(line.slice(2));
      return;
    }

    flushList();
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
    } else {
      blocks.push({ type: "p", text: line });
    }
  });
  flushList();
  return blocks;
}

function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownReport({ markdown, source }: { markdown: string; source: "llm" | "fallback" | null }) {
  const blocks = parseMarkdownReport(markdown);
  return (
    <article className="data-ai-report-page data-ai-generated-report data-ai-markdown-report">
      <div className="data-ai-report-page-header">
        <p className="eyebrow">AI-Authored Advisory</p>
        <h2>Consulting report generated as Markdown</h2>
        <span className={`data-ai-report-source ${source === "fallback" ? "fallback" : "llm"}`}>
          {source === "fallback" ? "Deterministic fallback" : "AI2 model authored"}
        </span>
      </div>
      <div className="data-ai-markdown-body">
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`;
          switch (block.type) {
            case "h1":
              return <h2 key={key}>{renderInlineMarkdown(block.text)}</h2>;
            case "h2":
              return <h3 key={key}>{renderInlineMarkdown(block.text)}</h3>;
            case "h3":
              return <h4 key={key}>{renderInlineMarkdown(block.text)}</h4>;
            case "ul":
              return (
                <ul key={key}>
                  {block.items.map((item, itemIndex) => (
                    <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={key}>
                  {block.items.map((item, itemIndex) => (
                    <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                  ))}
                </ol>
              );
            case "p":
            default:
              return <p key={key}>{renderInlineMarkdown(block.text)}</p>;
          }
        })}
      </div>
    </article>
  );
}

export function DataAiDiagnosticWorkspace() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("capture");
  const [selectedDomain, setSelectedDomain] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [stateByQuestion, setStateByQuestion] = useState(initialState);
  const [customerContext, setCustomerContext] = useState<CustomerContext>(emptyCustomerContext);
  const [generatedReport, setGeneratedReport] = useState<GeneratedConsultingReport | null>(null);
  const [generatedMarkdownReport, setGeneratedMarkdownReport] = useState<string | null>(null);
  const [generatedMarkdownReportSource, setGeneratedMarkdownReportSource] = useState<"llm" | "fallback" | null>(null);
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "ready" | "missing_key" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");
  const [reportStageIndex, setReportStageIndex] = useState(0);
  const [reportFailureLog, setReportFailureLog] = useState<{
    timestamp: string;
    stage: string;
    status: string;
    message: string;
    model: string;
    endpoint: string;
    details: string[];
  } | null>(null);
  const [handoffMessage, setHandoffMessage] = useState("");
  const [selectedSeedProfileId, setSelectedSeedProfileId] = useState<SeedProfileId>("nawah-real-estate");
  const [selectedSeedDatasetLevel, setSelectedSeedDatasetLevel] = useState<SeedDatasetLevel>("evidence-enriched");

  const summaries = useMemo(() => buildDomainSummaries(stateByQuestion), [stateByQuestion]);
  const gartnerSummaries = useMemo(() => buildGartnerPillarSummaries(stateByQuestion), [stateByQuestion]);
  const totalQuestions = dataAiDiagnosticQuestions.length;
  const scoredQuestions = dataAiDiagnosticQuestions.filter((question) => stateByQuestion[question.id]?.score !== null).length;
  const overallScore =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) /
        scoredQuestions
      : null;
  const overallGap =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) /
        scoredQuestions
      : null;
  const criticalItems = dataAiDiagnosticQuestions.filter((question) => {
    const priority = statusForQuestion(question, stateByQuestion[question.id]);
    return priority === "critical" || priority === "high";
  });

  const filteredQuestions = dataAiDiagnosticQuestions.filter((question) => {
    const matchesDomain = selectedDomain === "all" || question.domainId === selectedDomain;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      question.questionEn.toLowerCase().includes(query) ||
      question.questionAr.toLowerCase().includes(query) ||
      question.evidenceRequired.toLowerCase().includes(query) ||
      question.domainEn.toLowerCase().includes(query);
    return matchesDomain && matchesSearch;
  });

  const rankedGaps = [...dataAiDiagnosticQuestions]
    .map((question) => ({
      question,
      state: stateByQuestion[question.id],
      gap: scoreGap(question, stateByQuestion[question.id]),
      priority: statusForQuestion(question, stateByQuestion[question.id]),
    }))
    .filter((item) => item.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0) || a.question.number - b.question.number);

  const updateQuestion = (questionId: string, patch: Partial<QuestionState>) => {
    setStateByQuestion((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }));
  };

  const selectedSeedProfile = seedProfiles.find((profile) => profile.id === selectedSeedProfileId) ?? seedProfiles[0];
  const selectedSeedDataset = seedDatasetOptions.find((dataset) => dataset.id === selectedSeedDatasetLevel) ?? seedDatasetOptions[1];

  const seedDummyData = () => {
    setStateByQuestion(seededState(selectedSeedProfile, selectedSeedDataset));
    setCustomerContext(selectedSeedProfile.context);
    setGeneratedReport(null);
    setGeneratedMarkdownReport(null);
    setGeneratedMarkdownReportSource(null);
    setReportStatus("idle");
    setReportMessage("");
    setReportFailureLog(null);
    setHandoffMessage(`Seeded ${selectedSeedProfile.label} with ${selectedSeedDataset.label.toLowerCase()}.`);
  };

  const resetCapture = () => {
    setStateByQuestion(initialState());
    setCustomerContext(emptyCustomerContext);
    setGeneratedReport(null);
    setGeneratedMarkdownReport(null);
    setGeneratedMarkdownReportSource(null);
    setReportStatus("idle");
    setReportMessage("");
    setReportStageIndex(0);
    setReportFailureLog(null);
    clearLatestDiagnosticStrategyHandoff();
    setHandoffMessage("Strategy handoff cleared locally.");
  };

  const updateCustomerContext = (field: keyof CustomerContext, value: string) => {
    setCustomerContext((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const downloadDummyDataFile = () => {
    const seededStateByQuestion = seededState(selectedSeedProfile, selectedSeedDataset);
    const contextRows = Object.entries(selectedSeedProfile.context).map(([field, value]) => ({
      record_type: "customer_context",
      profile: selectedSeedProfile.label,
      dataset_level: selectedSeedDataset.label,
      field,
      value,
    }));
    const rows = dataAiDiagnosticQuestions.map((question) => {
      const state = seededStateByQuestion[question.id];
      return {
        record_type: "assessment_question",
        profile: selectedSeedProfile.label,
        dataset_level: selectedSeedDataset.label,
        field: question.id,
        value: "",
        question_id: question.id,
        question_number: question.number,
        domain_id: question.domainId,
        domain: question.domainEn,
        question: question.questionEn,
        score: state.score,
        target: question.target,
        gap: scoreGap(question, state),
        evidence_strength: state.evidenceStrength,
        evidence_available: state.evidenceAvailable,
        action_plan: state.actionPlan,
        notes: state.notes,
      };
    });
    const headers = Array.from(new Set([...Object.keys(contextRows[0] ?? {}), ...Object.keys(rows[0] ?? {})]));
    const csv = [
      headers.join(","),
      ...[...contextRows, ...rows].map((row) =>
        headers.map((header) => csvCell(row[header as keyof typeof row])).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `data-ai-diagnostic-${selectedSeedProfile.id}-${selectedSeedDataset.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    setActiveTab("report");
    window.setTimeout(() => window.print(), 100);
  };

  const topGapDomains = summaries
    .filter((summary) => summary.avgGap !== null)
    .sort((a, b) => (b.avgGap ?? 0) - (a.avgGap ?? 0))
    .slice(0, 3);
  const assessedDomains = summaries.filter((summary) => summary.scored > 0);
  const strongestDomains = [...assessedDomains]
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 3);
  const evidenceBackedItems = dataAiDiagnosticQuestions.filter((question) => {
    const state = stateByQuestion[question.id];
    return state?.score !== null && state?.evidenceStrength !== "none" && state?.evidenceAvailable.trim();
  }).length;
  const maturityPct = overallScore === null ? 0 : Math.round((overallScore / 4) * 100);
  const evidenceCoveragePct = totalQuestions ? Math.round((evidenceBackedItems / totalQuestions) * 100) : 0;
  const assessedCoveragePct = totalQuestions ? Math.round((scoredQuestions / totalQuestions) * 100) : 0;
  const domainsRequiringAction = summaries.filter((summary) => summary.priority === "critical" || summary.priority === "high");
  const reportDomainRows = [...summaries].sort((a, b) => (b.avgGap ?? -1) - (a.avgGap ?? -1));
  const topPriorityGaps = rankedGaps.slice(0, 8);
  const reportDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date());
  const reportCustomerName = customerContext.customerName.trim() || "Customer organisation";
  const reportBusinessDomain = customerContext.businessDomain.trim() || "Business domain not specified";
  const reportSubtitle = customerContext.reportPurpose.trim()
    || "Executive readiness assessment, maturity heatmap, remediation roadmap, and AI-governance decision pack.";
  const reportNavItems = [
    ["summary", "Summary"],
    ["scorecard", "Scorecard"],
    ["heatmap", "Heatmap"],
    ["gartner", "Gartner lens"],
    ["actions", "Action plan"],
    ["gaps", "Gap register"],
    ["roadmap", "Roadmap"],
    ["gate", "AI gate"],
  ];
  const reportWorkstreams = [
    "Data governance operating model",
    "Data quality and master data controls",
    "Catalogue, metadata, and lineage",
    "Reporting inventory and KPI certification",
    "AI risk, privacy, and model governance",
    "Use-case prioritisation and benefits tracking",
  ];
  const reportGenerationStages = [
    "Preparing diagnostic payload",
    "Sending request to local AI gateway",
    "Generating consulting narrative with local model",
    "Parsing advisory sections",
    "Saving Module 02 strategy handoff",
    "Report ready",
  ];

  const generateConsultingReport = async () => {
    setReportStatus("loading");
    setReportMessage("");
    setReportStageIndex(0);
    setReportFailureLog(null);
    setHandoffMessage("");
    let generationTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const captureFailure = (status: string, message: string, details: string[] = [], stageIndex = reportStageIndex) => {
      setReportFailureLog({
        timestamp: new Date().toISOString(),
        stage: reportGenerationStages[Math.min(stageIndex, reportGenerationStages.length - 1)] ?? "Unknown stage",
        status,
        message,
        model: "llama3.1:8b via ai.opendatalake.com",
        endpoint: "/api/data-ai-diagnostic/report",
        details: [
          `Elapsed: ${Math.round((Date.now() - startedAt) / 1000)}s`,
          `Questions scored: ${scoredQuestions}/${totalQuestions}`,
          `Evidence-backed items: ${evidenceBackedItems}/${totalQuestions}`,
          `Top gap domains: ${topGapDomains.map((domain) => domain.nameEn).join(", ") || "none"}`,
          ...details,
        ],
      });
    };
    try {
      setReportStageIndex(1);
      generationTimer = setTimeout(() => {
        setReportStageIndex(2);
      }, 1200);
      const response = await fetch("/api/data-ai-diagnostic/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerContext,
          overallScore,
          overallGap,
          scoredQuestions,
          totalQuestions,
          evidenceBackedItems,
          topGapDomains,
          strongestDomains,
          gartnerPillars: gartnerSummaries.map((pillar) => ({
            name: pillar.name,
            score: pillar.avgScore,
            gap: pillar.avgGap,
            priority: priorityLabels[pillar.priority],
            scored: pillar.scored,
            total: pillar.total,
            evidenceCoveragePct: pillar.evidenceCoveragePct,
            mappedDomains: pillar.domainIds
              .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
              .filter(Boolean),
            decisionQuestion: pillar.decisionQuestion,
            managementAction: pillar.managementAction,
          })),
          priorityGaps: rankedGaps.slice(0, 10).map(({ question, state, gap }) => ({
            question: question.questionEn,
            domain: question.domainEn,
            score: state.score,
            gap,
            evidenceStrength: state.evidenceStrength,
            actionPlan: state.actionPlan,
          })),
        }),
      });
      if (generationTimer) {
        clearTimeout(generationTimer);
      }
      setReportStageIndex(3);
      let result: DiagnosticReportApiResponse;
      try {
        result = (await response.json()) as DiagnosticReportApiResponse;
      } catch {
        setReportStatus("error");
        const message = `AI report generation returned a non-JSON response (${response.status}).`;
        setReportMessage(message);
        captureFailure(String(response.status), message, [
          "The portal API response could not be parsed as JSON.",
          "Check portal logs for the upstream gateway response body.",
        ], 3);
        return;
      }
      if (!response.ok || result.status !== "ready") {
        setReportStatus(result.status === "missing_key" ? "missing_key" : "error");
        const message = result.message ?? `AI report generation failed (${response.status}).`;
        setReportMessage(message);
        captureFailure(String(response.status), message, [
          `API status: ${result.status ?? "unknown"}`,
          `Gateway: ${result.gateway ?? "not returned"}`,
          `Model: ${result.model ?? "not returned"}`,
          ...(Array.isArray(result.details) ? result.details : []),
          "If this is a timeout, reduce the prompt size or generate the report section by section.",
        ], 3);
        return;
      }
      setReportStageIndex(4);
      const normalisedReport = normaliseGeneratedReport(result.report);
      const handoff = buildDiagnosticStrategyHandoff({
        customerContext,
        overallScore,
        overallGap,
        maturityLabel: maturityLabel(overallScore),
        readinessScorePct: overallScore === null ? null : Math.round((overallScore / 4) * 100),
        questionsScored: scoredQuestions,
        totalQuestions,
        domainsAssessed: assessedDomains.length,
        totalDomains: summaries.length,
        evidenceBackedResponses: evidenceBackedItems,
        totalResponses: totalQuestions,
        evidenceCoveragePct,
        domainSummaries: summaries,
        gartnerSummaries: gartnerSummaries.map((pillar) => ({
          pillarName: pillar.name,
          score: pillar.avgScore,
          gap: pillar.avgGap,
          priority: priorityLabels[pillar.priority],
          decisionQuestion: pillar.decisionQuestion,
          managementAction: pillar.managementAction,
          mappedDomains: pillar.domainIds
            .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
            .filter((domainName): domainName is string => Boolean(domainName)),
        })),
        priorityGaps: rankedGaps.slice(0, 10).map(({ question, state, gap, priority }) => ({
          question: question.questionEn,
          domain: question.domainEn,
          score: state.score,
          gap,
          evidence: state.evidenceAvailable || state.evidenceStrength,
          action: state.actionPlan,
          severity: priorityLabels[priority],
        })),
        generatedReport: normalisedReport,
      });
      saveLatestDiagnosticStrategyHandoff(handoff);
      setGeneratedReport(normalisedReport);
      setGeneratedMarkdownReport(typeof result.markdownReport === "string" && result.markdownReport.trim()
        ? result.markdownReport
        : null);
      setGeneratedMarkdownReportSource(result.markdownReportSource ?? null);
      setReportStageIndex(5);
      setReportStatus("ready");
      const fallbackSections = result.sectionFallbacks ?? [];
      const repairedSections = result.repairedSections ?? [];
      const fallbackFields = result.fieldFallbacks ?? [];
      const enrichedFields = result.enrichedFields ?? [];
      setReportMessage(result.markdownReportSource === "llm"
        ? `${result.message ?? "AI2 generated the Markdown consulting report."} Strategy handoff saved locally.`
        : result.fallback
          ? `${result.message ?? "AI2 Markdown generation did not complete; deterministic report fallback was used."} Strategy handoff saved locally.`
        : fallbackFields.length > 0
          ? `Report JSON was built deterministically. ${fallbackFields.length} optional narrative field${fallbackFields.length === 1 ? "" : "s"} used fallback: ${fallbackFields.join(", ")}. Strategy handoff saved locally.`
          : enrichedFields.length > 0
            ? `Report JSON was built deterministically and ${enrichedFields.length} narrative field${enrichedFields.length === 1 ? "" : "s"} were safely enriched by ${result.model ?? "configured local model"}. Strategy handoff saved locally.`
            : fallbackSections.length > 0
          ? `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validation. ${fallbackSections.length} section${fallbackSections.length === 1 ? "" : "s"} used deterministic fallback: ${fallbackSections.join(", ")}. Strategy handoff saved locally.`
          : repairedSections.length > 0
            ? `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validation. ${repairedSections.length} section${repairedSections.length === 1 ? "" : "s"} required JSON repair. Strategy handoff saved locally.`
            : `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validated JSON. Strategy handoff saved locally.`);
      setHandoffMessage("Diagnostic completed - available to Data Strategy Builder");
    } catch (error) {
      if (generationTimer) {
        clearTimeout(generationTimer);
      }
      setReportStatus("error");
      const message = error instanceof Error ? error.message : "Unable to reach the report generation API.";
      setReportMessage(message);
      captureFailure("client_exception", message, [
        "The browser could not complete the request to the portal report API.",
        "Check browser network details and portal logs.",
      ], reportStageIndex);
    }
  };

  return (
    <main className="page data-ai-diagnostic-page">
      <header className="data-ai-dmo-header">
        <Link className="data-ai-dmo-brand" href="/use-cases/data-management-office-establishment">
          <span aria-hidden="true">Y</span>
          <span>
            <strong>Yottalogica</strong>
            <small>Data Management Advisory</small>
          </span>
        </Link>
        <div className="data-ai-dmo-header-actions">
          <Link href="/use-cases/data-management-office-establishment">Return to DMO home</Link>
          <a href="#diagnostic-workbench">Continue assessment</a>
        </div>
      </header>

      <section className="data-ai-hero">
        <div>
          <p className="eyebrow">Module 01 - DMO Establishment Pathway</p>
          <h1>Data & AI Capability Diagnostic</h1>
          <p>
            A bilingual assessment and AI reporting workspace for capturing maturity evidence, scoring capability gaps,
            prioritising remediation, and producing executive-ready diagnostic outputs for the wider DMO establishment
            programme.
          </p>
          <div className="data-ai-chip-row">
            <span>84 workbook questions</span>
            <span>13 maturity domains</span>
            <span>AI report draft</span>
            <span>Capture first - connect APIs later</span>
          </div>
        </div>
        <div className="data-ai-hero-panel">
          <span className="data-ai-mode-chip">Workbook seeded</span>
          <strong>{formatScore(overallScore)} / 4</strong>
          <p>Current maturity score</p>
          <small>{scoredQuestions} of {totalQuestions} questions scored</small>
        </div>
      </section>

      <nav className="data-ai-tabs" id="diagnostic-workbench" aria-label="Data and AI diagnostic sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "capture" ? (
        <>
          <section className="panel data-ai-control-panel">
            <div>
              <p className="eyebrow">Assessment Intake</p>
              <h2>Data capture workbench</h2>
              <p>Score each question, capture available evidence, and leave action notes for the AI report.</p>
            </div>
            <div className="data-ai-capture-summary" aria-label="Assessment progress summary">
              <div>
                <span>Coverage</span>
                <strong>{scoredQuestions}/{totalQuestions}</strong>
              </div>
              <div>
                <span>Avg score</span>
                <strong>{formatScore(overallScore)}</strong>
              </div>
              <div>
                <span>High gaps</span>
                <strong>{criticalItems.length}</strong>
              </div>
            </div>
            <div className="data-ai-demo-actions" aria-label="Demo data actions">
              <div>
                <span className="data-ai-mode-chip">Seed catalogue</span>
                <p>Select a fictitious customer profile and dataset depth, then populate deterministic context, scores, evidence notes, and action plans for a walkthrough.</p>
              </div>
              <div className="data-ai-seed-controls">
                <label>
                  <span>Customer profile</span>
                  <select
                    value={selectedSeedProfileId}
                    onChange={(event) => setSelectedSeedProfileId(event.target.value as SeedProfileId)}
                  >
                    {seedProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label} - {profile.sector}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Dataset depth</span>
                  <select
                    value={selectedSeedDatasetLevel}
                    onChange={(event) => setSelectedSeedDatasetLevel(event.target.value as SeedDatasetLevel)}
                  >
                    {seedDatasetOptions.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{selectedSeedDataset.description}</p>
              </div>
              <div>
                <button type="button" onClick={seedDummyData}>
                  Seed selected data
                </button>
                <button type="button" onClick={downloadDummyDataFile}>
                  Download selected seed
                </button>
                <button type="button" onClick={resetCapture}>
                  Reset capture
                </button>
              </div>
            </div>
            <div className="data-ai-context-panel" aria-label="Customer and business domain context">
              <div className="data-ai-context-header">
                <div>
                  <p className="eyebrow">Customer Context</p>
                  <h3>Tell the report what business domain it is assessing</h3>
                  <p>
                    These fields shape the AI narrative, report language, priorities, and examples. They are captured as
                    context, not maturity scores.
                  </p>
                </div>
                <span className="data-ai-mode-chip">
                  {customerContext.businessDomain.trim() ? "Context captured" : "Needs customer context"}
                </span>
              </div>
              <div className="data-ai-context-grid">
                <label>
                  <span>Customer / organisation</span>
                  <input
                    value={customerContext.customerName}
                    onChange={(event) => updateCustomerContext("customerName", event.target.value)}
                    placeholder="Example: Nawah Real Estate Investment Company"
                  />
                </label>
                <label>
                  <span>Business domain</span>
                  <input
                    value={customerContext.businessDomain}
                    onChange={(event) => updateCustomerContext("businessDomain", event.target.value)}
                    placeholder="Example: public-sector services and operations"
                  />
                </label>
                <label>
                  <span>Operating scope</span>
                  <textarea
                    value={customerContext.operatingScope}
                    onChange={(event) => updateCustomerContext("operatingScope", event.target.value)}
                    placeholder="Geography, entities, functions, services, or user groups in scope..."
                  />
                </label>
                <label>
                  <span>Strategic priorities</span>
                  <textarea
                    value={customerContext.strategicPriorities}
                    onChange={(event) => updateCustomerContext("strategicPriorities", event.target.value)}
                    placeholder="What outcomes should data and AI support?"
                  />
                </label>
                <label>
                  <span>Current pain points</span>
                  <textarea
                    value={customerContext.currentPainPoints}
                    onChange={(event) => updateCustomerContext("currentPainPoints", event.target.value)}
                    placeholder="Known constraints, risks, data gaps, operating issues..."
                  />
                </label>
                <label>
                  <span>Report audience</span>
                  <input
                    value={customerContext.targetAudience}
                    onChange={(event) => updateCustomerContext("targetAudience", event.target.value)}
                    placeholder="Executive committee, data council, PMO, IT..."
                  />
                </label>
                <label className="data-ai-context-wide">
                  <span>Report purpose</span>
                  <textarea
                    value={customerContext.reportPurpose}
                    onChange={(event) => updateCustomerContext("reportPurpose", event.target.value)}
                    placeholder="What should this report help the customer decide?"
                  />
                </label>
              </div>
            </div>
            <div className="data-ai-filters">
              <label>
                <span>Domain</span>
                <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value === "all" ? "all" : Number(event.target.value))}>
                  <option value="all">All domains</option>
                  {dataAiDiagnosticDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.id}. {domain.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Question, evidence, domain..." />
              </label>
            </div>
          </section>

          <section className="panel data-ai-rubric-panel" aria-label="Scoring guidance">
            <div className="data-ai-rubric-header">
              <div>
                <p className="eyebrow">Scoring Standard</p>
                <h2>Use one maturity definition across every interview</h2>
              </div>
              <span className="data-ai-mode-chip">Evidence caps score</span>
            </div>
            <div className="data-ai-rubric-grid">
              {scoreOptions.filter((option) => option.value !== null).map((option) => (
                <article key={option.shortLabel}>
                  <strong>{option.shortLabel}</strong>
                  <h3>{option.label.replace(`${option.shortLabel} - `, "")}</h3>
                  <p>{option.description}</p>
                </article>
              ))}
            </div>
            <div className="data-ai-evidence-rule">
              <strong>Evidence rule</strong>
              <span>No evidence caps at 1. Interview-only usually caps at 2. Scores 3-4 require documented, system, or audited evidence.</span>
            </div>
          </section>

          <section className="data-ai-question-list">
            {filteredQuestions.map((question) => {
              const state = stateByQuestion[question.id];
              const gap = scoreGap(question, state);
              const priority = statusForQuestion(question, state);
              const warning = evidenceWarning(state);
              return (
                <article className="data-ai-question-card" key={question.id}>
                  <div className="data-ai-question-main">
                    <div className="data-ai-question-topline">
                      <span className="data-ai-question-number">Q{question.number}</span>
                      <span className="data-ai-domain-pill">{question.domainEn}</span>
                      <span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span>
                    </div>
                    <h3>{question.questionEn}</h3>
                    <p className="arabic-copy">{question.questionAr}</p>
                    <dl className="data-ai-question-meta">
                      <div>
                        <dt>Framework</dt>
                        <dd>{question.isoReference || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt>Evidence required</dt>
                        <dd>{question.evidenceRequired}</dd>
                      </div>
                      <div>
                        <dt>Gap</dt>
                        <dd>{gap === null ? "Needs score" : `${gap} / ${question.target}`}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="data-ai-capture-fields">
                    <div className="data-ai-score-panel">
                      <div>
                        <span>Score</span>
                        <strong>{state.score === null ? "No data" : `${state.score} / ${question.target}`}</strong>
                      </div>
                      <div className="data-ai-score-buttons" role="group" aria-label={`Score question ${question.number}`}>
                        {scoreOptions.map((option) => (
                          <button
                            className={state.score === option.value ? "active" : ""}
                            key={option.label}
                            type="button"
                            title={option.label}
                            onClick={() => updateQuestion(question.id, { score: option.value })}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="data-ai-evidence-strength">
                      <span>Evidence strength</span>
                      <select
                        value={state.evidenceStrength}
                        onChange={(event) => updateQuestion(question.id, { evidenceStrength: event.target.value as EvidenceStrength })}
                      >
                        {evidenceStrengthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - caps score at {option.cap}
                          </option>
                        ))}
                      </select>
                      <small>
                        {evidenceStrengthOptions.find((option) => option.value === state.evidenceStrength)?.description}
                      </small>
                    </label>
                    {warning ? <p className="data-ai-evidence-warning">{warning}</p> : null}
                    <div className="data-ai-textarea-grid">
                      <label>
                        <span>Evidence available</span>
                        <textarea
                          value={state.evidenceAvailable}
                          onChange={(event) => updateQuestion(question.id, { evidenceAvailable: event.target.value })}
                          placeholder="Document, link, interview note, owner confirmation..."
                        />
                      </label>
                      <label>
                        <span>Action plan</span>
                        <textarea
                          value={state.actionPlan}
                          onChange={(event) => updateQuestion(question.id, { actionPlan: event.target.value })}
                          placeholder="Next action, owner, due date..."
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {activeTab === "dashboard" ? (
        <>
          <section className="data-ai-kpi-grid">
            {[
              ["Overall maturity", `${formatScore(overallScore)} / 4`, "Average across scored questions"],
              ["Assessment coverage", `${scoredQuestions} / ${totalQuestions}`, "Questions with score captured"],
              ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "Distance from target 4"],
              ["High-priority gaps", String(criticalItems.length), "Critical or high scored items"],
            ].map(([label, value, note]) => (
              <article className="data-ai-kpi-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <p>{note}</p>
              </article>
            ))}
          </section>
          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Domain Dashboard</p>
                <h2>Maturity by capability domain</h2>
              </div>
              <span className="data-ai-mode-chip">Target = 4</span>
            </div>
            <div className="data-ai-domain-list">
              {summaries.map((summary) => (
                <article className="data-ai-domain-row" key={summary.id}>
                  <div>
                    <strong>{summary.nameEn}</strong>
                    <span>{summary.nameAr}</span>
                  </div>
                  <div className="data-ai-score-bar" aria-label={`${summary.nameEn} maturity score`}>
                    <span style={{ width: scoreWidth(summary.avgScore) }} />
                  </div>
                  <div className="data-ai-domain-score">
                    <strong>{formatScore(summary.avgScore)}</strong>
                    <span>{summary.scored}/{summary.total} scored</span>
                  </div>
                  <span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "gartner" ? (
        <>
          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Gartner-Aligned Framework</p>
                <h2>7-pillar executive maturity lens</h2>
                <p>
                  This view complements the 13-domain workbook by grouping the captured evidence into seven executive
                  pillars for strategy, governance, data quality, architecture, analytics and AI, people, and execution.
                </p>
              </div>
              <span className="data-ai-mode-chip">Mapped from workbook scores</span>
            </div>
            <div className="data-ai-gartner-grid">
              {gartnerSummaries.map((pillar) => (
                <article className="data-ai-gartner-card" key={pillar.id}>
                  <div className="data-ai-gartner-card-header">
                    <span>{pillar.id.toString().padStart(2, "0")}</span>
                    <span className={`data-ai-priority ${pillar.priority}`}>{priorityLabels[pillar.priority]}</span>
                  </div>
                  <h3>{pillar.name}</h3>
                  <p>{pillar.description}</p>
                  <div className="data-ai-score-bar" aria-label={`${pillar.name} Gartner pillar maturity score`}>
                    <span style={{ width: scoreWidth(pillar.avgScore) }} />
                  </div>
                  <dl className="data-ai-gartner-metrics">
                    <div>
                      <dt>Score</dt>
                      <dd>{formatScore(pillar.avgScore)} / 4</dd>
                    </div>
                    <div>
                      <dt>Coverage</dt>
                      <dd>{pillar.scored}/{pillar.total}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{pillar.evidenceCoveragePct}%</dd>
                    </div>
                  </dl>
                  <div className="data-ai-gartner-domain-list">
                    {pillar.domainIds.map((domainId) => {
                      const domain = dataAiDiagnosticDomains.find((item) => item.id === domainId);
                      return domain ? <span key={domain.id}>{domain.nameEn}</span> : null;
                    })}
                  </div>
                  <section>
                    <strong>Decision question</strong>
                    <p>{pillar.decisionQuestion}</p>
                  </section>
                  <section>
                    <strong>Management action</strong>
                    <p>{pillar.managementAction}</p>
                  </section>
                </article>
              ))}
            </div>
          </section>

          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Framework Crosswalk</p>
                <h2>How the 13 domains roll into the 7 pillars</h2>
              </div>
              <span className="data-ai-mode-chip">{dataAiDiagnosticDomains.length} domains mapped</span>
            </div>
            <div className="data-ai-table-wrap">
              <table className="table data-ai-table">
                <thead>
                  <tr>
                    <th>Gartner pillar</th>
                    <th>Mapped workbook domains</th>
                    <th>Score</th>
                    <th>Evidence</th>
                    <th>Primary management action</th>
                  </tr>
                </thead>
                <tbody>
                  {gartnerSummaries.map((pillar) => (
                    <tr key={pillar.id}>
                      <td>{pillar.name}</td>
                      <td>
                        {pillar.domainIds
                          .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
                          .filter(Boolean)
                          .join("; ")}
                      </td>
                      <td>{formatScore(pillar.avgScore)} / 4</td>
                      <td>{pillar.evidenceBacked}/{pillar.total} evidence-backed</td>
                      <td>{pillar.managementAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "gaps" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">Prioritisation</p>
              <h2>Gap analysis and action queue</h2>
            </div>
            <span className="data-ai-mode-chip">{rankedGaps.length} scored rows</span>
          </div>
          <div className="data-ai-table-wrap">
            <table className="table data-ai-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Domain</th>
                  <th>Score</th>
                  <th>Gap</th>
                  <th>Priority</th>
                  <th>Evidence</th>
                  <th>Action plan</th>
                </tr>
              </thead>
              <tbody>
                {rankedGaps.length ? rankedGaps.map(({ question, state, gap, priority }) => (
                  <tr key={question.id}>
                    <td>{question.questionEn}</td>
                    <td>{question.domainEn}</td>
                    <td>{state.score}</td>
                    <td>{gap}</td>
                    <td><span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span></td>
                    <td>{state.evidenceAvailable || "No evidence captured"}</td>
                    <td>{state.actionPlan || "No action captured"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>No scored gaps yet. Capture scores in the data capture tab.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "report" ? (
        <section className="data-ai-report-pack">
          <div className="panel data-ai-report-toolbar">
            <div>
              <p className="eyebrow">Consulting Report</p>
              <h2>Data & AI capability diagnostic report pack</h2>
              <p>Structured pages suitable for executive review, steering committee discussion, and browser print-to-PDF export.</p>
            </div>
            <div>
              <button type="button" onClick={generateConsultingReport} disabled={reportStatus === "loading"}>
                {reportStatus === "loading" ? "Generating..." : "Generate with local AI"}
              </button>
              <button type="button" onClick={printReport}>Print / Save PDF</button>
              <span className="data-ai-mode-chip">
                {reportStatus === "ready" ? "AI narrative ready" : "Generated from captured scores"}
              </span>
            </div>
          </div>
          <nav className="data-ai-report-nav" aria-label="Report sections">
            {reportNavItems.map(([id, label]) => (
              <a href={`#data-ai-report-${id}`} key={id}>{label}</a>
            ))}
          </nav>
          {reportStatus === "loading" || reportStatus === "ready" || reportStatus === "error" || reportStatus === "missing_key" ? (
            <div className={`data-ai-generation-progress ${reportStatus}`} aria-live="polite">
              <div className="data-ai-generation-progress-top">
                <span>Local AI generation pipeline</span>
                <strong>{reportGenerationStages[Math.min(reportStageIndex, reportGenerationStages.length - 1)]}</strong>
              </div>
              <div className="data-ai-generation-bar" aria-hidden="true">
                <span style={{ width: `${((Math.min(reportStageIndex, reportGenerationStages.length - 1) + 1) / reportGenerationStages.length) * 100}%` }} />
              </div>
              <ol>
                {reportGenerationStages.map((stage, index) => {
                  const isComplete = reportStatus === "ready" || index < reportStageIndex;
                  const isCurrent = reportStatus === "loading" && index === reportStageIndex;
                  const isFailed = (reportStatus === "error" || reportStatus === "missing_key") && index === reportStageIndex;
                  return (
                    <li
                      className={[
                        isComplete ? "complete" : "",
                        isCurrent ? "current" : "",
                        isFailed ? "failed" : "",
                      ].filter(Boolean).join(" ")}
                      key={stage}
                    >
                      <span>{index + 1}</span>
                      <p>{stage}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          {reportMessage ? (
            <div className={`data-ai-report-status ${reportStatus}`}>
              {reportMessage}
            </div>
          ) : null}
          {handoffMessage ? (
            <div className="data-ai-handoff-status">
              <span>{handoffMessage}</span>
              <Link href="/use-cases/data-strategy-builder">Open Data Strategy Builder</Link>
            </div>
          ) : null}
          {reportFailureLog ? (
            <section className="data-ai-failure-log" aria-label="Local AI failure log">
              <div>
                <p className="eyebrow">Failure diagnostics</p>
                <h3>Local AI report generation log</h3>
              </div>
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{reportFailureLog.timestamp}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>{reportFailureLog.stage}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{reportFailureLog.status}</dd>
                </div>
                <div>
                  <dt>Model path</dt>
                  <dd>{reportFailureLog.model}</dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd>{reportFailureLog.endpoint}</dd>
                </div>
              </dl>
              <div>
                <strong>Error message</strong>
                <p>{reportFailureLog.message}</p>
              </div>
              <details>
                <summary>Diagnostic details</summary>
                <pre>{JSON.stringify(reportFailureLog, null, 2)}</pre>
              </details>
            </section>
          ) : null}

          <article className="data-ai-report-page data-ai-report-cover" id="data-ai-report-cover">
            <div>
              <p className="eyebrow">Data & AI Capability Diagnostic</p>
              <h2>Data & AI Capability Diagnostic</h2>
              <p>{reportCustomerName}</p>
              <p>{reportBusinessDomain}</p>
              <p>{reportSubtitle}</p>
              <div className="data-ai-report-cover-pills">
                <span>{scoredQuestions}/{totalQuestions} questions</span>
                <span>{assessedDomains.length}/{summaries.length} domains</span>
                <span>{evidenceBackedItems}/{totalQuestions} evidence-backed</span>
                <span>{maturityPct}% readiness score</span>
              </div>
            </div>
            <div className="data-ai-report-cover-card">
              <div className="data-ai-report-cover-gauge" style={{ "--score-pct": `${maturityPct}%` } as CSSProperties}>
                <div>
                  <strong>{formatScore(overallScore)}</strong>
                  <span>out of 4.0</span>
                  <small>{maturityLabel(overallScore)}</small>
                </div>
              </div>
              <p>{reportDate} - {assessedDomains.length} domains</p>
            </div>
            <dl className="data-ai-report-facts">
              <div><dt>Report date</dt><dd>{reportDate}</dd></div>
              <div><dt>Assessment coverage</dt><dd>{scoredQuestions} / {totalQuestions} questions</dd></div>
              <div><dt>Domains assessed</dt><dd>{assessedDomains.length} / {summaries.length}</dd></div>
              <div><dt>Evidence-backed responses</dt><dd>{evidenceBackedItems} / {totalQuestions}</dd></div>
              <div><dt>Report audience</dt><dd>{customerContext.targetAudience.trim() || "Not specified"}</dd></div>
            </dl>
          </article>

          <article className="data-ai-report-page data-ai-report-contents">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">Report Navigation</p>
              <h2>Contents and decision flow</h2>
            </div>
            <div className="data-ai-report-toc">
              {[
                ["01", "Executive Summary", "Readiness position, decision asks, and management attention."],
                ["02", "Board Scorecard", "Maturity, evidence coverage, priority gaps, and readiness thesis."],
                ["03", "Maturity Heatmap", "Domain-level scores and gap concentration."],
                ["04", "Gartner 7-Pillar Lens", "Executive framework roll-up mapped from the 13 workbook domains."],
                ["05", "Domain Action Plan", "Recommended owner focus and remediation route by domain."],
                ["06", "Priority Gap Register", "Highest-risk questions requiring evidence-backed action."],
                ["07", "90-Day Roadmap", "Mobilise, remediate, and certify readiness."],
                ["08", "AI Readiness Gate", "What can proceed now and what should wait."],
                ["09", "Appendix", "Prompt library and report generation basis."],
              ].map(([number, title, text]) => (
                <div key={number}>
                  <span>{number}</span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-summary">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">01 - Executive Summary</p>
              <h2>Readiness position and management attention</h2>
            </div>
            <div className="data-ai-report-kpis">
              {[
                ["Overall maturity", `${formatScore(overallScore)} / 4`, maturityLabel(overallScore)],
                ["Coverage", `${scoredQuestions}/${totalQuestions}`, "questions scored"],
                ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "from target maturity"],
                ["Priority gaps", String(criticalItems.length), "critical or high items"],
                ["Evidence coverage", `${evidenceCoveragePct}%`, "responses with evidence"],
                ["Domains requiring action", String(domainsRequiringAction.length), "critical or high domains"],
              ].map(([label, value, note]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
              ))}
            </div>
            <div className="data-ai-report-strength-vulnerability">
              <section className="strength">
                <h3>Headline assessment</h3>
                <p>
                  The current capture for {reportCustomerName} indicates {maturityProfilePhrase(overallScore)} data and AI capability profile
                  for {reportBusinessDomain}.
                  {topGapDomains.length
                    ? ` The most material gaps are concentrated in ${topGapDomains.map((item) => item.nameEn).join(", ")}.`
                    : " No scored domain gap pattern is available yet."}
                </p>
                <p>
                  The immediate priority is to strengthen evidence, ownership, operating cadence, and data controls before
                  scaling predictive or generative AI use cases.
                </p>
              </section>
              <section className="vulnerability">
                <h3>Executive decisions required</h3>
                <ul>
                  <li>Confirm accountable executive owner and data council cadence.</li>
                  <li>Approve the diagnostic scoring baseline and evidence standard.</li>
                  <li>Prioritise remediation for the highest-gap domains.</li>
                  <li>Gate AI use cases until data quality, privacy, lineage, and model-risk evidence are ready.</li>
                </ul>
              </section>
            </div>
            <section className="data-ai-report-thesis">
              <h3>Readiness thesis</h3>
              <p>{readinessThesis(overallScore)}</p>
            </section>
          </article>

          <article className="data-ai-report-page data-ai-board-page" id="data-ai-report-scorecard">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">02 - Board Scorecard</p>
              <h2>Readiness signal for steering committee review</h2>
            </div>
            <section className="data-ai-board-scorecard-hero">
              <span>Readiness score</span>
              <strong>{maturityPct}%</strong>
              <p>{formatScore(overallScore)} / 4 maturity - {maturityLabel(overallScore)}</p>
            </section>
            <div className="data-ai-board-postures">
              {[
                ["decision", "Decision posture", generatedReport?.boardScorecardNarrative || readinessThesis(overallScore)],
                ["evidence", "Evidence posture", `${evidenceCoveragePct}% of questions currently have evidence strength and evidence notes. Unsupported high scores remain provisional until documents, system records, audit trails, or owner confirmations are attached.`],
                ["assessment", "Assessment completeness", `${assessedCoveragePct}% of workbook questions have been scored. Unscored items should remain outside the approved baseline and be tracked as evidence gaps.`],
              ].map(([tone, title, text]) => (
                <section className={tone} key={title}>
                  <span>{title}</span>
                  <p>{text}</p>
                </section>
              ))}
            </div>
            <div className="data-ai-report-decision-strip">
              {(generatedReport?.boardAsks?.length ? generatedReport.boardAsks : [
                "Approve baseline: Confirm score standard and evidence requirements.",
                "Assign owners: Close priority domains through named remediation owners.",
                "Gate use cases: Proceed only where data, privacy, and model risk controls are ready.",
              ]).slice(0, 3).map((ask, index) => {
                const [label, ...rest] = ask.split(":");
                return (
                  <div key={`${label}-${index}`}>
                    <span>{index === 0 ? "Board ask" : index === 1 ? "Management ask" : "AI ask"}</span>
                    <strong>{label || `Ask ${index + 1}`}</strong>
                    <p>{rest.join(":").trim() || ask}</p>
                  </div>
                );
              })}
            </div>
          </article>

          {generatedMarkdownReport ? (
            <MarkdownReport markdown={generatedMarkdownReport} source={generatedMarkdownReportSource} />
          ) : generatedReport ? (
            <article className="data-ai-report-page data-ai-generated-report">
              <div className="data-ai-report-page-header">
                <p className="eyebrow">AI-Generated Advisory</p>
                <h2>Consulting-grade narrative generated from the captured diagnostic</h2>
              </div>
              <section className="data-ai-report-callout">
                <h3>Executive summary</h3>
                <p>{generatedReport.executiveSummary}</p>
              </section>
              <section className="data-ai-report-callout">
                <h3>Overall advisory synthesis</h3>
                <p>{generatedReport.overallAdvisoryNarrative || generatedReport.boardMessage}</p>
              </section>
              <section className="data-ai-report-callout">
                <h3>Board scorecard advisory</h3>
                <p>{generatedReport.boardScorecardNarrative || generatedReport.readinessThesis}</p>
              </section>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Headline assessment</h3>
                  <p>{generatedReport.headlineAssessment || generatedReport.boardMessage}</p>
                </section>
                <section>
                  <h3>Readiness thesis</h3>
                  <p>{generatedReport.readinessThesis || generatedReport.aiReadinessGate}</p>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>Board message</h3>
                <p>{generatedReport.boardMessage}</p>
              </section>
              <div className="data-ai-report-decision-strip">
                {(generatedReport.boardAsks?.length ? generatedReport.boardAsks : [
                  "Approve baseline - confirm the scoring standard and evidence requirements.",
                  "Assign owners - name accountable owners for priority domains.",
                  "Gate use cases - proceed only where data, privacy, and model-risk controls are ready.",
                ]).slice(0, 3).map((item, index) => {
                  const separatorIndex = item.indexOf(" - ");
                  const title = separatorIndex >= 0 ? item.slice(0, separatorIndex) : `Ask ${index + 1}`;
                  const text = separatorIndex >= 0 ? item.slice(separatorIndex + 3) : item;
                  return (
                    <div key={`${title}-${index}`}>
                      <span>{index === 0 ? "Board ask" : index === 1 ? "Management ask" : "AI ask"}</span>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Material findings</h3>
                  <ul>
                    {(generatedReport.materialFindings ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Recommended decisions</h3>
                  <ul>
                    {(generatedReport.recommendedDecisions ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Domain action plan</h3>
                  <ul>
                    {(generatedReport.domainActionPlan ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Priority gap register</h3>
                  <ul>
                    {(generatedReport.priorityGapRegister ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>Gartner 7-pillar assessment</h3>
                {(generatedReport.gartnerPillarAssessment ?? []).length ? (
                  <ul>
                    {(generatedReport.gartnerPillarAssessment ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p>The Gartner pillar narrative will appear here after generation with the current report schema.</p>
                )}
              </section>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>90-day plan</h3>
                  <ol>
                    {((generatedReport.roadmapPhases?.length ? generatedReport.roadmapPhases : generatedReport.ninetyDayPlan) ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </section>
                <section>
                  <h3>Risks to control</h3>
                  <ul>
                    {(generatedReport.risks ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>AI readiness gate</h3>
                <p>{generatedReport.aiReadinessGate}</p>
              </section>
              <div className="data-ai-gate-matrix">
                <section>
                  <h3>Proceed</h3>
                  <ul>{(generatedReport.aiGateProceed ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <h3>Pilot with controls</h3>
                  <ul>{(generatedReport.aiGatePilotWithControls ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <h3>Hold</h3>
                  <ul>{(generatedReport.aiGateHold ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              </div>
              <section>
                <h3>Next steps</h3>
                <ol>
                  {(generatedReport.nextSteps ?? []).map((item) => <li key={item}>{item}</li>)}
                </ol>
              </section>
            </article>
          ) : null}

          <article className="data-ai-report-page" id="data-ai-report-heatmap">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">03 - Maturity Heatmap</p>
              <h2>Domain maturity and gap concentration</h2>
            </div>
            <div className="data-ai-report-legend">
              <span><i className="critical" />Critical</span>
              <span><i className="high" />High</span>
              <span><i className="medium" />Medium</span>
              <span><i className="watch" />Watch</span>
            </div>
            <div className="data-ai-report-domain-grid">
              {summaries.map((summary) => (
                <div key={summary.id}>
                  <span>{summary.id.toString().padStart(2, "0")}</span>
                  <strong>{summary.nameEn}</strong>
                  <div className="data-ai-report-score-track" aria-label={`${summary.nameEn} report maturity score`}>
                    <span
                      className={`data-ai-report-score-fill ${summary.priority}`}
                      style={{ width: scoreWidth(summary.avgScore) }}
                    />
                  </div>
                  <p>
                    <b>{formatScore(summary.avgScore)} / 4</b>
                    <span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span>
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gartner">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">04 - Gartner 7-Pillar Lens</p>
              <h2>Executive maturity framework roll-up</h2>
            </div>
            <p>
              The seven-pillar view translates the detailed diagnostic into an executive framework for deciding where to
              invest first, where governance must tighten, and which AI ambitions should proceed, pilot, or wait.
            </p>
            <div className="data-ai-report-domain-grid">
              {gartnerSummaries.map((pillar) => (
                <div key={pillar.id}>
                  <span>{pillar.id.toString().padStart(2, "0")} - {pillar.shortName}</span>
                  <strong>{pillar.name}</strong>
                  <div className="data-ai-report-score-track" aria-label={`${pillar.name} report pillar score`}>
                    <span
                      className={`data-ai-report-score-fill ${pillar.priority}`}
                      style={{ width: scoreWidth(pillar.avgScore) }}
                    />
                  </div>
                  <p>
                    <b>{formatScore(pillar.avgScore)} / 4</b>
                    <span className={`data-ai-priority ${pillar.priority}`}>{priorityLabels[pillar.priority]}</span>
                  </p>
                  <p>{pillar.scored}/{pillar.total} questions scored - {pillar.evidenceCoveragePct}% evidence-backed</p>
                </div>
              ))}
            </div>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th>Mapped domains</th>
                    <th>Decision question</th>
                    <th>Management action</th>
                  </tr>
                </thead>
                <tbody>
                  {gartnerSummaries.map((pillar) => (
                    <tr key={pillar.id}>
                      <td>{pillar.name}</td>
                      <td>
                        {pillar.domainIds
                          .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
                          .filter(Boolean)
                          .join("; ")}
                      </td>
                      <td>{pillar.decisionQuestion}</td>
                      <td>{pillar.managementAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-actions">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">05 - Domain Action Plan</p>
              <h2>Strengths, vulnerabilities, and remediation route</h2>
            </div>
            <div className="data-ai-report-strength-vulnerability">
              <section className="strength">
                <h3>Relative strengths</h3>
                {strongestDomains.length ? (
                  <ol>
                    {strongestDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> - {formatScore(summary.avgScore)} / 4, with {summary.scored}/{summary.total} questions scored.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No strengths can be confirmed until scoring data is captured.</p>
                )}
              </section>
              <section className="vulnerability">
                <h3>Priority vulnerabilities</h3>
                {topGapDomains.length ? (
                  <ol>
                    {topGapDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> - average gap {summary.avgGap?.toFixed(1)} from target maturity.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No vulnerability pattern can be confirmed until scoring data is captured.</p>
                )}
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>Evidence quality view</h3>
              <p>
                {evidenceBackedItems} of {totalQuestions} responses include both a non-empty evidence note and an evidence strength above
                "No evidence". Management should treat unsupported high scores as provisional until documents, system records,
                audit trails, or owner confirmations are attached.
              </p>
            </section>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Score</th>
                    <th>Gap</th>
                    <th>Priority</th>
                    <th>Recommended management action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportDomainRows.map((summary) => (
                    <tr key={summary.id}>
                      <td>{summary.nameEn}</td>
                      <td>{formatScore(summary.avgScore)} / 4</td>
                      <td>{summary.avgGap === null ? "No data" : summary.avgGap.toFixed(1)}</td>
                      <td><span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span></td>
                      <td>{domainActionForSummary(summary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gaps">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">06 - Priority Gap Register</p>
              <h2>Highest-risk items requiring action</h2>
            </div>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Domain</th>
                    <th>Score</th>
                    <th>Gap</th>
                    <th>Evidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topPriorityGaps.length ? topPriorityGaps.map(({ question, state, gap }) => (
                    <tr className={state.score === 0 ? "critical-row" : undefined} key={question.id}>
                      <td>{question.questionEn}</td>
                      <td>{question.domainEn}</td>
                      <td>{state.score}</td>
                      <td>{gap}</td>
                      <td>{state.evidenceStrength}</td>
                      <td>{state.actionPlan || "Assign owner, evidence, and due date."}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>No scored gaps available. Seed or capture assessment data before issuing the report.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <section className="data-ai-report-callout">
              <h3>Control principle</h3>
              <p>Every high-priority gap should have an accountable owner, required evidence artifact, target date, and steering committee escalation path.</p>
            </section>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-roadmap">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">07 - 90-Day Roadmap</p>
              <h2>Remediation plan for decision-ready AI</h2>
            </div>
            <div className="data-ai-roadmap">
              {[
                ["Days 0-30", "Mobilise governance", "Confirm owners, scoring approval, evidence standard, and steering cadence."],
                ["Days 31-60", "Close critical gaps", "Resolve priority gaps in quality, sources, metadata, privacy, architecture, and ownership."],
                ["Days 61-90", "Certify AI readiness", "Publish validated scorecard, action register, AI use-case gating decision, and board report."],
              ].map(([period, title, text]) => (
                <div key={period}>
                  <span>{period}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <h3>Recommended workstreams</h3>
            <ul className="data-ai-report-columns">
              {reportWorkstreams.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gate">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">08 - AI Readiness Gate</p>
              <h2>What can proceed now and what should wait</h2>
            </div>
            <div className="data-ai-gate-matrix">
              {[
                ["proceed", "Proceed", "Management dashboards, evidence-backed diagnostics, and AI-assisted reporting with human approval."],
                ["pilot", "Pilot with controls", "Forecasting, classification, and summarisation where source quality and privacy controls are confirmed."],
                ["hold", "Hold", "Autonomous decisions, sensitive generative AI workflows, and model outputs without audit trail or owner sign-off."],
              ].map(([tone, label, text]) => (
                <section className={tone} key={label}>
                  <h3>{label}</h3>
                  <p>{text}</p>
                </section>
              ))}
            </div>
            <div className="data-ai-report-two-col">
              <section>
                <h3>Feasible now</h3>
                <ul>
                  <li>Descriptive reporting and management dashboards.</li>
                  <li>Diagnostic gap analysis and evidence-backed action tracking.</li>
                  <li>Controlled AI-assisted report drafting with human review.</li>
                </ul>
              </section>
              <section>
                <h3>Gate before scale</h3>
                <ul>
                  <li>Predictive models using sensitive or incomplete source data.</li>
                  <li>Generative AI decisions without policy, prompt, and output controls.</li>
                  <li>Automated recommendations without auditability and accountable owners.</li>
                </ul>
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>Local AI gateway note</h3>
              <p>
                Narrative generation is wired through the server-side local AI gateway using environment variables such as
                AI_GATEWAY_BASE_URL and LOCAL_AI_API_KEY. The gateway key must never be stored in client-side code or exposed in browser requests.
              </p>
            </section>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">09 - Appendix</p>
              <h2>Prompt library and report generation basis</h2>
            </div>
            <div className="data-ai-prompt-list">
              {dataAiReportPrompts.map((prompt) => (
                <details key={prompt.title}>
                  <summary>{prompt.title}</summary>
                  <p>{prompt.prompt}</p>
                </details>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "evidence" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">OpenCare Contract</p>
              <h2>Data capture and AI reporting evidence model</h2>
            </div>
            <Link className="secondary-link" href="/use-cases">Back to use cases</Link>
          </div>
          <div className="data-ai-evidence-grid">
            {[
              ["Sources", "Assessment workbook, interviews, policies, architecture diagrams, report inventory, data catalogue, model records."],
              ["Capture tables", "diagnostic.questions, diagnostic.responses, diagnostic.evidence, diagnostic.action_plan, diagnostic.review_session."],
              ["Analytics marts", "domain maturity summary, gap priority matrix, AI readiness score, roadmap backlog, evidence completeness."],
              ["Gartner lens", "Seven executive pillars mapped from the 13-domain workbook: strategy, governance, data quality, architecture, analytics and AI, people, and execution."],
              ["AI reporting", "Executive narrative, top gap ranking, 90-day actions, risk register, AI feasibility assessment."],
              ["Governance controls", "Human-reviewed scores, evidence required per question, source trace, owner assignment, approval status."],
              ["Backend status", "This page is a front-end capture shell. API persistence and model orchestration are pending wiring."],
            ].map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
