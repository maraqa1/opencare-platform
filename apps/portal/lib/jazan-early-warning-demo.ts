export type EarlyWarningMetric = {
  label: string;
  value: string;
  note?: string;
  tone?: "normal" | "warning" | "critical";
};

export type EarlyWarningDeliverable = {
  title: string;
  description: string;
  marker: string;
};

export type EarlyWarningSource = {
  table: string;
  description: string;
  status: string;
};

export type MunicipalityRisk = {
  slug: string;
  name: string;
  arabicName: string;
  rank: number;
  score: number;
  status: "watch" | "high risk" | "on track";
  trend: string;
  openActions: number;
};

export type SabyaRiskDriver = {
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium";
  href?: string;
};

export type SabyaKpi = {
  label: string;
  value: string;
  status: "at risk" | "watch" | "on track";
};

export type ProjectMetric = {
  label: string;
  value: string;
  note: string;
  tone?: "normal" | "warning" | "critical";
};

export type ProjectTask = {
  name: string;
  start: number;
  width: number;
  status: "planned" | "complete" | "in-progress" | "overrun" | "forecast";
};

export type ProjectComment = {
  text: string;
  source: string;
};

export type ProjectRecommendation = {
  title: string;
  description: string;
  confidence: "high confidence" | "medium confidence";
};

export type ProjectDemo = {
  slug: string;
  title: string;
  subtitle: string;
  municipality: string;
  status: "delayed";
  risk: "high risk";
  metrics: ProjectMetric[];
  tasks: ProjectTask[];
  metadata: Array<[string, string]>;
  comments: ProjectComment[];
  recommendations: ProjectRecommendation[];
};

export const earlyWarningMethodology = ["Ingest", "Transform", "Score", "Surface", "Act"];

export const earlyWarningMetrics: EarlyWarningMetric[] = [
  { label: "Municipalities covered", value: "25 / 25" },
  { label: "High-risk projects with action plans", value: "100% target" },
  { label: "Data freshness SLA", value: "> 90%" },
  { label: "Mean time to detect", value: "< 24h" },
];

export const earlyWarningDeliverables: EarlyWarningDeliverable[] = [
  { title: "Executive cockpit", description: "RAG scorecards - 25 municipalities", marker: "grid" },
  { title: "Project delay forecast", description: "R runtime - output table", marker: "trend" },
  { title: "Performance anomaly", description: "R runtime - z-score detection", marker: "alert" },
  { title: "Municipality risk score", description: "weighted composite", marker: "shield" },
  { title: "Action triggers", description: "auto-create on threshold", marker: "bolt" },
  { title: "Monthly review pack", description: "exportable evidence", marker: "doc" },
];

export const earlyWarningSources: EarlyWarningSource[] = [
  { table: "source_jazan.kpi_results", description: "KPI results per municipality", status: "loaded - 8m ago" },
  { table: "source_jazan.project_milestones", description: "project schedule + actuals", status: "loaded - 8m ago" },
  { table: "source_jazan.service_requests", description: "service backlog & SLA", status: "loaded - 8m ago" },
  { table: "source_jazan.revenue_collections", description: "quarterly collections vs target", status: "loaded - 8m ago" },
  { table: "source_jazan.visual_distortion_cases", description: "visual distortion - open cases", status: "loaded - 8m ago" },
  { table: "source_jazan.municipalities", description: "reference - 25 municipalities", status: "loaded - 8m ago" },
];

export const municipalityRisks: MunicipalityRisk[] = [
  { slug: "jazan", name: "Jazan", arabicName: "بلدية جازان", rank: 4, score: 82, status: "on track", trend: "+3pp", openActions: 0 },
  { slug: "abu-arish", name: "Abu Arish", arabicName: "بلدية أبو عريش", rank: 8, score: 76, status: "watch", trend: "-4pp", openActions: 1 },
  { slug: "sabya", name: "Sabya", arabicName: "بلدية صبيا", rank: 22, score: 68, status: "high risk", trend: "-14pp", openActions: 1 },
  { slug: "samtah", name: "Samtah", arabicName: "بلدية صامطة", rank: 18, score: 71, status: "watch", trend: "-8pp", openActions: 2 },
  { slug: "farasan", name: "Farasan", arabicName: "بلدية فرسان", rank: 11, score: 74, status: "watch", trend: "-5pp", openActions: 1 },
  { slug: "al-ardah", name: "Al Ardah", arabicName: "بلدية العارضة", rank: 16, score: 72, status: "watch", trend: "-6pp", openActions: 1 },
];

export const sabyaTrend = [
  { month: "Dec", score: 82 },
  { month: "Jan", score: 81 },
  { month: "Feb", score: 78 },
  { month: "Mar", score: 75 },
  { month: "Apr", score: 71 },
  { month: "May", score: 68 },
];

export const sabyaDrivers: SabyaRiskDriver[] = [
  { title: "Performance anomaly", detail: "composite -14pp / 90 days - z = -2.4", severity: "critical" },
  {
    title: "Project delay",
    detail: "road resurfacing phase 2 - 42 days late",
    severity: "high",
    href: "/jazan-performance/municipal-project-early-warning/projects/sabya-road-resurfacing-phase-2",
  },
  { title: "Revenue decline", detail: "Q3 collections -8% vs target", severity: "medium" },
  { title: "Service backlog", detail: "open requests +18% month on month", severity: "medium" },
];

export const sabyaKpis: SabyaKpi[] = [
  { label: "Project completion on time", value: "61% / 85%", status: "at risk" },
  { label: "Service request SLA met", value: "74% / 90%", status: "watch" },
  { label: "Revenue collection rate", value: "79% / 90%", status: "watch" },
  { label: "Visual distortion closed", value: "70% / 85%", status: "watch" },
  { label: "Infrastructure uptime", value: "86% / 80%", status: "on track" },
];

export const projectDemos: ProjectDemo[] = [
  {
    slug: "sabya-road-resurfacing-phase-2",
    title: "Sabya road resurfacing - phase 2",
    subtitle: "LZN-SAB-RR-02",
    municipality: "Sabya",
    status: "delayed",
    risk: "high risk",
    metrics: [
      { label: "Physical progress", value: "58%", note: "vs 75% planned" },
      { label: "Schedule slip", value: "42 days", note: "+14 vs last month", tone: "critical" },
      { label: "Budget used", value: "65%", note: "SAR 8.1M / 12.4M" },
      { label: "Forecast completion", value: "11 Jul", note: "planned 30 May", tone: "warning" },
    ],
    tasks: [
      { name: "Mobilization", start: 4, width: 10, status: "complete" },
      { name: "Site clearing", start: 14, width: 10, status: "complete" },
      { name: "Sub-base prep", start: 24, width: 14, status: "complete" },
      { name: "Asphalt laying", start: 39, width: 34, status: "overrun" },
      { name: "Line marking", start: 75, width: 7, status: "forecast" },
      { name: "Handover", start: 86, width: 6, status: "forecast" },
    ],
    metadata: [
      ["Sector", "Roads & infrastructure"],
      ["Contractor", "Al-Marwan Contracting"],
      ["Owner", "Eng. K. Al-Najmi"],
      ["Budget", "SAR 12.4M"],
      ["Start date", "1 Dec 2025"],
      ["Planned end", "30 May 2026"],
      ["Forecast end", "11 Jul 2026"],
    ],
    comments: [
      { text: "Asphalt supplier confirmed delivery slipped to next week - port congestion at Jazan.", source: "Eng. K. Al-Najmi - 2 days ago" },
      { text: "Sub-grade moisture above spec on segment 3; remediation adds about a week.", source: "Site inspector - 5 days ago" },
      { text: "Phase 2 flagged amber - milestone variance over 20%.", source: "PMO - 1 week ago" },
      { text: "Contractor requested a 30-day extension; under review.", source: "Contracts office - 2 weeks ago" },
    ],
    recommendations: [
      {
        title: "Escalate to the steering committee now, not at the next monthly review.",
        description:
          "Across 14 comparable resurfacing projects, those that slipped past the 50% milestone finished 58 days late on average.",
        confidence: "high confidence",
      },
      {
        title: "Pre-order phase 5 line-marking materials this week.",
        description:
          "Material-supply delays drove 6 of the last 9 road-project slips in Jazan; ordering now protects the next phase from a second delay.",
        confidence: "high confidence",
      },
      {
        title: "Run line marking in parallel with the final asphalt segments.",
        description:
          "Projects that parallelized phases 4 and 5 recovered about 12 days on average without added cost.",
        confidence: "medium confidence",
      },
    ],
  },
];
