import { dataAiDiagnosticQuestions, type DataAiDiagnosticQuestion } from "@/lib/data-ai-diagnostic";

export type EvidenceStrength = "none" | "interview" | "documented" | "system" | "audited";

export type QuestionState = {
  score: number | null;
  evidenceStrength: EvidenceStrength;
  evidenceAvailable: string;
  notes: string;
  actionPlan: string;
};

export type CustomerContext = {
  customerName: string;
  businessDomain: string;
  operatingScope: string;
  strategicPriorities: string;
  currentPainPoints: string;
  targetAudience: string;
  reportPurpose: string;
};

export type SeedProfileId = "nawah-real-estate" | "hayat-health-network" | "amana-utilities-group";
export type SeedDatasetLevel = "interview-light" | "evidence-enriched" | "board-ready";

export type DiagnosticSeedProfile = {
  id: SeedProfileId;
  label: string;
  sector: string;
  context: CustomerContext;
  domainScores: Record<number, number>;
  domainEvidence: Record<number, string>;
  domainActions: Record<number, string>;
  questionOverrides?: Record<string, {
    questionEn?: string;
    evidenceRequired?: string;
  }>;
  domainNameOverrides?: Record<number, string>;
};

export const emptyCustomerContext = {
  customerName: "",
  businessDomain: "",
  operatingScope: "",
  strategicPriorities: "",
  currentPainPoints: "",
  targetAudience: "",
  reportPurpose: "",
} satisfies CustomerContext;

export const seedDatasetOptions = [
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

export const seedProfiles = [
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
      12: "decision adoption notes for investment analysts, asset managers, finance users, and data stewards",
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
    domainNameOverrides: {
      12: "Decision Enablement & Data Adoption",
    },
    questionOverrides: {
      q014: {
        questionEn: "What systems manage assets, leases, tenants, property units, valuations, capex, occupancy and leasing decisions?",
        evidenceRequired: "PMS, ERP, CRM, valuation, leasing, capex and property-management system list with architecture documents",
      },
      q024: {
        questionEn: "Are unified reference lists maintained for assets, tenants, leases, units, properties and investment entities?",
        evidenceRequired: "MDM rules, reference data tables, golden record logic for asset, tenant, lease and property records",
      },
      q025: {
        questionEn: "Is there a unified identifier for each asset, tenant, lease, property unit and investment entity usable across all systems?",
        evidenceRequired: "Identity management rules, linking logic and golden identifiers for asset, tenant, lease and property records",
      },
      q033: {
        questionEn: "Is there a unified executive dashboard showing portfolio, occupancy, asset quality and value-impact indicators?",
        evidenceRequired: "Unified portfolio dashboard and BI documentation",
      },
      q035: {
        questionEn: "Can portfolio gap analysis be derived from data to support leasing, capex and investment planning decisions?",
        evidenceRequired: "Portfolio analytics reports, asset performance matrices and planning decision evidence",
      },
      q047: {
        questionEn: "Is sufficient data available to build predictive models for occupancy, leasing demand, valuation risk and asset performance?",
        evidenceRequired: "Predictive model readiness assessment, minimum data requirements for occupancy, leasing, valuation and asset performance",
      },
      q055: {
        questionEn: "Is there a skills gap between the data strategy requirements and current investment, asset management, finance and IT capabilities?",
        evidenceRequired: "Skills assessment, hiring plan and capability uplift plan",
      },
      q059: {
        questionEn: "How are tenant, lease, asset, valuation and investment data protected, and are clear access controls in place?",
        evidenceRequired: "Security controls, access policies and protection records for tenant, lease, asset, valuation and investment data",
      },
      q075: {
        questionEn: "Can asset, lease, tenant and portfolio data be linked to investment performance outcomes and operating quality?",
        evidenceRequired: "Decision adoption reports, portfolio value impact measures and asset performance linkage evidence",
      },
      q078: {
        questionEn: "Can the full asset and tenant journey be tracked from acquisition or lease onboarding through occupancy, capex, income and valuation impact?",
        evidenceRequired: "Asset lifecycle reports, tenant journey reports, occupancy and valuation impact tracking",
      },
      q082: {
        questionEn: "How is adoption of new data assets, dashboards and policies ensured across investment, asset management, development, finance and IT teams?",
        evidenceRequired: "Change management plan, adoption metrics and champion network evidence",
      },
      q083: {
        questionEn: "How is data initiative success defined for portfolio reporting, asset performance, investment decisions, quality improvement and measurable value outcomes?",
        evidenceRequired: "Benefits map, portfolio KPIs, asset performance reports, investment committee decision evidence",
      },
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

function evidenceStrengthForScore(score: number): EvidenceStrength {
  if (score >= 4) return "audited";
  if (score >= 3) return "system";
  if (score >= 2) return "documented";
  if (score >= 1) return "interview";
  return "none";
}

function evidenceRank(value: EvidenceStrength) {
  const ranks: EvidenceStrength[] = ["none", "interview", "documented", "system", "audited"];
  return ranks.indexOf(value);
}

function capEvidenceStrength(value: EvidenceStrength, cap: EvidenceStrength) {
  return evidenceRank(value) > evidenceRank(cap) ? cap : value;
}

export function seedScoreForQuestion(
  profile: DiagnosticSeedProfile,
  dataset: typeof seedDatasetOptions[number],
  question: DataAiDiagnosticQuestion,
) {
  const base = profile.domainScores[question.domainId] ?? 1;
  const variation = question.number % 7 === 0 ? -1 : question.number % 6 === 0 ? 1 : 0;
  const score = base + dataset.scoreShift + variation;
  return Math.max(0, Math.min(4, score));
}

export function evidenceStrengthForSeed(score: number, dataset: typeof seedDatasetOptions[number]) {
  return capEvidenceStrength(evidenceStrengthForScore(score), dataset.evidenceCap);
}

export function seededEvidenceForQuestion(
  profile: DiagnosticSeedProfile,
  dataset: typeof seedDatasetOptions[number],
  question: DataAiDiagnosticQuestion,
  score: number,
) {
  const domainEvidence = profile.domainEvidence[question.domainId] ?? "workshop notes and open evidence requests";
  const requiredEvidence = seededEvidenceRequired(profile, question);
  const domainName = seededDomainName(profile, question.domainId, question.domainEn);
  if (dataset.id === "interview-light") {
    return `Interview seed: ${domainEvidence}. Evidence is mostly workshop-confirmed and still needs approved artefacts for ${domainName}. Required evidence: ${requiredEvidence}.`;
  }
  if (dataset.id === "board-ready") {
    return `Board-ready seed: ${domainEvidence}, owner sign-off, dated evidence register entry, and steering-review trace. Score ${score}/4 reflects the available evidence for ${domainName}. Required evidence: ${requiredEvidence}.`;
  }
  return `Evidence-enriched seed: ${domainEvidence}, draft owner confirmation, sample artefact, and remediation note for ${domainName}. Required evidence: ${requiredEvidence}.`;
}

export function seededActionByDomain(domainName: string) {
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

export function seededActionForQuestion(
  profile: DiagnosticSeedProfile,
  dataset: typeof seedDatasetOptions[number],
  question: DataAiDiagnosticQuestion,
  score: number,
) {
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
    return `${datasetPrefix} strengthen evidence completeness for ${seededDomainName(profile, question.domainId, question.domainEn)}, confirm accountable sign-off, and move the control from defined to managed maturity.`;
  }
  return `${datasetPrefix} maintain evidence, monitor benefits, and review ${seededDomainName(profile, question.domainId, question.domainEn)} in the next assessment cycle.`;
}

export function seededState(profile: DiagnosticSeedProfile, dataset: typeof seedDatasetOptions[number]) {
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

export function seededQuestionText(profile: DiagnosticSeedProfile, question: DataAiDiagnosticQuestion) {
  return profile.questionOverrides?.[question.id]?.questionEn ?? question.questionEn;
}

export function seededEvidenceRequired(profile: DiagnosticSeedProfile, question: DataAiDiagnosticQuestion) {
  return profile.questionOverrides?.[question.id]?.evidenceRequired ?? question.evidenceRequired;
}

export function seededDomainName(profile: DiagnosticSeedProfile, domainId: number, fallback: string) {
  return profile.domainNameOverrides?.[domainId] ?? fallback;
}
