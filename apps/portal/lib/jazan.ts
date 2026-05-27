export type JazanMetric = {
  label: string;
  value: string | number | null;
  unit?: string | null;
};

export type JazanPillar = {
  id: string;
  number: number;
  title: string;
  tone: "blue" | "teal" | "green" | "cyan" | "purple" | "orange";
  bullets: string[];
  primary_kpi: JazanMetric;
  status: "on-track" | "watch" | "at-risk" | "unavailable";
  open_risks: number | null;
  data_freshness: string | null;
  route: string;
};

export type JazanOverview = {
  region: string;
  platform: string;
  vision: string;
  stakeholders: Array<{ title: string; coverage: string[]; municipalities?: string[] }>;
  foundation_enablers: string[];
  governance: {
    top: string;
    description: string;
    boxes: string[];
  };
  success_measures: JazanMetric[];
};

export type JazanPillarsResponse = {
  pillars: JazanPillar[];
};

export const jazanPillars: JazanPillar[] = [
  {
    id: "strategic-alignment-objective-cascade",
    number: 1,
    title: "Strategic Alignment & Objective Cascade",
    tone: "blue",
    bullets: [
      "Vision 2030 / ministry / Amanah alignment",
      "Objective cascade to agencies and municipalities",
      "Initiative linkage to strategic outcomes",
      "Alignment matrix and coverage tracking",
    ],
    primary_kpi: { label: "Alignment coverage", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/strategic-alignment-objective-cascade",
  },
  {
    id: "kpi-performance-governance",
    number: 2,
    title: "KPI & Performance Governance",
    tone: "teal",
    bullets: [
      "KPI dictionary and formulas",
      "Baselines, targets, thresholds",
      "KPI owners and data owners",
      "Adaa-aligned performance scorecards",
    ],
    primary_kpi: { label: "KPI dictionary completeness", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/kpi-performance-governance",
  },
  {
    id: "data-analytics-dashboards",
    number: 3,
    title: "Data, Analytics & Dashboards",
    tone: "green",
    bullets: [
      "Unified performance data sources",
      "Executive and operational dashboards",
      "Strategic / monthly / quarterly reports",
      "Data quality, freshness, and lineage",
    ],
    primary_kpi: { label: "Certified dashboard coverage", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/data-analytics-dashboards",
  },
  {
    id: "municipal-project-early-warning",
    number: 4,
    title: "Municipal & Project Early Warning",
    tone: "cyan",
    bullets: [
      "Municipality risk ranking",
      "Project delay prediction",
      "Revenue decline warning",
      "Service and visual distortion alerts",
    ],
    primary_kpi: { label: "High-risk projects with action plans", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/municipal-project-early-warning",
  },
  {
    id: "decision-rhythm-corrective-actions",
    number: 5,
    title: "Decision Rhythm & Corrective Actions",
    tone: "purple",
    bullets: [
      "Weekly / monthly / quarterly reviews",
      "Deviation and root-cause analysis",
      "Corrective-action queue",
      "Escalation and decision log",
    ],
    primary_kpi: { label: "Corrective-action closure rate", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/decision-rhythm-corrective-actions",
  },
  {
    id: "quality-knowledge-transfer-sustainability",
    number: 6,
    title: "Quality, Knowledge Transfer & Sustainability",
    tone: "orange",
    bullets: [
      "Quality and excellence procedures",
      "Gap analysis and improvement plans",
      "Training and on-the-job coaching",
      "Handover and sustainability evidence",
    ],
    primary_kpi: { label: "Training completion", value: null, unit: null },
    status: "unavailable",
    open_risks: null,
    data_freshness: null,
    route: "/jazan-performance/quality-knowledge-transfer-sustainability",
  },
];

export const jazanOverview: JazanOverview = {
  region: "Jazan Region",
  platform: "Performance Management Platform",
  vision:
    "A unified performance management ecosystem that drives strategic alignment, data-driven decisions, accountability, and measurable impact for Jazan Region.",
  stakeholders: [
    { title: "Decision Makers", coverage: ["Mayor / Secretary", "Deputies", "Steering Committee"] },
    {
      title: "Performance Owners",
      coverage: ["Agency leaders", "Department heads", "KPI owners", "Initiative owners"],
    },
    {
      title: "Municipality Network",
      coverage: ["25 linked municipalities", "Municipality coordinators", "Field operations teams"],
    },
    {
      title: "Enablement Teams",
      coverage: ["PMO", "Data and analytics", "IT and digital", "Quality and excellence", "Finance and investment"],
    },
    {
      title: "External Interfaces",
      coverage: ["Ministry", "National entities", "Vendors and contractors", "Auditors and regulators"],
    },
  ],
  foundation_enablers: [
    "PMO & Governance",
    "Data Governance",
    "Change Management",
    "Communications",
    "Capability Building",
    "Risk & Compliance",
    "Smart Technology & Tools",
    "Integration & Security",
  ],
  governance: {
    top: "Steering Committee",
    description: "Strategic oversight and decisions",
    boxes: [
      "PMO / Performance Office",
      "Performance Owners",
      "Data & Analytics",
      "Municipality Coordinators",
      "Quality & Excellence",
    ],
  },
  success_measures: [
    { label: "KPI dictionary completeness", value: "100%" },
    { label: "Municipality scorecard coverage", value: "25 / 25" },
    { label: "Timely monthly reports", value: ">95%" },
    { label: "Data freshness SLA", value: ">90%" },
    { label: "High-risk projects with action plans", value: "100%" },
    { label: "Corrective-action closure rate", value: ">85%" },
    { label: "Training completion", value: ">90%" },
  ],
};

export const emptyJazanOverview: JazanOverview = jazanOverview;

export const emptyJazanPillarsResponse: JazanPillarsResponse = {
  pillars: jazanPillars,
};

export function formatJazanMetric(metric?: JazanMetric) {
  if (!metric || metric.value === null || metric.value === undefined || metric.value === "") {
    return "Needs data";
  }

  return metric.unit ? `${metric.value}${metric.unit}` : String(metric.value);
}

export function formatJazanStatus(status?: JazanPillar["status"]) {
  if (!status || status === "unavailable") {
    return "Needs data";
  }

  return status.replace("-", " ");
}

export function formatJazanFreshness(value?: string | null) {
  return value || "Not connected";
}

export function formatJazanRisks(value?: number | null) {
  return value === null || value === undefined ? "No data loaded" : String(value);
}
