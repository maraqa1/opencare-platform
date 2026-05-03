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
    sourceTables: ["claims", "financial_postings", "denials", "payer_contracts", "encounters", "referrals"],
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
      freshnessSources: ["claims", "denials", "postings", "payer_contracts", "payments", "encounters"],
    },
  },
];

export function getGovernanceUseCases() {
  return governanceUseCases;
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
