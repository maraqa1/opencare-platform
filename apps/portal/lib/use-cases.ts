export type UseCaseStatus = "active" | "coming_soon";

export type UseCaseModule = {
  id: string;
  slug: string;
  icon: string;
  name: string;
  description: string;
  status: UseCaseStatus;
  summary: string;
  kpis: Array<{ label: string; value: string; note: string }>;
};

export type DecisionItem = {
  urgency: string;
  tone: "critical" | "warning";
  ward: string;
  title: string;
  signal: string;
  decision: string;
  rationale: string;
  confidence: string;
  actions: string[];
};

export type ResolvedDecision = {
  title: string;
  date: string;
  outcome: string;
};

export const useCases: UseCaseModule[] = [
  {
    id: "bed_pressure",
    slug: "bed-pressure",
    icon: "Bed",
    name: "Bed Pressure Intelligence",
    description: "Real-time occupancy, breach forecasting, anomaly detection, and action tracking.",
    status: "active",
    summary: "3 critical wards, 87.3% average occupancy",
    kpis: [
      { label: "Current Occupancy", value: "87.3%", note: "Across live ward footprint" },
      { label: "7-Day Forecast", value: "3", note: "Breach risks predicted" },
      { label: "Active Anomalies", value: "5", note: "Actionable signals" },
    ],
  },
  {
    id: "staff_scheduling",
    slug: "staff-scheduling",
    icon: "Staff",
    name: "Staff Scheduling",
    description: "Roster pressure, skill mix, and escalation recommendations for safe staffing.",
    status: "coming_soon",
    summary: "Coming soon",
    kpis: [
      { label: "Roster Risk", value: "-", note: "Awaiting enablement" },
      { label: "Skill Mix", value: "-", note: "Awaiting data layer" },
      { label: "Escalations", value: "-", note: "Awaiting rules" },
    ],
  },
  {
    id: "patient_flow",
    slug: "patient-flow",
    icon: "Flow",
    name: "Patient Flow",
    description: "Admissions, discharges, transfer delays, and throughput bottlenecks.",
    status: "coming_soon",
    summary: "Coming soon",
    kpis: [
      { label: "Flow Risk", value: "-", note: "Awaiting enablement" },
      { label: "Transfer Delays", value: "-", note: "Awaiting data layer" },
      { label: "Actions", value: "-", note: "Awaiting rules" },
    ],
  },
];

export const bedPressureTabs = [
  { key: "overview", label: "Overview", href: "/use-cases/bed-pressure/overview" },
  { key: "status", label: "Current Status", href: "/use-cases/bed-pressure/status" },
  { key: "predictions", label: "Predictions", href: "/use-cases/bed-pressure/predictions" },
  { key: "analysis", label: "Analysis", href: "/use-cases/bed-pressure/analysis" },
  { key: "decisions", label: "Decisions", href: "/use-cases/bed-pressure/decisions" },
];

export const decisionQueue: DecisionItem[] = [
  {
    urgency: "URGENT",
    tone: "critical",
    ward: "ICU-01",
    title: "Expedite 3 discharges",
    signal: "Occupancy at 97.3%, breach in 14h",
    decision: "Discharge 3 patients to create buffer",
    rationale: "Admission rate is exceeding discharge by 4/day. Without intervention, occupancy reaches 100% by Wednesday.",
    confidence: "HIGH - MAPE 4.2%, 6/6 tests passing",
    actions: [
      "Notify discharge coordinator for Ward 4B",
      "Review 3 discharge-ready patients with consultant",
      "Arrange transport and pharmacy for same-day discharge",
    ],
  },
  {
    urgency: "HIGH",
    tone: "critical",
    ward: "Card-01",
    title: "Activate surge capacity",
    signal: "8 unplanned admissions in 24h against an average of 4",
    decision: "Open 4 surge beds in overflow area",
    rationale: "Admission rate is 2x normal while the ward is already at 93%.",
    confidence: "MEDIUM - admission spike confirmed, 42/42 tests passing",
    actions: [
      "Notify capacity manager",
      "Open Ward 4B overflow capacity",
      "Reassess admission criteria for elective cases",
    ],
  },
  {
    urgency: "MODERATE",
    tone: "warning",
    ward: "Surg-02",
    title: "Monitor and prepare",
    signal: "Rising trend across 5 consecutive days",
    decision: "No immediate action. Prepare contingency.",
    rationale: "Trajectory is rising but breach confidence remains low.",
    confidence: "LOW - watch state, 6/6 source freshness checks passing",
    actions: [
      "Review tomorrow's elective list for deferral options",
      "Brief night shift on rising occupancy",
    ],
  },
];

export const resolvedDecisions: ResolvedDecision[] = [
  {
    title: "Med-01: Discharge backlog cleared",
    date: "Apr 18",
    outcome: "Occupancy dropped 84% to 72% in 24h",
  },
  {
    title: "Ortho-01: Elective deferrals avoided breach",
    date: "Apr 16",
    outcome: "Predicted 92% never materialised",
  },
];
