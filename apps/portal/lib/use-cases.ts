export type UseCaseStatus = "active" | "coming_soon";

export type UseCaseModule = {
  id: string;
  slug: string;
  icon: string;
  name: string;
  description: string;
  status: UseCaseStatus;
  summary: string;
  defaultHref?: string;
  kpis: Array<{ label: string; value: string; note: string }>;
  shell: {
    label: string;
    title: string;
    badge: string;
    actionHref: string;
    actionLabel: string;
  };
};

export type UseCaseManifestEntry = {
  name?: string;
  description?: string;
  enabled?: boolean;
};

export function getManifestEnabledUseCaseIds(
  manifest: Record<string, UseCaseManifestEntry> = {},
): string[] | null {
  const entries = Object.entries(manifest);
  if (entries.length === 0) {
    return null;
  }

  return entries
    .filter(([, config]) => config?.enabled === true)
    .map(([useCaseId]) => useCaseId);
}

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

export const useCases: UseCaseModule[] = [
  {
    id: "bed_pressure",
    slug: "bed-pressure",
    icon: "Bed",
    name: "Bed Pressure Intelligence",
    description: "Real-time occupancy, breach forecasting, anomaly detection, and action tracking.",
    status: "active",
    summary: "3 critical wards, 87.3% average occupancy",
    defaultHref: "/use-cases/bed-pressure/status",
    kpis: [
      { label: "Current Occupancy", value: "87.3%", note: "Across live ward footprint" },
      { label: "7-Day Forecast", value: "3", note: "Breach risks predicted" },
      { label: "Active Anomalies", value: "5", note: "Actionable signals" },
    ],
    shell: {
      label: "Bed Pressure Intelligence",
      title: "Bed Pressure Workspace",
      badge: "Operations",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
  },
  {
    id: "revenue_cycle_management",
    slug: "revenue-cycle-management",
    icon: "Cash",
    name: "Revenue Cycle Management",
    description: "A hospital revenue operating system for cash control, recovery execution, and payer accountability.",
    status: "active",
    summary: "Real-time cash control workspace",
    defaultHref: "/use-cases/revenue-cycle-management/cash-command",
    kpis: [
      { label: "Recoverable Cash 7d", value: "Live", note: "From loaded recovery opportunities" },
      { label: "Payer Control", value: "Live", note: "Contract breaches and underpayment flags" },
      { label: "Execution Queue", value: "Live", note: "Owner-led recovery actions" },
    ],
    shell: {
      label: "Revenue Cycle Management",
      title: "Revenue Cycle Workspace",
      badge: "Revenue Ops",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
  },
  {
    id: "talemia_business_intelligence",
    slug: "talemia-business-intelligence",
    icon: "BI",
    name: "TALEMIA Business Intelligence",
    description: "Commercial pipeline, win/loss, account ownership, and opportunity drilldown with platform-governed KPI lineage.",
    status: "active",
    summary: "Commercial control tower for pipeline, wins/losses, ownership, and KPI governance.",
    defaultHref: "/use-cases/talemia-business-intelligence",
    kpis: [
      { label: "Dashboard Suite", value: "7", note: "Executive, financial, commercial, and drilldown tabs" },
      { label: "API Surface", value: "Live", note: "Commercial KPI and opportunity endpoints" },
      { label: "Governed Outputs", value: "Live", note: "dbt marts and dictionary-backed metrics" },
    ],
    shell: {
      label: "TALEMIA Business Intelligence",
      title: "TALEMIA Commercial Workspace",
      badge: "Commercial Ops",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
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
    shell: {
      label: "Staff Scheduling",
      title: "Staff Scheduling Workspace",
      badge: "Coming Soon",
      actionHref: "/admin/configuration",
      actionLabel: "Configuration",
    },
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
    shell: {
      label: "Patient Flow",
      title: "Patient Flow Workspace",
      badge: "Coming Soon",
      actionHref: "/admin/configuration",
      actionLabel: "Configuration",
    },
  },
];

export const bedPressureTabs = [
  { key: "overview", label: "Overview", href: "/use-cases/bed-pressure/overview" },
  { key: "status", label: "Current Status", href: "/use-cases/bed-pressure/status" },
  { key: "predictions", label: "Predictions", href: "/use-cases/bed-pressure/predictions" },
  { key: "analysis", label: "Analysis", href: "/use-cases/bed-pressure/analysis" },
  { key: "decisions", label: "Decisions", href: "/use-cases/bed-pressure/decisions" },
];

export const revenueCycleTabs = [
  { key: "cash-command", label: "Cash Command", href: "/use-cases/revenue-cycle-management/cash-command" },
  { key: "recovery-queue", label: "Recovery Queue", href: "/use-cases/revenue-cycle-management/recovery-queue" },
  { key: "payer-control", label: "Payer Control", href: "/use-cases/revenue-cycle-management/payer-control" },
  { key: "revenue-leakage", label: "Revenue Leakage", href: "/use-cases/revenue-cycle-management/revenue-leakage" },
  { key: "team-performance", label: "Team Performance", href: "/use-cases/revenue-cycle-management/team-performance" },
  { key: "executive-narrative", label: "Executive Narrative", href: "/use-cases/revenue-cycle-management/executive-narrative" },
];

export const talemiaTabs = [
  { key: "overview", label: "Overview", href: "/use-cases/talemia-business-intelligence" },
  { key: "executive", label: "Executive", href: "/use-cases/talemia-business-intelligence/executive" },
  { key: "financial", label: "Financial", href: "/use-cases/talemia-business-intelligence/financial" },
  { key: "business-lines", label: "Business Lines", href: "/use-cases/talemia-business-intelligence/business-lines" },
  { key: "account-managers", label: "Account Managers", href: "/use-cases/talemia-business-intelligence/account-managers" },
  { key: "commercial", label: "Commercial", href: "/use-cases/talemia-business-intelligence/commercial" },
  { key: "opportunities", label: "Opportunities", href: "/use-cases/talemia-business-intelligence/opportunities" },
];

export function filterVisibleUseCases(
  modules: UseCaseModule[],
  manifest: Record<string, UseCaseManifestEntry> = {},
) {
  const enabledIds = getManifestEnabledUseCaseIds(manifest);
  if (enabledIds === null) {
    return modules;
  }

  return modules.filter((module) => enabledIds.includes(module.id));
}

export function getFallbackUseCaseManifestEntries(): Record<string, UseCaseManifestEntry> {
  return Object.fromEntries(
    useCases.map((useCase) => [
      useCase.id,
      {
        name: useCase.name,
        description: useCase.description,
        enabled: useCase.status === "active",
      } satisfies UseCaseManifestEntry,
    ]),
  );
}

export function getUseCaseByPath(pathname: string): UseCaseModule | null {
  if (pathname.startsWith("/occupancy") || pathname.startsWith("/use-cases/bed-pressure")) {
    return useCases.find((item) => item.id === "bed_pressure") ?? null;
  }
  if (pathname.startsWith("/use-cases/revenue-cycle-management")) {
    return useCases.find((item) => item.id === "revenue_cycle_management") ?? null;
  }
  if (pathname.startsWith("/use-cases/talemia-business-intelligence")) {
    return useCases.find((item) => item.id === "talemia_business_intelligence") ?? null;
  }
  if (pathname.startsWith("/use-cases/staff-scheduling")) {
    return useCases.find((item) => item.id === "staff_scheduling") ?? null;
  }
  if (pathname.startsWith("/use-cases/patient-flow")) {
    return useCases.find((item) => item.id === "patient_flow") ?? null;
  }
  return null;
}

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
