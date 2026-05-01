export type GovernanceStatus =
  | "trusted"
  | "draft"
  | "warning"
  | "unknown"
  | "not_connected"
  | "complete"
  | "partial"
  | "missing"
  | "approved"
  | "needs_review";

export type GovernanceUseCase = {
  id: string;
  name: string;
  domain: "Clinical Operations" | "Financial Operations" | "Platform Administration";
  workspacePath: string;
  description: string;
  businessPurpose: string;
  owner: string;
  steward?: string;
  workspaceCoverage: WorkspaceCoverageItem[];
  governedDatasets: GovernedDataset[];
  dictionaryTerms: DictionaryTerm[];
  lineageEntryPoints: LineageEntryPoint[];
  qualitySummary: QualitySummary;
  complianceContext: ComplianceContext;
  downstreamConsumers: string[];
};

export type WorkspaceCoverageItem = {
  label: string;
  href: string;
};

export type GovernedDataset = {
  id: string;
  name: string;
  schema: string;
  table: string;
  assetType: "fact" | "dimension" | "output" | "decision" | "dictionary" | "source" | "unknown";
  businessMeaning: string;
  grain?: string;
  owner?: string;
  steward?: string;
  freshnessStatus: "fresh" | "warning" | "stale" | "unknown" | "not_connected";
  testStatus: "passing" | "warning" | "failing" | "unknown" | "not_connected";
  lineageStatus: "complete" | "partial" | "missing" | "unknown" | "not_connected";
  recordSpecStatus: "complete" | "partial" | "missing" | "unknown";
  certificationStatus: "trusted" | "draft" | "warning" | "unknown";
  consumers: string[];
  relatedTerms?: string[];
  complianceNotes?: string[];
  lineageSummary?: string[];
};

export type DictionaryTerm = {
  id: string;
  term: string;
  definition: string;
  domain: GovernanceUseCase["domain"];
  useCaseId: string;
  relatedDatasets?: string[];
  owner?: string;
  status: "approved" | "draft" | "needs_review" | "missing";
};

export type LineageEntryPoint = {
  id: string;
  label: string;
  summary: string;
  path: string[];
  impactTargets: string[];
  status: "complete" | "partial" | "missing" | "unknown" | "not_connected";
};

export type QualitySummary = {
  freshness: "fresh" | "warning" | "stale" | "unknown" | "not_connected";
  quality: "passing" | "warning" | "failing" | "unknown" | "not_connected";
  lineage: "complete" | "partial" | "missing" | "unknown" | "not_connected";
  recordSpecs: "complete" | "partial" | "missing" | "unknown";
  compliance: "trusted" | "draft" | "warning" | "unknown";
  note: string;
};

export type ComplianceContext = {
  posture: "trusted" | "draft" | "warning" | "unknown";
  summary: string;
  evidence: string[];
  gaps: string[];
};

const governanceUseCases: GovernanceUseCase[] = [
  {
    id: "bed_pressure",
    name: "Bed Pressure Intelligence",
    domain: "Clinical Operations",
    workspacePath: "/use-cases/bed-pressure/status",
    description: "Occupancy, forecasting, anomaly detection, and discharge decision metadata.",
    businessPurpose: "Monitor ward pressure, forecast occupancy risk, surface anomalies, and support capacity decisions.",
    owner: "Clinical Operations Analytics",
    steward: "Capacity Planning Lead",
    workspaceCoverage: [
      { label: "Overview", href: "/use-cases/bed-pressure/overview" },
      { label: "Status", href: "/use-cases/bed-pressure/status" },
      { label: "Predictions", href: "/use-cases/bed-pressure/predictions" },
      { label: "Analysis", href: "/use-cases/bed-pressure/analysis" },
      { label: "Decisions", href: "/use-cases/bed-pressure/decisions" },
    ],
    governedDatasets: [
      {
        id: "bed-fct-occupancy",
        name: "Ward Occupancy Fact",
        schema: "analytics",
        table: "fct_bed_occupancy",
        assetType: "fact",
        businessMeaning: "Daily ward occupancy facts used to monitor live pressure and breach risk.",
        grain: "One row per ward per day",
        owner: "Clinical Operations Analytics",
        steward: "Capacity Planning Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Bed Pressure workspace", "Superset dashboard", "Forecast runtime"],
        relatedTerms: ["Occupancy Rate", "Ward Capacity", "Discharge Pressure"],
        complianceNotes: ["Ward-level operational data only.", "No patient-identifying fields surfaced in workspace output."],
        lineageSummary: ["bed_events -> staging -> analytics.fct_bed_occupancy -> workspace status pages"],
      },
      {
        id: "bed-dim-ward",
        name: "Ward Dimension",
        schema: "analytics",
        table: "dim_ward",
        assetType: "dimension",
        businessMeaning: "Reference asset defining ward names, codes, and capacity context.",
        grain: "One row per ward",
        owner: "Clinical Operations Analytics",
        steward: "Bed Operations Steward",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "trusted",
        consumers: ["Bed Pressure workspace", "Lineage view"],
        relatedTerms: ["Ward Capacity"],
        complianceNotes: ["Administrative dimension; no sensitive attributes."],
        lineageSummary: ["wards -> staging -> analytics.dim_ward -> analytics facts"],
      },
      {
        id: "bed-output-forecast",
        name: "Occupancy Forecast Output",
        schema: "output",
        table: "forecast",
        assetType: "output",
        businessMeaning: "Forecast output that estimates upcoming occupancy and breach windows.",
        grain: "One row per ward per forecast date",
        owner: "Forecast Runtime",
        steward: "Capacity Planning Lead",
        freshnessStatus: "not_connected",
        testStatus: "not_connected",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        consumers: ["Predictions page", "Superset dashboard"],
        relatedTerms: ["Forecast Occupancy"],
        complianceNotes: ["Runtime freshness not connected in Governance phase 1."],
        lineageSummary: ["analytics.fct_bed_occupancy -> forecast runtime -> output.forecast -> workspace predictions"],
      },
      {
        id: "bed-output-anomaly",
        name: "Occupancy Anomaly Output",
        schema: "output",
        table: "anomaly",
        assetType: "output",
        businessMeaning: "Anomaly detection output for unusual ward pressure or flow conditions.",
        grain: "One row per ward per anomaly event",
        owner: "Anomaly Runtime",
        steward: "Operational Intelligence Lead",
        freshnessStatus: "not_connected",
        testStatus: "not_connected",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        consumers: ["Alerts page", "Operations reviews"],
        relatedTerms: ["Active Anomaly"],
        complianceNotes: ["Runtime evidence pending integration."],
        lineageSummary: ["analytics.fct_bed_occupancy -> anomaly runtime -> output.anomaly -> workspace alerts"],
      },
      {
        id: "bed-dict-metrics",
        name: "Metric Dictionary",
        schema: "dictionary",
        table: "dict_metrics",
        assetType: "dictionary",
        businessMeaning: "Business glossary anchor for occupancy metrics and calculations.",
        grain: "One row per governed metric",
        owner: "Platform Governance",
        steward: "Data Stewardship Office",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "unknown",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        consumers: ["Governance page", "Admin configuration"],
        relatedTerms: ["Occupancy Rate", "Forecast Occupancy", "Active Anomaly"],
        complianceNotes: ["Business definitions manually curated in phase 1 registry."],
      },
      {
        id: "bed-decision-queue",
        name: "Decision Queue",
        schema: "decision",
        table: "decision_queue",
        assetType: "decision",
        businessMeaning: "Operational decision recommendations triggered by occupancy risk and anomaly signals.",
        grain: "One row per generated operational decision",
        owner: "Decision Engine",
        steward: "Capacity Planning Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "unknown",
        certificationStatus: "warning",
        consumers: ["Bed Pressure decisions page", "Notifications"],
        relatedTerms: ["Discharge Pressure"],
        complianceNotes: ["Outcome evidence visible, but governance runtime evidence not connected."],
      },
    ],
    dictionaryTerms: [
      {
        id: "bp-occupancy-rate",
        term: "Occupancy Rate",
        definition: "Share of staffed beds currently occupied in a ward.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-fct-occupancy"],
        owner: "Capacity Planning Lead",
        status: "approved",
      },
      {
        id: "bp-forecast-occupancy",
        term: "Forecast Occupancy",
        definition: "Projected occupancy for a future ward-date produced by the forecasting runtime.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-output-forecast"],
        owner: "Operational Intelligence Lead",
        status: "approved",
      },
      {
        id: "bp-active-anomaly",
        term: "Active Anomaly",
        definition: "A ward-level signal indicating pressure behavior outside expected bounds.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-output-anomaly"],
        owner: "Operational Intelligence Lead",
        status: "approved",
      },
      {
        id: "bp-discharge-pressure",
        term: "Discharge Pressure",
        definition: "Operational urgency to create safe bed capacity through discharge actions.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-decision-queue"],
        owner: "Capacity Planning Lead",
        status: "draft",
      },
      {
        id: "bp-ward-capacity",
        term: "Ward Capacity",
        definition: "Configured bed capacity available to a ward for occupancy and forecasting logic.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-dim-ward"],
        owner: "Bed Operations Steward",
        status: "approved",
      },
    ],
    lineageEntryPoints: [
      {
        id: "bp-lineage-live-occupancy",
        label: "Live occupancy contract",
        summary: "Tracks how source bed events become governed occupancy facts and workspace views.",
        path: ["bed_events", "staging.stg_bed_events", "analytics.fct_bed_occupancy", "Bed Pressure workspace"],
        impactTargets: ["Status", "Overview", "Superset bed dashboard"],
        status: "partial",
      },
      {
        id: "bp-lineage-forecast",
        label: "Forecast and anomaly outputs",
        summary: "Shows product lineage from analytics facts into runtime outputs and alerting surfaces.",
        path: ["analytics.fct_bed_occupancy", "R runtimes", "output.forecast / output.anomaly", "Predictions and Alerts pages"],
        impactTargets: ["Predictions", "Alerts", "Superset"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "not_connected",
      quality: "unknown",
      lineage: "partial",
      recordSpecs: "partial",
      compliance: "warning",
      note: "Record specifications exist for core assets, but live freshness and test telemetry are not connected in phase 1.",
    },
    complianceContext: {
      posture: "warning",
      summary: "Clinical operations metadata is governed, but runtime evidence and certification workflows are only partially surfaced.",
      evidence: [
        "Core record specifications exist for occupancy and output assets.",
        "Operational definitions are available for the primary ward pressure metrics.",
      ],
      gaps: [
        "Freshness telemetry not connected to governance UI.",
        "Decision queue asset lacks a complete record specification preview.",
      ],
    },
    downstreamConsumers: ["Bed Pressure workspace", "Administration -> Governance", "Superset dashboard", "Decision notifications"],
  },
  {
    id: "revenue_cycle_management",
    name: "Revenue Cycle Management",
    domain: "Financial Operations",
    workspacePath: "/use-cases/revenue-cycle-management/cash-command",
    description: "Cash control, recovery execution, payer accountability, and leakage metadata.",
    businessPurpose: "Track claim movement, identify denial and recovery opportunities, control payer performance, detect leakage, and support executive revenue narrative.",
    owner: "Revenue Operations Analytics",
    steward: "Revenue Integrity Lead",
    workspaceCoverage: [
      { label: "Cash Command", href: "/use-cases/revenue-cycle-management/cash-command" },
      { label: "Recovery Queue", href: "/use-cases/revenue-cycle-management/recovery-queue" },
      { label: "Payer Control", href: "/use-cases/revenue-cycle-management/payer-control" },
      { label: "Revenue Leakage", href: "/use-cases/revenue-cycle-management/revenue-leakage" },
      { label: "Team Performance", href: "/use-cases/revenue-cycle-management/team-performance" },
      { label: "Executive Narrative", href: "/use-cases/revenue-cycle-management/executive-narrative" },
    ],
    governedDatasets: [
      {
        id: "rcm-recovery-opportunity",
        name: "Cash Recovery Opportunity",
        schema: "analytics",
        table: "fct_cash_recovery_opportunity",
        assetType: "fact",
        businessMeaning: "Prioritized recovery opportunities across denials, underpayments, and filing risks.",
        grain: "One row per revenue recovery opportunity",
        owner: "Revenue Operations Analytics",
        steward: "Revenue Integrity Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Recovery Queue", "Cash Command", "Executive dashboard"],
        relatedTerms: ["Recovery Opportunity", "Cash at Risk", "Claim Value"],
        complianceNotes: ["Financial operations use case; no direct patient identifiers exposed in workspace layer."],
        lineageSummary: ["claims / postings / denials -> analytics.fct_cash_recovery_opportunity -> Recovery Queue"],
      },
      {
        id: "rcm-cash-forecast",
        name: "Cash Forecast",
        schema: "analytics",
        table: "fct_cash_forecast",
        assetType: "fact",
        businessMeaning: "Forward-looking forecast of recoverable cash, risk, and expected collections.",
        grain: "One row per forecast date and payer or department segment",
        owner: "Revenue Operations Analytics",
        steward: "CFO Analytics Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Cash Command", "Executive Narrative"],
        relatedTerms: ["Cash at Risk", "Expected Collections"],
        complianceNotes: ["Forecast quality evidence not connected in phase 1."],
      },
      {
        id: "rcm-payer-contract",
        name: "Payer Contract Performance",
        schema: "analytics",
        table: "fct_payer_contract_performance",
        assetType: "fact",
        businessMeaning: "Monthly payer performance against contracted collection and payment expectations.",
        grain: "One row per payer per month",
        owner: "Payer Performance Analytics",
        steward: "Payer Relations Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Payer Control", "Executive dashboard", "Contract review"],
        relatedTerms: ["Payer Turnaround Time", "Denial Rate"],
        complianceNotes: ["Contract evidence summarized; renewal and SLA monitoring not yet wired to runtime telemetry."],
      },
      {
        id: "rcm-team-performance",
        name: "Recovery Team Performance",
        schema: "analytics",
        table: "fct_team_recovery_performance",
        assetType: "fact",
        businessMeaning: "Performance of owner-led recovery execution against expected outcomes.",
        grain: "One row per owner or team per reporting period",
        owner: "Revenue Operations Analytics",
        steward: "Revenue Integrity Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        consumers: ["Team Performance", "Executive Narrative"],
        relatedTerms: ["Recovery Opportunity"],
        complianceNotes: ["Stewardship present; SLA outcome evidence not connected."],
      },
      {
        id: "rcm-revenue-cycle",
        name: "Revenue Cycle Fact",
        schema: "analytics",
        table: "fct_revenue_cycle",
        assetType: "fact",
        businessMeaning: "Lifecycle fact connecting claim movement from encounter through payment state.",
        grain: "One row per claim and encounter revenue lifecycle state",
        owner: "Revenue Operations Analytics",
        steward: "Revenue Integrity Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Cash Command", "Revenue analytics", "Governance"],
        relatedTerms: ["Claim Value", "Denial Rate"],
        complianceNotes: ["Financial truth anchored to ERP postings; patient-level operational details suppressed in workspace layer."],
      },
      {
        id: "rcm-financial-posting",
        name: "Financial Posting Fact",
        schema: "analytics",
        table: "fct_financial_posting",
        assetType: "fact",
        businessMeaning: "ERP financial truth anchor for payments, collections, and reconciliation.",
        grain: "One row per ERP financial posting",
        owner: "Finance Data Platform",
        steward: "Finance Controller",
        freshnessStatus: "not_connected",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Cash Command", "Executive dashboard", "Payer Control"],
        relatedTerms: ["Claim Value", "Cash at Risk"],
        complianceNotes: ["Financial anchor confirmed; freshness signal not connected to governance UI."],
      },
      {
        id: "rcm-claim-aging",
        name: "Claim Aging Snapshot",
        schema: "analytics",
        table: "fct_claim_aging",
        assetType: "fact",
        businessMeaning: "Aging snapshot for open claim balances by payer and segment.",
        grain: "One row per claim aging snapshot",
        owner: "AR Analytics",
        steward: "Revenue Integrity Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        consumers: ["Cash Command", "Payer Control", "Executive dashboard"],
        relatedTerms: ["Payer Turnaround Time"],
        complianceNotes: ["Trend evidence partially modeled; freshness not connected."],
      },
      {
        id: "rcm-denials",
        name: "Denial Events",
        schema: "analytics",
        table: "fct_denials",
        assetType: "fact",
        businessMeaning: "Normalized denial events supporting queueing, appeal, and payer control analysis.",
        grain: "One row per denial event",
        owner: "Revenue Integrity Analytics",
        steward: "Coding Manager",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Recovery Queue", "Payer Control", "Superset dashboard"],
        relatedTerms: ["Denial Rate", "Recovery Opportunity"],
        complianceNotes: ["Appeal success evidence not fully connected in governance UI."],
      },
      {
        id: "rcm-leakage",
        name: "Revenue Leakage Fact",
        schema: "analytics",
        table: "fct_revenue_leakage",
        assetType: "fact",
        businessMeaning: "Leakage findings across denials, underpayments, write-offs, and unbilled activity.",
        grain: "One row per leakage finding",
        owner: "Revenue Operations Analytics",
        steward: "Revenue Integrity Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        consumers: ["Revenue Leakage workspace", "Executive dashboard"],
        relatedTerms: ["Revenue Leakage", "Cash at Risk"],
        complianceNotes: ["Recoverability guidance is registry-driven in phase 1."],
      },
      {
        id: "rcm-payer-performance",
        name: "Payer Performance Summary",
        schema: "analytics",
        table: "fct_payer_performance",
        assetType: "fact",
        businessMeaning: "Supplementary payer-period performance summary used in comparative analytics.",
        grain: "One row per payer and period performance summary",
        owner: "Payer Performance Analytics",
        steward: "Payer Relations Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "unknown",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        consumers: ["Executive dashboard", "Payer reviews"],
        relatedTerms: ["Payer Turnaround Time"],
        complianceNotes: ["Coverage exists, but runtime trust evidence is still partial."],
      },
      {
        id: "rcm-patient-acquisition",
        name: "Patient Acquisition Fact",
        schema: "analytics",
        table: "fct_patient_acquisition",
        assetType: "fact",
        businessMeaning: "Referral and acquisition performance linked to revenue outcomes.",
        grain: "One row per acquisition or referral channel and period",
        owner: "Growth Analytics",
        steward: "Patient Access Lead",
        freshnessStatus: "unknown",
        testStatus: "unknown",
        lineageStatus: "missing",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        consumers: ["Executive Narrative", "Growth reporting"],
        relatedTerms: ["Claim Value"],
        complianceNotes: ["CRM lineage not yet connected in governance view."],
      },
    ],
    dictionaryTerms: [
      {
        id: "rcm-claim-value",
        term: "Claim Value",
        definition: "Financial value represented by a claim before denials, write-offs, and collection adjustments.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-revenue-cycle", "rcm-financial-posting"],
        owner: "Finance Controller",
        status: "approved",
      },
      {
        id: "rcm-denial-rate",
        term: "Denial Rate",
        definition: "Share of submitted claims that enter a denied or appealed state.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-denials", "rcm-revenue-cycle"],
        owner: "Revenue Integrity Lead",
        status: "approved",
      },
      {
        id: "rcm-recovery-opportunity",
        term: "Recovery Opportunity",
        definition: "A financially actionable issue that can be assigned, worked, and measured for cash recovery.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-recovery-opportunity", "rcm-team-performance"],
        owner: "Revenue Integrity Lead",
        status: "approved",
      },
      {
        id: "rcm-revenue-leakage",
        term: "Revenue Leakage",
        definition: "Financial value lost or delayed because of denials, underpayments, write-offs, or process failures.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-leakage"],
        owner: "CFO Analytics Lead",
        status: "approved",
      },
      {
        id: "rcm-payer-turnaround",
        term: "Payer Turnaround Time",
        definition: "Elapsed time between claim submission and payment receipt for a payer segment.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-payer-contract", "rcm-claim-aging"],
        owner: "Payer Relations Lead",
        status: "approved",
      },
      {
        id: "rcm-cash-at-risk",
        term: "Cash at Risk",
        definition: "Expected cash likely to be delayed or lost unless active recovery actions are taken.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-cash-forecast", "rcm-recovery-opportunity"],
        owner: "CFO Analytics Lead",
        status: "draft",
      },
    ],
    lineageEntryPoints: [
      {
        id: "rcm-lineage-cash-command",
        label: "Cash command product lineage",
        summary: "Shows how claims, postings, and recovery opportunities become the executive cash-command experience.",
        path: ["claims / denials / postings", "staging", "analytics facts", "revenue-cycle APIs", "Cash Command workspace"],
        impactTargets: ["Cash Command", "Open CFO Dashboard"],
        status: "partial",
      },
      {
        id: "rcm-lineage-payer-control",
        label: "Payer control contract lineage",
        summary: "Maps contract and payment performance into payer accountability surfaces.",
        path: ["payer_contracts / financial_postings", "analytics.fct_payer_contract_performance", "payer-control API", "Payer Control workspace"],
        impactTargets: ["Payer Control", "Executive Narrative"],
        status: "partial",
      },
      {
        id: "rcm-lineage-leakage",
        label: "Leakage impact lineage",
        summary: "Summarizes how leakage findings flow into recovery prioritization and executive narrative.",
        path: ["claims / denials / postings", "analytics.fct_revenue_leakage", "revenue-cycle APIs", "Leakage + Executive Narrative"],
        impactTargets: ["Revenue Leakage", "Executive Narrative", "Superset dashboard"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "not_connected",
      quality: "unknown",
      lineage: "partial",
      recordSpecs: "complete",
      compliance: "warning",
      note: "Revenue Cycle has broad record-spec coverage, but governance still lacks connected freshness, test, and compliance telemetry.",
    },
    complianceContext: {
      posture: "warning",
      summary: "Revenue data products are governed as operational contracts, but runtime evidence and stewardship workflows are only partially surfaced.",
      evidence: [
        "Core RCM facts have defined record specs and business meaning.",
        "Use-case workspace coverage and downstream consumers are explicitly modeled.",
      ],
      gaps: [
        "Freshness and quality evidence not connected to live runtime telemetry.",
        "CRM-linked acquisition lineage remains incomplete in governance phase 1.",
      ],
    },
    downstreamConsumers: ["Revenue Cycle workspace", "Administration -> Governance", "Superset executive dashboard", "Executive reviews"],
  },
];

export function getGovernanceUseCases() {
  return governanceUseCases;
}

export function getGovernanceOverview() {
  const useCases = getGovernanceUseCases();
  const datasets = useCases.flatMap((useCase) => useCase.governedDatasets);
  const glossaryTerms = useCases.flatMap((useCase) => useCase.dictionaryTerms);
  const lineageMapped = useCases.filter((useCase) => useCase.lineageEntryPoints.length > 0).length;
  const recordSpecs = datasets.filter((dataset) => dataset.recordSpecStatus !== "missing").length;
  const complianceGaps = useCases.reduce((count, useCase) => count + useCase.complianceContext.gaps.length, 0);

  return {
    activeUseCases: useCases.length,
    governedAssets: datasets.length,
    glossaryTerms: glossaryTerms.length,
    recordSpecs,
    lineageCoverage: `${lineageMapped}/${useCases.length} products mapped`,
    qualityStatus: "Not connected",
    freshnessStatus: "Not connected",
    complianceGaps,
  };
}
