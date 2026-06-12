import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";

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
): string[] {
  const entries = Object.entries(manifest);
  if (entries.length === 0) {
    return [];
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
    id: "jazan_strategy_kpi_governance",
    slug: "jazan-strategy-kpi-governance",
    icon: "KPI",
    name: "Strategy & KPI Governance",
    description: "Govern strategic objectives, KPI definitions, ownership, targets, evidence, and performance score roll-up for Jazan Municipality.",
    status: "active",
    summary: "Objective cascade, KPI dictionary, accountability, thresholds, and audit evidence.",
    defaultHref: "/#kpi-governance-diagram",
    ctaLabel: "Open KPI Governance",
    kpis: [
      { label: "Objective Cascade", value: "Vision -> Municipality", note: "Parent alignment and weighted roll-up" },
      { label: "KPI Dictionary", value: "Governed", note: "Formula, owner, source, frequency, and thresholds" },
      { label: "Evidence", value: "Required", note: "Freshness, lineage, source, and audit trail" },
    ],
    shell: {
      label: "Jazan KPI Governance",
      title: "Strategy & KPI Governance",
      badge: "Governance",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
  },
  {
    id: "jazan_performance_early_warning",
    slug: "jazan-performance-early-warning",
    icon: "Risk",
    name: "Performance Early Warning",
    description: "Detect delays, anomalies, and performance risks across municipal initiatives before they become executive escalations.",
    status: "active",
    summary: "Data pipeline, risk heatmap, executive cockpit, corrective action, and review loop.",
    defaultHref: "/#early-warning-diagram",
    ctaLabel: "Open Early Warning",
    kpis: [
      { label: "Risk Signals", value: "Watch / At risk", note: "Delay forecasts, anomalies, and thresholds" },
      { label: "Corrective Action", value: "Owner-led", note: "Root cause, owner, escalation, and closure" },
      { label: "Review Rhythm", value: "Monthly", note: "Leadership packs and decisions" },
    ],
    shell: {
      label: "Jazan Early Warning",
      title: "Performance Early Warning",
      badge: "Risk & Response",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
  },
  {
    id: "jazan_executive_cockpit",
    slug: "jazan-executive-cockpit",
    icon: "Exec",
    name: "Executive Performance Cockpit",
    description: "Give Jazan leadership a unified cockpit for performance score, risks, corrective actions, and evidence-backed decisions.",
    status: "active",
    summary: "Leadership-ready view of scorecards, risks, decisions, operating rhythm, and target outcomes.",
    defaultHref: "/",
    ctaLabel: "Open Cockpit",
    kpis: [
      { label: "Success Measures", value: "5", note: "Strategic KPIs, timeliness, quality, on-track rate, satisfaction" },
      { label: "Operating Rhythm", value: "Weekly -> Annual", note: "Monitor, review, analyze, improve" },
      { label: "Target Outcomes", value: "5", note: "Alignment, decisions, accountability, excellence, citizen impact" },
    ],
    shell: {
      label: "Jazan Executive Cockpit",
      title: "Executive Performance Cockpit",
      badge: "Leadership",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    },
  },
  {
    id: "data_ai_capability_diagnostic",
    slug: "data-ai-capability-diagnostic",
    icon: "AI",
    name: "Data & AI Capability Diagnostic",
    description:
      "Module 01 of the DMO Establishment pathway: capture maturity evidence, score gaps, apply the Gartner lens, and generate executive diagnostic reports.",
    status: "active",
    summary:
      "First embedded DMO module for data capture, maturity scoring, gap prioritisation, AI readiness narrative, and evidence-backed planning.",
    defaultHref: "/use-cases/data-ai-capability-diagnostic",
    ctaLabel: "Open Diagnostic Tool",
    kpis: [
      { label: "Workbook Questions", value: "84", note: "Across 13 data and AI maturity domains" },
      { label: "Target Score", value: "4 / 4", note: "Evidence-backed maturity target per question" },
      { label: "AI Report", value: "Draft", note: "Executive narrative generated from captured inputs" },
    ],
    shell: {
      label: "Data & AI Assessment",
      title: "Capability Diagnostic",
      badge: "Assessment",
      actionHref: "/use-cases/data-ai-capability-diagnostic",
      actionLabel: "Open Tool",
    },
  },
  {
    id: "data_management_office_establishment",
    slug: "data-management-office-establishment",
    icon: "DMO",
    name: "Data Management Office Establishment",
    description:
      "The parent Yottalogica advisory use case for establishing an operational Data Management Office, embedding diagnostic, slide, control, operating, and P1 accreditation modules.",
    status: "active",
    summary:
      "Executive landing, consulting-grade slides, vertical establishment modules, embedded diagnostic, control traceability, and P1 accreditation readiness.",
    defaultHref: "/use-cases/data-management-office-establishment",
    ctaLabel: "Open DMO Landing Page",
    kpis: [
      { label: "NDMO Controls", value: "152", note: "Mapped to advisory deliverables and evidence" },
      { label: "P1 Controls", value: "68", note: "Addressed through the establishment pathway" },
      { label: "Certification Path", value: "90 days", note: "From diagnostic to P1 readiness" },
    ],
    shell: {
      label: "Yottalogica Advisory",
      title: "DMO Establishment",
      badge: "NDMO P1",
      actionHref: "/use-cases/data-management-office-establishment",
      actionLabel: "Open Landing",
    },
  },
  {
    id: "jazan_urban_service_quality_visual_distortion_loop",
    slug: "urban-service-quality-visual-distortion-loop",
    icon: "Loop",
    name: "Urban Service Quality & Visual Distortion Loop",
    description:
      "A native Jazan shell connecting KPI contracts, runtime evidence, decision workflow, outcome recovery, and governance proof.",
    status: "active",
    summary:
      "Strategic landing, KPI contract, runtime intelligence, decision queue, outcome recovery, and governance evidence in one governed shell.",
    defaultHref: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop?demo=1",
    ctaLabel: "Open Urban Service Loop",
    kpis: [
      { label: "Closure Quality", value: ">= 90%", note: "Visual-distortion complaint closure target" },
      { label: "Breach Forecast", value: "4-week horizon", note: "Runtime evidence and risk scoring" },
      { label: "Governance Proof", value: "Required", note: "Lineage, record spec, audit, and evidence pack" },
    ],
    shell: {
      label: "Jazan Use Case",
      title: "Urban Service Quality Loop",
      badge: "Golden Shell",
      actionHref: "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/governance-evidence?demo=1",
      actionLabel: "Evidence",
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
  if (pathname === "/") {
    return useCases.find((item) => item.id === "jazan_executive_cockpit") ?? null;
  }

  if (pathname.startsWith("/occupancy") || pathname.startsWith("/use-cases/bed-pressure")) {
    return useCases.find((item) => item.id === "bed_pressure") ?? null;
  }

  if (pathname.startsWith("/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop")) {
    return (
      useCases.find((item) => item.id === "jazan_urban_service_quality_visual_distortion_loop") ?? null
    );
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
      const importedWorkspaceHref = `/use-cases/imported/${encodeURIComponent(pkg.id ?? pkg.package_id)}`;
      const routeHref = preview?.install_impact?.full_runtime_supported
        ? preview?.route_to_be_added ?? importedWorkspaceHref
        : importedWorkspaceHref;
      const kpis = (preview?.business_summary?.kpis ?? []).slice(0, 3);

      return {
        id: `imported:${pkg.package_id}`,
        slug: pkg.slug,
        icon: "Pkg",
        name: pkg.name,
        description:
          preview?.business_summary?.problem ??
          pkg.domain ??
          "Imported use-case package activated in the OpenCare portal.",
        status: "active",
        summary:
          pkg.domain ??
          "Imported use-case package awaiting deeper runtime materialization.",
        defaultHref: routeHref,
        ctaLabel: "Open Imported Workspace",
        kpis:
          kpis.length > 0
            ? kpis.map((kpi) => ({
                label: kpi,
                value: "Defined",
                note: "Imported package contract",
              }))
            : [
                { label: "Package Status", value: "Active", note: "Visible in portal" },
                { label: "Version", value: pkg.version, note: "Imported package version" },
                {
                  label: "Runtime Mode",
                  value: preview?.install_impact?.full_runtime_supported ? "Supported" : "Imported",
                  note: preview?.install_impact?.full_runtime_supported
                    ? "Eligible for deeper materialization"
                    : "Review in admin for next steps",
                },
              ],
        shell: {
          label: pkg.name,
          title: `${pkg.name} Imported Package`,
          badge: "Imported",
          actionHref: adminHref,
          actionLabel: "Template Admin",
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
