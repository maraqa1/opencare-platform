import type {
  UseCaseRuntimeCatalogEntry,
  UseCaseTemplatePackage,
} from "@/components/admin/use-case-template-types";

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
  ctaLabel?: string;
  kpis: Array<{ label: string; value: string; note: string }>;
  runtimeCatalog?: UseCaseRuntimeCatalogEntry;
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

function importedUseCaseIcon(pkg: UseCaseTemplatePackage) {
  const source = pkg.name || pkg.slug || pkg.package_id;
  const letters = source
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "UC";
}

function firstMeaningfulText(values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value && value.trim())) ?? null;
}

function importedUseCaseSummary(pkg: UseCaseTemplatePackage) {
  const preview = pkg.preview_summary;
  const personas = preview?.business_summary?.personas ?? [];
  const decisions = preview?.business_summary?.decisions ?? [];
  const kpis = preview?.business_summary?.kpis ?? [];

  return (
    firstMeaningfulText([
      preview?.business_summary?.problem,
      decisions.length > 0 ? `Supports ${decisions[0]}.` : null,
      kpis.length > 0 ? `Tracks ${kpis.slice(0, 2).join(" and ")}.` : null,
      personas.length > 0 ? `Designed for ${personas.slice(0, 2).join(" and ")}.` : null,
      pkg.domain,
    ]) ??
    "Imported use case activated in the OpenCare runtime."
  );
}

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
    return modules.filter((module) => module.status === "active");
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

  const slugMatch = useCases.find((item) => pathname.startsWith(`/use-cases/${item.slug}`));
  if (slugMatch) {
    return slugMatch;
  }
  return null;
}

export function projectImportedPackagesToUseCases(
  packages: UseCaseTemplatePackage[],
): UseCaseModule[] {
  return packages
    .filter((pkg) => pkg.enabled === true && pkg.status !== "uninstalled")
    .map((pkg) => {
      const adminHref = `/admin/use-case-templates/${encodeURIComponent(pkg.id ?? pkg.package_id)}`;
      const preview = pkg.preview_summary;
      const runtime = pkg.runtime_catalog_entry;
      const importedWorkspaceHref = `/use-cases/imported/${encodeURIComponent(pkg.id ?? pkg.package_id)}`;
      const routeHref =
        runtime?.default_tab_route ??
        (preview?.install_impact?.full_runtime_supported
          ? preview?.route_to_be_added ?? importedWorkspaceHref
          : importedWorkspaceHref);
      const personas = preview?.business_summary?.personas ?? [];
      const businessKpis = (preview?.business_summary?.kpis ?? []).slice(0, 3);
      const decisions = (preview?.business_summary?.decisions ?? []).slice(0, 2);
      const routeLabel =
        runtime?.default_tab_route?.split("/").filter(Boolean).pop() ??
        preview?.route_to_be_added?.split("/").filter(Boolean).pop();
      const summary =
        firstMeaningfulText([
          runtime?.description,
          importedUseCaseSummary(pkg),
          runtime?.domain,
        ]) ?? importedUseCaseSummary(pkg);
      const runtimeTabs = runtime?.tabs ?? [];
      const runtimeKpis =
        businessKpis.length > 0
          ? businessKpis.map((kpi) => ({
              label: kpi,
              value: "Defined",
              note: runtime?.domain ?? pkg.domain ?? "Runtime contract",
            }))
          : [
              {
                label: "Tabs",
                value: String(runtimeTabs.length || 1),
                note: "Persisted workspace navigation",
              },
              {
                label: "Widgets",
                value: String(runtime?.widget_count ?? 0),
                note: "Compiled dashboard model",
              },
              {
                label: "Trust",
                value:
                  runtime?.live_verification_status === "live_verified"
                    ? "Verified"
                    : runtime?.live_verification_status === "degraded"
                      ? "Degraded"
                      : "Active",
                note: "Runtime verification state",
              },
            ];

      return {
        id: `imported:${pkg.package_id}`,
        slug: pkg.slug,
        icon: importedUseCaseIcon(pkg),
        name: pkg.name,
        description:
          firstMeaningfulText([
            runtime?.description,
            preview?.business_summary?.problem,
            personas.length > 0 ? `Designed for ${personas.join(", ")}.` : null,
            pkg.domain,
          ]) ?? "Runtime-promoted use case available in the OpenCare portal.",
        status: "active",
        summary,
        defaultHref: routeHref,
        ctaLabel: `Open ${pkg.name} Workspace`,
        kpis: runtimeKpis,
        runtimeCatalog: runtime,
        shell: {
          label: runtime?.domain ?? pkg.domain ?? pkg.name,
          title: runtime?.name ?? pkg.name,
          badge:
            runtime?.live_verification_status === "live_verified"
              ? "Trusted Runtime"
              : runtime?.activation_status === "active"
                ? "Runtime Active"
                : runtime?.domain ?? pkg.domain ?? "Imported",
          actionHref: adminHref,
          actionLabel: "Use Case Admin",
        },
      } satisfies UseCaseModule;
    });
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
