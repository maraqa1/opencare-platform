import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

const baseRoute = "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop";

export const metadata: Metadata = {
  title: "Urban Service Quality & Visual Distortion Loop",
  description:
    "Jazan dashboard-rigid shell spanning strategic monitoring, KPI workspace, case intelligence, decisions, runtimes, and audit.",
};

type PageProps = {
  params: Promise<{ screen?: string[] }>;
  searchParams?: Promise<{ demo?: string; decision?: string; selected?: string }>;
};

type CaseTab = "overview" | "intelligence" | "decisions" | "recovery";

type Metric = {
  label: string;
  value: string;
  note?: string;
};

type KpiCard = {
  slug: string;
  short_label: string;
  name: string;
  status: string;
  status_tone: string;
  current_value: string;
  target_value: string;
  delta: string;
  owner: string;
  cadence: string;
  trigger: string;
  href: string;
};

type RankingRow = {
  municipality: string;
  current: string;
  target: string;
  risk_score: string;
  breach_probability: string;
  status: string;
  case_id: string;
};

type TrendPoint = {
  label: string;
  actual?: number;
  forecast?: number;
  target: number;
};

type OpenCase = {
  case_id: string;
  municipality: string;
  reason: string;
  owner: string;
  href: string;
};

type GovernanceChip = {
  label: string;
  value: string;
};

type KpiWorkspace = {
  slug: string;
  short_label: string;
  name: string;
  current_value: string;
  target_value: string;
  status: string;
  status_tone: string;
  delta: string;
  owner: string;
  cadence: string;
  trigger: string;
  summary_strip: Metric[];
  municipality_ranking: RankingRow[];
  trend: TrendPoint[];
  open_cases: OpenCase[];
  governance: GovernanceChip[];
};

type FeatureContribution = {
  label: string;
  value: string;
};

type RankedAction = {
  title: string;
  impact: string;
  note: string;
};

type EvidenceItem = {
  label: string;
  value: string;
};

type ActionButton = {
  id: string;
  label: string;
  tone: string;
  note?: string;
};

type CaseWorkspace = {
  case_id: string;
  kpi_slug: string;
  kpi_name: string;
  municipality: string;
  status: string;
  owner: string;
  due_date: string;
  risk_score: string;
  breach_probability: string;
  current_value: string;
  target_value: string;
  rationale: string;
  overview_metrics: Metric[];
  intelligence: {
    feature_contributions: FeatureContribution[];
    trend: TrendPoint[];
    ranked_actions: RankedAction[];
    outputs: string[];
  };
  decisions: {
    recommended_actions: string[];
    evidence_pack: EvidenceItem[];
    action_buttons: ActionButton[];
    human_authorisation_note: string;
  };
  recovery: {
    baseline: string;
    target: string;
    after_30_days: string;
    forecast_accuracy: string;
    intervention_effectiveness: string;
    learning_pillars: string[];
  };
};

type DecisionQueueRow = {
  decision_id: string;
  municipality: string;
  kpi: string;
  risk_score: string;
  breach_probability: string;
  recommendation: string;
  owner: string;
  status: string;
  due_date: string;
};

type RuntimeCard = {
  runtime_id: string;
  name: string;
  status: string;
  last_run: string;
  duration: string;
  rows_out: string;
  next_run: string;
  image: string;
  inputs: string[];
  outputs: string[];
};

type AuditAction = {
  time: string;
  actor: string;
  action: string;
  channel: string;
  result: string;
};

type EmailLog = {
  recipient: string;
  template: string;
  status: string;
  sent_at: string;
};

type TicketLog = {
  system: string;
  ticket_id: string;
  priority: string;
  status: string;
  linked_case: string;
};

type CorrectiveAction = {
  action_id: string;
  decision_id: string;
  action_plan: string;
  owner: string;
  status: string;
  due_in: string;
  evidence_status: string;
  next_step: string;
};

type DatasetRow = {
  asset: string;
  classification: string;
  owner: string;
  freshness: string;
  lineage: string;
};

type EvidencePack = {
  name: string;
  contents: string;
};

type ShellData = {
  meta: {
    use_case: string;
    mode: string;
    connected: boolean;
    source: string;
    message: string;
  };
  navigation: {
    base_route: string;
    default_kpi_slug: string;
    default_case_id: string;
    supported_tabs: string[];
  };
  purpose: {
    eyebrow: string;
    title: string;
    description: string;
  };
  strategic_dashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    objective_context: string[];
    summary_strip: Metric[];
    golden_thread: string[];
    kpi_cards: KpiCard[];
    active_case_banner: {
      case_id: string;
      municipality: string;
      kpi: string;
      risk_score: string;
      breach_probability: string;
      summary: string;
      href: string;
    };
  };
  kpi_workspaces: KpiWorkspace[];
  case_workspaces: CaseWorkspace[];
  decision_command: {
    counters: Metric[];
    queue: DecisionQueueRow[];
    selected_case_id: string;
    action_buttons: ActionButton[];
    human_authorisation_note: string;
  };
  runtime_evidence: {
    status: string;
    seed_note: string;
    runtime_cards: RuntimeCard[];
    execution_history: Array<{ runtime: string; started_at: string; status: string; duration: string }>;
    lineage_flow: string[];
    evidence_note: string;
  };
  decision_action_audit: {
    counters: Metric[];
    queue: DecisionQueueRow[];
    action_history: AuditAction[];
    email_log: EmailLog[];
    ticket_log: TicketLog[];
    corrective_actions: CorrectiveAction[];
    audit_note: string;
  };
  governance_evidence: {
    lineage_flow: string[];
    datasets: DatasetRow[];
    quality_checks: string[];
    evidence_packs: EvidencePack[];
  };
};

type RouteState =
  | { kind: "strategic" }
  | { kind: "kpi"; kpiSlug: string }
  | { kind: "case"; kpiSlug: string; caseId: string; tab: CaseTab }
  | { kind: "decisions" }
  | { kind: "runtimes" }
  | { kind: "audit" };

const fallbackShellData: ShellData = {
  meta: {
    use_case: "jazan_urban_service_quality_visual_distortion_loop",
    mode: "seeded",
    connected: false,
    source: "page_fallback",
    message: "Fallback seeded shell data is being used because the backend payload was unavailable.",
  },
  navigation: {
    base_route: baseRoute,
    default_kpi_slug: "visual-distortion-closure-quality",
    default_case_id: "JZN-DEC-1007",
    supported_tabs: ["overview", "intelligence", "decisions", "recovery"],
  },
  purpose: {
    eyebrow: "Jazan Performance Management",
    title: "Urban Service Quality & Visual Distortion Loop",
    description:
      "Fallback shell preserving the six-dashboard story while seeded platform data is being recovered.",
  },
  strategic_dashboard: {
    eyebrow: "01 Strategic objective cascade",
    title: "Sustain and improve municipal service quality and visual distortion response",
    subtitle: "Fallback strategic surface",
    objective_context: ["Vision 2030 Quality of Life", "MOMRAH municipal index", "25 municipalities"],
    summary_strip: [
      { label: "Meeting target", value: "5" },
      { label: "Approaching trigger", value: "1" },
      { label: "In breach", value: "1" },
      { label: "Decision candidates", value: "4" },
    ],
    golden_thread: [
      "Strategic objective",
      "KPI contract",
      "Certified data",
      "Predict and recommend",
      "Human-authorised action",
      "Audit and learn",
    ],
    kpi_cards: [
      {
        slug: "visual-distortion-closure-quality",
        short_label: "KPI 1",
        name: "Visual distortion closure quality",
        status: "In breach",
        status_tone: "critical",
        current_value: "0.71",
        target_value: "0.85",
        delta: "-0.14 below",
        owner: "Field Compliance",
        cadence: "Monthly",
        trigger: "Forecast risk 0.78",
        href: `${baseRoute}/kpi/visual-distortion-closure-quality?demo=1`,
      },
    ],
    active_case_banner: {
      case_id: "JZN-DEC-1007",
      municipality: "Sabya",
      kpi: "Visual distortion closure quality",
      risk_score: "84 / 100",
      breach_probability: "0.78",
      summary: "Fallback active case",
      href: `${baseRoute}/kpi/visual-distortion-closure-quality/case/JZN-DEC-1007/overview?demo=1`,
    },
  },
  kpi_workspaces: [],
  case_workspaces: [],
  decision_command: {
    counters: [],
    queue: [],
    selected_case_id: "JZN-DEC-1007",
    action_buttons: [],
    human_authorisation_note: "All external actions remain human authorised.",
  },
  runtime_evidence: {
    status: "Unavailable",
    seed_note: "Fallback",
    runtime_cards: [],
    execution_history: [],
    lineage_flow: [],
    evidence_note: "Runtime evidence fallback",
  },
  decision_action_audit: {
    counters: [],
    queue: [],
    action_history: [],
    email_log: [],
    ticket_log: [],
    corrective_actions: [],
    audit_note: "Audit fallback",
  },
  governance_evidence: {
    lineage_flow: [],
    datasets: [],
    quality_checks: [],
    evidence_packs: [],
  },
};

const emptyKpiWorkspace: KpiWorkspace = {
  slug: fallbackShellData.navigation.default_kpi_slug,
  short_label: "KPI",
  name: "KPI workspace",
  current_value: "-",
  target_value: "-",
  status: "Seeded",
  status_tone: "warning",
  delta: "Awaiting data",
  owner: "Platform",
  cadence: "Monthly",
  trigger: "Awaiting seeded metrics",
  summary_strip: [],
  municipality_ranking: [],
  trend: [],
  open_cases: [],
  governance: [],
};

const emptyCaseWorkspace: CaseWorkspace = {
  case_id: fallbackShellData.navigation.default_case_id,
  kpi_slug: fallbackShellData.navigation.default_kpi_slug,
  kpi_name: "Case workspace",
  municipality: "Unknown",
  status: "Seeded",
  owner: "Platform",
  due_date: "-",
  risk_score: "-",
  breach_probability: "-",
  current_value: "-",
  target_value: "-",
  rationale: "Awaiting seeded case data.",
  overview_metrics: [],
  intelligence: {
    feature_contributions: [],
    trend: [],
    ranked_actions: [],
    outputs: [],
  },
  decisions: {
    recommended_actions: [],
    evidence_pack: [],
    action_buttons: [],
    human_authorisation_note: "Every external action remains human authorised.",
  },
  recovery: {
    baseline: "-",
    target: "-",
    after_30_days: "-",
    forecast_accuracy: "-",
    intervention_effectiveness: "-",
    learning_pillars: [],
  },
};

function buildHref(path: string, demoMode: boolean) {
  return demoMode ? `${path}${path.includes("?") ? "&" : "?"}demo=1` : path;
}

function buildCaseHref(kpiSlug: string, caseId: string, tab: CaseTab, demoMode: boolean) {
  return buildHref(`${baseRoute}/kpi/${kpiSlug}/case/${caseId}/${tab}`, demoMode);
}

function resolveRoute(
  rawSegments: string[],
  navigation: ShellData["navigation"],
  preferredDecisionId: string | undefined,
): RouteState | null {
  if (rawSegments.length === 0 || rawSegments[0] === "overview") {
    return { kind: "strategic" };
  }

  const first = rawSegments[0];
  const defaultCaseId = preferredDecisionId ?? navigation.default_case_id;

  if (first === "kpi-contract") {
    return { kind: "kpi", kpiSlug: navigation.default_kpi_slug };
  }

  if (first === "model-intelligence") {
    return { kind: "case", kpiSlug: navigation.default_kpi_slug, caseId: defaultCaseId, tab: "intelligence" };
  }

  if (first === "decision-action-tracker") {
    return { kind: "decisions" };
  }

  if (first === "outcome-feedback") {
    return { kind: "case", kpiSlug: navigation.default_kpi_slug, caseId: defaultCaseId, tab: "recovery" };
  }

  if (first === "governance-evidence") {
    return { kind: "audit" };
  }

  if (first === "decisions") {
    return { kind: "decisions" };
  }

  if (first === "runtimes") {
    return { kind: "runtimes" };
  }

  if (first === "audit") {
    return { kind: "audit" };
  }

  if (first !== "kpi") {
    return null;
  }

  if (rawSegments.length === 2) {
    return { kind: "kpi", kpiSlug: rawSegments[1] };
  }

  if (rawSegments.length >= 4 && rawSegments[2] === "case") {
    const tab = (rawSegments[4] ?? "overview") as CaseTab;
    if (!navigation.supported_tabs.includes(tab)) {
      return null;
    }

    return {
      kind: "case",
      kpiSlug: rawSegments[1],
      caseId: rawSegments[3],
      tab,
    };
  }

  return null;
}

function findKpiWorkspace(data: ShellData, kpiSlug: string) {
  return data.kpi_workspaces.find((item) => item.slug === kpiSlug) ?? data.kpi_workspaces[0] ?? emptyKpiWorkspace;
}

function findCaseWorkspace(data: ShellData, kpiSlug: string, caseId: string) {
  return (
    data.case_workspaces.find((item) => item.case_id === caseId && item.kpi_slug === kpiSlug) ??
    data.case_workspaces.find((item) => item.case_id === caseId) ??
    data.case_workspaces[0] ??
    emptyCaseWorkspace
  );
}

function selectedCase(data: ShellData, selectedId: string | undefined) {
  return (
    data.case_workspaces.find((item) => item.case_id === selectedId) ??
    data.case_workspaces.find((item) => item.case_id === data.decision_command.selected_case_id) ??
    data.case_workspaces[0] ??
    emptyCaseWorkspace
  );
}

function dashboardRail(route: RouteState, data: ShellData, demoMode: boolean) {
  const currentKpiSlug =
    route.kind === "kpi" || route.kind === "case"
      ? route.kpiSlug
      : data.navigation.default_kpi_slug;
  const currentCaseId = route.kind === "case" ? route.caseId : data.navigation.default_case_id;

  const entries = [
    {
      id: "01",
      label: "Strategic objective",
      subtitle: "Monitor thresholds",
      href: buildHref(baseRoute, demoMode),
      active: route.kind === "strategic",
    },
    {
      id: "02",
      label: "KPI workspace",
      subtitle: "Municipality ranking",
      href: buildHref(`${baseRoute}/kpi/${currentKpiSlug}`, demoMode),
      active: route.kind === "kpi",
    },
    {
      id: "03",
      label: "Case intelligence",
      subtitle: "Forecast and action",
      href: buildCaseHref(currentKpiSlug, currentCaseId, "overview", demoMode),
      active: route.kind === "case",
    },
    {
      id: "04",
      label: "Decision command",
      subtitle: "Human review",
      href: buildHref(`${baseRoute}/decisions`, demoMode),
      active: route.kind === "decisions",
    },
    {
      id: "05",
      label: "Runtime evidence",
      subtitle: "Execution history",
      href: buildHref(`${baseRoute}/runtimes`, demoMode),
      active: route.kind === "runtimes",
    },
    {
      id: "06",
      label: "Decision audit",
      subtitle: "Emails, tickets, actions",
      href: buildHref(`${baseRoute}/audit`, demoMode),
      active: route.kind === "audit",
    },
  ];

  return (
    <nav className="jazan-dashboard-rail" aria-label="Bundle dashboards">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          className={`jazan-dashboard-link${entry.active ? " is-active" : ""}`}
        >
          <span className="jazan-dashboard-index">{entry.id}</span>
          <span className="jazan-dashboard-label">{entry.label}</span>
          <span className="jazan-dashboard-subtitle">{entry.subtitle}</span>
        </Link>
      ))}
    </nav>
  );
}

function statusBadge(text: string, tone: string) {
  return <span className={`jazan-status-badge tone-${tone}`}>{text}</span>;
}

function sectionCard(props: { eyebrow?: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="jazan-section-card">
      <div className="jazan-section-card-header">
        <div>
          {props.eyebrow ? <p className="jazan-eyebrow">{props.eyebrow}</p> : null}
          <h2>{props.title}</h2>
        </div>
        {props.aside ? <div className="jazan-section-aside">{props.aside}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function metricStrip(items: Metric[]) {
  return (
    <div className="jazan-metric-strip">
      {items.map((item) => (
        <article key={`${item.label}-${item.value}`} className="jazan-metric-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <small>{item.note}</small> : null}
        </article>
      ))}
    </div>
  );
}

function trendChart(points: TrendPoint[]) {
  if (points.length === 0) {
    return <p className="jazan-empty-copy">Seeded trend data has not been attached yet.</p>;
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.actual ?? 0, point.forecast ?? 0, point.target]),
  );

  return (
    <div className="jazan-trend-chart" role="img" aria-label="KPI trend and forecast">
      {points.map((point) => {
        const value = point.forecast ?? point.actual ?? 0;
        return (
          <div key={point.label} className="jazan-trend-column">
            <div className="jazan-trend-bars">
              <span
                className={`jazan-trend-bar${point.forecast !== undefined ? " is-forecast" : ""}`}
                style={{ height: `${Math.max(8, (value / maxValue) * 100)}%` }}
              />
              <span
                className="jazan-target-line"
                style={{ bottom: `${Math.max(8, (point.target / maxValue) * 100)}%` }}
              />
            </div>
            <strong>{value.toFixed(2)}</strong>
            <small>{point.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function dataTable(props: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="jazan-table-wrap">
      <table className="jazan-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function governanceMiniRail(items: GovernanceChip[]) {
  return (
    <div className="jazan-governance-rail">
      {items.map((item) => (
        <article key={`${item.label}-${item.value}`} className="jazan-governance-chip">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function StrategicScreen(props: { data: ShellData; demoMode: boolean }) {
  const { strategic_dashboard: strategic } = props.data;

  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">{strategic.eyebrow}</p>
          <h2>{strategic.title}</h2>
          <p>{strategic.subtitle}</p>
        </div>
        <div className="jazan-pill-row">
          {strategic.objective_context.map((item) => (
            <span key={item} className="jazan-pill">
              {item}
            </span>
          ))}
        </div>
      </section>

      {metricStrip(strategic.summary_strip)}

      <sectionCard eyebrow="Golden thread" title="One governed objective from monitoring to audit">
        <div className="jazan-stage-flow">
          {strategic.golden_thread.map((item, index) => (
            <article key={item} className="jazan-stage-card">
              <span>{`0${index + 1}`}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </sectionCard>

      <sectionCard eyebrow="KPI threshold cards" title="All six KPI dashboards are declared and routable">
        <div className="jazan-kpi-card-grid">
          {strategic.kpi_cards.map((card) => (
            <article key={card.slug} className="jazan-kpi-card">
              <div className="jazan-kpi-card-header">
                <span>{card.short_label}</span>
                {statusBadge(card.status, card.status_tone)}
              </div>
              <h3>{card.name}</h3>
              <p className="jazan-kpi-metric">
                <strong>{card.current_value}</strong>
                <span>{`target ${card.target_value}`}</span>
              </p>
              <small>{card.delta}</small>
              <div className="jazan-kpi-meta">
                <span>{card.owner}</span>
                <span>{card.cadence}</span>
              </div>
              <p className="jazan-kpi-trigger">{card.trigger}</p>
              <Link href={card.href} className="jazan-inline-link">
                Open KPI workspace
              </Link>
            </article>
          ))}
        </div>
      </sectionCard>

      <sectionCard eyebrow="Active case" title="The story starts from the highest-priority seeded case">
        <div className="jazan-active-case-banner">
          <div>
            <h3>{`${strategic.active_case_banner.municipality} - ${strategic.active_case_banner.kpi}`}</h3>
            <p>{strategic.active_case_banner.summary}</p>
          </div>
          <div className="jazan-active-case-metrics">
            <div>
              <span>Risk score</span>
              <strong>{strategic.active_case_banner.risk_score}</strong>
            </div>
            <div>
              <span>Forecast breach</span>
              <strong>{strategic.active_case_banner.breach_probability}</strong>
            </div>
            <Link href={strategic.active_case_banner.href} className="jazan-inline-link">
              Review case
            </Link>
          </div>
        </div>
      </sectionCard>
    </div>
  );
}

function KpiWorkspaceScreen(props: { kpi: KpiWorkspace; demoMode: boolean }) {
  const { kpi, demoMode } = props;

  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">02 KPI municipality workspace</p>
          <h2>{kpi.name}</h2>
          <p>{`Owner: ${kpi.owner}. Cadence: ${kpi.cadence}. Trigger: ${kpi.trigger}.`}</p>
        </div>
        {statusBadge(kpi.status, kpi.status_tone)}
      </section>

      {metricStrip(kpi.summary_strip)}

      <div className="jazan-split-grid">
        {sectionCard({
          eyebrow: "Municipality ranking",
          title: "Which municipalities are degrading for this KPI and why?",
          children: dataTable({
            columns: ["Municipality", "Current", "Target", "Risk", "Breach", "Status", "Drill"],
            rows:
              kpi.municipality_ranking.length > 0
                ? kpi.municipality_ranking.map((row) => [
                    row.municipality,
                    row.current,
                    row.target,
                    row.risk_score,
                    row.breach_probability,
                    row.status,
                    row.case_id ? (
                      <Link
                        href={buildCaseHref(kpi.slug, row.case_id, "overview", demoMode)}
                        className="jazan-inline-link"
                      >
                        Open case
                      </Link>
                    ) : (
                      "No case"
                    ),
                  ])
                : [["No open seeded municipality rows yet", "-", "-", "-", "-", "-", "-"]],
          }),
        })}
        {sectionCard({
          eyebrow: "Governance evidence",
          title: "Certified route from source to KPI dashboard",
          children: governanceMiniRail(kpi.governance),
        })}
      </div>

      {sectionCard({
        eyebrow: "Trend",
        title: "Portfolio trend with target and forecast extension",
        children: trendChart(kpi.trend),
      })}

      {sectionCard({
        eyebrow: "Open cases",
        title: "Case drill paths emitted from KPI monitoring",
        children:
          kpi.open_cases.length > 0 ? (
            <div className="jazan-card-grid">
              {kpi.open_cases.map((openCase) => (
                <article key={openCase.case_id} className="jazan-detail-card">
                  <strong>{`${openCase.case_id} - ${openCase.municipality}`}</strong>
                  <p>{openCase.reason}</p>
                  <small>{openCase.owner}</small>
                  <Link href={openCase.href} className="jazan-inline-link">
                    Open case workspace
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="jazan-empty-copy">No open seeded cases are currently attached to this KPI.</p>
          ),
      })}
    </div>
  );
}

function CaseWorkspaceScreen(props: {
  route: Extract<RouteState, { kind: "case" }>;
  caseWorkspace: CaseWorkspace;
  demoMode: boolean;
}) {
  const { route, caseWorkspace, demoMode } = props;
  const tabs: Array<{ id: CaseTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "intelligence", label: "Intelligence" },
    { id: "decisions", label: "Decisions" },
    { id: "recovery", label: "Recovery" },
  ];

  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">03 Case model intelligence</p>
          <h2>{`${caseWorkspace.municipality} - ${caseWorkspace.kpi_name}`}</h2>
          <p>{caseWorkspace.rationale}</p>
        </div>
        <div className="jazan-hero-metrics">
          <div>
            <span>Risk score</span>
            <strong>{caseWorkspace.risk_score}</strong>
          </div>
          <div>
            <span>Breach probability</span>
            <strong>{caseWorkspace.breach_probability}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{caseWorkspace.status}</strong>
          </div>
        </div>
      </section>

      <div className="jazan-case-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={buildCaseHref(caseWorkspace.kpi_slug, caseWorkspace.case_id, tab.id, demoMode)}
            className={`jazan-case-tab${route.tab === tab.id ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {metricStrip(caseWorkspace.overview_metrics)}

      {route.tab === "overview" ? (
        <div className="jazan-screen-stack">
          {sectionCard({
            eyebrow: "Case rationale",
            title: "Why this municipality reached the golden thread",
            children: (
              <div className="jazan-card-grid">
                <article className="jazan-detail-card">
                  <strong>Current KPI vs target</strong>
                  <p>{`${caseWorkspace.current_value} against ${caseWorkspace.target_value}`}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>Owner</strong>
                  <p>{caseWorkspace.owner}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>Due date</strong>
                  <p>{caseWorkspace.due_date}</p>
                </article>
              </div>
            ),
          })}
          {sectionCard({
            eyebrow: "Recommended next step",
            title: "Move from case understanding to human-authorised action",
            children: (
              <div className="jazan-card-grid">
                {caseWorkspace.decisions.recommended_actions.map((action) => (
                  <article key={action} className="jazan-detail-card">
                    <strong>{action}</strong>
                    <p>Declared in the bundle as a recommended intervention for this case.</p>
                  </article>
                ))}
              </div>
            ),
          })}
        </div>
      ) : null}

      {route.tab === "intelligence" ? (
        <div className="jazan-screen-stack">
          {sectionCard({
            eyebrow: "Model intelligence",
            title: "Feature contribution to score and risk explanation",
            children: (
              <div className="jazan-card-grid">
                {caseWorkspace.intelligence.feature_contributions.map((item) => (
                  <article key={item.label} className="jazan-detail-card">
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                  </article>
                ))}
              </div>
            ),
          })}
          {sectionCard({
            eyebrow: "Forecast path",
            title: "RNN forecast and target line",
            children: trendChart(caseWorkspace.intelligence.trend),
          })}
          {sectionCard({
            eyebrow: "Top recommendations",
            title: "Ranked actions measured in comparable municipalities",
            children: (
              <div className="jazan-card-grid">
                {caseWorkspace.intelligence.ranked_actions.map((action) => (
                  <article key={action.title} className="jazan-detail-card">
                    <strong>{action.title}</strong>
                    <p>{action.impact}</p>
                    <small>{action.note}</small>
                  </article>
                ))}
              </div>
            ),
          })}
          {sectionCard({
            eyebrow: "Key outputs",
            title: "Runtime outputs bound to this case",
            children: (
              <div className="jazan-pill-row">
                {caseWorkspace.intelligence.outputs.map((output) => (
                  <span key={output} className="jazan-pill">
                    {output}
                  </span>
                ))}
              </div>
            ),
          })}
        </div>
      ) : null}

      {route.tab === "decisions" ? (
        <div className="jazan-screen-stack">
          {sectionCard({
            eyebrow: "Evidence pack",
            title: "Human-authorised actions must sit on certified evidence",
            children: (
              <div className="jazan-card-grid">
                {caseWorkspace.decisions.evidence_pack.map((item) => (
                  <article key={item.label} className="jazan-detail-card">
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </article>
                ))}
              </div>
            ),
          })}
          {sectionCard({
            eyebrow: "Action buttons",
            title: "Shared platform actions reused by this shell",
            children: (
              <div className="jazan-action-strip">
                {caseWorkspace.decisions.action_buttons.map((button) => (
                  <button key={button.id} type="button" className={`jazan-action-button tone-${button.tone}`}>
                    {button.label}
                  </button>
                ))}
              </div>
            ),
            aside: <span className="jazan-seed-note">Seeded workflow</span>,
          })}
          <p className="jazan-seed-note">{caseWorkspace.decisions.human_authorisation_note}</p>
        </div>
      ) : null}

      {route.tab === "recovery" ? (
        <div className="jazan-screen-stack">
          {sectionCard({
            eyebrow: "Recovery evidence",
            title: "Outcome recovery and learning feedback",
            children: (
              <div className="jazan-card-grid">
                <article className="jazan-detail-card">
                  <strong>Baseline</strong>
                  <p>{caseWorkspace.recovery.baseline}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>Target</strong>
                  <p>{caseWorkspace.recovery.target}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>After 30 days</strong>
                  <p>{caseWorkspace.recovery.after_30_days}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>Forecast accuracy</strong>
                  <p>{caseWorkspace.recovery.forecast_accuracy}</p>
                </article>
                <article className="jazan-detail-card">
                  <strong>Intervention effectiveness</strong>
                  <p>{caseWorkspace.recovery.intervention_effectiveness}</p>
                </article>
              </div>
            ),
          })}
          {sectionCard({
            eyebrow: "Learning transfer",
            title: "Lessons captured back into the platform rhythm",
            children: (
              <ul className="jazan-bullet-list">
                {caseWorkspace.recovery.learning_pillars.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          })}
        </div>
      ) : null}
    </div>
  );
}

function DecisionCommandScreen(props: { data: ShellData; selected: CaseWorkspace }) {
  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">04 Decision command centre</p>
          <h2>Generated decisions awaiting human review and approval</h2>
          <p>{props.data.decision_command.human_authorisation_note}</p>
        </div>
        <span className="jazan-seed-note">Demo data - seeded</span>
      </section>

      {metricStrip(props.data.decision_command.counters)}

      {sectionCard({
        eyebrow: "Decision queue",
        title: "Which generated decisions require intervention right now?",
        children: dataTable({
          columns: ["Decision ID", "Municipality", "KPI", "Risk", "Breach", "Owner", "Status", "Due"],
          rows: props.data.decision_command.queue.map((row) => [
            row.decision_id,
            row.municipality,
            row.kpi,
            row.risk_score,
            row.breach_probability,
            row.owner,
            row.status,
            row.due_date,
          ]),
        }),
      })}

      <div className="jazan-split-grid">
        {sectionCard({
          eyebrow: "Selected decision",
          title: `${props.selected.case_id} - ${props.selected.municipality}`,
          children: (
            <div className="jazan-card-grid">
              <article className="jazan-detail-card">
                <strong>Rationale</strong>
                <p>{props.selected.rationale}</p>
              </article>
              <article className="jazan-detail-card">
                <strong>Recommended actions</strong>
                <p>{props.selected.decisions.recommended_actions.join(", ")}</p>
              </article>
            </div>
          ),
        })}
        {sectionCard({
          eyebrow: "Take action",
          title: "Every external workflow is explicitly human authorised",
          children: (
            <div className="jazan-action-strip">
              {props.data.decision_command.action_buttons.map((button) => (
                <button key={button.id} type="button" className={`jazan-action-button tone-${button.tone}`}>
                  {button.label}
                </button>
              ))}
            </div>
          ),
        })}
      </div>
    </div>
  );
}

function RuntimeEvidenceScreen(props: { data: ShellData }) {
  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">05 Runtime evidence and execution history</p>
          <h2>Show that predictive runtimes ran on governed inputs and produced expected outputs</h2>
          <p>{props.data.runtime_evidence.evidence_note}</p>
        </div>
        <span className="jazan-seed-note">{`${props.data.runtime_evidence.status} · ${props.data.runtime_evidence.seed_note}`}</span>
      </section>

      {sectionCard({
        eyebrow: "Runtime services",
        title: "Declared runtime images and outputs",
        children: (
          <div className="jazan-card-grid">
            {props.data.runtime_evidence.runtime_cards.map((runtime) => (
              <article key={runtime.runtime_id} className="jazan-detail-card">
                <div className="jazan-runtime-header">
                  <strong>{runtime.name}</strong>
                  {statusBadge(runtime.status, runtime.status === "online" ? "positive" : "warning")}
                </div>
                <p>{runtime.image}</p>
                <small>{`Last run ${runtime.last_run} · ${runtime.duration} · ${runtime.rows_out} rows`}</small>
                <div className="jazan-runtime-io">
                  <span>{`Inputs: ${runtime.inputs.join(", ")}`}</span>
                  <span>{`Outputs: ${runtime.outputs.join(", ")}`}</span>
                </div>
              </article>
            ))}
          </div>
        ),
      })}

      {sectionCard({
        eyebrow: "Execution history",
        title: "Last execution traces",
        children: dataTable({
          columns: ["Runtime", "Started at", "Status", "Duration"],
          rows: props.data.runtime_evidence.execution_history.map((row) => [
            row.runtime,
            row.started_at,
            row.status,
            row.duration,
          ]),
        }),
      })}

      {sectionCard({
        eyebrow: "Lineage path",
        title: "Runtime evidence is only useful when the path remains governed",
        children: (
          <div className="jazan-pill-row">
            {props.data.runtime_evidence.lineage_flow.map((step) => (
              <span key={step} className="jazan-pill">
                {step}
              </span>
            ))}
          </div>
        ),
      })}
    </div>
  );
}

function AuditScreen(props: { data: ShellData }) {
  return (
    <div className="jazan-screen-stack">
      <section className="jazan-focus-hero">
        <div>
          <p className="jazan-eyebrow">06 Decision queue and action audit</p>
          <h2>See decisions, actions, emails, tickets, and corrective-action closure</h2>
          <p>{props.data.decision_action_audit.audit_note}</p>
        </div>
        <span className="jazan-seed-note">Demo data - seeded</span>
      </section>

      {metricStrip(props.data.decision_action_audit.counters)}

      {sectionCard({
        eyebrow: "Decision queue",
        title: "Queue snapshot carried into audit view",
        children: dataTable({
          columns: ["Decision ID", "Municipality", "KPI", "Risk", "Status", "Due"],
          rows: props.data.decision_action_audit.queue.map((row) => [
            row.decision_id,
            row.municipality,
            row.kpi,
            row.risk_score,
            row.status,
            row.due_date,
          ]),
        }),
      })}

      <div className="jazan-split-grid">
        {sectionCard({
          eyebrow: "Action history",
          title: "Who acted, through which channel, and with what result",
          children: dataTable({
            columns: ["Time", "Actor", "Action", "Channel", "Result"],
            rows: props.data.decision_action_audit.action_history.map((row) => [
              row.time,
              row.actor,
              row.action,
              row.channel,
              row.result,
            ]),
          }),
        })}
        {sectionCard({
          eyebrow: "External workflow evidence",
          title: "Emails and tickets logged alongside corrective actions",
          children: (
            <div className="jazan-screen-stack compact">
              {dataTable({
                columns: ["Recipient", "Template", "Status", "Sent at"],
                rows:
                  props.data.decision_action_audit.email_log.length > 0
                    ? props.data.decision_action_audit.email_log.map((row) => [
                        row.recipient,
                        row.template,
                        row.status,
                        row.sent_at,
                      ])
                    : [["No seeded emails yet", "-", "-", "-"]],
              })}
              {dataTable({
                columns: ["System", "Ticket", "Priority", "Status", "Case"],
                rows:
                  props.data.decision_action_audit.ticket_log.length > 0
                    ? props.data.decision_action_audit.ticket_log.map((row) => [
                        row.system,
                        row.ticket_id,
                        row.priority,
                        row.status,
                        row.linked_case,
                      ])
                    : [["No seeded tickets yet", "-", "-", "-", "-"]],
              })}
            </div>
          ),
        })}
      </div>

      {sectionCard({
        eyebrow: "Corrective actions",
        title: "Tracked to closure rather than disappearing after approval",
        children: dataTable({
          columns: ["Action ID", "Decision", "Action plan", "Owner", "Status", "Due", "Evidence", "Next step"],
          rows: props.data.decision_action_audit.corrective_actions.map((row) => [
            row.action_id,
            row.decision_id,
            row.action_plan,
            row.owner,
            row.status,
            row.due_in,
            row.evidence_status,
            row.next_step,
          ]),
        }),
      })}
    </div>
  );
}

function breadcrumb(route: RouteState, data: ShellData) {
  if (route.kind === "strategic" || route.kind === "decisions" || route.kind === "runtimes" || route.kind === "audit") {
    return null;
  }

  const kpi = findKpiWorkspace(data, route.kpiSlug);
  const segments = ["Urban service quality", kpi.name];

  if (route.kind === "case") {
    segments.push(findCaseWorkspace(data, route.kpiSlug, route.caseId).municipality);
  }

  return (
    <p className="jazan-breadcrumb">{segments.join(" -> ")}</p>
  );
}

export default async function UrbanServiceQualityLoopPage({ params, searchParams }: PageProps) {
  const [{ screen = [] }, query = {}] = await Promise.all([params, searchParams]);
  const demoMode = query.demo === "1";
  const selectedId = query.selected ?? query.decision;

  const data = await getApiJson<ShellData>({
    path: "/api/v1/jazan/service-quality/shell",
    fallback: fallbackShellData,
    cacheMode: "no-store",
  });

  const route = resolveRoute(screen, data.navigation, query.decision);
  if (!route) {
    notFound();
  }

  const pageActions = (
    <div className="jazan-header-actions">
      <Link href={buildHref(`${baseRoute}/decisions`, demoMode)} className="jazan-inline-link">
        Decision centre
      </Link>
      <Link href={buildHref(`${baseRoute}/runtimes`, demoMode)} className="jazan-inline-link">
        Runtime evidence
      </Link>
      <Link href={buildHref(`${baseRoute}/audit`, demoMode)} className="jazan-inline-link">
        Action audit
      </Link>
    </div>
  );

  let content: ReactNode;

  if (route.kind === "strategic") {
    content = <StrategicScreen data={data} demoMode={demoMode} />;
  } else if (route.kind === "kpi") {
    content = <KpiWorkspaceScreen kpi={findKpiWorkspace(data, route.kpiSlug)} demoMode={demoMode} />;
  } else if (route.kind === "case") {
    content = (
      <CaseWorkspaceScreen
        route={route}
        caseWorkspace={findCaseWorkspace(data, route.kpiSlug, route.caseId)}
        demoMode={demoMode}
      />
    );
  } else if (route.kind === "decisions") {
    content = <DecisionCommandScreen data={data} selected={selectedCase(data, selectedId)} />;
  } else if (route.kind === "runtimes") {
    content = <RuntimeEvidenceScreen data={data} />;
  } else {
    content = <AuditScreen data={data} />;
  }

  return (
    <PageFrame
      eyebrow={data.purpose.eyebrow}
      title={data.purpose.title}
      description={data.purpose.description}
      chips={[
        { label: "Demo data - seeded", tone: "accent" },
        { label: "Dashboard-rigid bundle", tone: "primary" },
        { label: "Human-authorised actions", tone: "accent" },
      ]}
      actions={pageActions}
      pageClassName="jazan-bundle-layout"
    >
      {dashboardRail(route, data, demoMode)}
      {breadcrumb(route, data)}
      <p className="jazan-seed-note">{data.meta.message}</p>
      <div className="jazan-dashboard-content">{content}</div>
    </PageFrame>
  );
}
