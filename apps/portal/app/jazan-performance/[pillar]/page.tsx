import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import {
  emptyJazanPillarsResponse,
  formatJazanFreshness,
  formatJazanMetric,
  formatJazanRisks,
  formatJazanStatus,
  type JazanPillar,
} from "@/lib/jazan";
import {
  earlyWarningDeliverables,
  earlyWarningMethodology,
  earlyWarningMetrics,
  earlyWarningSources,
  municipalityRisks,
} from "@/lib/jazan-early-warning-demo";
import {
  carryForwardRules,
  demoStrategicAlignmentWorkspace,
  objectiveInitiativeLinks,
  objectiveSpotlight,
  strategicNarrativeCards,
} from "@/lib/jazan-strategic-alignment-demo";

type PageProps = {
  params: Promise<{ pillar: string }>;
  searchParams?: Promise<{ demo?: string }>;
};

type PillarResponse = {
  pillar: JazanPillar | null;
};

export type StrategicAlignmentSummary = {
  alignmentCoverage?: number | null;
  objectivesCascaded: number | string | null;
  kpisLinked: number | string | null;
  initiativesLinked: number | string | null;
  municipalitiesCovered: number | string | null;
  openAlignmentGaps: number | null;
  dataFreshness: string | null;
};

export type CascadeNode = {
  id: string;
  label: string;
  stage:
    | "vision_ministry"
    | "amanah_objective"
    | "agency_department"
    | "municipality"
    | "kpi_initiative_action";
  owner?: string | null;
  countLabel?: string | null;
  coveragePct?: number | null;
  openGaps?: number | null;
  linkedKpiCount?: number | null;
  linkedInitiativeCount?: number | null;
  status:
    | "aligned"
    | "partially_aligned"
    | "needs_review"
    | "missing_kpi"
    | "missing_owner"
    | "missing_initiative"
    | "needs_data";
};

export type AlignmentMatrixRow = {
  objectiveId: string;
  strategicObjective: string;
  ministryAlignment: string | null;
  owner: string | null;
  linkedKpis: number | null;
  linkedInitiatives: number | null;
  municipalitiesCovered: string | null;
  status: string;
  gaps: string[];
  carryForward?: string[];
};

export type MunicipalityCoverage = {
  municipalityId: string;
  municipalityName: string;
  coveragePct: number | null;
  linkedObjectives: number | null;
  openGaps: number | null;
  status: "complete" | "partial" | "needs_data" | "at_risk";
};

type InitiativeLinkage = {
  initiativeId: string;
  initiativeName: string;
  objective: string | null;
  owner: string | null;
  linkedKpi: string | null;
  expectedBenefit: string | null;
  municipalityCoverage: string | null;
  status: string;
};

export type AlignmentGap = {
  gapId: string;
  gap: string;
  impactedObjective: string;
  type?: string;
  owner: string | null;
  targetPillar?: string;
  dueDate?: string | null;
  dueDateLabel?: string | null;
  escalation?: "low" | "medium" | "high" | null;
  escalationLevel?: string | null;
  expectedOutcome: string | null;
  status: string;
};

export type StrategicAlignmentWorkspace = {
  summary: StrategicAlignmentSummary;
  cascadeNodes: CascadeNode[];
  alignmentMatrix: AlignmentMatrixRow[];
  municipalityCoverage: MunicipalityCoverage[];
  initiativeLinkage: InitiativeLinkage[];
  alignmentGaps: AlignmentGap[];
};

type DeliveryStatus = "operational" | "partial" | "pending";

type DeliveryComponent = {
  id: string;
  title: string;
  status: DeliveryStatus;
  description: string;
  delivers: string[];
  tools: string[];
  note: string;
  icon: DeliveryIconName;
};

type ModelRuntimeConnection = {
  title: string;
  status: DeliveryStatus;
  description: string;
  inputs: string[];
  outputs: string[];
  owner: string;
};

type DeliveryIconName =
  | "bar-chart"
  | "database"
  | "shield"
  | "network"
  | "layers"
  | "dashboard"
  | "check"
  | "partial"
  | "clock"
  | "package"
  | "wrench"
  | "spark";

const emptyStrategicAlignmentWorkspace: StrategicAlignmentWorkspace = {
  summary: {
    objectivesCascaded: null,
    kpisLinked: null,
    initiativesLinked: null,
    municipalitiesCovered: null,
    openAlignmentGaps: null,
    dataFreshness: null,
  },
  cascadeNodes: [],
  alignmentMatrix: [],
  municipalityCoverage: [],
  initiativeLinkage: [],
  alignmentGaps: [],
};

const pillarTabs = [
  {
    key: "strategic-alignment",
    label: "01 · Strategic alignment",
    href: "/jazan-performance/strategic-alignment-objective-cascade",
  },
  {
    key: "kpi-governance",
    label: "02 · KPI governance",
    href: "/jazan-performance/kpi-performance-governance",
  },
  {
    key: "data-analytics",
    label: "03 · Data & analytics",
    href: "/jazan-performance/data-analytics-dashboards",
  },
  {
    key: "early-warning",
    label: "04 · Early warning",
    href: "/jazan-performance/municipal-project-early-warning",
  },
  {
    key: "decision-rhythm",
    label: "05 · Decision rhythm",
    href: "/jazan-performance/decision-rhythm-corrective-actions",
  },
  {
    key: "sustainability",
    label: "06 · Sustainability",
    href: "/jazan-performance/quality-knowledge-transfer-sustainability",
  },
];

const methodology = ["Align", "Cascade", "Link", "Validate", "Act"];

const liveIndicators: Array<[keyof StrategicAlignmentSummary, string]> = [
  ["objectivesCascaded", "Objectives cascaded"],
  ["kpisLinked", "KPIs linked"],
  ["initiativesLinked", "Initiatives linked"],
  ["municipalitiesCovered", "Municipalities covered"],
  ["openAlignmentGaps", "Open alignment gaps"],
];

const targetMeasures = [
  ["Strategic alignment coverage", "100% target"],
  ["Municipality coverage", "25 / 25 target"],
  ["Initiatives linked to objectives", "100% target"],
  ["Objectives with approved KPIs", "100% target"],
  ["Open alignment gaps resolved", ">85% target"],
];

const cascadeStages: CascadeNode[] = [
  {
    id: "vision-ministry",
    label: "Vision 2030 / Ministry Priorities",
    stage: "vision_ministry",
    status: "needs_data",
  },
  {
    id: "amanah-objectives",
    label: "Amanah Strategic Objectives",
    stage: "amanah_objective",
    status: "needs_data",
  },
  {
    id: "agency-department",
    label: "Agency / Department Objectives",
    stage: "agency_department",
    status: "needs_data",
  },
  {
    id: "municipality-objectives",
    label: "Municipality Objectives",
    stage: "municipality",
    status: "needs_data",
  },
  {
    id: "kpi-initiative-action",
    label: "KPIs + Initiatives + Corrective Actions",
    stage: "kpi_initiative_action",
    status: "needs_data",
  },
];

const deliverables = [
  ["Strategic alignment matrix", "Vision / Ministry / Amanah objective mapping"],
  ["Objective cascade map", "Leadership -> agencies -> departments -> municipalities"],
  ["Initiative portfolio", "Strategic and operational initiatives with owners"],
  ["Municipality coverage register", "25 municipality alignment coverage"],
  ["Alignment gap queue", "Missing KPI / owner / initiative / municipality mapping"],
  ["Monthly review input", "Alignment exceptions for leadership review"],
];

const dependencyGroups = [
  {
    title: "Sources",
    items: [
      "source_jazan.strategic_objectives - Amanah and ministry-aligned objective definitions",
      "source_jazan.objective_alignment - objective-to-objective mapping",
      "source_jazan.agencies_departments - agency and department ownership hierarchy",
      "source_jazan.municipalities - reference: 25 municipalities",
      "source_jazan.municipality_objective_map - municipality objective coverage",
      "source_jazan.initiatives - strategic and operational initiatives",
      "source_jazan.kpi_definitions - KPI dictionary references",
      "source_jazan.kpi_results - KPI results for linked objectives",
    ],
  },
  {
    title: "Analytics marts",
    items: [
      "analytics.dim_jazan_objective",
      "analytics.dim_jazan_municipality",
      "analytics.fct_jazan_objective_alignment",
      "analytics.fct_jazan_municipality_objective_coverage",
      "analytics.fct_jazan_initiative_portfolio",
      "analytics.fct_jazan_alignment_gap",
    ],
  },
  {
    title: "Decision tables",
    items: [
      "decision.jazan_alignment_gap_queue",
      "decision.jazan_escalation_recommendations",
      "decision.jazan_monthly_review_pack",
    ],
  },
  {
    title: "APIs",
    items: [
      "GET /api/v1/jazan/strategic-alignment",
      "GET /api/v1/jazan/objectives",
      "GET /api/v1/jazan/objective-cascade",
      "GET /api/v1/jazan/municipality-coverage",
      "GET /api/v1/jazan/alignment-gaps",
      "GET /api/v1/jazan/review-pack/monthly",
    ],
  },
];

const matrixColumns = [
  "Strategic Objective",
  "Vision / Ministry Alignment",
  "Owner",
  "Linked KPIs",
  "Linked Initiatives",
  "Municipalities Covered",
  "Status",
  "Gaps",
  "Action",
];

const initiativeColumns = [
  "Initiative",
  "Linked objective",
  "Owner",
  "Linked KPI",
  "Expected benefit",
  "Municipality coverage",
  "Status",
];

const gapColumns = ["Gap", "Impacted objective", "Owner", "Due date", "Escalation level", "Expected outcome", "Status"];

const deliveryComponents: DeliveryComponent[] = [
  {
    id: "data-platform",
    title: "Data platform",
    status: "operational",
    description: "Foundation services for source ingestion, storage, orchestration, model serving, and runtime execution.",
    delivers: ["source ingestion", "storage", "orchestration", "model serving", "runtime execution"],
    tools: ["Airbyte", "dbt", "PostgreSQL", "MinIO", "Redis", "K3s", "Databricks", "Microsoft Fabric"],
    note: "Base platform is available for demo workloads, scheduled refresh, and predictive runtime execution.",
    icon: "database",
  },
  {
    id: "data-governance",
    title: "Data governance",
    status: "partial",
    description: "Controls for ownership, definitions, evidence, lineage, and quality gates across the delivery stack.",
    delivers: ["ownership", "definitions", "evidence", "lineage", "quality gates"],
    tools: ["NDMO - Saudi", "PDPL - Saudi", "Lineage", "Data dictionary", "Business glossary", "Data quality"],
    note: "Governance controls are defined; certification coverage is still being expanded.",
    icon: "shield",
  },
  {
    id: "data-modelling",
    title: "Data modelling",
    status: "partial",
    description: "Analytics-ready marts and feature sets that turn raw municipal, project, revenue, and service data into governed facts.",
    delivers: ["analytics-ready marts", "feature sets", "governed facts"],
    tools: ["dbt models", "PostgreSQL marts", "Star schemas", "Fact / dim marts"],
    note: "Core model structure is in place; predictive features support early-warning model runtimes.",
    icon: "network",
  },
  {
    id: "semantic-layer",
    title: "Semantic layer",
    status: "pending",
    description: "Shared business definitions for measures, dimensions, targets, thresholds, model inputs, and report filters.",
    delivers: ["measures", "dimensions", "targets", "thresholds", "model inputs", "report filters"],
    tools: ["MetricFlow", "Cube", "Governed metrics"],
    note: "Semantic publishing is pending final KPI dictionary approval and model input certification.",
    icon: "layers",
  },
  {
    id: "visualisation",
    title: "Visualisation design & implementation",
    status: "partial",
    description: "Executive and operational dashboard surfaces for scorecards, warnings, reviews, and drilldowns.",
    delivers: ["scorecards", "warnings", "reviews", "drilldowns"],
    tools: ["Power BI", "Superset", "Tableau", "Next.js portal", "Report packs"],
    note: "Demo surfaces are available; production dashboards will bind to governed API outputs.",
    icon: "dashboard",
  },
];

const stackComponents = [
  deliveryComponents[4],
  deliveryComponents[3],
  deliveryComponents[2],
  deliveryComponents[0],
];

const modelRuntimeConnections: ModelRuntimeConnection[] = [
  {
    title: "Project delay prediction runtime",
    status: "partial",
    description: "Forecasts milestone slippage using project schedule, progress, contractor, and historical delay features.",
    inputs: ["project milestones", "physical progress", "contractor history", "schedule variance"],
    outputs: ["delay risk score", "forecast completion", "recommended escalation"],
    owner: "PMO + Data & Analytics",
  },
  {
    title: "Municipality anomaly detection runtime",
    status: "operational",
    description: "Detects abnormal movement in municipality performance scores and service KPIs.",
    inputs: ["KPI results", "service backlog", "revenue collections", "visual distortion cases"],
    outputs: ["risk driver", "severity", "early-warning flag"],
    owner: "Data & Analytics",
  },
  {
    title: "AI recommendation layer",
    status: "partial",
    description: "Generates advisory recommendations from governed evidence, historical patterns, and decision outcomes.",
    inputs: ["risk facts", "project history", "decision logs", "owner assignments"],
    outputs: ["advisory recommendation", "confidence label", "decision rationale"],
    owner: "Performance Office",
  },
];

const decisionInputs = [
  "Risk-scored municipalities",
  "Forecast breaches",
  "AI recommendations - advisory",
];

const decisionFlow = [
  {
    title: "Triage",
    text: "Flags land and get tagged: severity, type, municipality",
    icon: "dashboard" as DeliveryIconName,
  },
  {
    title: "Review",
    text: "Cadence picks the queue at the right altitude",
    icon: "bar-chart" as DeliveryIconName,
  },
  {
    title: "Decide",
    text: "Owner chooses action from evidence and recommendation",
    icon: "check" as DeliveryIconName,
  },
  {
    title: "Act",
    text: "Lifecycle runs to verified closure across stages",
    icon: "wrench" as DeliveryIconName,
    active: true,
  },
  {
    title: "Track",
    text: "Outcome measured against expected KPI recovery",
    icon: "spark" as DeliveryIconName,
  },
];

const reviewCadence = [
  ["Weekly tactical", "Hot anomalies, urgent slips, escalations", "Next in 3 days - 9 items queued", "spark"],
  ["Monthly performance", "KPI trends, action effectiveness, portfolio", "Next in 12 days - 4 items", "bar-chart"],
  ["Quarterly strategic", "Objective alignment, learning, resource shifts", "Next in 47 days - 1 item", "dashboard"],
] as const;

const actionLifecycle = ["Proposed", "Approved", "In progress", "Evidence submitted", "Verified", "Closed"];

const decisionSummary = [
  ["Open corrective actions", "14", "across 8 municipalities", "neutral"],
  ["Closure rate - 30 days", "78%", "target >= 85% - watch", "watch"],
  ["Verified this month", "8", "recovered against target", "good"],
  ["High-escalation items", "3", "awaiting executive review", "danger"],
] as const;

const correctiveActionQueue = [
  {
    action: "Rebalance field-response capacity & SLA escalation",
    impacted: "Sabya - service quality",
    lifecycle: "In progress",
    owner: "Services Agency",
    ticket: "JZN-SVC-2347",
    due: "+23 days",
    escalation: "Med",
    selected: true,
  },
  {
    action: "Investigate revenue collection drop",
    impacted: "Abu Arish - revenue",
    lifecycle: "Approved",
    owner: "Finance & Investment",
    ticket: "JZN-FIN-2351",
    due: "+18 days",
    escalation: "Med",
  },
  {
    action: "Compliance follow-up - visual distortion",
    impacted: "Samtah - compliance",
    lifecycle: "Evidence",
    owner: "Field Compliance",
    ticket: "JZN-CMP-2339",
    due: "+5 days",
    escalation: "Low",
  },
  {
    action: "Service center reopening plan",
    impacted: "Bish - service quality",
    lifecycle: "Proposed",
    owner: "Services Agency",
    ticket: "JZN-SVC-2354",
    due: "+30 days",
    escalation: "Low",
  },
  {
    action: "Project escalation - road resurfacing",
    impacted: "Sabya - project",
    lifecycle: "Approved",
    owner: "PMO",
    ticket: "JZN-PRJ-2348",
    due: "+14 days",
    escalation: "High",
  },
  {
    action: "Citizen satisfaction recovery program",
    impacted: "Al Aridah - service quality",
    lifecycle: "In progress",
    owner: "Service Quality",
    ticket: "JZN-SVC-2342",
    due: "+21 days",
    escalation: "Med",
  },
];

const selectedDecisionAction = {
  title: "Rebalance field-response capacity and activate SLA escalation protocol",
  arabic: "إعادة توازن استجابة الميدان وتفعيل بروتوكول تصعيد اتفاقية مستوى الخدمة",
  status: "In progress",
  owner: "Services Agency",
  supporting: "Municipality Coordinator",
  due: "+23 days",
  escalation: "Medium",
  ticket: "JZN-SVC-2347",
  lifecycle: [
    ["Proposed", "12d ago", true],
    ["Approved", "9d ago", true],
    ["In progress", "started 7d ago", true],
    ["Evidence", "", false],
    ["Verified", "", false],
    ["Closed", "", false],
  ] as const,
  evidence: [
    ["Forecast", "78% probability of missing closure-rate target within 4 weeks.", "High confidence - Runtime"],
    ["Anomaly", "Resolution time +23% above Sabya's own baseline.", "z = +2.4 - Runtime"],
    ["Composite risk", "84 / 100 - High - forecast 78%, anomaly +2.4, backlog +18%, SLA -8pp.", "Deterministic - not a black box"],
    ["Recommendation", "Field-response rebalancing + SLA escalation protocol.", "Basis: 14 comparable interventions - advisory"],
  ],
  actors: [
    ["JZN-SVC-2347", "OpenCare Action Tracker", "Open - assigned"],
    ["Field Response Team", "8 technicians - Services Agency", ""],
    ["Sabya Municipality Office", "3 coordinators - Municipality Coordinator", ""],
    ["SLA Escalation Lead", "1 manager - Services Agency", ""],
  ],
  expectedOutcome: "Restore closure rate to > 90% and reduce average resolution time to < 48h within the +30 day window.",
  decisionLog: [
    ["7d ago - Services Agency", "Services Agency activated SLA escalation protocol citywide."],
    ["9d ago - Weekly tactical review", "Weekly review approved the intervention; +30-day target set."],
    ["12d ago - Early Warning runtime", "Auto-triggered by Early Warning composite risk score 84 / 100 for Sabya."],
  ],
};

function componentHref(component: DeliveryComponent) {
  if (component.id === "data-governance") {
    return "/jazan-performance/data-analytics-dashboards/delivery-components/data-governance";
  }

  return null;
}

async function getPillar(pillarId: string) {
  const fallback = emptyJazanPillarsResponse.pillars.find((item) => item.id === pillarId) ?? null;
  const data = await getApiJson<PillarResponse>({
    path: `/api/v1/jazan/pillars/${pillarId}`,
    fallback: { pillar: fallback },
    cacheMode: "no-store",
  });

  return data.pillar?.bullets?.length ? data.pillar : fallback;
}

async function getStrategicAlignmentWorkspace() {
  return getApiJson<StrategicAlignmentWorkspace>({
    path: "/api/v1/jazan/strategic-alignment",
    fallback: emptyStrategicAlignmentWorkspace,
    cacheMode: "no-store",
  });
}

function formatNullableNumber(value: number | string | null | undefined) {
  return value === null || value === undefined ? "No data loaded" : String(value);
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function EmptyState({ message }: { message: string }) {
  return <div className="jazan-empty-state">{message}</div>;
}

function DeliveryIcon({ name, size = 16, className }: { name: DeliveryIconName; size?: number; className?: string }) {
  const common = {
    "aria-hidden": true,
    className: className ? `delivery-icon ${className}` : "delivery-icon",
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
    width: size,
  };

  switch (name) {
    case "bar-chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16v-5" />
          <path d="M12 16V8" />
          <path d="M16 16v-9" />
        </svg>
      );
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      );
    case "network":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="6" height="5" rx="1.5" />
          <rect x="15" y="4" width="6" height="5" rx="1.5" />
          <rect x="9" y="15" width="6" height="5" rx="1.5" />
          <path d="M9 7h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M5 12l7 4 7-4" />
          <path d="M5 16l7 4 7-4" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 9h3" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
          <path d="M16 9h2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 12.5l2.2 2.2 4.8-5.2" />
        </svg>
      );
    case "partial":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M4 8l8-4 8 4-8 4-8-4z" />
          <path d="M4 8v8l8 4 8-4V8" />
          <path d="M12 12v8" />
          <path d="M9 15l1.5 1.5L14 13" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M14.5 5.5a4 4 0 0 0 4 5L10 19a2.5 2.5 0 0 1-3.5-3.5l8.5-8.5a4 4 0 0 0-.5-1.5z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
          <path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15z" />
          <path d="M18 14l.7 1.8 1.8.7-1.8.7L18 19l-.7-1.8-1.8-.7 1.8-.7L18 14z" />
        </svg>
      );
    default:
      return null;
  }
}

function statusIconName(status: DeliveryStatus): DeliveryIconName {
  if (status === "operational") return "check";
  if (status === "pending") return "clock";
  return "partial";
}

function DeliveryStatusChip({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`delivery-status-chip ${status}`}>
      <DeliveryIcon name={statusIconName(status)} size={14} />
      {status}
    </span>
  );
}

const toolChipToneByName: Record<string, string> = {
  Airbyte: "violet",
  dbt: "coral",
  "dbt models": "coral",
  PostgreSQL: "slate",
  "PostgreSQL marts": "slate",
  MinIO: "red",
  Redis: "red",
  K3s: "blue",
  Databricks: "red",
  "Microsoft Fabric": "purple",
  "NDMO - Saudi": "green",
  "PDPL - Saudi": "slate",
  Lineage: "cyan",
  "Data dictionary": "indigo",
  "Business glossary": "amber",
  "Data quality": "coral",
  "Star schemas": "amber",
  "Fact / dim marts": "indigo",
  MetricFlow: "coral",
  Cube: "pink",
  "Governed metrics": "indigo",
  "Power BI": "yellow",
  Superset: "cyan",
  Tableau: "orange",
  "Next.js portal": "black",
  "Report packs": "green",
};

function toolChipInitial(label: string) {
  if (label === "PostgreSQL" || label === "PostgreSQL marts") return "PG";
  if (label === "Microsoft Fabric") return "F";
  if (label === "Data dictionary") return "DD";
  if (label === "Business glossary") return "BG";
  if (label === "Fact / dim marts") return "F-D";
  if (label === "Power BI") return "PB";
  if (label === "Next.js portal") return "N";
  return label
    .split(/[\s./-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function DeliveryToolChip({ label }: { label: string }) {
  return (
    <span className="delivery-tool-chip">
      <span className={`delivery-tool-initial ${toolChipToneByName[label] ?? "slate"}`}>{toolChipInitial(label)}</span>
      {label}
    </span>
  );
}

const cascadeStageIcons: Record<CascadeNode["stage"], DeliveryIconName> = {
  vision_ministry: "bar-chart",
  amanah_objective: "dashboard",
  agency_department: "network",
  municipality: "layers",
  kpi_initiative_action: "check",
};

function StrategicStatusChip({ status }: { status: string }) {
  return <span className={`jazan-status-chip ${status}`}>{formatStatusLabel(status)}</span>;
}

function StrategicAlignmentWorkspacePage({ pillar, data }: { pillar: JazanPillar; data: StrategicAlignmentWorkspace }) {
  const cascadeNodes = data.cascadeNodes.length > 0 ? data.cascadeNodes : cascadeStages;

  return (
    <PageFrame
      eyebrow="Pillar 01"
      title={pillar.title}
      description="المواءمة الاستراتيجية وتسلسل الأهداف"
      chips={[
        { label: `Status: ${formatJazanStatus(pillar.status)}`, tone: "primary" },
        { label: `Primary KPI: ${pillar.primary_kpi.label}`, tone: "accent" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance">
            Back to operating model
          </Link>
          <Link className="secondary-link" href="/jazan-performance/kpi-performance-governance">
            View KPI Governance
          </Link>
          <Link className="button primary" href="#alignment-gaps">
            Open Alignment Gaps
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page"
    >
      <TabNav items={pillarTabs} activeKey="strategic-alignment" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Scope & Methodology</p>
            <h2>Strategic alignment operating model</h2>
          </div>
          <span className="summary-badge">Data freshness: {formatJazanFreshness(data.summary.dataFreshness)}</span>
        </div>
        <p>
          Convert the Amanah strategy into an operating alignment model by cascading Vision 2030, ministry, and Amanah
          objectives to agencies, departments, and all 25 municipalities; linking each objective to KPIs, initiatives,
          owners, targets, and alignment gaps.
        </p>
        <div className="jazan-method-chain" aria-label="Strategic alignment methodology">
          {methodology.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Section A</p>
              <h2>Live Alignment Indicators</h2>
            </div>
          </div>
          <div className="jazan-metric-grid">
            {liveIndicators.map(([key, label]) => (
              <article className="jazan-metric-card" key={key}>
                <span>Live</span>
                <h3>{label}</h3>
                <strong>{formatNullableNumber(data.summary[key] as number | null)}</strong>
              </article>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Section B</p>
              <h2>Target Success Measures</h2>
            </div>
          </div>
          <div className="jazan-metric-grid">
            {targetMeasures.map(([label, value]) => (
              <article className="jazan-metric-card target" key={label}>
                <span>Target</span>
                <h3>{label}</h3>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Cascade</p>
            <h2>Strategic Cascade Map</h2>
          </div>
        </div>
        <div className="jazan-cascade-map">
          {cascadeNodes.map((node) => (
            <article className="jazan-cascade-node" key={node.id}>
              <span className={`jazan-status-chip ${node.status}`}>{formatStatusLabel(node.status)}</span>
              <h3>{node.label}</h3>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{node.owner || "Needs data"}</dd>
                </div>
                <div>
                  <dt>Linked KPIs</dt>
                  <dd>{formatNullableNumber(node.linkedKpiCount ?? null)}</dd>
                </div>
                <div>
                  <dt>Linked initiatives</dt>
                  <dd>{formatNullableNumber(node.linkedInitiativeCount ?? null)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        {data.cascadeNodes.length === 0 ? (
          <EmptyState message="No cascade data loaded. Connect strategic objectives, KPI definitions, initiatives, and municipality mappings to populate this view." />
        ) : null}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Matrix</p>
            <h2>Strategic Alignment Matrix</h2>
          </div>
        </div>
        {data.alignmentMatrix.length === 0 ? (
          <EmptyState message="No strategic alignment matrix loaded." />
        ) : (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{matrixColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentMatrix.map((row) => (
                  <tr key={row.objectiveId}>
                    <td><strong>{row.strategicObjective}</strong></td>
                    <td>{row.ministryAlignment ?? "Needs data"}</td>
                    <td>{row.owner ?? "Needs data"}</td>
                    <td>{formatNullableNumber(row.linkedKpis)}</td>
                    <td>{formatNullableNumber(row.linkedInitiatives)}</td>
                    <td>{row.municipalitiesCovered ?? "Needs data"}</td>
                    <td>{row.status}</td>
                    <td>{row.gaps.length > 0 ? row.gaps.join(", ") : "No data loaded"}</td>
                    <td>No data loaded</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">25 municipalities</p>
            <h2>Municipality Coverage</h2>
          </div>
        </div>
        {data.municipalityCoverage.length === 0 ? (
          <EmptyState message="No municipality coverage data loaded. Coverage is expected across 25 municipalities once mappings are connected." />
        ) : (
          <div className="jazan-municipality-grid">
            {data.municipalityCoverage.map((municipality) => (
              <article className="jazan-municipality-tile" key={municipality.municipalityId}>
                <h3>{municipality.municipalityName}</h3>
                <span className={`jazan-status-chip ${municipality.status}`}>{formatStatusLabel(municipality.status)}</span>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>{municipality.coveragePct === null ? "No data loaded" : `${municipality.coveragePct}%`}</dd>
                  </div>
                  <div>
                    <dt>Linked objectives</dt>
                    <dd>{formatNullableNumber(municipality.linkedObjectives)}</dd>
                  </div>
                  <div>
                    <dt>Open gaps</dt>
                    <dd>{formatNullableNumber(municipality.openGaps)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Initiatives</p>
            <h2>Initiative Linkage</h2>
          </div>
        </div>
        {data.initiativeLinkage.length === 0 ? (
          <EmptyState message="No initiative linkage data loaded." />
        ) : (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{initiativeColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.initiativeLinkage.map((initiative) => (
                  <tr key={initiative.initiativeId}>
                    <td>{initiative.initiativeName}</td>
                    <td>{initiative.objective ?? "Needs data"}</td>
                    <td>{initiative.owner ?? "Needs data"}</td>
                    <td>{initiative.linkedKpi ?? "Needs data"}</td>
                    <td>{initiative.expectedBenefit ?? "Needs data"}</td>
                    <td>{initiative.municipalityCoverage ?? "Needs data"}</td>
                    <td>{initiative.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section" id="alignment-gaps">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Decision bridge</p>
            <h2>Alignment Gaps Requiring Action</h2>
          </div>
        </div>
        {data.alignmentGaps.length === 0 ? (
          <EmptyState message="No alignment gaps generated." />
        ) : (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{gapColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentGaps.map((gap) => (
                  <tr key={gap.gapId}>
                    <td>{gap.gap}</td>
                    <td>{gap.impactedObjective}</td>
                    <td>{gap.owner ?? "Needs data"}</td>
                    <td>{gap.dueDate ?? "Needs data"}</td>
                    <td>{gap.escalationLevel ?? "Needs data"}</td>
                    <td>{gap.expectedOutcome ?? "Needs data"}</td>
                    <td>{gap.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Outputs</p>
              <h2>Deliverables</h2>
            </div>
          </div>
          <div className="jazan-deliverable-grid">
            {deliverables.map(([title, description]) => (
              <article className="jazan-deliverable-card" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Integration contract</p>
              <h2>Data Sources & Dependencies</h2>
            </div>
          </div>
          <div className="jazan-dependency-groups">
            {dependencyGroups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

function hasStrategicAlignmentData(data: StrategicAlignmentWorkspace) {
  return Boolean(
    data.cascadeNodes.length ||
      data.alignmentMatrix.length ||
      data.municipalityCoverage.length ||
      data.alignmentGaps.length ||
      data.summary.alignmentCoverage ||
      data.summary.objectivesCascaded,
  );
}

function StrategicMiniIcon({ label }: { label: string }) {
  return (
    <span className="strategic-icon" aria-hidden="true">
      {label}
    </span>
  );
}

function StrategicAlignmentCockpitPage({
  pillar,
  data,
  mode,
}: {
  pillar: JazanPillar;
  data: StrategicAlignmentWorkspace;
  mode: "live" | "demo" | "empty";
}) {
  const modeLabel =
    mode === "demo" ? "Demo data · seeded for proposal walkthrough" : mode === "live" ? "Live data" : "Needs data";

  return (
    <PageFrame
      eyebrow="Pillar 01"
      title={pillar.title}
      description="المواءمة الاستراتيجية وتسلسل الأهداف"
      chips={[
        { label: modeLabel, tone: "primary" },
        { label: `Primary KPI: ${pillar.primary_kpi.label}`, tone: "accent" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance">
            Back to operating model
          </Link>
          <Link className="secondary-link" href="/jazan-performance/kpi-performance-governance">
            View KPI Governance
          </Link>
          <Link className="button primary" href="#alignment-gaps">
            Open Alignment Gaps
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page strategic-cockpit-page"
    >
      <TabNav items={pillarTabs} activeKey="strategic-alignment" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Scope & Methodology</p>
            <h2>Strategic alignment operating model</h2>
          </div>
          <span className="summary-badge">Data freshness: {formatJazanFreshness(data.summary.dataFreshness)}</span>
        </div>
        <p>
          Convert the Amanah strategy into an operating alignment model by cascading Vision 2030, ministry, and Amanah
          objectives to agencies, departments, and all 25 municipalities; linking each objective to KPIs, initiatives,
          owners, targets, and alignment gaps.
        </p>
        <div className="jazan-method-chain" aria-label="Strategic alignment methodology">
          {methodology.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Operating intent</p>
            <h2>Why this pillar matters</h2>
          </div>
        </div>
        <div className="strategic-narrative-grid">
          {strategicNarrativeCards.map((card) => (
            <article key={card.title}>
              <StrategicMiniIcon label={card.icon === "users" ? "LE" : card.icon === "map" ? "25" : "PMO"} />
              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Executive alignment KPI strip</p>
            <h2>Alignment signal</h2>
          </div>
        </div>
        <div className="jazan-metric-grid">
          <article className="jazan-metric-card">
            <span>{mode === "demo" ? "Demo" : "Live"}</span>
            <h3>Alignment coverage</h3>
            <strong>{data.summary.alignmentCoverage === null || data.summary.alignmentCoverage === undefined ? "No data loaded" : `${data.summary.alignmentCoverage}%`}</strong>
          </article>
          {liveIndicators.map(([key, label]) => (
            <article className="jazan-metric-card" key={key}>
              <span>{mode === "demo" ? "Demo" : "Live"}</span>
              <h3>{label}</h3>
              <strong>{formatNullableNumber(data.summary[key])}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Strategic hierarchy</p>
            <h2>Strategy to execution cascade</h2>
          </div>
        </div>
        {data.cascadeNodes.length === 0 ? (
          <EmptyState message="No cascade data loaded. Connect strategic objectives, KPI definitions, initiatives, and municipality mappings to populate this view." />
        ) : (
          <div className="strategic-hierarchy-flow">
            {data.cascadeNodes.map((node, index) => (
              <article key={node.id}>
                <div className="strategic-stage-topline">
                  <StrategicMiniIcon label={index === 0 ? "V" : index === 1 ? "A" : index === 2 ? "D" : index === 3 ? "M" : "K"} />
                  <DeliveryIcon name={cascadeStageIcons[node.stage]} size={18} />
                </div>
                <h3>{node.label}</h3>
                <p>{node.countLabel || "No data loaded"}{node.openGaps ? ` - ${node.openGaps} gaps` : ""}</p>
                <div className="strategic-progress-row">
                  <span className="strategic-progress-track">
                    <span style={{ width: `${Math.max(0, Math.min(node.coveragePct ?? 0, 100))}%` }} />
                  </span>
                  <strong>{node.coveragePct === null || node.coveragePct === undefined ? "No data loaded" : `${node.coveragePct}%`}</strong>
                </div>
                <StrategicStatusChip status={node.status} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Objective carried to action</p>
            <h2>{mode === "empty" ? "No objective spotlight loaded" : objectiveSpotlight.amanahObjective}</h2>
          </div>
        </div>
        {mode === "empty" ? (
          <EmptyState message="No objective spotlight loaded." />
        ) : (
          <div className="objective-spotlight-card">
            <div className="objective-spotlight-titlebar">
              <strong>{objectiveSpotlight.amanahObjective}</strong>
              <span>Ministry / vision</span>
              <span>Amanah objective</span>
              <span>Owner</span>
              <span>Municipality</span>
              <span>KPIs</span>
              <span>Gaps</span>
              <span>Actions</span>
            </div>
            <div className="objective-spotlight">
              <article>
                <span>Objective summary</span>
                <div className="objective-summary-list">
                  <p><DeliveryIcon name="bar-chart" size={15} /> <strong>Ministry / vision alignment</strong>{objectiveSpotlight.ministryAlignment}</p>
                  <p><DeliveryIcon name="dashboard" size={15} /> <strong>Amanah objective</strong>{objectiveSpotlight.amanahObjective}</p>
                  <p><DeliveryIcon name="network" size={15} /> <strong>Owner + agency</strong>{objectiveSpotlight.owner} - {objectiveSpotlight.agency}</p>
                  <p><DeliveryIcon name="layers" size={15} /> <strong>Municipality coverage</strong>{objectiveSpotlight.municipalityCoverage}</p>
                </div>
              </article>
              <article>
                <span>Linked KPIs</span>
                <ul>{objectiveSpotlight.linkedKpis.map((item) => <li key={item}>{item}</li>)}</ul>
                <span>Linked Initiatives</span>
                <ul>{objectiveSpotlight.linkedInitiatives.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <span>Gaps & carry-forward</span>
                <ul>{objectiveSpotlight.gaps.map((item) => <li key={item}>{item}</li>)}</ul>
                {objectiveSpotlight.actions.map((action) => (
                  <Link className="secondary-link" href={action.href} key={action.label}>
                    {action.label}
                  </Link>
                ))}
              </article>
            </div>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Matrix</p>
            <h2>Strategic Alignment Matrix</h2>
          </div>
        </div>
        {data.alignmentMatrix.length === 0 ? (
          <EmptyState message="No strategic alignment matrix loaded." />
        ) : (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["Strategic Objective", "Ministry / Vision Alignment", "Owner", "Linked KPIs", "Linked Initiatives", "Municipalities Covered", "Alignment Status", "Gaps", "Carry Forward"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentMatrix.map((row) => (
                  <tr key={row.objectiveId}>
                    <td><strong>{row.strategicObjective}</strong></td>
                    <td>{row.ministryAlignment ?? "Needs data"}</td>
                    <td>{row.owner ?? "Needs data"}</td>
                    <td>{formatNullableNumber(row.linkedKpis)}</td>
                    <td>{formatNullableNumber(row.linkedInitiatives)}</td>
                    <td>{row.municipalitiesCovered ?? "Needs data"}</td>
                    <td><StrategicStatusChip status={row.status} /></td>
                    <td><strong>{row.gaps.length > 0 ? row.gaps.join(", ") : "0"}</strong></td>
                    <td>{row.carryForward?.length ? row.carryForward.join(", ") : "No data loaded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Many-to-many logic</p>
            <h2>Objective ↔ Initiative Map</h2>
          </div>
        </div>
        {mode === "empty" ? (
          <EmptyState message="No objective-to-initiative relationships loaded." />
        ) : (
          <>
          <div className="objective-initiative-map">
            <div>
              <h3>Strategic objectives</h3>
              {[...new Set(objectiveInitiativeLinks.map((item) => item.objectiveName))].map((name) => <span key={name}>{name}</span>)}
            </div>
            <div>
              <h3>Initiatives</h3>
              {[...new Set(objectiveInitiativeLinks.map((item) => item.initiativeName))].map((name) => <span className={name === "Digital request tracking" ? "shared" : undefined} key={name}>{name}</span>)}
            </div>
            <div>
              <h3>KPIs / benefits</h3>
              {objectiveInitiativeLinks.map((item) => <span key={`${item.objectiveName}-${item.kpiOrBenefit}`}>{item.kpiOrBenefit}</span>)}
            </div>
          </div>
          <p className="strategic-helper-text relationship-note">
            Digital request tracking feeds service quality, transparency, and early-warning capture - one initiative,
            multiple objectives.
          </p>
          </>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">25 municipalities</p>
            <h2>Municipality Coverage</h2>
          </div>
        </div>
        {data.municipalityCoverage.length === 0 ? (
          <EmptyState message="No municipality coverage data loaded." />
        ) : (
          <>
          <div className="municipality-coverage-legend" aria-label="Municipality coverage status summary">
            <span><i className="complete" /> complete - {data.municipalityCoverage.filter((municipality) => municipality.status === "complete").length}</span>
            <span><i className="partial" /> partial - {data.municipalityCoverage.filter((municipality) => municipality.status === "partial").length}</span>
            <span><i className="at_risk" /> at risk - {data.municipalityCoverage.filter((municipality) => municipality.status === "at_risk").length}</span>
          </div>
          <div className="jazan-municipality-grid">
            {data.municipalityCoverage.map((municipality) => (
              <article className="jazan-municipality-tile" key={municipality.municipalityId}>
                <div className="municipality-tile-header">
                  <h3>{municipality.municipalityName}</h3>
                  <i className={municipality.status} aria-hidden="true" />
                </div>
                <strong>{municipality.coveragePct === null ? "No data loaded" : `${municipality.coveragePct}%`}</strong>
                <p>{formatNullableNumber(municipality.linkedObjectives)} objectives - {formatNullableNumber(municipality.openGaps)} gaps</p>
                <StrategicStatusChip status={municipality.status} />
              </article>
            ))}
          </div>
          </>
        )}
      </section>

      <section className="panel jazan-workspace-section" id="alignment-gaps">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Decision bridge</p>
            <h2>Alignment Gaps Requiring Action</h2>
          </div>
        </div>
        {data.alignmentGaps.length === 0 ? (
          <EmptyState message="No alignment gaps generated." />
        ) : (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["Gap", "Impacted Objective", "Type", "Owner", "Target Pillar", "Due Date", "Escalation", "Expected Outcome", "Status"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentGaps.map((gap) => (
                  <tr key={gap.gapId}>
                    <td>{gap.gap}</td>
                    <td>{gap.impactedObjective}</td>
                    <td>{gap.type ?? "Needs data"}</td>
                    <td>{gap.owner ?? "Needs data"}</td>
                    <td>{gap.targetPillar ?? "Needs data"}</td>
                    <td>{gap.dueDateLabel ?? gap.dueDate ?? "Needs data"}</td>
                    <td><StrategicStatusChip status={gap.escalation ?? gap.escalationLevel ?? "needs_data"} /></td>
                    <td>{gap.expectedOutcome ?? "Needs data"}</td>
                    <td><StrategicStatusChip status={gap.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="strategic-helper-text">Alignment gaps are routed into KPI governance, data governance, corrective actions, or sustainability workflows depending on the gap type.</p>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Carry-forward logic</p>
            <h2>Where aligned work moves next</h2>
          </div>
        </div>
        <div className="carry-forward-grid">
          {carryForwardRules.map(([condition, output, target]) => (
            <article key={condition}>
              <span>{condition}</span>
              <strong>{output}</strong>
              <p>{target}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Outputs</p>
              <h2>Outputs of Pillar 01</h2>
            </div>
          </div>
          <div className="jazan-deliverable-grid">
            {[...deliverables, ["Carry-forward package", "Shows which items move to KPI governance, data governance, early warning, corrective actions, or sustainability."]].map(([title, description], index) => (
              <article className="jazan-deliverable-card" key={title}>
                <DeliveryIcon name={index % 3 === 0 ? "dashboard" : index % 3 === 1 ? "network" : "package"} size={18} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Integration contract</p>
              <h2>Data Sources & OpenCare Contract Evidence</h2>
            </div>
          </div>
          <div className="jazan-dependency-groups">
            {dependencyGroups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

function PillarThreeOverviewPage({ pillar }: { pillar: JazanPillar }) {
  const dataSources = [
    ["source_jazan", "early-warning slice", "6 sources feeding pillar 4", "loaded - 8m ago"],
    ["source_jazan", "finance & budget", "expenditure, collections, budget", "needs data"],
    ["source_jazan", "workforce", "staffing, capacity", "needs data"],
    ["source_jazan", "full citizen services", "all service channels", "needs data"],
  ];

  return (
    <PageFrame
      eyebrow="Home > Pillars > Data, analytics & dashboards"
      title="Data, analytics & dashboards"
      description="البيانات والتحليلات"
      chips={[
        { label: "partially connected", tone: "primary" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href="/jazan-performance">
          Back to operating model
        </Link>
      }
      pageClassName="jazan-workspace-page jazan-delivery-page"
    >
      <TabNav items={pillarTabs} activeKey="data-analytics" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Scope & methodology</p>
            <h2>Governed data foundation</h2>
          </div>
        </div>
        <p>
          Build the governed data foundation every other pillar runs on - the platform, the governance, the models, a
          semantic layer that turns governed KPIs into consistent metrics, the predictive runtimes that score risk, and
          the visualisations on top.
        </p>
        <div className="jazan-method-chain compact" aria-label="Data analytics delivery method">
          {["Platform", "Govern", "Model", "Predict", "Semantic", "Visualise"].map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Pillar-level success measures</p>
            <h2>Connection status</h2>
          </div>
        </div>
        <div className="jazan-warning-metrics">
          <article className="jazan-warning-metric">
            <span>Sources unified</span>
            <strong>6 / 18</strong>
            <p>early-warning slice live</p>
          </article>
          <article className="jazan-warning-metric">
            <span>Data quality - connected</span>
            <strong>&gt; 90%</strong>
            <p>on the 6 live sources</p>
          </article>
          <article className="jazan-warning-metric">
            <span>Certified dashboard coverage</span>
            <strong>-</strong>
            <p>target &gt;90% - pending</p>
          </article>
          <article className="jazan-warning-metric">
            <span>Report timeliness</span>
            <strong>-</strong>
            <p>target &gt;95% - pending</p>
          </article>
          <article className="jazan-warning-metric">
            <span>Predictive runtimes connected</span>
            <strong>2 / 3</strong>
            <p>early-warning and anomaly live</p>
          </article>
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Architecture</p>
            <h2>Delivery components</h2>
          </div>
          <Link className="secondary-link" href="/jazan-performance/data-analytics-dashboards/delivery-components">
            View component detail
          </Link>
        </div>
        <div className="delivery-overview-list">
          {deliveryComponents.map((component) => {
            const href = componentHref(component);
            const content = (
              <>
                <div className="delivery-card-title">
                  <DeliveryIcon name={component.icon} size={17} />
                  <div>
                    <h3>{component.title}</h3>
                    <p>{component.description}</p>
                    <div className="delivery-tool-chip-row" aria-label={`${component.title} tools and standards`}>
                      {component.tools.map((tool) => (
                        <DeliveryToolChip label={tool} key={tool} />
                      ))}
                    </div>
                  </div>
                </div>
                <DeliveryStatusChip status={component.status} />
              </>
            );

            return href ? (
              <Link className="delivery-overview-item clickable" href={href} key={component.id}>
                {content}
              </Link>
            ) : (
              <article className="delivery-overview-item" key={component.id}>
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">AI and predictive runtimes</p>
            <h2>Model connections</h2>
          </div>
          <DeliveryIcon name="spark" size={18} className="section-icon" />
        </div>
        <div className="delivery-model-grid">
          {modelRuntimeConnections.map((model) => (
            <article className="delivery-model-card" key={model.title}>
              <header>
                <div className="delivery-card-title">
                  <DeliveryIcon name="spark" size={17} />
                  <h3>{model.title}</h3>
                </div>
                <DeliveryStatusChip status={model.status} />
              </header>
              <p>{model.description}</p>
              <div className="delivery-model-flow">
                <div>
                  <span>Inputs</span>
                  <p>{model.inputs.join(" | ")}</p>
                </div>
                <div>
                  <span>Outputs</span>
                  <p>{model.outputs.join(" | ")}</p>
                </div>
              </div>
              <strong>Owner: {model.owner}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Dependencies</p>
            <h2>Data sources & dependencies</h2>
          </div>
        </div>
        <div className="jazan-source-list">
          {dataSources.map(([schema, domain, description, status]) => (
            <div key={`${schema}-${domain}`}>
              <code>{schema}</code>
              <span>
                {domain} - {description}
              </span>
              <strong className={status === "needs data" ? "pending" : undefined}>{status}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section delivery-linked-usecase">
        <div>
          <p className="eyebrow">Linked use case - partially live</p>
          <h2>Performance data & dashboards</h2>
          <p>
            The platform, the predictive early-warning runtimes, and the dashboards feeding pillar 4 are running today.
            Full certified coverage across all domains, the AI recommendation layer, and the semantic layer light up as
            the remaining sources connect and pillar 2 publishes its KPI dictionary.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-link" href="/jazan-performance/municipal-project-early-warning">
            View the live pipeline
          </Link>
          <Link className="secondary-link" href="/jazan-performance/data-analytics-dashboards/delivery-components">
            View delivery components
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

export function PillarThreeDeliveryComponentsPage({
  backHref = "/jazan-performance/data-analytics-dashboards",
}: {
  backHref?: string;
}) {
  return (
    <PageFrame
      eyebrow="Pillars > Data, analytics & dashboards > Delivery components"
      title="Pillar 3 · five delivery components"
      description="مكونات تسليم البيانات والتحليلات ولوحات المتابعة"
      chips={[
        { label: "partially connected", tone: "primary" },
        { label: "Delivery detail", tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href={backHref}>
          Back to Pillar 3
        </Link>
      }
      pageClassName="jazan-workspace-page jazan-delivery-page"
    >
      <TabNav items={pillarTabs} activeKey="data-analytics" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Delivery architecture</p>
            <h2>How they stack</h2>
          </div>
          <DeliveryIcon name="bar-chart" size={18} className="section-icon" />
        </div>
        <div className="delivery-stack">
          <div className="delivery-stack-rows">
            {stackComponents.map((component) => (
              <article className="delivery-stack-row" key={component.id}>
                <div className="delivery-stack-title">
                  <DeliveryIcon name={component.icon} size={17} />
                  <span>{component.title}</span>
                </div>
                <DeliveryStatusChip status={component.status} />
              </article>
            ))}
            <article className="delivery-stack-row model-runtime">
              <div className="delivery-stack-title">
                <DeliveryIcon name="spark" size={17} />
                <span>AI models & predictive runtimes</span>
              </div>
              <DeliveryStatusChip status="partial" />
            </article>
          </div>
          <aside className="delivery-governance-spine">
            <DeliveryIcon name="shield" size={18} />
            <span>Data governance applies to all</span>
          </aside>
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">AI and runtime layer</p>
            <h2>Predictive model connections</h2>
          </div>
          <DeliveryIcon name="spark" size={18} className="section-icon" />
        </div>
        <div className="delivery-model-grid">
          {modelRuntimeConnections.map((model) => (
            <article className="delivery-model-card" key={model.title}>
              <header>
                <div className="delivery-card-title">
                  <DeliveryIcon name="spark" size={17} />
                  <h3>{model.title}</h3>
                </div>
                <DeliveryStatusChip status={model.status} />
              </header>
              <p>{model.description}</p>
              <div className="delivery-model-flow">
                <div>
                  <span>Inputs</span>
                  <p>{model.inputs.join(" | ")}</p>
                </div>
                <div>
                  <span>Outputs</span>
                  <p>{model.outputs.join(" | ")}</p>
                </div>
              </div>
              <strong>Owner: {model.owner}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="delivery-workstream-grid">
        {deliveryComponents.map((component) => {
          const href = componentHref(component);

          return (
          <article className={href ? "panel delivery-workstream-card clickable" : "panel delivery-workstream-card"} key={component.id}>
            <header>
              <div className="delivery-card-title">
                <DeliveryIcon name={component.icon} size={18} />
                <h2>{component.title}</h2>
              </div>
              <DeliveryStatusChip status={component.status} />
            </header>
            <p>{component.description}</p>

            <div className="delivery-chip-row">
              <span className="delivery-row-label">
                <DeliveryIcon name="package" size={14} />
                Delivers
              </span>
              <div>
                {component.delivers.map((item) => (
                  <span className="delivery-soft-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="delivery-chip-row">
              <span className="delivery-row-label">
                <DeliveryIcon name="wrench" size={14} />
                Tools
              </span>
              <div>
                {component.tools.map((tool) => (
                  <span className="delivery-soft-chip" key={tool}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <p className="delivery-note">{component.note}</p>
            {href ? (
              <Link className="secondary-link" href={href}>
                Open governance detail
              </Link>
            ) : null}
          </article>
          );
        })}
      </section>
    </PageFrame>
  );
}

function EarlyWarningWorkspacePage({ pillar }: { pillar: JazanPillar }) {
  return (
    <PageFrame
      eyebrow="Pillar 04"
      title="Municipal & project early warning"
      description="الإنذار المبكر للبلديات والمشاريع"
      chips={[
        { label: "Live - 6/6 sources", tone: "primary" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
        { label: "Demo visual values", tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance">
            Back to operating model
          </Link>
          <Link className="secondary-link" href="/jazan-performance/municipal-project-early-warning/municipalities/sabya">
            Open Sabya detail
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page jazan-early-warning-page"
    >
      <TabNav items={pillarTabs} activeKey="early-warning" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Scope & methodology</p>
            <h2>Municipality risk sensing layer</h2>
          </div>
        </div>
        <p>
          Detect performance, project, revenue, and service risks across all 25 municipalities before they become
          crises. Ingest from source systems, transform through governed analytics marts, score risk with forecasting
          and anomaly runtimes, and surface the result in the executive cockpit and corrective-action queue.
        </p>
        <div className="jazan-method-chain compact" aria-label="Early warning methodology">
          {earlyWarningMethodology.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Demo targets</p>
            <h2>Pillar-level success measures</h2>
          </div>
        </div>
        <div className="jazan-warning-metrics">
          {earlyWarningMetrics.map((metric) => (
            <article className="jazan-warning-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.note ? <p>{metric.note}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Operating outputs</p>
            <h2>Deliverables</h2>
          </div>
        </div>
        <div className="jazan-warning-deliverables">
          {earlyWarningDeliverables.map((item) => (
            <article className="jazan-warning-deliverable" key={item.title}>
              <span aria-hidden="true">{item.marker}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Risk cockpit</p>
            <h2>Municipality risk ranking</h2>
          </div>
          <Link className="secondary-link" href="/jazan-performance/municipal-project-early-warning/municipalities/sabya">
            View high-risk municipality
          </Link>
        </div>
        <div className="jazan-municipality-risk-grid">
          {municipalityRisks.map((municipality) => (
            <Link
              className={`jazan-municipality-risk-card ${municipality.status.replace(" ", "-")}`}
              href={`/jazan-performance/municipal-project-early-warning/municipalities/${municipality.slug}`}
              key={municipality.slug}
            >
              <div>
                <strong>{municipality.name}</strong>
                <span>{municipality.arabicName}</span>
              </div>
              <dl>
                <div>
                  <dt>Score</dt>
                  <dd>{municipality.score}%</dd>
                </div>
                <div>
                  <dt>Rank</dt>
                  <dd>{municipality.rank} / 25</dd>
                </div>
                <div>
                  <dt>Trend</dt>
                  <dd>{municipality.trend}</dd>
                </div>
              </dl>
              <span className={`jazan-status-chip ${municipality.status.replace(" ", "-")}`}>{municipality.status}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Integration contract</p>
            <h2>Data sources & dependencies</h2>
          </div>
        </div>
        <div className="jazan-source-list">
          {earlyWarningSources.map((source) => (
            <div key={source.table}>
              <code>{source.table}</code>
              <span>{source.description}</span>
              <strong>{source.status}</strong>
            </div>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}

function DecisionRhythmWorkspacePage({ pillar }: { pillar: JazanPillar }) {
  return (
    <PageFrame
      eyebrow="Pillar 05"
      title={pillar.title}
      description="إيقاع القرار والإجراءات التصحيحية"
      chips={[
        { label: "Demo data - seeded for proposal walkthrough", tone: "primary" },
        { label: `Primary KPI: ${pillar.primary_kpi.label}`, tone: "accent" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href="/jazan-performance">
          Back to operating model
        </Link>
      }
      pageClassName="jazan-workspace-page decision-rhythm-page"
    >
      <TabNav items={pillarTabs} activeKey={pillar.id} />

      <section className="panel jazan-workspace-section decision-loop-panel">
        <div className="decision-loop-band">
          <p className="eyebrow">Inputs - from Pillar 4</p>
          <div>
            {decisionInputs.map((input) => (
              <span className="decision-loop-chip" key={input}>{input}</span>
            ))}
          </div>
        </div>

        <div className="decision-flow-grid">
          {decisionFlow.map((step) => (
            <article className={step.active ? "active" : undefined} key={step.title}>
              <DeliveryIcon name={step.icon} size={20} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <span>Pillar 5</span>
            </article>
          ))}
        </div>

        <div className="decision-loop-two-col">
          <article>
            <p className="eyebrow">Review cadence</p>
            {reviewCadence.map(([title, text, note, icon]) => (
              <div className="decision-cadence-row" key={title}>
                <DeliveryIcon name={icon as DeliveryIconName} size={18} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <strong>{note}</strong>
                </div>
              </div>
            ))}
          </article>
          <article>
            <p className="eyebrow">Action lifecycle - 6 stages</p>
            <div className="decision-lifecycle-chips">
              {actionLifecycle.map((stage) => (
                <span key={stage}>{stage}</span>
              ))}
            </div>
            <p>
              Every stage is auditable: the decision log captures who acted, when, and what evidence supported the move.
              No action closes without a verified outcome against its expected KPI recovery.
            </p>
          </article>
        </div>

        <div className="decision-loop-band">
          <p className="eyebrow">Outputs - feedback</p>
          <div>
            <span className="decision-loop-chip">Pillar 1 - alignment status updated</span>
            <span className="decision-loop-chip">Pillar 4 - recommendation history enriched</span>
            <span className="decision-loop-chip">Pillar 6 - training need if pattern repeats</span>
          </div>
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Action loop - summary</p>
            <h2>Corrective-action control tower</h2>
          </div>
        </div>
        <div className="decision-summary-grid">
          {decisionSummary.map(([label, value, note, tone]) => (
            <article className={`decision-summary-card ${tone}`} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Review cadence - إيقاع المراجعات</p>
            <h2>Cadence picks the right altitude</h2>
          </div>
        </div>
        <div className="decision-cadence-cards">
          {reviewCadence.map(([title, text, note, icon]) => (
            <article key={title}>
              <DeliveryIcon name={icon as DeliveryIconName} size={19} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
                <strong>{note}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Corrective-action queue</p>
            <h2>Actions requiring movement</h2>
          </div>
        </div>
        <div className="jazan-table-wrap strategic-scroll-table">
          <table className="table jazan-data-table decision-action-table">
            <thead>
              <tr>{["Action", "Impacted", "Lifecycle", "Owner", "Ticket", "Due", "Esc."].map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {correctiveActionQueue.map((row) => (
                <tr className={row.selected ? "selected" : undefined} key={row.ticket}>
                  <td><strong>{row.action}</strong></td>
                  <td>{row.impacted}</td>
                  <td><StrategicStatusChip status={row.lifecycle.toLowerCase().replaceAll(" ", "_")} /></td>
                  <td>{row.owner}</td>
                  <td>{row.ticket}</td>
                  <td>{row.due}</td>
                  <td><StrategicStatusChip status={row.escalation.toLowerCase()} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel jazan-workspace-section decision-action-detail">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Selected action detail</p>
            <h2>{selectedDecisionAction.title}</h2>
            <p>{selectedDecisionAction.arabic}</p>
          </div>
          <StrategicStatusChip status="in_progress" />
        </div>

        <div className="decision-action-meta">
          {[
            ["Owner", selectedDecisionAction.owner],
            ["Supporting", selectedDecisionAction.supporting],
            ["Due", selectedDecisionAction.due],
            ["Escalation", selectedDecisionAction.escalation],
            ["Ticket", selectedDecisionAction.ticket],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="decision-lifecycle-line">
          {selectedDecisionAction.lifecycle.map(([stage, note, done]) => (
            <div className={done ? "done" : undefined} key={stage}>
              <span />
              <strong>{stage}</strong>
              <small>{note || "pending"}</small>
            </div>
          ))}
        </div>

        <div className="decision-detail-grid">
          <article>
            <p className="eyebrow">Model evidence - why this action was triggered</p>
            <div className="decision-evidence-grid">
              {selectedDecisionAction.evidence.map(([title, text, note]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <p>{text}</p>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </article>

          <article>
            <p className="eyebrow">Work execution - who's acting</p>
            <div className="decision-actors">
              {selectedDecisionAction.actors.map(([name, role, badge]) => (
                <div key={name}>
                  <strong>{name}</strong>
                  <span>{role}</span>
                  {badge ? <em>{badge}</em> : null}
                </div>
              ))}
            </div>
            <p className="strategic-helper-text">Last field update 8 hours ago - 2 service centers re-staffed, intake queue down 12%.</p>
          </article>
        </div>

        <div className="decision-detail-grid compact">
          <article>
            <p className="eyebrow">Expected outcome</p>
            <strong>{selectedDecisionAction.expectedOutcome}</strong>
          </article>
          <article>
            <p className="eyebrow">Decision log</p>
            <div className="decision-log-list">
              {selectedDecisionAction.decisionLog.map(([meta, text]) => (
                <div key={meta}>
                  <strong>{text}</strong>
                  <span>{meta}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </PageFrame>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pillar: pillarId } = await params;
  const pillar = await getPillar(pillarId);
  return {
    title: pillar ? `${pillar.title} - Jazan Performance` : "Jazan Performance Pillar",
  };
}

export default async function JazanPerformancePillarPage({ params, searchParams }: PageProps) {
  const { pillar: pillarId } = await params;
  const query = searchParams ? await searchParams : {};
  const pillar = await getPillar(pillarId);

  if (!pillar) {
    notFound();
  }

  if (pillar.id === "strategic-alignment-objective-cascade") {
    const apiData = await getStrategicAlignmentWorkspace();
    const demoEnabled = query.demo === "1" || process.env.NEXT_PUBLIC_JAZAN_DEMO_MODE === "true";
    const mode = hasStrategicAlignmentData(apiData) ? "live" : demoEnabled ? "demo" : "empty";
    const data = mode === "demo" ? demoStrategicAlignmentWorkspace : apiData;

    return <StrategicAlignmentCockpitPage pillar={pillar} data={data} mode={mode} />;
  }

  if (pillar.id === "data-analytics-dashboards") {
    return <PillarThreeOverviewPage pillar={pillar} />;
  }

  if (pillar.id === "municipal-project-early-warning") {
    return <EarlyWarningWorkspacePage pillar={pillar} />;
  }

  if (pillar.id === "decision-rhythm-corrective-actions") {
    return <DecisionRhythmWorkspacePage pillar={pillar} />;
  }

  return (
    <PageFrame
      eyebrow={`Pillar ${String(pillar.number).padStart(2, "0")}`}
      title={pillar.title}
      description={pillar.bullets.join(" | ")}
      chips={[
        { label: `Status: ${formatJazanStatus(pillar.status)}`, tone: "primary" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href="/jazan-performance">
          Back to operating model
        </Link>
      }
    >
      <TabNav items={pillarTabs} activeKey={pillar.id} />
      <section className="jazan-detail-grid">
        <article className="panel jazan-detail-panel">
          <h2>Pillar Scope</h2>
          <ul>
            {pillar.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>

        <article className="panel jazan-detail-panel">
          <h2>Use-Case Contract</h2>
          <dl>
            <div>
              <dt>Primary KPI</dt>
              <dd>{pillar.primary_kpi.label}</dd>
            </div>
            <div>
              <dt>KPI Value</dt>
              <dd>{formatJazanMetric(pillar.primary_kpi)}</dd>
            </div>
            <div>
              <dt>Open Risks</dt>
              <dd>{formatJazanRisks(pillar.open_risks)}</dd>
            </div>
            <div>
              <dt>Data Freshness</dt>
              <dd>{formatJazanFreshness(pillar.data_freshness)}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{pillar.route}</dd>
            </div>
          </dl>
        </article>

        <article className="panel jazan-detail-panel">
          <h2>Empty State</h2>
          <p>No data loaded</p>
        </article>
      </section>
    </PageFrame>
  );
}
