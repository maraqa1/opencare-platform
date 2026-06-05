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
  | "needs_review"
  | "reviewed"
  | "certified"
  | "deprecated"
  | "fresh"
  | "stale"
  | "passing"
  | "failing"
  | "sensitive"
  | "restricted"
  | "internal"
  | "public";

export type TrustState = "trusted" | "degraded" | "untrusted" | "unmapped";

export type GovernanceDomain =
  | "Clinical Operations"
  | "Financial Operations"
  | "Commercial Operations"
  | "Municipal Operations"
  | "Platform Administration";

export type ScopeCoverage =
  | "use_cases"
  | "assets"
  | "glossary"
  | "lineage"
  | "quality"
  | "compliance"
  | "classification";

export type WorkspaceCoverageItem = {
  label: string;
  href: string;
};

export type SensitivityClass = "public" | "internal" | "sensitive" | "restricted";

export type QualityDimensionStatus = "fresh" | "passing" | "warning" | "failing" | "unknown" | "not_connected";

export type QualityDimensions = {
  freshness: QualityDimensionStatus;
  completeness: QualityDimensionStatus;
  validity: QualityDimensionStatus;
  consistency: QualityDimensionStatus;
};

export type CertificationStatus = "draft" | "reviewed" | "certified" | "deprecated";

export type DatasetColumn = {
  name: string;
  dataType: string;
  sensitivityClass: SensitivityClass;
  suppressedInWorkspace: boolean;
  businessDescription?: string;
  relatedTermIds?: string[];
};

export type ClassificationRule = {
  id: string;
  name: string;
  matchPattern: string;
  classification: SensitivityClass;
  scope: "column_name" | "field_usage";
  rationale: string;
};

export type CompliancePolicy = {
  id: string;
  framework: string;
  policy: string;
  evidence: string;
  owner: string;
  status: "compliant" | "partial" | "gap" | "not_assessed";
  nextReviewDate?: string;
  appliesTo?: string[];
};

export type ComplianceContext = {
  posture: "trusted" | "draft" | "warning" | "unknown";
  summary: string;
  policies: CompliancePolicy[];
};

export type BusinessTrustNodeType =
  | "source"
  | "landing"
  | "staging"
  | "mart"
  | "runtime"
  | "workspace"
  | "dashboard"
  | "kpi"
  | "decision";

export type BusinessTrustNode = {
  id: string;
  label: string;
  type: BusinessTrustNodeType;
  assetId?: string;
  description?: string;
  sensitivityClass?: SensitivityClass;
  freshnessStatus?: GovernedDataset["freshnessStatus"];
  qualityStatus?: GovernedDataset["testStatus"];
  certificationStatus?: CertificationStatus;
  owner?: string;
  steward?: string;
  uses?: string[];
  curated?: boolean;
};

export type BusinessTrustEdge = {
  from: string;
  to: string;
  label?: string;
  curated?: boolean;
};

export type BusinessTrustMap = {
  title: string;
  summary: string;
  nodes: BusinessTrustNode[];
  edges: BusinessTrustEdge[];
  focusNodeId?: string;
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
  certification?: {
    status: CertificationStatus;
    note?: string;
    certifiedDate?: string;
  };
  consumers: string[];
  downstreamConsumers?: string[];
  upstreamSources?: string[];
  relatedDashboards?: string[];
  relatedTerms?: string[];
  complianceNotes?: string[];
  lineageSummary?: string[];
  columns?: DatasetColumn[];
  qualityDimensions?: QualityDimensions;
  rowCount?: number;
  lastUpdated?: string;
  openRisks?: string[];
};

export type DictionaryTerm = {
  id: string;
  term: string;
  definition: string;
  domain: GovernanceDomain;
  useCaseId: string;
  relatedDatasets?: string[];
  relatedTermIds?: string[];
  synonyms?: string[];
  owner?: string;
  steward?: string;
  exampleUsage?: string;
  sourceMetric?: string;
  status: "approved" | "draft" | "needs_review" | "missing";
};

export type LineageEntryPoint = {
  id: string;
  label: string;
  summary: string;
  technicalModel: string;
  impactTargets: string[];
  status: "complete" | "partial" | "missing" | "unknown" | "not_connected";
};

export type QualitySummary = {
  freshness: "fresh" | "warning" | "stale" | "unknown" | "not_connected";
  quality: "passing" | "warning" | "failing" | "unknown" | "not_connected";
  lineage: "complete" | "partial" | "missing" | "unknown" | "not_connected";
  recordSpecs: "complete" | "partial" | "missing" | "unknown";
  compliance: "trusted" | "draft" | "warning" | "unknown";
  dqDimensions?: QualityDimensions;
  note: string;
};

export type GovernanceUseCase = {
  id: string;
  name: string;
  domain: GovernanceDomain;
  workspacePath: string;
  description: string;
  businessPurpose: string;
  owner: string;
  steward?: string;
  sourceTables: string[];
  workspaceCoverage: WorkspaceCoverageItem[];
  governedDatasets: GovernedDataset[];
  dictionaryTerms: DictionaryTerm[];
  lineageEntryPoints: LineageEntryPoint[];
  qualitySummary: QualitySummary;
  complianceContext: ComplianceContext;
  downstreamConsumers: string[];
  trustMap: BusinessTrustMap;
  diagnosticsScope?: {
    qualityModels?: string[];
    freshnessSources?: string[];
  };
};

export type GovernanceKpi = {
  slug: string;
  id: string;
  label: string;
  description: string;
  useCaseId: string;
  useCaseName: string;
  domain: GovernanceDomain;
  trustState: TrustState;
  assetId?: string;
  technicalModel?: string;
  glossaryTerms: DictionaryTerm[];
};

type GovernanceOverview = {
  activeUseCases: number;
  governedAssets: number;
  useCasesCovered: string;
  certifiedAssets: string;
  classifiedColumns: string;
  policiesMapped: string;
  qualityChecksRepresented: string;
  glossaryCoverage: string;
  lineageCoverage: string;
  highRiskAssets: string;
};

export type GovernanceHealthDetails = {
  unmappedKpis: GovernanceKpi[];
  missingOwners: Array<{ assetId: string; name: string; useCaseId: string }>;
  staleAssets: Array<{ assetId: string; name: string; useCaseId: string }>;
  uncertifiedAssets: Array<{ assetId: string; name: string; useCaseId: string; status: string }>;
};

function datasetColumn(
  name: string,
  dataType: string,
  sensitivityClass: SensitivityClass,
  businessDescription: string,
  options?: Partial<Pick<DatasetColumn, "suppressedInWorkspace" | "relatedTermIds">>,
): DatasetColumn {
  return {
    name,
    dataType,
    sensitivityClass,
    businessDescription,
    suppressedInWorkspace: options?.suppressedInWorkspace ?? false,
    relatedTermIds: options?.relatedTermIds,
  };
}

function dims(
  freshness: QualityDimensionStatus,
  completeness: QualityDimensionStatus,
  validity: QualityDimensionStatus,
  consistency: QualityDimensionStatus,
): QualityDimensions {
  return { freshness, completeness, validity, consistency };
}

function certification(status: CertificationStatus, note: string, certifiedDate?: string) {
  return {
    status,
    note,
    certifiedDate,
  };
}

function policy(
  id: string,
  framework: string,
  policyName: string,
  evidence: string,
  owner: string,
  status: CompliancePolicy["status"],
  nextReviewDate: string,
  appliesTo: string[],
): CompliancePolicy {
  return {
    id,
    framework,
    policy: policyName,
    evidence,
    owner,
    status,
    nextReviewDate,
    appliesTo,
  };
}

const classificationRules: ClassificationRule[] = [
  {
    id: "rule-patient-identifiers",
    name: "Patient identifier fields",
    matchPattern: "patient_id|patient_key|mrn|medical_record_number",
    classification: "restricted",
    scope: "column_name",
    rationale: "Patient identifiers are restricted and must not be surfaced in operational workspace views.",
  },
  {
    id: "rule-demographic-dates",
    name: "Patient birth and encounter dates",
    matchPattern: "date_of_birth|dob|birth_date|encounter_date",
    classification: "sensitive",
    scope: "column_name",
    rationale: "Demographic and encounter dates become sensitive when paired with operational context.",
  },
  {
    id: "rule-financial-identifiers",
    name: "Claim and account identifiers",
    matchPattern: "claim_id|account_number|billing_id|payer_id",
    classification: "sensitive",
    scope: "column_name",
    rationale: "Financial identifiers require controlled access and should be treated as sensitive internal data.",
  },
  {
    id: "rule-operational-codes",
    name: "Operational ward and department identifiers",
    matchPattern: "ward_id|ward_code|department_id|department_code",
    classification: "internal",
    scope: "column_name",
    rationale: "Operational identifiers are needed in the workspace but remain internal-only data.",
  },
];

const bedPressureTrustMap: BusinessTrustMap = {
  title: "Bed Pressure Data Trust Map",
  summary:
    "A curated product-layer map showing how occupancy evidence moves from source events to governed facts, operational KPIs, analytics, and decisions.",
  focusNodeId: "bp-mart-occupancy",
  nodes: [
    {
      id: "bp-source-bed-events",
      label: "Bed Events",
      type: "source",
      description: "EHR and operational bed movement events.",
      sensitivityClass: "restricted",
      owner: "Operational Source Systems",
      curated: false,
    },
    {
      id: "bp-landing-raw",
      label: "Airbyte Raw Landing",
      type: "landing",
      description: "Raw landed events in PostgreSQL before transformation.",
      sensitivityClass: "restricted",
      freshnessStatus: "fresh",
      curated: true,
    },
    {
      id: "bp-staging-events",
      label: "dbt Staging: stg_bed_events",
      type: "staging",
      description: "Normalized event stream used by occupancy marts.",
      freshnessStatus: "fresh",
      qualityStatus: "passing",
      certificationStatus: "reviewed",
      curated: false,
    },
    {
      id: "bp-mart-occupancy",
      label: "Analytics Mart: fct_bed_occupancy",
      type: "mart",
      assetId: "bed-fct-occupancy",
      description: "Governed occupancy fact for daily ward pressure.",
      freshnessStatus: "fresh",
      qualityStatus: "passing",
      certificationStatus: "certified",
      owner: "Clinical Operations Analytics",
      steward: "Capacity Planning Lead",
      uses: ["Current Status", "Predictions", "Superset"],
      curated: false,
    },
    {
      id: "bp-runtime-forecast",
      label: "Forecast Runtime",
      type: "runtime",
      assetId: "bed-output-forecast",
      description: "R runtime producing breach-risk forecasts.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "reviewed",
      curated: false,
    },
    {
      id: "bp-runtime-anomaly",
      label: "Anomaly Runtime",
      type: "runtime",
      assetId: "bed-output-anomaly",
      description: "R runtime producing pressure anomaly signals.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "reviewed",
      curated: false,
    },
    {
      id: "bp-kpi-pressure",
      label: "Portal KPI: Bed Occupancy",
      type: "kpi",
      assetId: "bed-fct-occupancy",
      description: "Executive occupancy headline used in the workspace shell.",
      freshnessStatus: "warning",
      qualityStatus: "passing",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "bp-dashboard-superset",
      label: "Superset Bed Dashboard",
      type: "dashboard",
      description: "Executive-facing occupancy evidence dashboard.",
      freshnessStatus: "warning",
      qualityStatus: "passing",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "bp-workspace-status",
      label: "Bed Pressure Workspace",
      type: "workspace",
      description: "Operational status, alerts, predictions, and evidence views.",
      freshnessStatus: "warning",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "bp-decision-queue",
      label: "Decision / Action Queue",
      type: "decision",
      assetId: "bed-decision-queue",
      description: "Operational actions triggered by forecast and anomaly evidence.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      curated: true,
    },
  ],
  edges: [
    { from: "bp-source-bed-events", to: "bp-landing-raw", curated: true },
    { from: "bp-landing-raw", to: "bp-staging-events", curated: false },
    { from: "bp-staging-events", to: "bp-mart-occupancy", curated: false },
    { from: "bp-mart-occupancy", to: "bp-runtime-forecast", label: "Forecast features", curated: true },
    { from: "bp-mart-occupancy", to: "bp-runtime-anomaly", label: "Anomaly features", curated: true },
    { from: "bp-mart-occupancy", to: "bp-kpi-pressure", label: "Operational KPI", curated: true },
    { from: "bp-mart-occupancy", to: "bp-dashboard-superset", label: "Analytics evidence", curated: true },
    { from: "bp-runtime-forecast", to: "bp-workspace-status", label: "Predictions", curated: true },
    { from: "bp-runtime-anomaly", to: "bp-workspace-status", label: "Alerts", curated: true },
    { from: "bp-workspace-status", to: "bp-decision-queue", label: "Decision actioning", curated: true },
    { from: "bp-dashboard-superset", to: "bp-decision-queue", label: "Evidence to action", curated: true },
  ],
};

const revenueCycleTrustMap: BusinessTrustMap = {
  title: "Revenue Cycle Data Trust Map",
  summary:
    "A curated product-layer map showing how financial source records become governed marts, command views, executive dashboards, and recovery actions.",
  focusNodeId: "rcm-mart-cycle",
  nodes: [
    {
      id: "rcm-source-claims",
      label: "Claims and Denials",
      type: "source",
      description: "Revenue source systems and adjudication feeds.",
      sensitivityClass: "restricted",
      owner: "Revenue Source Systems",
      curated: false,
    },
    {
      id: "rcm-landing-raw",
      label: "Airbyte Raw Landing",
      type: "landing",
      description: "Raw landed finance and denial records.",
      sensitivityClass: "restricted",
      freshnessStatus: "fresh",
      curated: true,
    },
    {
      id: "rcm-staging-revenue",
      label: "dbt Staging",
      type: "staging",
      description: "Normalized staging models for claims, denials, and postings.",
      freshnessStatus: "fresh",
      qualityStatus: "passing",
      certificationStatus: "reviewed",
      curated: false,
    },
    {
      id: "rcm-mart-cycle",
      label: "Analytics Mart: fct_revenue_cycle",
      type: "mart",
      assetId: "rcm-revenue-cycle",
      description: "Governed revenue lifecycle fact used by multiple RCM views.",
      freshnessStatus: "fresh",
      qualityStatus: "passing",
      certificationStatus: "certified",
      owner: "Revenue Operations Analytics",
      steward: "Revenue Integrity Lead",
      uses: ["Cash Command", "Payer Control", "Executive Narrative"],
      curated: false,
    },
    {
      id: "rcm-mart-recovery",
      label: "Analytics Mart: Recovery Opportunities",
      type: "mart",
      assetId: "rcm-recovery-opportunity",
      description: "Actionable recovery opportunities prioritized for queue work.",
      freshnessStatus: "fresh",
      qualityStatus: "passing",
      certificationStatus: "certified",
      curated: false,
    },
    {
      id: "rcm-output-forecast",
      label: "Cash Forecast Output",
      type: "runtime",
      assetId: "rcm-cash-forecast",
      description: "Expected collections and cash-at-risk output for executives.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "rcm-kpi-command",
      label: "Portal KPI: Cash Command",
      type: "kpi",
      assetId: "rcm-cash-forecast",
      description: "Executive cash and risk KPIs rendered in the workspace.",
      freshnessStatus: "warning",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "rcm-dashboard-cfo",
      label: "Superset CFO Dashboard",
      type: "dashboard",
      description: "Executive revenue cycle evidence surface.",
      freshnessStatus: "warning",
      qualityStatus: "passing",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "rcm-workspace",
      label: "Revenue Cycle Workspace",
      type: "workspace",
      description: "Cash command, queue management, payer control, and narrative views.",
      freshnessStatus: "warning",
      certificationStatus: "reviewed",
      curated: true,
    },
    {
      id: "rcm-decision-recovery",
      label: "Recovery Action Queue",
      type: "decision",
      description: "Owner-led work queue driven by governed opportunities and leakage signals.",
      assetId: "rcm-team-performance",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      curated: true,
    },
  ],
  edges: [
    { from: "rcm-source-claims", to: "rcm-landing-raw", curated: true },
    { from: "rcm-landing-raw", to: "rcm-staging-revenue", curated: false },
    { from: "rcm-staging-revenue", to: "rcm-mart-cycle", curated: false },
    { from: "rcm-staging-revenue", to: "rcm-mart-recovery", curated: false },
    { from: "rcm-mart-cycle", to: "rcm-output-forecast", label: "Cash risk model", curated: true },
    { from: "rcm-mart-cycle", to: "rcm-kpi-command", label: "Executive KPI", curated: true },
    { from: "rcm-mart-recovery", to: "rcm-workspace", label: "Recovery queue", curated: true },
    { from: "rcm-output-forecast", to: "rcm-dashboard-cfo", label: "CFO evidence", curated: true },
    { from: "rcm-kpi-command", to: "rcm-workspace", label: "Command surface", curated: true },
    { from: "rcm-workspace", to: "rcm-decision-recovery", label: "Action management", curated: true },
  ],
};

const talemiaTrustMap: BusinessTrustMap = {
  title: "TALEMIA Commercial Intelligence Trust Map",
  summary:
    "A product-layer map showing how the V4 workbook extract becomes guarded dbt staging, analytics marts, dictionary outputs, dashboard reconciliation, and the TALEMIA commercial workspace.",
  focusNodeId: "talemia-mart-opportunity",
  nodes: [
    {
      id: "talemia-source-v4",
      label: "V4 Extract Workbook",
      type: "source",
      description: "TALEMIA extractor output from the original commercial workbook.",
      sensitivityClass: "internal",
      owner: "Commercial Operations",
      steward: "Data/Governance Owner",
      curated: false,
    },
    {
      id: "talemia-landing-raw",
      label: "raw_demo.talemia_*",
      type: "landing",
      description: "Source-derived raw tables loaded from talemia_raw_demo_extracted_v4.xlsx.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Operations",
      steward: "Data/Governance Owner",
      curated: false,
    },
    {
      id: "talemia-staging",
      label: "dbt Staging: stg_talemia_*",
      type: "staging",
      description: "Guarded dbt staging models that return empty outputs if raw_demo TALEMIA tables are absent.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Analytics",
      steward: "Data/Governance Owner",
      curated: false,
    },
    {
      id: "talemia-mart-opportunity",
      label: "Analytics Mart: fct_talemia_opportunity",
      type: "mart",
      assetId: "talemia-fct-opportunity",
      description: "Opportunity-grain commercial fact used by dashboard tabs and backend APIs.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Analytics",
      steward: "Commercial Operations Lead",
      uses: ["Executive", "Financial", "Business Lines", "Account Managers", "Commercial", "Opportunities"],
      curated: false,
    },
    {
      id: "talemia-mart-performance",
      label: "Analytics Marts: Pipeline and Win/Loss",
      type: "mart",
      assetId: "talemia-fct-pipeline",
      description: "Aggregated marts for pipeline value, win/loss, account-manager, and business-line performance.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Analytics",
      steward: "Commercial Operations Lead",
      uses: ["Executive KPIs", "Portfolio views", "Superset"],
      curated: false,
    },
    {
      id: "talemia-dictionary",
      label: "Dictionary: dict_talemia_metrics",
      type: "kpi",
      assetId: "talemia-dict-metrics",
      description: "KPI formulas, source mart references, raw lineage, limitations, and dashboard placement.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Data/Governance Owner",
      steward: "Commercial Operations Lead",
      curated: false,
    },
    {
      id: "talemia-reconciliation",
      label: "Dashboard Reconciliation",
      type: "kpi",
      assetId: "talemia-fct-reconciliation",
      description: "Calculated dashboard values compared with V4 dashboard targets before authoritative reporting.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Data/Governance Owner",
      steward: "Commercial Operations Lead",
      curated: false,
    },
    {
      id: "talemia-dashboard-superset",
      label: "Superset: talemia-business-intelligence",
      type: "dashboard",
      description: "Superset dashboard suite that must query analytics and dictionary assets only.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Analytics",
      steward: "Commercial Operations Lead",
      curated: true,
    },
    {
      id: "talemia-workspace",
      label: "TALEMIA Commercial Workspace",
      type: "workspace",
      description: "Operational portal workspace for commercial pipeline, performance, and opportunity drilldown.",
      freshnessStatus: "warning",
      qualityStatus: "warning",
      certificationStatus: "draft",
      owner: "Commercial Operations",
      steward: "Commercial Operations Lead",
      curated: true,
    },
  ],
  edges: [
    { from: "talemia-source-v4", to: "talemia-landing-raw", curated: true },
    { from: "talemia-landing-raw", to: "talemia-staging", curated: false },
    { from: "talemia-staging", to: "talemia-mart-opportunity", curated: false },
    { from: "talemia-staging", to: "talemia-mart-performance", curated: false },
    { from: "talemia-mart-opportunity", to: "talemia-dictionary", label: "Metric lineage", curated: false },
    { from: "talemia-mart-performance", to: "talemia-reconciliation", label: "Target checks", curated: false },
    { from: "talemia-mart-performance", to: "talemia-dashboard-superset", label: "Dashboard datasets", curated: true },
    { from: "talemia-mart-opportunity", to: "talemia-workspace", label: "Portal APIs", curated: true },
    { from: "talemia-dictionary", to: "talemia-workspace", label: "Record specs", curated: true },
  ],
};

const governanceUseCases: GovernanceUseCase[] = [
  {
    id: "bed_pressure",
    name: "Bed Pressure Intelligence",
    domain: "Clinical Operations",
    workspacePath: "/use-cases/bed-pressure/status",
    description: "Occupancy, forecasting, anomaly detection, and discharge decision metadata.",
    businessPurpose:
      "Monitor ward pressure, forecast occupancy risk, surface anomalies, and support capacity decisions.",
    owner: "Clinical Operations Analytics",
    steward: "Capacity Planning Lead",
    sourceTables: ["bed_events", "wards", "patients"],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "complete",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "Certified for operational decision support.", "2026-04-28"),
        consumers: ["Bed Pressure workspace", "Superset dashboard", "Forecast runtime"],
        downstreamConsumers: ["Forecast runtime", "Anomaly runtime", "Status workspace", "Superset dashboard"],
        upstreamSources: ["raw.bed_events", "analytics.dim_ward"],
        relatedDashboards: ["Ward Occupancy Trends", "Bed Occupancy Intelligence"],
        relatedTerms: ["bp-occupancy-rate", "bp-ward-capacity", "bp-discharge-pressure"],
        complianceNotes: [
          "Ward-level operational fact only.",
          "No patient-identifying fields are exposed in the workspace layer.",
        ],
        lineageSummary: ["bed_events -> stg_bed_events -> analytics.fct_bed_occupancy -> workspace KPIs"],
        columns: [
          datasetColumn("ward_id", "text", "internal", "Operational ward identifier.", { relatedTermIds: ["bp-ward-capacity"] }),
          datasetColumn("date_day", "date", "internal", "Snapshot calendar day."),
          datasetColumn("occupied_beds", "integer", "internal", "Beds occupied at the ward snapshot."),
          datasetColumn("staffed_beds", "integer", "internal", "Beds staffed and available for use."),
          datasetColumn("occupancy_rate", "numeric", "internal", "Ratio of occupied to staffed beds.", {
            relatedTermIds: ["bp-occupancy-rate"],
          }),
          datasetColumn("pressure_flag", "boolean", "internal", "True when occupancy crosses the pressure threshold."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 3650,
        lastUpdated: "2026-05-03T08:20:00Z",
        openRisks: [],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "complete",
        recordSpecStatus: "partial",
        certificationStatus: "trusted",
        certification: certification("certified", "Reference asset approved for operational use.", "2026-04-24"),
        consumers: ["Bed Pressure workspace", "Lineage view"],
        downstreamConsumers: ["fct_bed_occupancy", "workspace selectors"],
        upstreamSources: ["raw.wards"],
        relatedDashboards: ["Ward Occupancy Trends"],
        relatedTerms: ["bp-ward-capacity"],
        complianceNotes: ["Administrative dimension with no restricted fields."],
        columns: [
          datasetColumn("ward_id", "text", "internal", "Primary operational ward key."),
          datasetColumn("ward_code", "text", "internal", "Short ward code used in the UI."),
          datasetColumn("ward_name", "text", "internal", "Display name for the ward."),
          datasetColumn("service_line", "text", "internal", "Service line grouping."),
          datasetColumn("licensed_beds", "integer", "internal", "Configured licensed bed count."),
          datasetColumn("staffed_beds_baseline", "integer", "internal", "Normal staffed bed baseline."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 18,
        lastUpdated: "2026-05-03T08:20:00Z",
        openRisks: ["Record spec coverage is partial for ward baseline fields."],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        certification: certification("reviewed", "Forecast output is reviewed but runtime evidence is only partially connected."),
        consumers: ["Predictions page", "Superset dashboard"],
        downstreamConsumers: ["Predictions page", "Executive dashboard"],
        upstreamSources: ["analytics.fct_bed_occupancy"],
        relatedDashboards: ["Ward Occupancy Trends"],
        relatedTerms: ["bp-forecast-occupancy"],
        complianceNotes: ["Forecast freshness is honest but runtime telemetry is not fully connected."],
        columns: [
          datasetColumn("ward_id", "text", "internal", "Ward key used in the forecast output."),
          datasetColumn("forecast_date", "date", "internal", "Projected future date."),
          datasetColumn("predicted_occupancy", "numeric", "internal", "Forecasted occupancy percentage."),
          datasetColumn("breach_hours", "numeric", "internal", "Hours until breach threshold is crossed."),
          datasetColumn("confidence_interval", "jsonb", "internal", "Confidence interval metadata for the forecast."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "not_connected"),
        rowCount: 126,
        lastUpdated: "2026-05-03T07:55:00Z",
        openRisks: ["Runtime freshness telemetry is not connected to the governance UI."],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        certification: certification("reviewed", "Output is reviewed, but detection evidence is still partially connected."),
        consumers: ["Alerts page", "Operations reviews"],
        downstreamConsumers: ["Alerts page", "Decision generation"],
        upstreamSources: ["analytics.fct_bed_occupancy"],
        relatedDashboards: ["Bed Occupancy Intelligence"],
        relatedTerms: ["bp-active-anomaly"],
        complianceNotes: ["No restricted columns surfaced downstream."],
        columns: [
          datasetColumn("ward_id", "text", "internal", "Ward key for the anomaly event."),
          datasetColumn("event_timestamp", "timestamp", "internal", "Time the anomaly was recorded."),
          datasetColumn("anomaly_type", "text", "internal", "Business-readable anomaly type."),
          datasetColumn("severity", "text", "internal", "Operational severity classification."),
          datasetColumn("z_score", "numeric", "internal", "Standardized score backing the anomaly."),
        ],
        qualityDimensions: dims("warning", "warning", "passing", "not_connected"),
        rowCount: 42,
        lastUpdated: "2026-05-03T07:55:00Z",
        openRisks: ["Quality evidence is partially registry-defined rather than runtime-derived."],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "unknown",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        certification: certification("draft", "Glossary registry is still being normalized into product terminology."),
        consumers: ["Governance page", "Admin configuration"],
        downstreamConsumers: ["Governance Control Tower"],
        upstreamSources: ["Manual governance registry"],
        relatedDashboards: [],
        relatedTerms: ["bp-occupancy-rate", "bp-forecast-occupancy", "bp-active-anomaly"],
        complianceNotes: ["Business definitions are currently curated in the frontend registry."],
        columns: [
          datasetColumn("metric_id", "text", "internal", "Registry metric identifier."),
          datasetColumn("term", "text", "internal", "Business term displayed in the glossary."),
          datasetColumn("definition", "text", "internal", "Business-readable metric definition."),
        ],
        qualityDimensions: dims("not_connected", "warning", "warning", "warning"),
        rowCount: 5,
        lastUpdated: "2026-05-01T10:00:00Z",
        openRisks: ["Registry is not yet connected to a governed backend catalog service."],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "unknown",
        certificationStatus: "warning",
        certification: certification("draft", "Decision audit is live, but trust evidence is still incomplete."),
        consumers: ["Bed Pressure decisions page", "Notifications"],
        downstreamConsumers: ["Decision log", "Notification service"],
        upstreamSources: ["output.forecast", "output.anomaly", "analytics.fct_bed_occupancy"],
        relatedDashboards: [],
        relatedTerms: ["bp-discharge-pressure"],
        complianceNotes: ["Decision ownership and audit exist, but governance telemetry is partial."],
        columns: [
          datasetColumn("decision_id", "integer", "internal", "Decision row identifier."),
          datasetColumn("entity_name", "text", "internal", "Ward or entity targeted by the decision."),
          datasetColumn("priority", "text", "internal", "Operational priority label."),
          datasetColumn("assignee_email", "text", "restricted", "Notification email for the decision owner.", {
            suppressedInWorkspace: true,
          }),
          datasetColumn("status", "text", "internal", "Current workflow state."),
        ],
        qualityDimensions: dims("warning", "not_connected", "warning", "warning"),
        rowCount: 12,
        lastUpdated: "2026-05-03T08:40:00Z",
        openRisks: ["Record specification coverage is incomplete.", "Notification delivery evidence is not surfaced in the main workspace."],
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
        relatedTermIds: ["bp-ward-capacity", "bp-discharge-pressure"],
        synonyms: ["Bed utilization", "Occupancy percent"],
        owner: "Capacity Planning Lead",
        steward: "Capacity Planning Lead",
        exampleUsage: "ICU-01 closed the day at a 97% occupancy rate, triggering a pressure alert.",
        sourceMetric: "analytics.fct_bed_occupancy.occupancy_rate",
        status: "approved",
      },
      {
        id: "bp-forecast-occupancy",
        term: "Forecast Occupancy",
        definition: "Projected occupancy for a future ward-date produced by the forecasting runtime.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-output-forecast"],
        relatedTermIds: ["bp-occupancy-rate"],
        synonyms: ["Predicted occupancy", "Forward occupancy"],
        owner: "Operational Intelligence Lead",
        steward: "Operational Intelligence Lead",
        exampleUsage: "Forecast occupancy shows ICU-01 breaching 100% within the next 14 hours.",
        sourceMetric: "output.forecast.predicted_occupancy",
        status: "approved",
      },
      {
        id: "bp-active-anomaly",
        term: "Active Anomaly",
        definition: "A ward-level signal indicating pressure behavior outside expected bounds.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-output-anomaly"],
        relatedTermIds: ["bp-discharge-pressure"],
        synonyms: ["Exception signal", "Pressure alert"],
        owner: "Operational Intelligence Lead",
        steward: "Operational Intelligence Lead",
        exampleUsage: "A discharge-stall anomaly tells the bed manager to inspect delayed discharges first.",
        sourceMetric: "output.anomaly.anomaly_type",
        status: "approved",
      },
      {
        id: "bp-discharge-pressure",
        term: "Discharge Pressure",
        definition: "Operational urgency to create safe bed capacity through discharge actions.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-decision-queue"],
        relatedTermIds: ["bp-occupancy-rate", "bp-active-anomaly"],
        synonyms: ["Capacity release pressure"],
        owner: "Capacity Planning Lead",
        steward: "Capacity Planning Lead",
        exampleUsage: "Discharge pressure rises when occupancy stays critical and breach risk is near-term.",
        sourceMetric: "decision.decision_queue.priority_score",
        status: "draft",
      },
      {
        id: "bp-ward-capacity",
        term: "Ward Capacity",
        definition: "Configured bed capacity available to a ward for occupancy and forecasting logic.",
        domain: "Clinical Operations",
        useCaseId: "bed_pressure",
        relatedDatasets: ["bed-dim-ward"],
        relatedTermIds: ["bp-occupancy-rate"],
        synonyms: ["Staffed capacity"],
        owner: "Bed Operations Steward",
        steward: "Bed Operations Steward",
        exampleUsage: "Ward capacity helps translate raw occupied beds into a meaningful occupancy rate.",
        sourceMetric: "analytics.dim_ward.staffed_beds_baseline",
        status: "approved",
      },
    ],
    lineageEntryPoints: [
      {
        id: "bp-lineage-live-occupancy",
        label: "Live occupancy contract",
        summary: "Technical lineage from raw bed events through the governed occupancy mart.",
        technicalModel: "fct_bed_occupancy",
        impactTargets: ["Status", "Overview", "Superset bed dashboard"],
        status: "complete",
      },
      {
        id: "bp-lineage-forecast",
        label: "Forecast and anomaly outputs",
        summary: "Technical lineage from occupancy mart to runtime outputs and alerting surfaces.",
        technicalModel: "forecast",
        impactTargets: ["Predictions", "Alerts", "Decision queue"],
        status: "partial",
      },
      {
        id: "bp-lineage-reference-context",
        label: "Ward reference and decision context",
        summary: "Technical lineage for supporting dimensions and decision actioning metadata.",
        technicalModel: "dim_ward",
        impactTargets: ["Status", "Analysis", "Decisions"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "warning",
      quality: "warning",
      lineage: "complete",
      recordSpecs: "partial",
      compliance: "warning",
      dqDimensions: dims("warning", "passing", "passing", "warning"),
      note:
        "Core occupancy assets carry strong governance evidence, while runtime outputs and decision surfaces still rely on partial telemetry.",
    },
    complianceContext: {
      posture: "warning",
      summary:
        "Clinical operations metadata is governed, but runtime evidence and certification coverage remain partial for forecast, anomaly, and decision surfaces.",
      policies: [
        policy(
          "bp-policy-restricted-columns",
          "Internal Data Handling",
          "Restricted source fields must stay out of workspace views",
          "Source patient identifiers are classified as restricted and represented only in raw landing or staging contexts.",
          "Data Stewardship Office",
          "compliant",
          "2026-06-15",
          ["patients", "bed_events", "decision_queue"],
        ),
        policy(
          "bp-policy-quality-evidence",
          "Operational Trust",
          "Runtime freshness and quality evidence must be visible for decision support",
          "Occupancy marts are certified, but runtime freshness evidence is only partially connected in the governance experience.",
          "Capacity Planning Lead",
          "partial",
          "2026-06-30",
          ["forecast", "anomaly", "decision_queue"],
        ),
      ],
    },
    downstreamConsumers: [
      "Bed Pressure workspace",
      "Administration -> Governance",
      "Superset dashboard",
      "Decision notifications",
    ],
    trustMap: bedPressureTrustMap,
    diagnosticsScope: {
      qualityModels: ["fct_bed_occupancy", "dim_ward", "forecast", "anomaly", "decision_queue"],
      freshnessSources: ["bed_events", "wards", "patients"],
    },
  },
  {
    id: "revenue_cycle_management",
    name: "Revenue Cycle Management",
    domain: "Financial Operations",
    workspacePath: "/use-cases/revenue-cycle-management/cash-command",
    description: "Cash control, recovery execution, payer accountability, and leakage metadata.",
    businessPurpose:
      "Track claim movement, identify denial and recovery opportunities, control payer performance, detect leakage, and support executive revenue narrative.",
    owner: "Revenue Operations Analytics",
    steward: "Revenue Integrity Lead",
    sourceTables: ["rcm_claims", "rcm_financial_postings", "rcm_referrals"],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "Certified for recovery operations and executive review.", "2026-04-26"),
        consumers: ["Recovery Queue", "Cash Command", "Executive dashboard"],
        downstreamConsumers: ["Recovery Queue", "Cash Command", "Team Performance"],
        upstreamSources: ["raw.claims", "raw.denials", "analytics.fct_financial_posting"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-recovery-opportunity", "rcm-cash-at-risk"],
        complianceNotes: ["Financial operations use case with restricted identifiers suppressed in workspace outputs."],
        columns: [
          datasetColumn("claim_id", "text", "sensitive", "Claim identifier used to link the opportunity.", {
            suppressedInWorkspace: true,
          }),
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier for recovery routing.", {
            suppressedInWorkspace: true,
          }),
          datasetColumn("opportunity_type", "text", "internal", "Type of recovery action available."),
          datasetColumn("expected_recovery", "numeric", "internal", "Expected recoverable cash value."),
          datasetColumn("owner_team", "text", "internal", "Team accountable for recovery."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 842,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: [],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("reviewed", "Executive forecast is reviewed but still missing live confidence telemetry."),
        consumers: ["Cash Command", "Executive Narrative"],
        downstreamConsumers: ["Cash Command", "CFO dashboard"],
        upstreamSources: ["analytics.fct_revenue_cycle", "analytics.fct_financial_posting"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-cash-at-risk", "rcm-claim-value"],
        complianceNotes: ["Forecast evidence is partially modeled and still registry-backed in governance."],
        columns: [
          datasetColumn("forecast_date", "date", "internal", "Projected cash collection date."),
          datasetColumn("expected_cash", "numeric", "internal", "Expected cash collection value."),
          datasetColumn("recoverable_cash", "numeric", "internal", "Cash likely recoverable through action."),
          datasetColumn("cash_at_risk", "numeric", "internal", "Cash likely to be delayed or lost."),
          datasetColumn("confidence_score", "numeric", "internal", "Confidence score for the forecast segment."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        rowCount: 120,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: ["Live forecast telemetry and variance tracking are still partially connected."],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "Certified for payer accountability reviews.", "2026-04-20"),
        consumers: ["Payer Control", "Executive dashboard", "Contract review"],
        downstreamConsumers: ["Payer Control", "Executive Narrative"],
        upstreamSources: ["raw.payer_contracts", "analytics.fct_financial_posting"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-payer-turnaround", "rcm-denial-rate"],
        complianceNotes: ["Contract evidence is structured, but renewal telemetry is not connected."],
        columns: [
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier.", { suppressedInWorkspace: true }),
          datasetColumn("report_month", "date", "internal", "Reporting month."),
          datasetColumn("collection_rate", "numeric", "internal", "Observed collection rate."),
          datasetColumn("contract_target", "numeric", "internal", "Contract target collection rate."),
          datasetColumn("variance_to_contract", "numeric", "internal", "Variance from expected contract performance."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 96,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: [],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        certification: certification("reviewed", "Team performance is reviewed but SLA evidence is still partial."),
        consumers: ["Team Performance", "Executive Narrative"],
        downstreamConsumers: ["Team Performance", "Recovery Action Queue"],
        upstreamSources: ["analytics.fct_cash_recovery_opportunity", "decision queue overlays"],
        relatedDashboards: [],
        relatedTerms: ["rcm-recovery-opportunity"],
        complianceNotes: ["Stewardship is explicit; SLA outcome evidence is still incomplete."],
        columns: [
          datasetColumn("owner_team", "text", "internal", "Recovery team or owner."),
          datasetColumn("period_start", "date", "internal", "Performance window start."),
          datasetColumn("cases_worked", "integer", "internal", "Number of items worked."),
          datasetColumn("expected_value", "numeric", "internal", "Expected recovery value."),
          datasetColumn("recovered_value", "numeric", "internal", "Recovered value achieved."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        rowCount: 40,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: ["Outcome timeliness is not yet backed by live SLA telemetry."],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "Certified financial lifecycle asset.", "2026-04-25"),
        consumers: ["Cash Command", "Revenue analytics", "Governance"],
        downstreamConsumers: ["Cash Forecast", "Cash Command", "Leakage analysis"],
        upstreamSources: ["raw.claims", "raw.encounters", "raw.financial_postings"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-claim-value", "rcm-denial-rate"],
        complianceNotes: ["Patient-level operational details are suppressed in the workspace layer."],
        columns: [
          datasetColumn("claim_id", "text", "sensitive", "Claim identifier.", { suppressedInWorkspace: true }),
          datasetColumn("encounter_id", "text", "sensitive", "Encounter identifier.", { suppressedInWorkspace: true }),
          datasetColumn("lifecycle_stage", "text", "internal", "Current lifecycle state."),
          datasetColumn("gross_charges", "numeric", "internal", "Gross claim charges."),
          datasetColumn("posted_cash", "numeric", "internal", "Posted cash against the claim."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 12450,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: [],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "ERP financial anchor approved for executive reporting.", "2026-04-22"),
        consumers: ["Cash Command", "Executive dashboard", "Payer Control"],
        downstreamConsumers: ["Revenue Cycle Fact", "Cash Forecast", "Payer Contract Performance"],
        upstreamSources: ["raw.financial_postings"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-claim-value", "rcm-cash-at-risk"],
        complianceNotes: ["Financial anchor confirmed; freshness signal is available but not yet surfaced in the legacy admin widgets."],
        columns: [
          datasetColumn("posting_id", "text", "sensitive", "ERP posting identifier.", { suppressedInWorkspace: true }),
          datasetColumn("posting_date", "date", "internal", "Financial posting date."),
          datasetColumn("claim_id", "text", "sensitive", "Linked claim identifier.", { suppressedInWorkspace: true }),
          datasetColumn("posted_cash", "numeric", "internal", "Posted cash amount."),
          datasetColumn("adjustment_amount", "numeric", "internal", "Adjustment or variance amount."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 14520,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: [],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "warning",
        certification: certification("reviewed", "Aging metrics are reviewed but freshness evidence is partial."),
        consumers: ["Cash Command", "Payer Control", "Executive dashboard"],
        downstreamConsumers: ["Cash Command", "Payer Control"],
        upstreamSources: ["raw.claims", "analytics.fct_financial_posting"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-payer-turnaround"],
        complianceNotes: ["Trend evidence is only partially modeled in the current registry."],
        columns: [
          datasetColumn("claim_id", "text", "sensitive", "Claim identifier.", { suppressedInWorkspace: true }),
          datasetColumn("aging_bucket", "text", "internal", "Aging bucket label."),
          datasetColumn("open_balance", "numeric", "internal", "Open balance still outstanding."),
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier.", { suppressedInWorkspace: true }),
          datasetColumn("days_outstanding", "integer", "internal", "Age of the claim in days."),
        ],
        qualityDimensions: dims("warning", "warning", "passing", "warning"),
        rowCount: 4300,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: ["Freshness telemetry is not yet connected to the quality cards."],
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
        freshnessStatus: "fresh",
        testStatus: "passing",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("certified", "Certified for denial performance monitoring.", "2026-04-21"),
        consumers: ["Recovery Queue", "Payer Control", "Superset dashboard"],
        downstreamConsumers: ["Recovery Queue", "Payer Control"],
        upstreamSources: ["raw.denials", "raw.claims"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-denial-rate", "rcm-recovery-opportunity"],
        complianceNotes: ["Appeal success evidence is not yet joined into the governance experience."],
        columns: [
          datasetColumn("denial_id", "text", "sensitive", "Denial event identifier.", { suppressedInWorkspace: true }),
          datasetColumn("claim_id", "text", "sensitive", "Claim identifier for the denial.", {
            suppressedInWorkspace: true,
          }),
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier.", { suppressedInWorkspace: true }),
          datasetColumn("denial_reason", "text", "internal", "Normalized denial category."),
          datasetColumn("denial_amount", "numeric", "internal", "Financial value of the denial."),
        ],
        qualityDimensions: dims("fresh", "passing", "passing", "passing"),
        rowCount: 2150,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: [],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "trusted",
        certification: certification("reviewed", "Leakage fact is governed, but recoverability guidance is still registry-defined."),
        consumers: ["Revenue Leakage workspace", "Executive dashboard"],
        downstreamConsumers: ["Revenue Leakage", "Executive Narrative"],
        upstreamSources: ["raw.claims", "raw.denials", "analytics.fct_financial_posting"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-revenue-leakage", "rcm-cash-at-risk"],
        complianceNotes: ["Leakage recoverability guidance is registry-driven in the current release."],
        columns: [
          datasetColumn("finding_id", "text", "internal", "Leakage finding identifier."),
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier.", { suppressedInWorkspace: true }),
          datasetColumn("leakage_type", "text", "internal", "Leakage category."),
          datasetColumn("cash_at_risk", "numeric", "internal", "Estimated cash exposure."),
          datasetColumn("recommended_action", "text", "internal", "Suggested remediation."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        rowCount: 380,
        lastUpdated: "2026-05-03T07:50:00Z",
        openRisks: ["Recoverability evidence is not yet tied to outcome measurements."],
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
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "unknown",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        certification: certification("draft", "Secondary payer summary is still under governance review."),
        consumers: ["Executive dashboard", "Payer reviews"],
        downstreamConsumers: ["Executive Narrative"],
        upstreamSources: ["raw.payer_contracts", "analytics.fct_claim_aging"],
        relatedDashboards: ["Revenue Cycle Executive Command"],
        relatedTerms: ["rcm-payer-turnaround"],
        complianceNotes: ["Coverage exists, but runtime trust evidence is still partial."],
        columns: [
          datasetColumn("payer_id", "text", "sensitive", "Payer identifier.", { suppressedInWorkspace: true }),
          datasetColumn("report_period", "date", "internal", "Performance reporting period."),
          datasetColumn("turnaround_days", "numeric", "internal", "Average turnaround in days."),
          datasetColumn("denial_rate", "numeric", "internal", "Denial rate for the period."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "unknown"),
        rowCount: 60,
        lastUpdated: "2026-05-02T23:00:00Z",
        openRisks: ["Technical lineage remains incomplete for this summary layer."],
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
        freshnessStatus: "stale",
        testStatus: "warning",
        lineageStatus: "missing",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        certification: certification("deprecated", "CRM lineage is incomplete, so this asset is not demo-ready."),
        consumers: ["Executive Narrative", "Growth reporting"],
        downstreamConsumers: ["Executive Narrative"],
        upstreamSources: ["raw.referrals"],
        relatedDashboards: [],
        relatedTerms: ["rcm-claim-value"],
        complianceNotes: ["CRM lineage is not yet connected in governance."],
        columns: [
          datasetColumn("referral_channel", "text", "internal", "Referral or acquisition source."),
          datasetColumn("report_period", "date", "internal", "Reporting period."),
          datasetColumn("encounter_count", "integer", "internal", "Volume of encounters acquired."),
          datasetColumn("gross_revenue", "numeric", "internal", "Attributed gross revenue."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "unknown"),
        rowCount: 18,
        lastUpdated: "2026-04-21T08:00:00Z",
        openRisks: ["CRM lineage missing.", "Freshness is stale for the latest acquisition period."],
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
        relatedTermIds: ["rcm-cash-at-risk", "rcm-denial-rate"],
        synonyms: ["Gross claim amount", "Claimed value"],
        owner: "Finance Controller",
        steward: "Finance Controller",
        exampleUsage: "Claim value helps separate recoverable cash from noise in executive reviews.",
        sourceMetric: "analytics.fct_revenue_cycle.gross_charges",
        status: "approved",
      },
      {
        id: "rcm-denial-rate",
        term: "Denial Rate",
        definition: "Share of submitted claims that enter a denied or appealed state.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-denials", "rcm-revenue-cycle"],
        relatedTermIds: ["rcm-payer-turnaround", "rcm-recovery-opportunity"],
        synonyms: ["Claims denial ratio"],
        owner: "Revenue Integrity Lead",
        steward: "Revenue Integrity Lead",
        exampleUsage: "A payer with a rising denial rate should move into the Payer Control view.",
        sourceMetric: "analytics.fct_denials.denial_amount",
        status: "approved",
      },
      {
        id: "rcm-recovery-opportunity",
        term: "Recovery Opportunity",
        definition: "A financially actionable issue that can be assigned, worked, and measured for cash recovery.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-recovery-opportunity", "rcm-team-performance"],
        relatedTermIds: ["rcm-cash-at-risk"],
        synonyms: ["Workable cash opportunity"],
        owner: "Revenue Integrity Lead",
        steward: "Revenue Integrity Lead",
        exampleUsage: "Recovery opportunities should route into owner queues with expected value and next action.",
        sourceMetric: "analytics.fct_cash_recovery_opportunity.expected_recovery",
        status: "approved",
      },
      {
        id: "rcm-revenue-leakage",
        term: "Revenue Leakage",
        definition: "Financial value lost or delayed because of denials, underpayments, write-offs, or process failures.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-leakage"],
        relatedTermIds: ["rcm-cash-at-risk", "rcm-claim-value"],
        synonyms: ["Lost revenue", "Leakage exposure"],
        owner: "CFO Analytics Lead",
        steward: "Revenue Integrity Lead",
        exampleUsage: "Revenue leakage should explain where cash is being lost, delayed, or under-collected.",
        sourceMetric: "analytics.fct_revenue_leakage.cash_at_risk",
        status: "approved",
      },
      {
        id: "rcm-payer-turnaround",
        term: "Payer Turnaround Time",
        definition: "Elapsed time between claim submission and payment receipt for a payer segment.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-payer-contract", "rcm-claim-aging"],
        relatedTermIds: ["rcm-denial-rate"],
        synonyms: ["Payment turnaround"],
        owner: "Payer Relations Lead",
        steward: "Payer Relations Lead",
        exampleUsage: "Turnaround time helps distinguish collection friction from outright denials.",
        sourceMetric: "analytics.fct_payer_contract_performance.collection_rate",
        status: "approved",
      },
      {
        id: "rcm-cash-at-risk",
        term: "Cash at Risk",
        definition: "Expected cash likely to be delayed or lost unless active recovery actions are taken.",
        domain: "Financial Operations",
        useCaseId: "revenue_cycle_management",
        relatedDatasets: ["rcm-cash-forecast", "rcm-recovery-opportunity"],
        relatedTermIds: ["rcm-claim-value", "rcm-revenue-leakage"],
        synonyms: ["At-risk cash", "Recovery-sensitive cash"],
        owner: "CFO Analytics Lead",
        steward: "CFO Analytics Lead",
        exampleUsage: "Cash at risk is the headline number that turns claims noise into executive action.",
        sourceMetric: "analytics.fct_cash_forecast.cash_at_risk",
        status: "draft",
      },
    ],
    lineageEntryPoints: [
      {
        id: "rcm-lineage-cash-command",
        label: "Cash command technical lineage",
        summary: "Backend/dbt lineage for the executive cash command surface.",
        technicalModel: "fct_revenue_cycle",
        impactTargets: ["Cash Command", "CFO dashboard"],
        status: "partial",
      },
      {
        id: "rcm-lineage-payer-control",
        label: "Payer control technical lineage",
        summary: "Technical lineage for payer contract and aging evidence.",
        technicalModel: "fct_payer_contract_performance",
        impactTargets: ["Payer Control", "Executive Narrative"],
        status: "partial",
      },
      {
        id: "rcm-lineage-leakage",
        label: "Leakage technical lineage",
        summary: "Technical lineage for leakage and recovery prioritization.",
        technicalModel: "fct_revenue_leakage",
        impactTargets: ["Revenue Leakage", "Executive Narrative", "Superset dashboard"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "warning",
      quality: "warning",
      lineage: "partial",
      recordSpecs: "complete",
      compliance: "warning",
      dqDimensions: dims("warning", "passing", "warning", "warning"),
      note:
        "Revenue Cycle has strong record-spec coverage on core financial facts, while a few secondary assets remain partial or stale.",
    },
    complianceContext: {
      posture: "warning",
      summary:
        "Revenue data products are governed as operational contracts, but telemetry-backed freshness and a few secondary lineage chains remain incomplete.",
      policies: [
        policy(
          "rcm-policy-restricted-identifiers",
          "Internal Data Handling",
          "Restricted claim and account identifiers must not appear in executive-facing workspace views",
          "Claim, posting, and payer identifiers are classified as sensitive or restricted and suppressed in the workspace presentation layer.",
          "Finance Controller",
          "compliant",
          "2026-06-20",
          ["claims", "financial_postings", "denials", "payer_control"],
        ),
        policy(
          "rcm-policy-lineage-coverage",
          "Operational Trust",
          "Executive metrics must trace to governed marts and explicit downstream consumers",
          "Core marts and dashboards are mapped, but acquisition and some secondary performance summaries are not fully connected.",
          "Revenue Integrity Lead",
          "partial",
          "2026-06-30",
          ["fct_revenue_cycle", "fct_cash_forecast", "fct_patient_acquisition"],
        ),
      ],
    },
    downstreamConsumers: [
      "Revenue Cycle workspace",
      "Administration -> Governance",
      "Superset executive dashboard",
      "Executive reviews",
    ],
    trustMap: revenueCycleTrustMap,
    diagnosticsScope: {
      qualityModels: [
        "fct_cash_recovery_opportunity",
        "fct_cash_forecast",
        "fct_payer_contract_performance",
        "fct_team_recovery_performance",
        "fct_revenue_cycle",
        "fct_financial_posting",
        "fct_claim_aging",
        "fct_denials",
        "fct_revenue_leakage",
        "fct_payer_performance",
        "fct_patient_acquisition",
      ],
      freshnessSources: ["rcm_claims", "rcm_financial_postings", "rcm_referrals"],
    },
  },
  {
    id: "urban_service_quality_visual_distortion_loop",
    name: "Urban Service Quality & Visual Distortion Assurance Loop",
    domain: "Municipal Operations",
    workspacePath: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop",
    description:
      "Municipal service-quality and visual-distortion loop covering governed KPI contracts, predictive runtimes, decision candidates, corrective actions, and recovery evidence.",
    businessPurpose:
      "Help Jazan detect service deterioration and visual-distortion risks early, route human-approved corrective actions, and measure recovery against governed municipal KPIs.",
    owner: "Jazan Performance Office",
    steward: "Data & Analytics Office",
    sourceTables: [
      "source_jazan.visual_distortion_cases",
      "source_jazan.service_requests",
      "source_jazan.permit_requests",
      "source_jazan.service_coverage_assets",
      "source_jazan.emergency_readiness_checks",
      "source_jazan.citizen_satisfaction_surveys",
      "source_jazan.municipalities",
    ],
    workspaceCoverage: [
      { label: "Strategic landing", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop?demo=1" },
      { label: "KPI workspace", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/kpi/visual-distortion-closure-quality?demo=1" },
      { label: "Case overview", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/case/JZN-DEC-1007/overview?demo=1" },
      { label: "Decision command", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/case/JZN-DEC-1007/decisions?demo=1" },
      { label: "Runtime evidence", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/runtimes?demo=1" },
      { label: "Audit trail", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/audit?demo=1" },
      { label: "Governance evidence", href: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/governance-evidence?demo=1" },
    ],
    governedDatasets: [
      {
        id: "jazan-visual-distortion-source",
        name: "Jazan Visual Distortion Cases",
        schema: "source_jazan",
        table: "visual_distortion_cases",
        assetType: "source",
        businessMeaning: "Source records for visual-distortion complaints, field inspection, evidence submission, and closure quality.",
        grain: "One row per visual-distortion case",
        owner: "Field Compliance",
        steward: "Data & Analytics Office",
        freshnessStatus: "not_connected",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        certification: certification("draft", "Source contract mapped from the v1.0.8 package; live certification requires source freshness and DQ telemetry."),
        consumers: ["dbt staging", "Visual distortion mart", "Decision evidence"],
        downstreamConsumers: ["analytics.fct_jazan_visual_distortion_performance", "output.jazan_service_quality_anomaly"],
        upstreamSources: ["municipal complaint systems", "field inspection systems"],
        relatedDashboards: ["Urban Service Quality workspace"],
        relatedTerms: ["jazan-visual-closure-quality", "jazan-corrective-action", "jazan-evidence-submission"],
        complianceNotes: ["Complaint identifiers and citizen complaint details are restricted and suppressed in workspace views."],
        lineageSummary: ["source_jazan.visual_distortion_cases -> staging.stg_jazan_visual_distortion_cases -> analytics.fct_jazan_visual_distortion_performance"],
        columns: [
          datasetColumn("case_id", "text", "restricted", "Internal complaint/case identifier.", { suppressedInWorkspace: true }),
          datasetColumn("municipality_id", "text", "internal", "Municipality reference key."),
          datasetColumn("district_name", "text", "internal", "District or locality associated with the case."),
          datasetColumn("closure_quality_status", "text", "internal", "Governed closure quality status.", { relatedTermIds: ["jazan-visual-closure-quality"] }),
          datasetColumn("evidence_submitted_at", "timestamp", "internal", "Timestamp when closure evidence was submitted.", { relatedTermIds: ["jazan-evidence-submission"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Live source freshness is not connected.", "Closure evidence quality gates require runtime test results."],
      },
      {
        id: "jazan-service-requests-source",
        name: "Jazan Service Requests",
        schema: "source_jazan",
        table: "service_requests",
        assetType: "source",
        businessMeaning: "Source request records used for closure rate, resolution time, SLA compliance, and backlog indicators.",
        grain: "One row per service request",
        owner: "Services Agency",
        steward: "Data & Analytics Office",
        freshnessStatus: "not_connected",
        testStatus: "unknown",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        certification: certification("draft", "Mapped from v1.0.8 source contract; runtime telemetry is still required."),
        consumers: ["dbt staging", "Service quality mart", "Forecast runtime"],
        downstreamConsumers: ["analytics.fct_jazan_service_quality", "output.jazan_service_rnn_forecast"],
        upstreamSources: ["service request systems"],
        relatedTerms: ["jazan-service-request-closure", "jazan-breach-probability"],
        complianceNotes: ["Citizen-level complaint details remain restricted/internal and are not exposed directly."],
        lineageSummary: ["source_jazan.service_requests -> staging.stg_jazan_service_requests -> analytics.fct_jazan_service_quality"],
        columns: [
          datasetColumn("request_id", "text", "restricted", "Internal service request identifier.", { suppressedInWorkspace: true }),
          datasetColumn("municipality_id", "text", "internal", "Municipality reference key."),
          datasetColumn("created_at", "timestamp", "internal", "Request creation timestamp."),
          datasetColumn("closed_at", "timestamp", "internal", "Request closure timestamp."),
          datasetColumn("sla_met_flag", "boolean", "internal", "Whether the request met the SLA threshold.", { relatedTermIds: ["jazan-service-request-closure"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Source freshness has not been certified.", "Completeness checks need connected source telemetry."],
      },
      {
        id: "jazan-service-quality",
        name: "Jazan Service Quality Fact",
        schema: "analytics",
        table: "fct_jazan_service_quality",
        assetType: "fact",
        businessMeaning: "Governed municipal service-quality fact for closure rate, resolution time, SLA compliance, backlog, and breach-risk features.",
        grain: "One row per municipality, KPI, and reporting period",
        owner: "Data & Analytics Office",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Analytics mart is mapped but requires dbt test results before certification."),
        consumers: ["OpenCare workspace", "Forecast runtime", "Superset dashboard"],
        downstreamConsumers: ["output.jazan_service_rnn_forecast", "output.jazan_municipality_service_risk_score", "decision.jazan_generated_service_decisions"],
        upstreamSources: ["source_jazan.service_requests", "source_jazan.municipalities"],
        relatedDashboards: ["Urban Service Quality workspace", "Superset Urban Service Dashboard"],
        relatedTerms: ["jazan-service-request-closure", "jazan-breach-probability", "jazan-municipality-risk-score"],
        complianceNotes: ["Workspace views expose aggregated KPI evidence, not restricted request identifiers."],
        lineageSummary: ["source_jazan.service_requests -> staging -> analytics.fct_jazan_service_quality -> output runtimes -> decision queue"],
        columns: [
          datasetColumn("municipality_id", "text", "internal", "Municipality key."),
          datasetColumn("reporting_period", "date", "internal", "Reporting period date."),
          datasetColumn("closure_rate", "numeric", "internal", "Closed service requests divided by total requests.", { relatedTermIds: ["jazan-service-request-closure"] }),
          datasetColumn("average_resolution_time", "numeric", "internal", "Average request resolution time."),
          datasetColumn("sla_compliance", "numeric", "internal", "Share of requests meeting SLA."),
          datasetColumn("breach_probability", "numeric", "internal", "Forecast probability of KPI breach.", { relatedTermIds: ["jazan-breach-probability"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Model feature completeness and dbt test evidence are not yet connected."],
      },
      {
        id: "jazan-visual-distortion",
        name: "Jazan Visual Distortion Performance Fact",
        schema: "analytics",
        table: "fct_jazan_visual_distortion_performance",
        assetType: "fact",
        businessMeaning: "Governed visual-distortion performance fact for complaint closure quality, repeat cases, evidence completion, and recovery tracking.",
        grain: "One row per municipality, district, and reporting period",
        owner: "Field Compliance",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Mapped to v1.0.8 governance registry; certification awaits telemetry and evidence audit results."),
        consumers: ["OpenCare workspace", "Superset dashboard", "Anomaly runtime"],
        downstreamConsumers: ["output.jazan_service_quality_anomaly", "decision.jazan_visual_distortion_recovery_outcome"],
        upstreamSources: ["source_jazan.visual_distortion_cases", "source_jazan.municipalities"],
        relatedTerms: ["jazan-visual-closure-quality", "jazan-evidence-submission", "jazan-recovery-outcome"],
        complianceNotes: ["Restricted complaint identifiers are removed from executive-facing surfaces."],
        lineageSummary: ["source_jazan.visual_distortion_cases -> staging -> analytics.fct_jazan_visual_distortion_performance"],
        columns: [
          datasetColumn("municipality_id", "text", "internal", "Municipality key."),
          datasetColumn("district_name", "text", "internal", "District aggregation label."),
          datasetColumn("closure_quality_rate", "numeric", "internal", "Valid closed cases divided by total cases.", { relatedTermIds: ["jazan-visual-closure-quality"] }),
          datasetColumn("repeat_case_count", "integer", "internal", "Repeat visual-distortion complaint count."),
          datasetColumn("evidence_submission_rate", "numeric", "internal", "Evidence submitted before verification.", { relatedTermIds: ["jazan-evidence-submission"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Evidence package completeness needs live audit linkage."],
      },
      {
        id: "jazan-rnn-forecast",
        name: "Jazan Service RNN Forecast",
        schema: "output",
        table: "jazan_service_rnn_forecast",
        assetType: "output",
        businessMeaning: "Predictive runtime output estimating 4-8 week municipal service KPI breach probability.",
        grain: "One row per municipality, KPI, and forecast horizon",
        owner: "Data Science Runtime",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Forecast output is mapped for demo governance; runtime accuracy and drift monitoring are pending."),
        consumers: ["Risk score runtime", "Decision candidates", "Early-warning workspace"],
        downstreamConsumers: ["output.jazan_municipality_service_risk_score", "decision.jazan_generated_service_decisions"],
        upstreamSources: ["analytics.fct_jazan_service_quality", "analytics.fct_jazan_visual_distortion_performance"],
        relatedTerms: ["jazan-breach-probability", "jazan-forecast-accuracy"],
        complianceNotes: ["Forecast evidence must be retained before generated recommendations are operationalized."],
        lineageSummary: ["analytics features -> output.jazan_service_rnn_forecast -> risk score -> decision candidates"],
        columns: [
          datasetColumn("municipality_id", "text", "internal", "Municipality key."),
          datasetColumn("kpi_code", "text", "internal", "Forecasted KPI code."),
          datasetColumn("horizon_weeks", "integer", "internal", "Forecast horizon in weeks."),
          datasetColumn("breach_probability", "numeric", "internal", "Predicted breach probability.", { relatedTermIds: ["jazan-breach-probability"] }),
          datasetColumn("model_version", "text", "internal", "Runtime model version."),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Forecast accuracy, drift, and runtime freshness are not yet connected."],
      },
      {
        id: "jazan-risk-score",
        name: "Jazan Municipality Service Risk Score",
        schema: "output",
        table: "jazan_municipality_service_risk_score",
        assetType: "output",
        businessMeaning: "Transparent risk score combining governed KPI facts, anomaly evidence, and forecast outputs for municipality ranking.",
        grain: "One row per municipality and scoring run",
        owner: "Data Science Runtime",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Risk score is mapped but needs connected model evidence before production certification."),
        consumers: ["OpenCare workspace", "Decision candidates"],
        downstreamConsumers: ["decision.jazan_generated_service_decisions", "decision.jazan_service_quality_action_queue"],
        upstreamSources: ["output.jazan_service_rnn_forecast", "output.jazan_service_quality_anomaly"],
        relatedTerms: ["jazan-municipality-risk-score", "jazan-recommendation-effectiveness"],
        complianceNotes: ["Risk ranking is advisory until reviewed by the municipal performance owner."],
        lineageSummary: ["forecast + anomaly outputs -> output.jazan_municipality_service_risk_score -> decision candidate review"],
        columns: [
          datasetColumn("municipality_id", "text", "internal", "Municipality key."),
          datasetColumn("risk_score", "numeric", "internal", "Composite risk score.", { relatedTermIds: ["jazan-municipality-risk-score"] }),
          datasetColumn("risk_band", "text", "internal", "Risk band used for triage."),
          datasetColumn("driver_summary", "json", "internal", "Top scoring drivers."),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Model evidence and score calibration require runtime telemetry."],
      },
      {
        id: "jazan-generated-decisions",
        name: "Jazan Generated Service Decisions",
        schema: "decision",
        table: "jazan_generated_service_decisions",
        assetType: "decision",
        businessMeaning: "Decision candidates generated from forecast, anomaly, risk, and recommendation outputs before human approval.",
        grain: "One row per generated decision candidate",
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Human approval and audit evidence are required before a generated decision becomes a corrective action."),
        consumers: ["Decision Tracker", "Action lifecycle"],
        downstreamConsumers: ["decision.jazan_service_quality_action_queue", "decision.jazan_visual_distortion_recovery_outcome"],
        upstreamSources: ["output.jazan_municipality_service_risk_score", "output.jazan_recommended_intervention"],
        relatedTerms: ["jazan-corrective-action", "jazan-recommendation-effectiveness"],
        complianceNotes: ["Generated recommendations remain advisory until human approval creates an auditable action."],
        lineageSummary: ["model outputs -> decision.jazan_generated_service_decisions -> human approval -> action queue"],
        columns: [
          datasetColumn("decision_id", "text", "restricted", "Generated decision identifier.", { suppressedInWorkspace: true }),
          datasetColumn("municipality_id", "text", "internal", "Municipality key."),
          datasetColumn("recommendation", "text", "internal", "Recommended intervention text."),
          datasetColumn("approval_status", "text", "internal", "Human approval status."),
          datasetColumn("audit_event_id", "text", "restricted", "Audit event identifier.", { suppressedInWorkspace: true }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Audit event persistence needs live integration verification."],
      },
      {
        id: "jazan-action-queue",
        name: "Jazan Service Quality Action Queue",
        schema: "decision",
        table: "jazan_service_quality_action_queue",
        assetType: "decision",
        businessMeaning: "Human-approved corrective actions, owners, lifecycle stages, evidence, and closure status.",
        grain: "One row per corrective action",
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Action lifecycle is mapped; evidence submission and closure audit checks are pending."),
        consumers: ["Decision Tracker", "Outcome Feedback"],
        downstreamConsumers: ["decision.jazan_visual_distortion_recovery_outcome", "Pillar 5 corrective action review"],
        upstreamSources: ["decision.jazan_generated_service_decisions"],
        relatedTerms: ["jazan-corrective-action", "jazan-evidence-submission", "jazan-recovery-outcome"],
        complianceNotes: ["All action buttons must create audit events."],
        lineageSummary: ["human-approved decision -> decision.jazan_service_quality_action_queue -> recovery outcome"],
        columns: [
          datasetColumn("action_id", "text", "restricted", "Corrective action identifier.", { suppressedInWorkspace: true }),
          datasetColumn("owner_role", "text", "internal", "Assigned owner role."),
          datasetColumn("lifecycle_stage", "text", "internal", "Action lifecycle stage."),
          datasetColumn("evidence_status", "text", "internal", "Evidence submission and verification status.", { relatedTermIds: ["jazan-evidence-submission"] }),
          datasetColumn("closure_status", "text", "internal", "Closure status.", { relatedTermIds: ["jazan-corrective-action"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Closure cannot be certified until verified outcome evidence is connected."],
      },
      {
        id: "jazan-recovery-outcome",
        name: "Jazan Visual Distortion Recovery Outcome",
        schema: "decision",
        table: "jazan_visual_distortion_recovery_outcome",
        assetType: "decision",
        businessMeaning: "Outcome feedback table measuring verified recovery after corrective actions.",
        grain: "One row per action outcome measurement",
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "warning",
        certification: certification("reviewed", "Outcome table is mapped; recovery verification and audit evidence are pending."),
        consumers: ["Outcome Feedback", "Recommendation effectiveness"],
        downstreamConsumers: ["model retraining evidence", "monthly review pack"],
        upstreamSources: ["decision.jazan_service_quality_action_queue"],
        relatedTerms: ["jazan-recovery-outcome", "jazan-recommendation-effectiveness"],
        complianceNotes: ["Outcome feedback is used to improve advisory recommendations, not to auto-close actions without verification."],
        lineageSummary: ["action queue -> decision.jazan_visual_distortion_recovery_outcome -> recommendation history"],
        columns: [
          datasetColumn("outcome_id", "text", "restricted", "Outcome identifier.", { suppressedInWorkspace: true }),
          datasetColumn("action_id", "text", "restricted", "Corrective action identifier.", { suppressedInWorkspace: true }),
          datasetColumn("expected_outcome", "text", "internal", "Expected recovery outcome."),
          datasetColumn("verified_outcome", "text", "internal", "Verified outcome after action."),
          datasetColumn("recovered_against_target", "boolean", "internal", "Whether the expected recovery target was met.", { relatedTermIds: ["jazan-recovery-outcome"] }),
        ],
        qualityDimensions: dims("warning", "unknown", "warning", "unknown"),
        openRisks: ["Outcome measurement requires connected audit and verification data."],
      },
    ],
    dictionaryTerms: [
      {
        id: "jazan-visual-closure-quality",
        term: "Visual Distortion Closure Quality",
        definition: "Share of visual-distortion complaints closed with valid evidence, verification, and approved closure status.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-visual-distortion-source", "jazan-visual-distortion", "jazan-recovery-outcome"],
        owner: "Field Compliance",
        steward: "Data & Analytics Office",
        sourceMetric: "analytics.fct_jazan_visual_distortion_performance.closure_quality_rate",
        status: "approved",
      },
      {
        id: "jazan-service-request-closure",
        term: "Service Request Closure Rate",
        definition: "Closed municipal service requests divided by total eligible service requests in the reporting period.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-service-requests-source", "jazan-service-quality"],
        owner: "Services Agency",
        steward: "Data & Analytics Office",
        sourceMetric: "analytics.fct_jazan_service_quality.closure_rate",
        status: "approved",
      },
      {
        id: "jazan-breach-probability",
        term: "Breach Probability",
        definition: "Probability that a municipality KPI will breach its target or SLA threshold within the model horizon.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-service-quality", "jazan-rnn-forecast"],
        owner: "Data Science Runtime",
        steward: "Data & Analytics Office",
        sourceMetric: "output.jazan_service_rnn_forecast.breach_probability",
        status: "draft",
      },
      {
        id: "jazan-municipality-risk-score",
        term: "Municipality Risk Score",
        definition: "Composite score ranking municipalities by service quality, visual distortion, forecast, anomaly, and action risk evidence.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-risk-score", "jazan-generated-decisions"],
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        sourceMetric: "output.jazan_municipality_service_risk_score.risk_score",
        status: "draft",
      },
      {
        id: "jazan-corrective-action",
        term: "Corrective Action",
        definition: "Human-approved action assigned to an owner, tracked through lifecycle stages, and closed only with verified outcome evidence.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-generated-decisions", "jazan-action-queue", "jazan-recovery-outcome"],
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        sourceMetric: "decision.jazan_service_quality_action_queue.lifecycle_stage",
        status: "approved",
      },
      {
        id: "jazan-recommendation-effectiveness",
        term: "Recommendation Effectiveness",
        definition: "Observed recovery impact of an advisory recommendation after approved action and verified outcome feedback.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-risk-score", "jazan-recovery-outcome"],
        owner: "Data Science Runtime",
        steward: "Data & Analytics Office",
        sourceMetric: "decision.jazan_visual_distortion_recovery_outcome.recovered_against_target",
        status: "draft",
      },
      {
        id: "jazan-evidence-submission",
        term: "Evidence Submission",
        definition: "Submission of field or operational evidence required before an action can be verified and closed.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-visual-distortion-source", "jazan-action-queue"],
        owner: "Field Compliance",
        steward: "Data & Analytics Office",
        sourceMetric: "decision.jazan_service_quality_action_queue.evidence_status",
        status: "approved",
      },
      {
        id: "jazan-recovery-outcome",
        term: "Recovery Outcome",
        definition: "Verified post-action recovery evidence compared with the expected KPI or service-quality outcome.",
        domain: "Municipal Operations",
        useCaseId: "urban_service_quality_visual_distortion_loop",
        relatedDatasets: ["jazan-recovery-outcome"],
        owner: "Performance Office",
        steward: "Data & Analytics Office",
        sourceMetric: "decision.jazan_visual_distortion_recovery_outcome.verified_outcome",
        status: "approved",
      },
    ],
    lineageEntryPoints: [
      {
        id: "jazan-lineage-service-kpi",
        label: "Service KPI technical lineage",
        summary: "Service request closure, SLA, resolution time, forecast, and risk score lineage.",
        technicalModel: "analytics.fct_jazan_service_quality",
        impactTargets: ["KPI contract", "Forecast runtime", "Decision candidates"],
        status: "partial",
      },
      {
        id: "jazan-lineage-visual-distortion",
        label: "Visual distortion technical lineage",
        summary: "Visual-distortion complaint closure quality, anomaly, evidence, and outcome lineage.",
        technicalModel: "analytics.fct_jazan_visual_distortion_performance",
        impactTargets: ["Visual distortion dashboard", "Action tracker", "Outcome feedback"],
        status: "partial",
      },
      {
        id: "jazan-lineage-forecast",
        label: "RNN forecast technical lineage",
        summary: "Forecast runtime lineage from governed features to breach probability outputs.",
        technicalModel: "output.jazan_service_rnn_forecast",
        impactTargets: ["Early-warning cockpit", "Municipality risk score"],
        status: "partial",
      },
      {
        id: "jazan-lineage-decision-queue",
        label: "Decision queue technical lineage",
        summary: "Human-review lineage from model outputs into approved corrective actions and recovery outcomes.",
        technicalModel: "decision.jazan_generated_service_decisions",
        impactTargets: ["Decision Tracker", "Action lifecycle", "Outcome Feedback"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "warning",
      quality: "warning",
      lineage: "partial",
      recordSpecs: "partial",
      compliance: "warning",
      dqDimensions: dims("warning", "unknown", "warning", "unknown"),
      note:
        "Governance registry is package-complete, but live certification requires runtime telemetry, dbt test results, action audit evidence, and connected source freshness.",
    },
    complianceContext: {
      posture: "warning",
      summary:
        "The v1.0.8 package maps restricted municipal complaint identifiers, advisory model outputs, human approval controls, and action audit evidence; production certification still depends on connected telemetry.",
      policies: [
        policy(
          "jazan-policy-restricted-complaint-identifiers",
          "Municipal Data Handling",
          "Restricted municipal complaint IDs must not be exposed in executive or public workspace surfaces",
          "Complaint, decision, action, and outcome identifiers are classified as restricted and suppressed from workspace columns.",
          "Data & Analytics Office",
          "partial",
          "2026-07-15",
          ["source_jazan.visual_distortion_cases", "decision.jazan_generated_service_decisions", "decision.jazan_service_quality_action_queue"],
        ),
        policy(
          "jazan-policy-human-approval-before-action",
          "OpenCare Decision Governance",
          "Generated decisions must remain advisory until a human approver creates a corrective action",
          "Decision candidate and action queue contracts separate model recommendation from approved action lifecycle.",
          "Jazan Performance Office",
          "compliant",
          "2026-07-15",
          ["output.jazan_recommended_intervention", "decision.jazan_generated_service_decisions", "decision.jazan_service_quality_action_queue"],
        ),
        policy(
          "jazan-policy-model-evidence-before-recommendation",
          "Model Risk Control",
          "Runtime forecast and recommendation evidence must be retained before recommendations are operationalized",
          "Forecast, anomaly, risk, and recommendation outputs are mapped into lineage and decision evidence entry points.",
          "Data Science Runtime",
          "partial",
          "2026-07-15",
          ["output.jazan_service_rnn_forecast", "output.jazan_service_quality_anomaly", "output.jazan_municipality_service_risk_score"],
        ),
        policy(
          "jazan-policy-action-audit-events",
          "Operational Audit",
          "All action buttons must create audit events",
          "Action queue and recovery outcome tables include audit and evidence lifecycle fields, but live action telemetry is not yet connected.",
          "Performance Office",
          "partial",
          "2026-07-15",
          ["decision.jazan_service_quality_action_queue", "decision.jazan_visual_distortion_recovery_outcome"],
        ),
      ],
    },
    downstreamConsumers: [
      "Jazan use-case workspace",
      "Administration -> Governance",
      "Superset Urban Service Dashboard",
      "Pillar 5 corrective-action workflow",
      "Monthly performance review pack",
    ],
    trustMap: jazanUrbanServiceTrustMap,
    diagnosticsScope: {
      qualityModels: [
        "analytics.fct_jazan_service_quality",
        "analytics.fct_jazan_visual_distortion_performance",
        "output.jazan_service_rnn_forecast",
        "output.jazan_service_quality_anomaly",
        "output.jazan_municipality_service_risk_score",
        "output.jazan_recommended_intervention",
        "decision.jazan_generated_service_decisions",
        "decision.jazan_service_quality_action_queue",
        "decision.jazan_visual_distortion_recovery_outcome",
      ],
      freshnessSources: [
        "source_jazan.visual_distortion_cases",
        "source_jazan.service_requests",
        "source_jazan.permit_requests",
        "source_jazan.service_coverage_assets",
        "source_jazan.emergency_readiness_checks",
        "source_jazan.citizen_satisfaction_surveys",
        "source_jazan.municipalities",
      ],
    },
  },
  {
    id: "talemia_business_intelligence",
    name: "TALEMIA Business Intelligence",
    domain: "Commercial Operations",
    workspacePath: "/use-cases/talemia-business-intelligence",
    description: "Commercial pipeline, win/loss, account ownership, opportunity drilldown, and KPI reconciliation metadata.",
    businessPurpose:
      "Give executives, BD directors, account managers, and commercial operations leaders a governed control tower for pipeline value, win/loss outcomes, client coverage, and operational follow-up.",
    owner: "Commercial Operations",
    steward: "Data/Governance Owner",
    sourceTables: [
      "raw_demo.talemia_opportunities",
      "raw_demo.talemia_awards",
      "raw_demo.talemia_loss_reasons",
      "raw_demo.talemia_opportunity_updates_long",
      "raw_demo.talemia_dashboard_targets",
      "raw_demo.extraction_quality_report",
    ],
    workspaceCoverage: [
      { label: "Overview", href: "/use-cases/talemia-business-intelligence" },
      { label: "Executive", href: "/use-cases/talemia-business-intelligence/executive" },
      { label: "Financial", href: "/use-cases/talemia-business-intelligence/financial" },
      { label: "Business Lines", href: "/use-cases/talemia-business-intelligence/business-lines" },
      { label: "Account Managers", href: "/use-cases/talemia-business-intelligence/account-managers" },
      { label: "Commercial", href: "/use-cases/talemia-business-intelligence/commercial" },
      { label: "Opportunities", href: "/use-cases/talemia-business-intelligence/opportunities" },
    ],
    governedDatasets: [
      {
        id: "talemia-raw-opportunities",
        name: "TALEMIA Raw Opportunities",
        schema: "raw_demo",
        table: "talemia_opportunities",
        assetType: "source",
        businessMeaning: "Source-derived opportunity records from the TALEMIA V4 extractor output.",
        grain: "One row per extracted opportunity",
        owner: "Commercial Operations",
        steward: "Data/Governance Owner",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        certification: certification("draft", "V4 extract is accepted for iterative build-out, but reconciliation is not yet authoritative."),
        consumers: ["dbt staging", "Extraction quality review"],
        downstreamConsumers: ["stg_talemia_opportunities", "analytics.fct_talemia_opportunity"],
        upstreamSources: ["talemia_raw_demo_extracted_v4.xlsx"],
        relatedDashboards: ["TALEMIA BD Executive Dashboard", "TALEMIA Opportunity Details"],
        relatedTerms: ["talemia-opportunity", "talemia-workflow-state", "talemia-winning-likelihood"],
        complianceNotes: ["Commercial data is internal and must not expose raw_demo tables directly in workspace or Superset views."],
        lineageSummary: ["V4 workbook -> raw_demo.talemia_opportunities -> stg_talemia_opportunities"],
        columns: [
          datasetColumn("opportunity_id", "text", "internal", "Business key for the extracted opportunity.", {
            relatedTermIds: ["talemia-opportunity"],
          }),
          datasetColumn("opportunity_name_en", "text", "internal", "English opportunity name."),
          datasetColumn("opportunity_name_ar", "text", "internal", "Arabic opportunity name."),
          datasetColumn("client_name", "text", "internal", "Client organization display name."),
          datasetColumn("contract_value", "numeric", "internal", "Commercial value associated with the opportunity."),
          datasetColumn("winning_likelihood", "text", "internal", "High, Mid, or Low likelihood classification.", {
            relatedTermIds: ["talemia-winning-likelihood"],
          }),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        rowCount: 15,
        openRisks: [
          "Weekly updates may need parser correction.",
          "Expected award dates need validation before forecasting.",
        ],
      },
      {
        id: "talemia-fct-opportunity",
        name: "TALEMIA Opportunity Fact",
        schema: "analytics",
        table: "fct_talemia_opportunity",
        assetType: "fact",
        businessMeaning: "Opportunity-grain analytics fact for commercial pipeline, client, owner, and lifecycle reporting.",
        grain: "One row per opportunity",
        owner: "Commercial Analytics",
        steward: "Commercial Operations Lead",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        certification: certification("draft", "Ready for UX population, not yet certified for authoritative reporting."),
        consumers: ["TALEMIA workspace", "Backend APIs", "Superset dashboard"],
        downstreamConsumers: ["Executive", "Financial", "Business Lines", "Account Managers", "Commercial", "Opportunities"],
        upstreamSources: ["raw_demo.talemia_opportunities", "stg_talemia_opportunities"],
        relatedDashboards: ["talemia-business-intelligence"],
        relatedTerms: ["talemia-opportunity", "talemia-business-line", "talemia-client-department"],
        complianceNotes: ["APIs and Superset must query analytics/dictionary outputs only."],
        lineageSummary: ["raw_demo.talemia_opportunities -> stg_talemia_opportunities -> analytics.fct_talemia_opportunity"],
        columns: [
          datasetColumn("opportunity_id", "text", "internal", "Primary opportunity key.", {
            relatedTermIds: ["talemia-opportunity"],
          }),
          datasetColumn("business_line_name", "text", "internal", "Business line grouping.", {
            relatedTermIds: ["talemia-business-line"],
          }),
          datasetColumn("account_manager_name", "text", "internal", "BD owner or account manager."),
          datasetColumn("workflow_state", "text", "internal", "Commercial workflow state.", {
            relatedTermIds: ["talemia-workflow-state"],
          }),
          datasetColumn("sector_type", "text", "internal", "MoE, Non-MoE, or related sector grouping."),
          datasetColumn("qualified_sales", "numeric", "internal", "Qualified pipeline value."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        rowCount: 15,
        openRisks: ["Historical persistence is limited to the current extract."],
      },
      {
        id: "talemia-fct-pipeline",
        name: "TALEMIA Pipeline Performance Facts",
        schema: "analytics",
        table: "fct_talemia_pipeline",
        assetType: "fact",
        businessMeaning: "Pipeline, stage, business-line, and account-manager summaries used by the dashboard suite.",
        grain: "One row per performance grain, depending on mart",
        owner: "Commercial Analytics",
        steward: "Commercial Operations Lead",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "partial",
        certificationStatus: "draft",
        certification: certification("draft", "Dashboard marts are usable for demonstration, with reconciliation still required."),
        consumers: ["TALEMIA workspace", "Superset dashboard"],
        downstreamConsumers: ["Executive KPI cards", "Business-line dashboard", "Account-manager dashboard"],
        upstreamSources: ["analytics.fct_talemia_opportunity", "raw_demo.talemia_awards", "raw_demo.talemia_loss_reasons"],
        relatedDashboards: ["BD Executive Dashboard", "Business Line Dashboard", "Account Manager Dashboard"],
        relatedTerms: ["talemia-pipeline-value", "talemia-win-rate", "talemia-hit-rate"],
        complianceNotes: ["No hardcoded KPI values; metrics must resolve from analytics or dictionary assets."],
        lineageSummary: ["analytics.fct_talemia_opportunity -> analytics.fct_talemia_pipeline and performance marts"],
        columns: [
          datasetColumn("business_line_name", "text", "internal", "Business-line reporting dimension."),
          datasetColumn("opportunity_count", "integer", "internal", "Count of opportunities in scope."),
          datasetColumn("pipeline_value", "numeric", "internal", "Total pipeline value."),
          datasetColumn("win_rate", "numeric", "internal", "Win ratio for the selected grain.", {
            relatedTermIds: ["talemia-win-rate"],
          }),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        openRisks: ["Active stage extraction is partial because V4 contains closed awarded/lost records."],
      },
      {
        id: "talemia-dict-metrics",
        name: "TALEMIA Metric Dictionary",
        schema: "dictionary",
        table: "dict_talemia_metrics",
        assetType: "dictionary",
        businessMeaning: "KPI formula, raw lineage, source mart, placement, owner, and limitation dictionary.",
        grain: "One row per TALEMIA KPI",
        owner: "Data/Governance Owner",
        steward: "Commercial Operations Lead",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        certification: certification("draft", "Definitions are documented; authoritative reporting waits on reconciliation."),
        consumers: ["Administration -> Governance", "TALEMIA contract documentation"],
        downstreamConsumers: ["Governance control tower", "Metric calculation detail panel"],
        upstreamSources: ["docs/use_cases/talemia_business_intelligence/use_case_contract.md", "analytics.fct_talemia_pipeline"],
        relatedDashboards: ["KPI Governance and Dictionary"],
        relatedTerms: ["talemia-pipeline-value", "talemia-win-rate", "talemia-hit-rate"],
        complianceNotes: ["Dictionary must remain the place for formula ownership and limitations."],
        columns: [
          datasetColumn("kpi_name", "text", "internal", "KPI display name."),
          datasetColumn("formula", "text", "internal", "Formal KPI calculation rule."),
          datasetColumn("source_mart", "text", "internal", "Analytics or dictionary source for the KPI."),
          datasetColumn("raw_lineage", "text", "internal", "Raw table lineage reference."),
          datasetColumn("limitation", "text", "internal", "Known limitation or certification caveat."),
        ],
        qualityDimensions: dims("warning", "passing", "warning", "warning"),
      },
      {
        id: "talemia-fct-reconciliation",
        name: "TALEMIA Dashboard Reconciliation",
        schema: "analytics",
        table: "fct_talemia_dashboard_reconciliation",
        assetType: "fact",
        businessMeaning: "Comparison of calculated KPI outputs with dashboard target values from the extractor.",
        grain: "One row per dashboard and KPI target",
        owner: "Data/Governance Owner",
        steward: "Commercial Operations Lead",
        freshnessStatus: "warning",
        testStatus: "warning",
        lineageStatus: "partial",
        recordSpecStatus: "complete",
        certificationStatus: "draft",
        certification: certification("draft", "Must pass before TALEMIA reporting is treated as authoritative."),
        consumers: ["Administration -> Governance", "Executive review"],
        downstreamConsumers: ["Governance reconciliation", "Metric trust review"],
        upstreamSources: ["raw_demo.talemia_dashboard_targets", "analytics.fct_talemia_pipeline"],
        relatedDashboards: ["KPI Governance and Dictionary"],
        relatedTerms: ["talemia-dashboard-reconciliation"],
        complianceNotes: ["Dashboard reconciliation must be performed before authoritative reporting."],
        columns: [
          datasetColumn("dashboard_name", "text", "internal", "Dashboard being reconciled."),
          datasetColumn("kpi_name", "text", "internal", "Metric being compared."),
          datasetColumn("dashboard_visible_value", "text", "internal", "Extracted target or visible value."),
          datasetColumn("calculated_value", "numeric", "internal", "Calculated value from analytics marts."),
          datasetColumn("reconciliation_status", "text", "internal", "Pass, variance, or not comparable status."),
        ],
        qualityDimensions: dims("warning", "warning", "warning", "warning"),
        openRisks: ["Hidden Power BI or DAX logic may still exist outside the extracted workbook outputs."],
      },
    ],
    dictionaryTerms: [
      {
        id: "talemia-opportunity",
        term: "TALEMIA Opportunity",
        definition: "A commercial pursuit represented at opportunity grain with client, owner, value, stage, and lifecycle attributes.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-raw-opportunities", "talemia-fct-opportunity"],
        synonyms: ["BD opportunity", "Commercial opportunity"],
        owner: "Commercial Operations Lead",
        steward: "Data/Governance Owner",
        exampleUsage: "YTD opportunities counts distinct opportunity records in the selected period.",
        sourceMetric: "analytics.fct_talemia_opportunity.opportunity_id",
        status: "draft",
      },
      {
        id: "talemia-pipeline-value",
        term: "Pipeline Value",
        definition: "Total commercial value of opportunities in the selected pipeline scope.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-opportunity", "talemia-fct-pipeline"],
        relatedTermIds: ["talemia-opportunity"],
        synonyms: ["Contract value", "Commercial pipeline"],
        owner: "Executive / BD Director",
        steward: "Commercial Operations Lead",
        exampleUsage: "Pipeline value is shown on the Executive and Financial dashboards.",
        sourceMetric: "analytics.fct_talemia_pipeline.pipeline_value",
        status: "draft",
      },
      {
        id: "talemia-win-rate",
        term: "Win Rate",
        definition: "Share of closed opportunities that were awarded, excluding records that are still in progress where possible.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-pipeline", "talemia-fct-reconciliation"],
        synonyms: ["Winning percent"],
        owner: "Commercial Operations Lead",
        steward: "Data/Governance Owner",
        exampleUsage: "Win rate is used in Executive, Business Line, and Account Manager views.",
        sourceMetric: "analytics.fct_talemia_win_loss.win_rate",
        status: "draft",
      },
      {
        id: "talemia-hit-rate",
        term: "Hit Rate",
        definition: "Commercial conversion indicator comparing go or presented opportunities with the broader opportunity base.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-pipeline", "talemia-dict-metrics"],
        synonyms: ["Go rate", "Presented rate"],
        owner: "Executive / BD Director",
        steward: "Commercial Operations Lead",
        exampleUsage: "Hit rate is shown in the Executive KPI side panel.",
        sourceMetric: "dictionary.dict_talemia_metrics.hit_rate",
        status: "needs_review",
      },
      {
        id: "talemia-business-line",
        term: "Business Line",
        definition: "Commercial service-line grouping used to segment pipeline, wins, losses, and risk.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-opportunity", "talemia-fct-pipeline"],
        synonyms: ["Portfolio line", "Service line"],
        owner: "Commercial Operations Lead",
        steward: "Data/Governance Owner",
        exampleUsage: "Business-line pipeline value compares portfolio concentration.",
        sourceMetric: "analytics.fct_talemia_business_line_performance.business_line_name",
        status: "draft",
      },
      {
        id: "talemia-workflow-state",
        term: "Workflow State",
        definition: "Operational status such as active, pipeline, awarded, or lost; separate from opportunity stage.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-raw-opportunities", "talemia-fct-opportunity"],
        synonyms: ["Opportunity status"],
        owner: "Commercial Operations Lead",
        steward: "Data/Governance Owner",
        exampleUsage: "Workflow state filters the dashboard without replacing opportunity stage.",
        sourceMetric: "analytics.fct_talemia_opportunity.workflow_state",
        status: "draft",
      },
      {
        id: "talemia-winning-likelihood",
        term: "Winning Likelihood",
        definition: "High, Mid, or Low commercial likelihood classification used for pipeline risk views.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-raw-opportunities", "talemia-fct-opportunity"],
        synonyms: ["Win likelihood", "Risk class"],
        owner: "Account Manager",
        steward: "Commercial Operations Lead",
        exampleUsage: "High, medium, and low likelihood counts appear in executive and opportunity views.",
        sourceMetric: "analytics.fct_talemia_opportunity.winning_likelihood",
        status: "draft",
      },
      {
        id: "talemia-client-department",
        term: "Client Department",
        definition: "Client sub-organization or department used for coverage, engagement, and account planning analysis.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-opportunity"],
        owner: "Account Manager",
        steward: "Data/Governance Owner",
        exampleUsage: "Client department supports opportunity detail and customer engagement views.",
        sourceMetric: "analytics.fct_talemia_opportunity.client_department",
        status: "draft",
      },
      {
        id: "talemia-dashboard-reconciliation",
        term: "Dashboard Reconciliation",
        definition: "Governance check comparing calculated analytics values with extracted dashboard targets before authoritative use.",
        domain: "Commercial Operations",
        useCaseId: "talemia_business_intelligence",
        relatedDatasets: ["talemia-fct-reconciliation", "talemia-dict-metrics"],
        owner: "Data/Governance Owner",
        steward: "Commercial Operations Lead",
        exampleUsage: "Reconciliation must pass before executive numbers are treated as final.",
        sourceMetric: "analytics.fct_talemia_dashboard_reconciliation.reconciliation_status",
        status: "draft",
      },
    ],
    lineageEntryPoints: [
      {
        id: "talemia-lineage-opportunity",
        label: "Opportunity technical lineage",
        summary: "V4 workbook raw opportunity rows through guarded staging and opportunity fact.",
        technicalModel: "fct_talemia_opportunity",
        impactTargets: ["Executive", "Financial", "Commercial", "Opportunities"],
        status: "partial",
      },
      {
        id: "talemia-lineage-performance",
        label: "Performance mart lineage",
        summary: "Pipeline, win/loss, business-line, and account-manager marts feeding the operational dashboard suite.",
        technicalModel: "fct_talemia_pipeline",
        impactTargets: ["Executive KPI cards", "Business Lines", "Account Managers", "Superset dashboard"],
        status: "partial",
      },
      {
        id: "talemia-lineage-dictionary",
        label: "Dictionary and reconciliation lineage",
        summary: "Metric dictionary and dashboard reconciliation used by Administration -> Governance.",
        technicalModel: "dict_talemia_metrics",
        impactTargets: ["Governance control tower", "Contract documentation"],
        status: "partial",
      },
    ],
    qualitySummary: {
      freshness: "warning",
      quality: "warning",
      lineage: "partial",
      recordSpecs: "complete",
      compliance: "draft",
      dqDimensions: dims("warning", "warning", "warning", "warning"),
      note:
        "TALEMIA V4 has enough data to populate the dashboard shell, but parser quality, date validation, hidden Power BI logic, and reconciliation still need review before authoritative reporting.",
    },
    complianceContext: {
      posture: "draft",
      summary:
        "TALEMIA is governed as an internal commercial intelligence use case. Raw tables remain blocked from portal and Superset consumers; analytics and dictionary assets are the only supported surfaces.",
      policies: [
        policy(
          "talemia-policy-raw-demo-isolation",
          "Internal Data Handling",
          "TALEMIA raw_demo tables must not be queried directly by portal APIs or Superset charts",
          "Backend contracts and dashboard contracts require analytics/dictionary access only.",
          "Data/Governance Owner",
          "partial",
          "2026-06-30",
          ["raw_demo.talemia_opportunities", "analytics.fct_talemia_opportunity", "talemia-business-intelligence"],
        ),
        policy(
          "talemia-policy-reconciliation-before-reporting",
          "Operational Trust",
          "Dashboard reconciliation must pass before TALEMIA KPI reporting is authoritative",
          "V4 dashboard targets are loaded and reconciliation marts are defined, but validation is still provisional.",
          "Commercial Operations Lead",
          "partial",
          "2026-06-30",
          ["fct_talemia_dashboard_reconciliation", "dict_talemia_metrics"],
        ),
      ],
    },
    downstreamConsumers: [
      "TALEMIA Commercial Workspace",
      "Administration -> Governance",
      "Superset talemia-business-intelligence",
      "Executive and BD reviews",
    ],
    trustMap: talemiaTrustMap,
    diagnosticsScope: {
      qualityModels: [
        "stg_talemia_opportunities",
        "stg_talemia_awards",
        "stg_talemia_losses",
        "stg_talemia_updates",
        "fct_talemia_opportunity",
        "fct_talemia_pipeline",
        "fct_talemia_win_loss",
        "fct_talemia_dashboard_reconciliation",
        "dict_talemia_metrics",
      ],
      freshnessSources: [
        "raw_demo.talemia_opportunities",
        "raw_demo.talemia_dashboard_targets",
        "raw_demo.extraction_quality_report",
      ],
    },
  },
];

export function getGovernanceUseCases() {
  return governanceUseCases;
}

export function filterGovernanceUseCasesByIds(
  useCases: GovernanceUseCase[],
  enabledUseCaseIds: string[] | null,
) {
  if (!enabledUseCaseIds) {
    return useCases;
  }
  return useCases.filter((useCase) => enabledUseCaseIds.includes(useCase.id));
}

export function getClassificationRules() {
  return classificationRules;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function trustStateForSignal(status?: string): TrustState {
  switch (status) {
    case "trusted":
    case "approved":
    case "reviewed":
    case "certified":
    case "fresh":
    case "passing":
    case "complete":
    case "compliant":
      return "trusted";
    case "draft":
    case "partial":
    case "warning":
    case "needs_review":
    case "unknown":
    case "not_connected":
    case "not_assessed":
      return "degraded";
    case "missing":
    case "failing":
    case "stale":
    case "restricted":
    case "gap":
    case "deprecated":
      return "untrusted";
    default:
      return "unmapped";
  }
}

function combineTrustStates(states: TrustState[]): TrustState {
  if (states.includes("untrusted")) {
    return "untrusted";
  }
  if (states.includes("degraded")) {
    return "degraded";
  }
  if (states.includes("trusted")) {
    return "trusted";
  }
  return "unmapped";
}

export function getTrustStateForAsset(asset: GovernedDataset): TrustState {
  return combineTrustStates([
    trustStateForSignal(asset.freshnessStatus),
    trustStateForSignal(asset.testStatus),
    trustStateForSignal(asset.lineageStatus),
    trustStateForSignal(asset.certification?.status ?? asset.certificationStatus),
  ]);
}

export function getTrustStateForUseCase(useCase: GovernanceUseCase): TrustState {
  return combineTrustStates([
    trustStateForSignal(useCase.qualitySummary.freshness),
    trustStateForSignal(useCase.qualitySummary.quality),
    trustStateForSignal(useCase.qualitySummary.lineage),
    trustStateForSignal(useCase.complianceContext.posture),
  ]);
}

export function getGovernanceAssetById(assetId: string) {
  for (const useCase of governanceUseCases) {
    const asset = useCase.governedDatasets.find((dataset) => dataset.id === assetId);
    if (asset) {
      return { asset, useCase };
    }
  }
  return null;
}

export function getGovernanceLineageSources(useCase: GovernanceUseCase) {
  const rawUpstreams = useCase.governedDatasets.flatMap((dataset) =>
    (dataset.upstreamSources ?? [])
      .filter((source) => source.startsWith("raw."))
      .map((source) => source.replace(/^raw\./, "")),
  );

  return Array.from(new Set([...useCase.sourceTables, ...rawUpstreams]));
}

export function getGovernanceKpis(): GovernanceKpi[] {
  return governanceUseCases.flatMap((useCase) => {
    const technicalModel = useCase.lineageEntryPoints[0]?.technicalModel;
    return useCase.trustMap.nodes
      .filter((node) => node.type === "kpi")
      .map((node) => {
        const glossaryTerms = useCase.dictionaryTerms.filter((term) =>
          term.relatedDatasets?.some((datasetId) => datasetId === node.assetId) ||
          (node.assetId ? term.sourceMetric?.includes(node.assetId.replace(/-/g, "_")) : false),
        );
        const asset = node.assetId ? useCase.governedDatasets.find((dataset) => dataset.id === node.assetId) : undefined;
        const slug = slugify(`${useCase.id}-${node.label.replace(/^Portal KPI:\s*/i, "")}`);
        return {
          slug,
          id: node.id,
          label: node.label.replace(/^Portal KPI:\s*/i, ""),
          description: node.description ?? useCase.businessPurpose,
          useCaseId: useCase.id,
          useCaseName: useCase.name,
          domain: useCase.domain,
          trustState: combineTrustStates([
            trustStateForSignal(node.freshnessStatus),
            trustStateForSignal(node.qualityStatus),
            trustStateForSignal(node.certificationStatus),
            asset ? getTrustStateForAsset(asset) : "unmapped",
          ]),
          assetId: node.assetId,
          technicalModel,
          glossaryTerms,
        } satisfies GovernanceKpi;
      });
  });
}

export function filterGovernanceKpisByIds(
  kpis: GovernanceKpi[],
  enabledUseCaseIds: string[] | null,
) {
  if (!enabledUseCaseIds) {
    return kpis;
  }
  return kpis.filter((kpi) => enabledUseCaseIds.includes(kpi.useCaseId));
}

export function getGovernanceKpiBySlug(slug: string) {
  return getGovernanceKpis().find((kpi) => kpi.slug === slug) ?? null;
}

function classifiedColumnCount(datasets: GovernedDataset[]) {
  return datasets.reduce(
    (count, dataset) =>
      count +
      (dataset.columns?.filter((column) => column.sensitivityClass !== "public").length ?? 0),
    0,
  );
}

function certifiedAssetCount(datasets: GovernedDataset[]) {
  return datasets.filter((dataset) => dataset.certification?.status === "certified").length;
}

function qualityRepresentedCount(datasets: GovernedDataset[]) {
  return datasets.filter((dataset) => Boolean(dataset.qualityDimensions)).length;
}

function glossaryCoveredCount(useCases: GovernanceUseCase[]) {
  return useCases.filter((useCase) => useCase.dictionaryTerms.length > 0).length;
}

function lineageCoveredCount(datasets: GovernedDataset[]) {
  return datasets.filter((dataset) => dataset.lineageStatus === "complete" || dataset.lineageStatus === "partial").length;
}

function highRiskAssetCount(datasets: GovernedDataset[]) {
  return datasets.filter(
    (dataset) =>
      dataset.freshnessStatus === "stale" ||
      dataset.testStatus === "failing" ||
      dataset.certification?.status === "deprecated" ||
      (dataset.openRisks?.length ?? 0) > 1,
  ).length;
}

export function getGovernanceOverview(): GovernanceOverview {
  const useCases = getGovernanceUseCases();
  const datasets = useCases.flatMap((useCase) => useCase.governedDatasets);
  const glossaryTerms = useCases.flatMap((useCase) => useCase.dictionaryTerms);
  const policies = useCases.flatMap((useCase) => useCase.complianceContext.policies);

  return {
    activeUseCases: useCases.length,
    governedAssets: datasets.length,
    useCasesCovered: `${useCases.length} / ${useCases.length}`,
    certifiedAssets: `${certifiedAssetCount(datasets)} / ${datasets.length}`,
    classifiedColumns: `${classifiedColumnCount(datasets)} / ${datasets.reduce((sum, dataset) => sum + (dataset.columns?.length ?? 0), 0)}`,
    policiesMapped: `${policies.length} / ${useCases.length} use cases`,
    qualityChecksRepresented: `${qualityRepresentedCount(datasets)} / ${datasets.length}`,
    glossaryCoverage: `${glossaryTerms.length} terms across ${glossaryCoveredCount(useCases)} use cases`,
    lineageCoverage: `${lineageCoveredCount(datasets)} / ${datasets.length}`,
    highRiskAssets: `${highRiskAssetCount(datasets)} / ${datasets.length}`,
  };
}

export function getGovernanceHealthDetails(): GovernanceHealthDetails {
  const useCases = getGovernanceUseCases();
  const kpis = getGovernanceKpis();

  return {
    unmappedKpis: kpis.filter((kpi) => kpi.trustState === "unmapped"),
    missingOwners: useCases.flatMap((useCase) =>
      useCase.governedDatasets
        .filter((dataset) => !dataset.owner)
        .map((dataset) => ({
          assetId: dataset.id,
          name: dataset.name,
          useCaseId: useCase.id,
        })),
    ),
    staleAssets: useCases.flatMap((useCase) =>
      useCase.governedDatasets
        .filter((dataset) => dataset.freshnessStatus === "stale")
        .map((dataset) => ({
          assetId: dataset.id,
          name: dataset.name,
          useCaseId: useCase.id,
        })),
    ),
    uncertifiedAssets: useCases.flatMap((useCase) =>
      useCase.governedDatasets
        .filter((dataset) => dataset.certification?.status !== "certified")
        .map((dataset) => ({
          assetId: dataset.id,
          name: dataset.name,
          useCaseId: useCase.id,
          status: dataset.certification?.status ?? dataset.certificationStatus,
        })),
    ),
  };
}
