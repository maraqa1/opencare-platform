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
  searchParams?: Promise<{ demo?: string; decision?: string; selected?: string; step?: string }>;
};

type CaseTab = "overview" | "intelligence" | "decisions" | "recovery";
type DecisionStep = "review" | "action" | "consequences" | "authorise" | "recovery";

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
  model_family?: string;
  status: string;
  last_run: string;
  duration: string;
  rows_out: string;
  next_run: string;
  note?: string;
  image: string;
  inputs: string[];
  outputs: string[];
  last_seven_runs?: string[];
  hitl?: boolean;
};

type AuditAction = {
  time: string;
  actor: string;
  action: string;
  channel: string;
  result: string;
  created_record?: string;
  linked_decision_id?: string;
};

type EmailLog = {
  notification_id?: string;
  recipient: string;
  recipient_role?: string;
  subject?: string;
  template: string;
  status: string;
  sent_at: string;
  linked_decision_id?: string;
};

type TicketLog = {
  system: string;
  ticket_id: string;
  priority: string;
  status: string;
  linked_case: string;
  external_ticket_ref?: string;
  linked_action_id?: string;
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
    supported_tabs: CaseTab[];
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
      href: `${baseRoute}/case/JZN-DEC-1007/overview?demo=1`,
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

function buildCaseHref(caseId: string, tab: CaseTab, demoMode: boolean) {
  return buildHref(`${baseRoute}/case/${caseId}/${tab}`, demoMode);
}

function buildDecisionStepHref(caseId: string, step: DecisionStep, demoMode: boolean) {
  return buildHref(`${baseRoute}/case/${caseId}/decisions?step=${step}`, demoMode);
}

function normalizeCaseTab(rawTab: string | undefined, supportedTabs: CaseTab[]): CaseTab | null {
  const normalized = (rawTab ?? "overview").toLowerCase();
  const aliases: Record<string, CaseTab> = {
    overview: "overview",
    case: "overview",
    intel: "intelligence",
    intelligence: "intelligence",
    "model-intelligence": "intelligence",
    decide: "decisions",
    decision: "decisions",
    decisions: "decisions",
    "decision-command": "decisions",
    recovery: "recovery",
    "outcome-recovery": "recovery",
    "outcome-feedback": "recovery",
  };

  const resolved = aliases[normalized];
  if (!resolved || !supportedTabs.includes(resolved)) {
    return null;
  }

  return resolved;
}

function normalizeDecisionStep(rawStep: string | undefined): DecisionStep {
  const normalized = (rawStep ?? "review").toLowerCase();
  const aliases: Record<string, DecisionStep> = {
    review: "review",
    evidence: "review",
    action: "action",
    decide: "action",
    consequences: "consequences",
    confirm: "consequences",
    authorise: "authorise",
    authorize: "authorise",
    approve: "authorise",
    recovery: "recovery",
    track: "recovery",
  };

  return aliases[normalized] ?? "review";
}

function resolveRoute(
  rawSegments: string[],
  data: ShellData,
  preferredDecisionId: string | undefined,
): RouteState | null {
  const { navigation } = data;
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

  if (first === "case") {
    const caseId = rawSegments[1] ?? defaultCaseId;
    const normalizedTab = normalizeCaseTab(rawSegments[2], navigation.supported_tabs);
    if (!normalizedTab) {
      return null;
    }

    const caseWorkspace =
      data.case_workspaces.find((item) => item.case_id === caseId) ?? data.case_workspaces[0] ?? emptyCaseWorkspace;

    return {
      kind: "case",
      kpiSlug: caseWorkspace.kpi_slug,
      caseId,
      tab: normalizedTab,
    };
  }

  if (first !== "kpi") {
    return null;
  }

  if (rawSegments.length === 2) {
    return { kind: "kpi", kpiSlug: rawSegments[1] };
  }

  if (rawSegments.length >= 4 && rawSegments[2] === "case") {
    const caseId = rawSegments[3];
    const normalizedTab = normalizeCaseTab(rawSegments[4], navigation.supported_tabs);
    if (!normalizedTab) {
      return null;
    }

    const caseWorkspace =
      data.case_workspaces.find((item) => item.case_id === caseId) ?? data.case_workspaces[0] ?? emptyCaseWorkspace;

    return {
      kind: "case",
      kpiSlug: caseWorkspace.kpi_slug || rawSegments[1],
      caseId,
      tab: normalizedTab,
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
      href: buildCaseHref(currentCaseId, "overview", demoMode),
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

const SectionCard = sectionCard;

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

const PORTFOLIO_MUNICIPALITY_COUNT = 25;
const STRATEGIC_OBJECTIVE_ARABIC =
  "\u0627\u0633\u062a\u062f\u0627\u0645\u0629 \u0648\u062a\u062d\u0633\u064a\u0646 \u062c\u0648\u062f\u0629 \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0628\u0644\u062f\u064a\u0629 \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u062a\u0634\u0648\u0647 \u0627\u0644\u0628\u0635\u0631\u064a";

function severityFromTone(tone: string) {
  if (tone === "critical") {
    return "breach";
  }
  if (tone === "warning") {
    return "approaching";
  }
  return "meeting";
}

function severityFromStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("breach")) {
    return "breach";
  }
  if (normalized.includes("watch") || normalized.includes("approaching")) {
    return "approaching";
  }
  return "meeting";
}

function toneFromStatus(status: string) {
  const severity = severityFromStatus(status);
  if (severity === "breach") {
    return "critical";
  }
  if (severity === "approaching") {
    return "warning";
  }
  return "positive";
}

function rankingDelta(currentValue: string, targetValue: string) {
  const current = extractNumber(currentValue);
  const target = extractNumber(targetValue);
  const delta = current - target;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`;
}

function positionWidth(currentValue: string, kpiSlug: string) {
  const config = THRESHOLD_CONFIG[kpiSlug];
  if (!config) {
    return 0;
  }

  const current = extractNumber(currentValue);
  return Math.max(8, Math.min(100, (current / config.max) * 100));
}

function sparklinePath(points: TrendPoint[]) {
  if (points.length === 0) {
    return null;
  }

  // Plot raw values so lower-is-better KPIs still show a visible decline when performance improves.
  const values = points.map((point) => point.actual ?? point.forecast ?? point.target);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.01, max - min);
  const width = 60;
  const height = 22;
  const step = points.length === 1 ? 0 : (width - 4) / (points.length - 1);

  const coordinates = points.map((point, index) => {
    const value = point.actual ?? point.forecast ?? point.target;
    const normalized = (value - min) / span;
    const x = 2 + step * index;
    const y = height - 4 - normalized * (height - 8);
    return { x, y };
  });

  const polyline = coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="jazan-mini-sparkline" aria-hidden="true">
      <polyline
        points={polyline}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x.toFixed(1)} cy={lastPoint.y.toFixed(1)} r="2" fill="currentColor" />
    </svg>
  );
}

function compactThresholdBar(card: KpiCard) {
  const config = THRESHOLD_CONFIG[card.slug];
  if (!config) {
    return null;
  }

  return (
    <div className={`jazan-mini-threshold-track${config.direction === "lower" ? " is-lower-better" : ""}`} aria-hidden="true">
      <span className="jazan-mini-threshold-segment is-danger" />
      <span className="jazan-mini-threshold-segment is-warning" />
      <span className="jazan-mini-threshold-segment is-success" />
    </div>
  );
}

function workspaceBreakdown(kpi: KpiWorkspace) {
  const breach = kpi.municipality_ranking.filter((row) => severityFromStatus(row.status) === "breach").length;
  const riskMetric = kpi.summary_strip.find((item) => {
    const label = item.label.toLowerCase();
    return label.includes("watch") || label.includes("at-risk");
  });
  const seededAtRisk = riskMetric ? extractNumber(riskMetric.value) : 0;
  const approaching = Math.max(
    seededAtRisk > 0
      ? seededAtRisk - breach
      : kpi.municipality_ranking.filter((row) => severityFromStatus(row.status) === "approaching").length,
    0,
  );
  const meeting = Math.max(PORTFOLIO_MUNICIPALITY_COUNT - breach - approaching, 0);

  return [
    { label: "Meeting target", value: `${meeting}`, note: `of ${PORTFOLIO_MUNICIPALITY_COUNT} municipalities` },
    { label: "Approaching", value: `${approaching}`, note: "watch or trigger threshold" },
    { label: "In breach", value: `${breach}`, note: "below contractual threshold" },
    { label: "Open cases", value: `${kpi.open_cases.length}`, note: "decision review required" },
  ];
}

function workspaceTrendChart(points: TrendPoint[], slug: string) {
  if (points.length === 0) {
    return <p className="jazan-empty-copy">Seeded trend data has not been attached yet.</p>;
  }

  const config = THRESHOLD_CONFIG[slug];
  const values = points.flatMap((point) => [point.actual ?? point.forecast ?? point.target, point.target]);
  if (config) {
    values.push(config.trigger);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(0.05, (max - min) * 0.18);
  const domainMin = Math.max(0, min - padding);
  const domainMax = max + padding;
  const width = 720;
  const height = 220;
  const left = 42;
  const right = 20;
  const top = 20;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const step = points.length === 1 ? 0 : chartWidth / (points.length - 1);

  const pointX = (index: number) => left + step * index;
  const pointY = (value: number) =>
    top + chartHeight - ((value - domainMin) / Math.max(0.01, domainMax - domainMin)) * chartHeight;

  const actualPolyline = points
    .map((point, index) =>
      point.actual !== undefined ? `${pointX(index).toFixed(1)},${pointY(point.actual).toFixed(1)}` : null,
    )
    .filter(Boolean)
    .join(" ");

  const forecastStart = points.findIndex((point) => point.forecast !== undefined);
  const forecastPolyline =
    forecastStart >= 0
      ? points
          .slice(Math.max(0, forecastStart - 1))
          .map((point, offset) => {
            const index = Math.max(0, forecastStart - 1) + offset;
            const value = point.forecast ?? point.actual ?? point.target;
            return `${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`;
          })
          .join(" ")
      : "";

  const targetY = pointY(points[0]?.target ?? 0);
  const triggerY = config ? pointY(config.trigger) : null;

  return (
    <div className="jazan-line-chart-shell" role="img" aria-label="Portfolio trend across municipality average">
      <svg viewBox={`0 0 ${width} ${height}`} className="jazan-line-chart-svg">
        <line x1={left} y1={top} x2={left} y2={height - bottom} className="jazan-line-axis" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="jazan-line-axis" />
        {triggerY !== null ? <line x1={left} y1={triggerY} x2={width - right} y2={triggerY} className="jazan-line-trigger" /> : null}
        <line x1={left} y1={targetY} x2={width - right} y2={targetY} className="jazan-line-target" />
        {actualPolyline ? <polyline points={actualPolyline} className="jazan-line-series" /> : null}
        {forecastPolyline ? <polyline points={forecastPolyline} className="jazan-line-forecast" /> : null}
        {points.map((point, index) => {
          const plottedValue = point.actual ?? point.forecast ?? point.target;
          return (
            <g key={`${slug}-${point.label}`}>
              <text x={pointX(index)} y={height - 10} textAnchor="middle" className="jazan-line-label">
                {point.label}
              </text>
              {point.actual !== undefined ? <circle cx={pointX(index)} cy={pointY(plottedValue)} r="3" className="jazan-line-dot" /> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function caseTrajectoryChart(caseWorkspace: CaseWorkspace) {
  const points = caseWorkspace.intelligence.trend;
  if (points.length === 0) {
    return <p className="jazan-empty-copy">Seeded case trajectory data has not been attached yet.</p>;
  }

  const config = THRESHOLD_CONFIG[caseWorkspace.kpi_slug];
  const direction = config?.direction === "lower" ? "lower" : "higher";
  const values = points.flatMap((point) => [point.actual ?? point.forecast ?? point.target, point.target]);
  if (config) {
    values.push(config.trigger);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(0.04, (max - min) * 0.2);
  const domainMin = Math.max(0, min - padding);
  const domainMax = max + padding;
  const width = 760;
  const height = 240;
  const left = 44;
  const right = 18;
  const top = 24;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const step = points.length === 1 ? 0 : chartWidth / (points.length - 1);

  const pointX = (index: number) => left + step * index;
  const pointY = (value: number) =>
    top + chartHeight - ((value - domainMin) / Math.max(0.01, domainMax - domainMin)) * chartHeight;

  const actualPolyline = points
    .map((point, index) =>
      point.actual !== undefined ? `${pointX(index).toFixed(1)},${pointY(point.actual).toFixed(1)}` : null,
    )
    .filter(Boolean)
    .join(" ");

  const forecastStart = points.findIndex((point) => point.forecast !== undefined);
  const forecastPolyline =
    forecastStart >= 0
      ? points
          .slice(Math.max(0, forecastStart - 1))
          .map((point, offset) => {
            const index = Math.max(0, forecastStart - 1) + offset;
            const value = point.forecast ?? point.actual ?? point.target;
            return `${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`;
          })
          .join(" ")
      : "";

  const fillSeries = points.map((point, index) => {
    const value = point.actual ?? point.forecast ?? point.target;
    return `${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`;
  });

  const areaPath = `M ${left} ${height - bottom} L ${fillSeries.join(" L ")} L ${pointX(points.length - 1)} ${height - bottom} Z`;

  const targetValue = points[0]?.target ?? 0;
  const targetY = pointY(targetValue);
  const triggerValue = config?.trigger;
  const triggerY = triggerValue !== undefined ? pointY(triggerValue) : null;
  const breachIndex = points.findIndex((point) => {
    const value = point.actual ?? point.forecast ?? point.target;
    return direction === "lower" ? value > targetValue : value < targetValue;
  });
  const breachX = breachIndex >= 0 ? pointX(breachIndex) : null;
  const breachLabel = breachIndex >= 0 ? `${points[breachIndex].label} - breach onset` : "No breach onset";

  return (
    <div className="jazan-case-trajectory-shell" role="img" aria-label="Case KPI trajectory with breach onset marker">
      <div className="jazan-case-trajectory-meta">
        <div className="jazan-case-trajectory-legend">
          <span className="jazan-case-legend-chip">
            <i className="is-actual" />
            Observed to date
          </span>
          <span className="jazan-case-legend-chip">
            <i className="is-forecast" />
            Forecast future
          </span>
        </div>
        <span className="jazan-case-legend-note">Months are shown by year; forecasted periods use a separate colour.</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="jazan-case-trajectory-svg">
        <rect x={left} y={top} width={chartWidth} height={chartHeight} className="jazan-case-chart-frame" />
        <line x1={left} y1={targetY} x2={width - right} y2={targetY} className="jazan-case-target-line" />
        {triggerY !== null ? (
          <line x1={left} y1={triggerY} x2={width - right} y2={triggerY} className="jazan-case-trigger-line" />
        ) : null}
        {breachX !== null ? (
          <line x1={breachX} y1={top} x2={breachX} y2={height - bottom} className="jazan-case-breach-line" />
        ) : null}
        <path d={areaPath} className="jazan-case-area" />
        {actualPolyline ? <polyline points={actualPolyline} className="jazan-case-series" /> : null}
        {forecastPolyline ? <polyline points={forecastPolyline} className="jazan-case-forecast-series" /> : null}
        {points.map((point, index) => {
          const value = point.actual ?? point.forecast ?? point.target;
          return (
            <g key={`${caseWorkspace.case_id}-${point.label}`}>
              <text x={pointX(index)} y={height - 8} textAnchor="middle" className="jazan-case-axis-label">
                {formatTrajectoryPeriod(point.label)}
              </text>
              <circle
                cx={pointX(index)}
                cy={pointY(value)}
                r={index === points.length - 1 || point.forecast !== undefined ? 4 : 0}
                className={`jazan-case-point${point.forecast !== undefined ? " is-forecast" : ""}`}
              />
            </g>
          );
        })}
        <text x={left - 8} y={targetY + 4} textAnchor="end" className="jazan-case-value-label">
          {formatTrajectoryValue(caseWorkspace, targetValue)}
        </text>
        {triggerY !== null && triggerValue !== undefined ? (
          <text x={left - 8} y={triggerY + 4} textAnchor="end" className="jazan-case-trigger-label">
            {formatTrajectoryValue(caseWorkspace, triggerValue)}
          </text>
        ) : null}
        {breachX !== null ? (
          <text x={Math.min(width - 120, breachX + 10)} y={top + 14} className="jazan-case-breach-label">
            {breachLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function governanceEvidenceModule(kpi: KpiWorkspace, data: ShellData) {
  const fallbackFreshness = kpi.governance.find((item) => item.label === "Freshness")?.value ?? "Governed";
  const assets = kpi.governance
    .filter((item) => item.label !== "Freshness")
    .map((item) => {
      const matched = data.governance_evidence.datasets.find((dataset) => dataset.asset === item.value);
      const defaultClassification =
        item.label === "Source"
          ? "Restricted source"
          : item.label === "Analytics mart"
            ? "Internal analytics mart"
            : "Internal governed output";
      const defaultLineage =
        item.label === "Source"
          ? "source -> raw -> staging"
          : item.label === "Analytics mart"
            ? "source -> raw -> staging -> analytics"
            : "analytics -> output -> decision -> dashboard";

      return {
        asset: item.value,
        classification: matched?.classification ?? defaultClassification,
        owner: matched?.owner ?? kpi.owner,
        freshness: matched?.freshness ?? fallbackFreshness,
        lineage: matched?.lineage ?? defaultLineage,
      };
    });

  const lineageSteps =
    data.governance_evidence.lineage_flow.length > 0
      ? data.governance_evidence.lineage_flow.flatMap((item) => item.split(" -> ").map((step) => step.trim()))
      : ["source", "raw", "staging", "analytics", "output", "decision", "dashboard"];
  const qualityChecks = data.governance_evidence.quality_checks.slice(0, 3);

  return (
    <div className="jazan-governance-module">
      {governanceMiniRail(kpi.governance)}

      <div className="jazan-governance-assets">
        {assets.map((asset) => (
          <article key={asset.asset} className="jazan-governance-asset-card">
            <div className="jazan-governance-asset-top">
              <span className="jazan-governance-classification">{asset.classification}</span>
              <small>{asset.freshness}</small>
            </div>
            <strong className="jazan-mono-text">{asset.asset}</strong>
            <p>{`Owner: ${asset.owner}`}</p>
            <div className="jazan-governance-lineage">
              {asset.lineage.split(" -> ").map((step) => (
                <span key={`${asset.asset}-${step}`} className="jazan-pill">
                  {step}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="jazan-two-column-grid">
        <article className="jazan-detail-card">
          <strong>Governed lineage path</strong>
          <div className="jazan-governance-lineage">
            {lineageSteps.map((step, index) => (
              <span key={`${step}-${index}`} className="jazan-pill">
                {step}
              </span>
            ))}
          </div>
        </article>
        <article className="jazan-detail-card">
          <strong>Quality and classification controls</strong>
          <ul className="jazan-bullet-list">
            {qualityChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

function impactMagnitude(impact: string) {
  const match = impact.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]).toFixed(2) : impact;
}

function municipalityRankingTable(kpi: KpiWorkspace, demoMode: boolean) {
  if (kpi.municipality_ranking.length === 0) {
    return <p className="jazan-ranking-empty">No municipality ranking has been seeded for this KPI yet.</p>;
  }

  return (
    <div className="jazan-ranking-table-wrap">
      <table className="jazan-ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Municipality</th>
            <th>Current</th>
            <th>Position</th>
            <th>Delta</th>
            <th>State</th>
            <th>Drill</th>
          </tr>
        </thead>
        <tbody>
          {kpi.municipality_ranking.map((row, index) => {
            const severity = severityFromStatus(row.status);
            const rowTone = toneFromStatus(row.status);
            return (
              <tr key={`${kpi.slug}-${row.municipality}`} className={`jazan-ranking-row tone-${severity}`}>
                <td>{index + 1}</td>
                <td>
                  <strong>{row.municipality}</strong>
                </td>
                <td className="jazan-ranking-mono">{row.current}</td>
                <td>
                  <div className="jazan-ranking-position">
                    <div className="jazan-ranking-bar">
                      <span
                        className={`jazan-ranking-bar-fill tone-${severity}`}
                        style={{ width: `${positionWidth(row.current, kpi.slug)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className={`jazan-ranking-mono tone-${severity}`}>{rankingDelta(row.current, row.target)}</td>
                <td>{renderStatusBadge(row.status, rowTone)}</td>
                <td>
                  {row.case_id ? (
                  <Link href={buildCaseHref(row.case_id, "overview", demoMode)} className="jazan-ranking-drill">
                      Open case
                    </Link>
                  ) : (
                    <span className="jazan-ranking-empty-state">No case</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const KPI_ARABIC_LABELS: Record<string, string> = {
  "visual-distortion-closure-quality":
    "\u062c\u0648\u062f\u0629 \u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062a\u0634\u0648\u0647 \u0627\u0644\u0628\u0635\u0631\u064a",
  "service-request-closure-rate":
    "\u0646\u0633\u0628\u0629 \u0625\u063a\u0644\u0627\u0642 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062e\u062f\u0645\u0627\u062a",
  "average-permit-issuance-time":
    "\u0645\u062a\u0648\u0633\u0637 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0631\u062e\u0635",
  "urban-service-coverage":
    "\u0646\u0633\u0628\u0629 \u062a\u063a\u0637\u064a\u0629 \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u062d\u0636\u0631\u064a\u0629",
  "emergency-resilience-readiness":
    "\u0645\u0624\u0634\u0631 \u0635\u0645\u0648\u062f \u0627\u0644\u0623\u0632\u0645\u0627\u062a \u0648\u0627\u0644\u0637\u0648\u0627\u0631\u0626",
  "citizen-satisfaction": "\u0631\u0636\u0627 \u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f\u064a\u0646",
};

const STATUS_ARABIC_LABELS: Record<string, string> = {
  "in breach": "\u0645\u064f\u062e\u0644 \u0628\u0627\u0644\u062d\u062f",
  "approaching trigger": "\u064a\u0642\u062a\u0631\u0628 \u0645\u0646 \u0627\u0644\u0639\u062a\u0628\u0629",
  "meeting target": "\u0645\u062d\u0642\u0642 \u0627\u0644\u0647\u062f\u0641",
  watch: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629",
  queued: "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
  "awaiting review": "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  approved: "\u0645\u0639\u062a\u0645\u062f",
  escalated: "\u0645\u0635\u0639\u062f",
  online: "\u0645\u062a\u0635\u0644",
  offline: "\u0645\u062a\u0648\u0642\u0641",
};

const ACTION_ARABIC_LABELS: Record<string, string> = {
  approve: "\u0627\u0639\u062a\u0645\u0627\u062f",
  "request-revision": "\u0637\u0644\u0628 \u062a\u0639\u062f\u064a\u0644",
  revise: "\u0637\u0644\u0628 \u062a\u0639\u062f\u064a\u0644",
  escalate: "\u062a\u0635\u0639\u064a\u062f",
  "create-ticket": "\u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629",
  "notify-owner": "\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0627\u0644\u0643",
  "email-owner": "\u0628\u0631\u064a\u062f \u0627\u0644\u0645\u0627\u0644\u0643",
  "view-details": "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
};

const THRESHOLD_CONFIG: Record<
  string,
  { min: number; trigger: number; target: number; max: number; direction?: "higher" | "lower" }
> = {
  "visual-distortion-closure-quality": { min: 0.5, trigger: 0.75, target: 0.85, max: 1 },
  "service-request-closure-rate": { min: 0.5, trigger: 0.85, target: 0.9, max: 1 },
  "average-permit-issuance-time": { min: 0, trigger: 7, target: 5, max: 10, direction: "lower" },
  "urban-service-coverage": { min: 0.5, trigger: 0.93, target: 0.95, max: 1 },
  "emergency-resilience-readiness": { min: 0.5, trigger: 0.75, target: 0.8, max: 1 },
  "citizen-satisfaction": { min: 0, trigger: 0.7, target: 0.75, max: 1 },
};

const CASE_ARABIC_RATIONALE: Record<string, string> = {
  "JZN-DEC-1007":
    "\u062a\u064f\u0638\u0647\u0631 \u0645\u062d\u0627\u0641\u0638\u0629 \u0635\u0628\u064a\u0627 \u0627\u062d\u062a\u0645\u0627\u0644\u0627\u064b \u0645\u0631\u062a\u0641\u0639\u0627\u064b \u0644\u062a\u062c\u0627\u0648\u0632 \u0647\u062f\u0641 \u062c\u0648\u062f\u0629 \u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062a\u0634\u0648\u0647 \u0627\u0644\u0628\u0635\u0631\u064a \u062e\u0644\u0627\u0644 \u0623\u0631\u0628\u0639\u0629 \u0623\u0633\u0627\u0628\u064a\u0639. \u062a\u0642\u0648\u062f \u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u062a\u0631\u0627\u0643\u0645\u0627\u062a \u0627\u0644\u0634\u0643\u0627\u0648\u0649 \u0648\u0627\u0646\u062e\u0641\u0627\u0636 \u062c\u0648\u062f\u0629 \u0627\u0644\u0625\u063a\u0644\u0627\u0642 \u0648\u062a\u0643\u0631\u0627\u0631 \u062d\u0627\u0644\u0627\u062a \u0627\u0644\u0639\u0648\u062f\u0629.",
  "JZN-DEC-1011":
    "\u064a\u0624\u062f\u064a \u0646\u0645\u0648 \u0627\u0644\u062a\u0631\u0627\u0643\u0645 \u0648\u0628\u0637\u0621 \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0627\u0644\u0645\u064a\u062f\u0627\u0646\u064a\u0629 \u0625\u0644\u0649 \u0625\u0636\u0639\u0627\u0641 \u0623\u062f\u0627\u0621 \u0625\u063a\u0644\u0627\u0642 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062e\u062f\u0645\u0629 \u0641\u064a \u0623\u0628\u0648 \u0639\u0631\u064a\u0634.",
  "JZN-DEC-1015":
    "\u064a\u0642\u062a\u0631\u0628 \u062a\u0631\u0627\u0643\u0645 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0631\u062e\u0635 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629 \u0641\u064a \u0635\u0627\u0645\u0637\u0629 \u0645\u0646 \u062d\u062f \u0627\u0644\u062a\u062f\u062e\u0644\u060c \u0645\u0645\u0627 \u064a\u062a\u0637\u0644\u0628 \u0633\u0628\u0627\u0642\u064b\u0627 \u0644\u0644\u0645\u0639\u0627\u0644\u062c\u0629.",
  "JZN-DEC-1018":
    "\u062a\u0634\u064a\u0631 \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062a\u0645\u0627\u0631\u064a\u0646 \u0648\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0645\u0639\u062f\u0627\u062a \u0625\u0644\u0649 \u062d\u0627\u062c\u0629 \u0641\u0627\u0631\u0633\u0627\u0646 \u0625\u0644\u0649 \u062e\u0637\u0629 \u062a\u062f\u062e\u0644 \u0628\u0634\u0631\u064a\u0629 \u0645\u062d\u062f\u062f\u0629.",
};

const ACTION_CONSEQUENCE_PREVIEW: Record<string, { effect: string; records: string; audience: string }> = {
  approve: {
    effect: "Authorises the top recommendation and opens the corrective-action lifecycle.",
    records: "decision.approved + action.lifecycle snapshot",
    audience: "Performance Office approver and action owner",
  },
  "request-revision": {
    effect: "Returns the recommendation to the reviewer/runtime owner with tracked feedback.",
    records: "decision.revision_requested + reviewer note",
    audience: "Model reviewer and municipality owner",
  },
  escalate: {
    effect: "Triggers an escalated decision path for Emarah or MOMRAH review.",
    records: "decision.escalated + escalation audit event",
    audience: "Senior reviewer and escalation recipient",
  },
  "create-ticket": {
    effect: "Creates a municipal service-desk record linked to the corrective action.",
    records: "ticket.request + linked_action_id",
    audience: "Service desk and action owner",
  },
  "email-owner": {
    effect: "Sends a bilingual notification to the named municipal owner.",
    records: "notification.outbox + email delivery log",
    audience: "Municipality owner and audit trail",
  },
  "view-details": {
    effect: "Opens the linked case workspace without creating an external side effect.",
    records: "No external record created",
    audience: "Approver only",
  },
};

function extractNumber(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatTrajectoryValue(caseWorkspace: CaseWorkspace, value: number) {
  if (caseWorkspace.kpi_slug === "average-permit-issuance-time") {
    return `${value.toFixed(1)}d`;
  }

  if (Math.abs(value) <= 1.5) {
    return `${Math.round(value * 100)}%`;
  }

  return value.toFixed(2);
}

function formatTrajectoryPeriod(label: string) {
  return `${label} 2026`;
}

function statusLookup(text: string) {
  return STATUS_ARABIC_LABELS[text.toLowerCase()] ?? "\u062c\u0627\u0647\u0632\u064a\u0629 \u062a\u0634\u063a\u064a\u0644\u064a\u0629";
}

function actionLookup(id: string) {
  return ACTION_ARABIC_LABELS[id] ?? "\u0625\u062c\u0631\u0627\u0621";
}

function arabicRationale(caseId: string, fallback: string) {
  return CASE_ARABIC_RATIONALE[caseId] ?? fallback;
}

function actionConsequence(button: ActionButton) {
  return (
    ACTION_CONSEQUENCE_PREVIEW[button.id] ?? {
      effect: button.note ?? "Human-authorised workflow action",
      records: "Audit event only",
      audience: "Reviewer",
    }
  );
}

function runtimeRunTone(status: string) {
  return status === "degraded" ? " is-degraded" : "";
}

function screenSnapshot(data: ShellData) {
  const referenceRun = data.runtime_evidence.runtime_cards[0]?.last_run ?? "Seed snapshot";
  return `Seed snapshot ${referenceRun}`;
}

function ensureActionButtons(buttons: ActionButton[]) {
  if (buttons.some((button) => button.id === "view-details")) {
    return buttons;
  }

  return [
    ...buttons,
    {
      id: "view-details",
      label: "View details",
      tone: "outline",
      note: "Open the linked case workspace",
    },
  ];
}

function buildDecisionCounters(data: ShellData): Metric[] {
  const queue = data.decision_command.queue;
  const statusCount = (value: string) => queue.filter((row) => row.status.toLowerCase() === value).length.toString();

  return [
    { label: "New decisions", value: queue.length.toString() },
    { label: "Under review", value: statusCount("awaiting review") },
    { label: "Approved", value: statusCount("approved") },
    { label: "Escalated", value: statusCount("escalated") },
    { label: "Tickets created", value: data.decision_action_audit.ticket_log.length.toString() },
    { label: "Emails sent", value: data.decision_action_audit.email_log.length.toString() },
  ];
}

function buildAuditCounters(data: ShellData): Metric[] {
  const actions = data.decision_action_audit.corrective_actions;
  const inProgress = actions.filter((row) => row.status.toLowerCase() !== "approved").length.toString();
  const closed = actions.filter((row) => row.status.toLowerCase() === "approved").length.toString();

  return [
    { label: "Emails sent", value: data.decision_action_audit.email_log.length.toString() },
    { label: "Tickets created", value: data.decision_action_audit.ticket_log.length.toString() },
    { label: "Actions in progress", value: inProgress },
    { label: "Actions closed", value: closed },
  ];
}

function renderStatusBadge(text: string, tone: string) {
  return (
    <div className="jazan-status-pair">
      {statusBadge(text, tone)}
      <small>{statusLookup(text)}</small>
    </div>
  );
}

function renderScreenHeader(props: {
  screenId: string;
  title: string;
  subtitle: string;
  routeText: string;
  snapshot: string;
  demoMode: boolean;
}) {
  return (
    <section className="jazan-screen-header">
      <div className="jazan-screen-topbar">
        <div className="jazan-screen-identity">
          <div className="jazan-screen-emblem" aria-hidden="true">
            <span>JZ</span>
          </div>
          <div className="jazan-screen-meta">
            <span>JAZAN PERFORMANCE MANAGEMENT</span>
            <strong>{props.title}</strong>
            <small>{props.subtitle}</small>
          </div>
        </div>
        <div className="jazan-screen-topbar-actions">
          <span className="jazan-mode-chip accent">{props.demoMode ? "Demo data - seeded" : "Live route"}</span>
          <span className="jazan-mode-chip neutral">{props.routeText}</span>
          <div className="jazan-locale-switch" aria-label="Locale readiness">
            <span className="jazan-locale-chip is-active">EN</span>
            <span className="jazan-locale-chip">عربي</span>
          </div>
          <small className="jazan-screen-snapshot">{props.snapshot}</small>
        </div>
      </div>
      <div className="jazan-screen-shell">
        <span className="jazan-shell-index">{props.screenId}</span>
        <p>{props.subtitle}</p>
      </div>
    </section>
  );
}

function renderThresholdRail(card: KpiCard) {
  const config = THRESHOLD_CONFIG[card.slug];
  if (!config) {
    return null;
  }

  const current = extractNumber(card.current_value);
  const { min, trigger, target, max, direction = "higher" } = config;
  const span = Math.max(1, max - min);
  const pos = (value: number) => `${Math.min(100, Math.max(0, ((value - min) / span) * 100))}%`;
  const tone = direction === "lower" ? "is-lower-better" : "is-higher-better";

  return (
    <div className={`jazan-threshold-rail ${tone}`}>
      <div className="jazan-threshold-segments">
        <span className="jazan-threshold-segment is-danger" />
        <span className="jazan-threshold-segment is-warning" />
        <span className="jazan-threshold-segment is-success" />
      </div>
      <span className="jazan-threshold-marker is-trigger" style={{ left: pos(trigger) }}>
        trigger
      </span>
      <span className="jazan-threshold-marker is-target" style={{ left: pos(target) }}>
        target
      </span>
      <span className="jazan-threshold-marker is-current" style={{ left: pos(current) }}>
        current
      </span>
      <div className="jazan-threshold-scale">
        <small>{min.toFixed(direction === "lower" ? 0 : 2)}</small>
        <small>{trigger.toFixed(direction === "lower" ? 0 : 2)}</small>
        <small>{target.toFixed(direction === "lower" ? 0 : 2)}</small>
        <small>{max.toFixed(direction === "lower" ? 0 : 2)}</small>
      </div>
    </div>
  );
}

function renderDecisionButtons(buttons: ActionButton[], detailHref?: string) {
  const normalized = ensureActionButtons(buttons);

  return (
    <div className="jazan-action-strip">
      {normalized.map((button) => {
        const lookupId = button.id === "email-owner" ? "notify-owner" : button.id;

        return button.id === "view-details" && detailHref ? (
          <Link key={button.id} href={detailHref} className={`jazan-action-button tone-${button.tone}`}>
            <span>{button.label}</span>
            <small>{actionLookup(lookupId)}</small>
          </Link>
        ) : (
          <button key={button.id} type="button" className={`jazan-action-button tone-${button.tone}`}>
            <span>{button.label}</span>
            <small>{actionLookup(lookupId)}</small>
          </button>
        );
      })}
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

      <SectionCard eyebrow="Golden thread" title="One governed objective from monitoring to audit">
        <div className="jazan-stage-flow">
          {strategic.golden_thread.map((item, index) => (
            <article key={item} className="jazan-stage-card">
              <span>{`0${index + 1}`}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="KPI threshold cards" title="All six KPI dashboards are declared and routable">
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
      </SectionCard>

      <SectionCard eyebrow="Active case" title="The story starts from the highest-priority seeded case">
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
      </SectionCard>
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
                      href={buildCaseHref(row.case_id, "overview", demoMode)}
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
  const isRecoveryLocked = !["closed", "recovered"].includes(caseWorkspace.status.toLowerCase());
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
            href={buildCaseHref(caseWorkspace.case_id, tab.id, demoMode)}
            className={`jazan-case-tab${route.tab === tab.id ? " is-active" : ""}${tab.id === "recovery" && isRecoveryLocked ? " is-disabled" : ""}`}
            title={
              tab.id === "recovery" && isRecoveryLocked
                ? "Recovery data appears after corrective action closes"
                : undefined
            }
            aria-disabled={tab.id === "recovery" && isRecoveryLocked ? true : undefined}
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
        <span className="jazan-seed-note">{`${props.data.runtime_evidence.status} - ${props.data.runtime_evidence.seed_note}`}</span>
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
                <small>{`Last run ${runtime.last_run} - ${runtime.duration} - ${runtime.rows_out} rows`}</small>
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

function BundleStrategicScreen(props: { data: ShellData; demoMode: boolean }) {
  const { strategic_dashboard: strategic } = props.data;
  const activeCase =
    props.data.case_workspaces.find((item) => item.case_id === strategic.active_case_banner.case_id) ??
    props.data.case_workspaces[0] ??
    emptyCaseWorkspace;

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "01",
        title: "Strategic objective cascade - monitoring & thresholds",
        subtitle: "One objective - six governed KPIs - live threshold state",
        routeText: "Route 01 - strategic",
        snapshot: screenSnapshot(props.data),
        demoMode: props.demoMode,
      })}

      <section className="jazan-portfolio-hero">
        <div className="jazan-portfolio-hero-main">
          <div className="jazan-objective-copy">
            <span className="jazan-objective-tag">Strategic objective</span>
          <h2>{strategic.title}</h2>
          <p>{strategic.subtitle}</p>
          <small className="jazan-bilingual-copy">{STRATEGIC_OBJECTIVE_ARABIC}</small>
        </div>
        <div className="jazan-objective-chips">
          {strategic.objective_context.map((item) => (
            <span key={item} className="jazan-pill is-light">
              {item}
            </span>
          ))}
        </div>
        </div>
      </section>

      <section className="jazan-summary-band">
        {strategic.summary_strip.map((item) => (
          <article key={item.label} className="jazan-summary-counter">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{statusLookup(item.label)}</small>
          </article>
        ))}
      </section>

      <section className="jazan-connector-rail-shell">
        <div className="jazan-connector-line" />
        <div className="jazan-connector-node-row">
          {strategic.kpi_cards.map((card) => (
            <div key={card.slug} className="jazan-connector-node">
              <span className={`jazan-node-dot tone-${card.status_tone}`} />
              <small>{card.short_label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="jazan-threshold-grid">
        {strategic.kpi_cards.map((card) => (
          <article key={card.slug} className="jazan-threshold-card">
            <div className="jazan-threshold-card-header">
              <div>
                <span>{card.short_label}</span>
                <h3>{card.name}</h3>
                <small className="jazan-bilingual-copy">{KPI_ARABIC_LABELS[card.slug] ?? "\u0645\u0624\u0634\u0631 \u062a\u0634\u063a\u064a\u0644\u064a"}</small>
              </div>
              {renderStatusBadge(card.status, card.status_tone)}
            </div>
            <div className="jazan-threshold-value-row">
              <div>
                <strong>{card.current_value}</strong>
                <span>current</span>
              </div>
              <div className="jazan-threshold-target">
                <span>{`target ${card.target_value}`}</span>
                <small>{card.delta}</small>
              </div>
            </div>
            {renderThresholdRail(card)}
            <p className="jazan-threshold-trigger">{card.trigger}</p>
            <div className="jazan-threshold-footer">
              <span>{card.owner}</span>
              <span>{card.cadence}</span>
            </div>
            <Link href={card.href} className="jazan-inline-link">
              Open KPI workspace
            </Link>
          </article>
        ))}
      </section>

      <section className="jazan-alert-band">
        <div className="jazan-alert-copy">
          <span className="jazan-alert-tag">ACTIVE RISK CASE - HIGHEST PRIORITY</span>
          <h3>{`${strategic.active_case_banner.municipality} - ${strategic.active_case_banner.kpi}`}</h3>
          <p>{strategic.active_case_banner.summary}</p>
          <small>{activeCase.status}</small>
        </div>
        <div className="jazan-alert-metrics">
          <div>
            <span>Risk score</span>
            <strong>{strategic.active_case_banner.risk_score}</strong>
          </div>
          <div>
            <span>Forecast breach</span>
            <strong>{strategic.active_case_banner.breach_probability}</strong>
          </div>
          <Link href={strategic.active_case_banner.href} className="jazan-case-link-button">
            Review case
          </Link>
        </div>
      </section>
    </div>
  );
}

function BundleKpiWorkspaceScreen(props: { kpi: KpiWorkspace; demoMode: boolean; data: ShellData }) {
  const { kpi, demoMode, data } = props;

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "02",
        title: "KPI workspace - municipality monitoring and governance",
        subtitle: "Show KPI status by municipality, forecast path, governance evidence, and open cases",
        routeText: "Route 02 - KPI workspace",
        snapshot: screenSnapshot(data),
        demoMode,
      })}

      <section className="jazan-zone-card jazan-zone-card--context">
        <div>
          <p className="jazan-eyebrow">{kpi.short_label}</p>
          <h2>{kpi.name}</h2>
          <small className="jazan-bilingual-copy">{KPI_ARABIC_LABELS[kpi.slug] ?? "\u0645\u0624\u0634\u0631 \u062a\u0634\u063a\u064a\u0644\u064a"}</small>
        </div>
        <div className="jazan-zone-card-meta">
          {renderStatusBadge(kpi.status, kpi.status_tone)}
          <span>{`Owner: ${kpi.owner}`}</span>
          <span>{`Cadence: ${kpi.cadence}`}</span>
          <span>{kpi.trigger}</span>
        </div>
      </section>

      <section className="jazan-summary-band">
        {kpi.summary_strip.map((item) => (
          <article key={item.label} className="jazan-summary-counter">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note ? <small>{item.note}</small> : null}
          </article>
        ))}
      </section>

      <div className="jazan-two-column-grid">
        <SectionCard eyebrow="Municipality ranking" title="Ranked municipality risk and trigger state">
          {dataTable({
            columns: ["Municipality", "Current", "Target", "Risk score", "Breach", "Status", "Action"],
            rows:
              kpi.municipality_ranking.length > 0
                ? kpi.municipality_ranking.map((row) => [
                    row.municipality,
                    row.current,
                    row.target,
                    row.risk_score,
                    row.breach_probability,
                    renderStatusBadge(row.status, row.status === "In breach" ? "critical" : "warning"),
                    row.case_id ? (
                      <Link
                      href={buildCaseHref(row.case_id, "overview", demoMode)}
                        className="jazan-inline-link"
                      >
                        Open case
                      </Link>
                    ) : (
                      "No case"
                    ),
                  ])
                : [["No municipalities ranked yet", "-", "-", "-", "-", "-", "-"]],
          })}
        </SectionCard>

        <SectionCard eyebrow="Trend and forecast" title="Observed trend and threshold reference line">
          {trendChart(kpi.trend)}
        </SectionCard>
      </div>

      <div className="jazan-two-column-grid jazan-two-column-grid--wide-right">
        <SectionCard eyebrow="Governance evidence" title="Classification, ownership, freshness, and lineage">
          {governanceMiniRail(kpi.governance)}
        </SectionCard>

        <SectionCard eyebrow="Open cases" title="Municipality cases generated from this KPI">
          <div className="jazan-list-stack">
            {kpi.open_cases.length > 0 ? (
              kpi.open_cases.map((item) => (
                <article key={item.case_id} className="jazan-list-row">
                  <div>
                    <strong>{item.municipality}</strong>
                    <p>{item.reason}</p>
                    <small>{item.owner}</small>
                  </div>
                  <Link href={item.href} className="jazan-inline-link">
                    Open case
                  </Link>
                </article>
              ))
            ) : (
              <p className="jazan-empty-copy">No open cases on this KPI.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function EnhancedStrategicScreen(props: { data: ShellData; demoMode: boolean }) {
  const { strategic_dashboard: strategic } = props.data;
  const activeCase =
    props.data.case_workspaces.find((item) => item.case_id === strategic.active_case_banner.case_id) ??
    props.data.case_workspaces[0] ??
    emptyCaseWorkspace;
  const kpiWorkspaceMap = new Map(props.data.kpi_workspaces.map((workspace) => [workspace.slug, workspace]));

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "01",
        title: "Strategic objective cascade - monitoring & thresholds",
        subtitle: "One objective - six governed KPIs - live threshold state",
        routeText: "Route 01 - strategic",
        snapshot: screenSnapshot(props.data),
        demoMode: props.demoMode,
      })}

      <section className="jazan-portfolio-hero">
        <div className="jazan-portfolio-hero-main">
          <div className="jazan-objective-copy">
            <span className="jazan-objective-tag">Strategic objective</span>
            <h2>{strategic.title}</h2>
            <p>{strategic.subtitle}</p>
            <small className="jazan-bilingual-copy">{STRATEGIC_OBJECTIVE_ARABIC}</small>
          </div>
          <div className="jazan-objective-chips">
            {strategic.objective_context.map((item) => (
              <span key={item} className="jazan-pill is-light">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="jazan-portfolio-summary-grid">
          {strategic.summary_strip.map((item) => (
            <article key={item.label} className="jazan-portfolio-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{statusLookup(item.label)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="jazan-cascade-shell">
        <div className="jazan-cascade-shell-header">
          <span>Cascade - one objective to six KPIs - drill into any KPI workspace</span>
          <small>live seeded navigation</small>
        </div>
        <div className="jazan-cascade-objective-anchor">
          <span className="jazan-cascade-objective-badge">OBJ-SVC-QUALITY-01</span>
          <strong>Objective governance spine</strong>
        </div>
        <div className="jazan-cascade-grid">
          {strategic.kpi_cards.map((card) => (
            <Link key={card.slug} href={card.href} className="jazan-cascade-column">
              <span className={`jazan-cascade-line tone-${card.status_tone}`} />
              <span className={`jazan-cascade-dot tone-${card.status_tone}`} />
              <strong>{card.short_label}</strong>
              <small>{card.name}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="jazan-kpi-showcase-grid">
        {strategic.kpi_cards.map((card) => {
          const workspace = kpiWorkspaceMap.get(card.slug);
          return (
            <Link
              key={card.slug}
              href={card.href}
              className={`jazan-kpi-showcase-card kpi-card ${`kpi-card--${severityFromTone(card.status_tone)}`}`}
            >
              <div className="jazan-kpi-card-header">
                <div>
                  <span>{card.short_label}</span>
                  <h3>{card.name}</h3>
                  <small className="jazan-bilingual-copy">{KPI_ARABIC_LABELS[card.slug] ?? "Operational KPI"}</small>
                </div>
                {renderStatusBadge(card.status, card.status_tone)}
              </div>

              <div className="jazan-kpi-card-value-row">
                <div>
                  <strong className="jazan-kpi-card-main-value">{card.current_value}</strong>
                  <span>{`target ${card.target_value}`}</span>
                </div>
                <div className="jazan-kpi-card-target">
                  {sparklinePath(workspace?.trend ?? [])}
                  <small>{card.delta}</small>
                </div>
              </div>

              {compactThresholdBar(card)}

              <div className="jazan-kpi-pill-row">
                <span className="jazan-pill is-light">{card.owner}</span>
                <span className="jazan-pill is-light">{card.cadence}</span>
                {(workspace?.open_cases.length ?? 0) > 0 ? (
                  <span className="jazan-pill is-light">{`${workspace?.open_cases.length ?? 0} open cases`}</span>
                ) : null}
              </div>

              <p className="jazan-threshold-trigger">{card.trigger}</p>
            </Link>
          );
        })}
      </section>

      {strategic.active_case_banner.case_id ? (
        <section className="jazan-portfolio-alert">
          <div className="jazan-workspace-alert-copy">
            <span className="jazan-alert-tag">Active risk case - highest priority</span>
            <h3>{`${strategic.active_case_banner.municipality} - ${strategic.active_case_banner.kpi}`}</h3>
            <p>{strategic.active_case_banner.summary}</p>
            <small className="jazan-mono-text">{`${activeCase.case_id} - ${activeCase.status}`}</small>
          </div>
          <div className="jazan-alert-metrics">
            <div>
              <span>Risk score</span>
              <strong>{strategic.active_case_banner.risk_score}</strong>
            </div>
            <div>
              <span>Forecast breach</span>
              <strong>{strategic.active_case_banner.breach_probability}</strong>
            </div>
            <Link href={strategic.active_case_banner.href} className="jazan-case-link-button">
              Review case
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EnhancedKpiWorkspaceScreen(props: { kpi: KpiWorkspace; demoMode: boolean; data: ShellData }) {
  const { kpi, demoMode, data } = props;
  const breakdown = workspaceBreakdown(kpi);
  const direction = THRESHOLD_CONFIG[kpi.slug]?.direction === "lower" ? "lower is better" : "higher is better";
  const openCase = kpi.open_cases[0];
  const tabLinks = [
    { id: "overview", label: "Overview", href: buildHref(`${baseRoute}/kpi/${kpi.slug}`, demoMode), active: true },
    { id: "decisions", label: "Decisions", href: buildHref(`${baseRoute}/decisions`, demoMode), active: false },
    { id: "runtimes", label: "Runtimes", href: buildHref(`${baseRoute}/runtimes`, demoMode), active: false },
    { id: "audit", label: "Audit", href: buildHref(`${baseRoute}/audit`, demoMode), active: false },
  ];

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "02",
        title: "KPI workspace - municipality monitoring and governance",
        subtitle: "Show KPI status by municipality, portfolio trend, open cases, and the drill path into case review",
        routeText: "Route 02 - KPI workspace",
        snapshot: screenSnapshot(data),
        demoMode,
      })}

      <section className="jazan-workspace-hero">
        <div className="jazan-workspace-hero-header">
          <div className="jazan-workspace-definition">
            <div className="jazan-workspace-code">
              <span className="jazan-pill">{kpi.short_label.replace(" ", "-")}</span>
              {renderStatusBadge(kpi.status, kpi.status_tone)}
            </div>
            <h2>{kpi.name}</h2>
            <p>{`Portfolio current ${kpi.current_value} against target ${kpi.target_value}. ${
              THRESHOLD_CONFIG[kpi.slug]?.direction === "lower"
                ? "Lower values indicate stronger service delivery."
                : "Higher values indicate stronger service delivery."
            }`}</p>
            <small className="jazan-bilingual-copy">{KPI_ARABIC_LABELS[kpi.slug] ?? "Operational KPI"}</small>
          </div>

          <div className="jazan-workspace-meta-grid">
            <article className="jazan-workspace-meta-item">
              <span>Target</span>
              <strong>{kpi.target_value}</strong>
            </article>
            <article className="jazan-workspace-meta-item">
              <span>Trigger</span>
              <strong>{kpi.trigger}</strong>
            </article>
            <article className="jazan-workspace-meta-item">
              <span>Direction</span>
              <strong>{direction}</strong>
            </article>
            <article className="jazan-workspace-meta-item">
              <span>Owner</span>
              <strong>{kpi.owner}</strong>
            </article>
          </div>
        </div>

        <div className="jazan-workspace-summary-row">
          {breakdown.map((item) => (
            <article key={item.label} className="jazan-workspace-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.note ? <small>{item.note}</small> : null}
            </article>
          ))}
        </div>
      </section>

      <nav className="jazan-workspace-tabs" aria-label="KPI workspace tabs">
        {tabLinks.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`jazan-workspace-tab${tab.active ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <SectionCard eyebrow="Portfolio trend" title="Cross-municipality average and threshold reference">
        {workspaceTrendChart(kpi.trend, kpi.slug)}
      </SectionCard>

      {openCase ? (
        <section className="jazan-workspace-alert">
          <div className="jazan-workspace-alert-copy">
            <span className="jazan-alert-tag">{`${kpi.open_cases.length} open case${kpi.open_cases.length > 1 ? "s" : ""} on this KPI`}</span>
            <h3>{`${openCase.municipality} requires review`}</h3>
            <p>{kpi.open_cases.map((item) => `${item.case_id} - ${item.municipality}`).join(" - ")}</p>
            <small>{openCase.reason}</small>
          </div>
          <Link href={openCase.href} className="jazan-case-link-button">
            Review case
          </Link>
        </section>
      ) : null}

      <section className="jazan-ranking-shell">
        <div className="jazan-ranking-header">
          <div>
            <h3>{`Municipality ranking - ${PORTFOLIO_MUNICIPALITY_COUNT} municipalities`}</h3>
            <p>Current value, position, target delta, and direct drill path into the case workspace.</p>
          </div>
        </div>
        {municipalityRankingTable(kpi, demoMode)}
      </section>

      <SectionCard eyebrow="Governance evidence" title="Classified assets, freshness, and lineage path">
        {governanceEvidenceModule(kpi, data)}
      </SectionCard>
    </div>
  );
}

function BundleCaseWorkspaceScreen(props: {
  route: Extract<RouteState, { kind: "case" }>;
  caseWorkspace: CaseWorkspace;
  demoMode: boolean;
  data: ShellData;
  decisionStep: DecisionStep;
}) {
  const { route, caseWorkspace, demoMode, data, decisionStep } = props;
  const kpiWorkspace = findKpiWorkspace(data, caseWorkspace.kpi_slug);
  const caseCode = caseWorkspace.case_id.replace(/^JZN-/, "");
  const activeTab = route.tab === "recovery" ? null : route.tab;
  const overviewHref = buildCaseHref(caseWorkspace.case_id, "overview", demoMode);
  const intelligenceHref = buildCaseHref(caseWorkspace.case_id, "intelligence", demoMode);
  const decisionHref = buildCaseHref(caseWorkspace.case_id, "decisions", demoMode);
  const contributionTotal = caseWorkspace.intelligence.feature_contributions.reduce(
    (sum, item) => sum + extractNumber(item.value),
    0,
  );
  const primaryRecommendation = caseWorkspace.intelligence.ranked_actions[0];
  const secondaryRecommendation = caseWorkspace.intelligence.ranked_actions[1];
  const bilingualNarrative = arabicRationale(caseWorkspace.case_id, caseWorkspace.rationale);
  const tabs: Array<{ id: Extract<CaseTab, "overview" | "intelligence" | "decisions">; label: string; href: string }> = [
    { id: "overview", label: "Overview", href: overviewHref },
    { id: "intelligence", label: "Intel", href: intelligenceHref },
    { id: "decisions", label: "Decide", href: decisionHref },
  ];
  const isRecoveryLocked = !["closed", "recovered"].includes(caseWorkspace.status.toLowerCase());
  const actionButtons = ensureActionButtons(caseWorkspace.decisions.action_buttons);
  const linkedAction = data.decision_action_audit.corrective_actions.find((row) => row.decision_id === caseWorkspace.case_id);
  const linkedNotification = data.decision_action_audit.email_log.find((row) => row.linked_decision_id === caseWorkspace.case_id);
  const evidenceSummary = caseWorkspace.decisions.evidence_pack.map((item) => item.label).slice(0, 2).join(" · ");
  const comparableCases = data.case_workspaces.filter((item) => item.case_id !== caseWorkspace.case_id).slice(0, 2);
  const headlineStatus = caseWorkspace.status === "Awaiting review" ? "Under review" : caseWorkspace.status;
  const selectedActionButton = actionButtons.find((button) => button.id !== "view-details") ?? actionButtons[0];
  const selectedActionPreview = selectedActionButton ? actionConsequence(selectedActionButton) : null;
  const decisionCycle = [
    {
      id: "review" as const,
      label: "1. Review evidence",
      title: "Review certified evidence before choosing an action",
      summary: "Forecast, anomaly, governance, and KPI context should be read together before approval.",
    },
    {
      id: "action" as const,
      label: "2. Select action",
      title: "Choose the operational response with the strongest recovery path",
      summary: "Comparable-case effectiveness and owner capacity should guide the action choice.",
    },
    {
      id: "consequences" as const,
      label: "3. Preview consequences",
      title: "Preview the external and internal side effects before firing the action",
      summary: "Every email, ticket, or escalation should be visible before a human confirms it.",
    },
    {
      id: "authorise" as const,
      label: "4. Authorise and log",
      title: "Human reviewer authorises the action and writes the approval record",
      summary: "Bilingual rationale and audit logging are part of the decision, not an afterthought.",
    },
    {
      id: "recovery" as const,
      label: "5. Track recovery",
      title: "Keep the recovery path visible even before closure",
      summary: "The decision remains accountable until measured recovery evidence unlocks.",
    },
  ];
  const pageLabel =
    route.tab === "intelligence"
      ? "Model intelligence"
      : route.tab === "decisions"
        ? "Decision command"
        : route.tab === "recovery"
          ? "Outcome recovery"
          : "Case";
  const pageHeading =
    route.tab === "overview"
      ? `Case ${caseWorkspace.case_id}`
      : `${pageLabel} · ${caseCode}`;
  const pagePath = [
    "Portfolio",
    kpiWorkspace.short_label,
    caseWorkspace.municipality,
    caseCode,
    route.tab === "overview" ? null : pageLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="jazan-case-suite">
      <header className="jazan-case-page-header">
        <div>
          <p className="jazan-case-page-path">{pagePath}</p>
          <h2>{pageHeading}</h2>
        </div>
        <div className="jazan-case-page-tools">
          <span className="jazan-case-mode-pill">EN</span>
          <span className="jazan-case-mode-pill">عربي</span>
          {route.tab === "intelligence" ? (
            <span className="jazan-case-live-pill is-muted">Evidence-only · no actions on this tab</span>
          ) : null}
          {route.tab === "recovery" && isRecoveryLocked ? (
            <span className="jazan-case-live-pill is-muted">Recovery locked until closure</span>
          ) : null}
          <span className="jazan-case-live-pill">Live · seeded demo</span>
        </div>
      </header>

      <section className="jazan-case-hero-card">
        <div className="jazan-case-hero-main">
          <div className="jazan-case-hero-title">
            <span className="jazan-case-id-chip">{caseCode}</span>
            <h3>{`${caseWorkspace.municipality} · ${caseWorkspace.kpi_name}`}</h3>
          </div>
          <div className="jazan-case-status-row">
            <span className="jazan-case-chip is-review">{headlineStatus}</span>
            {linkedNotification ? <span className="jazan-case-chip is-lilac">Action fired</span> : null}
          </div>
        </div>

        <nav className="jazan-case-subtabs" aria-label="Case workspace tabs">
          {tabs.map((tab) => (
            <Link key={tab.id} href={tab.href} className={`jazan-case-subtab${activeTab === tab.id ? " is-active" : ""}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
      </section>

      {route.tab === "overview" ? (
        <>
          <section className="jazan-case-summary-card">
            <div className="jazan-case-summary-copy">
              <span className="jazan-case-summary-eyebrow">Situation summary</span>
              <p>
                {caseWorkspace.rationale}{" "}
                {linkedNotification ? `Email-owner action has already been fired through ${linkedNotification.template}. ` : ""}
                {linkedAction ? "Reviewer may close this case or escalate once the corrective action is confirmed." : ""}
              </p>
            </div>
          </section>

          <section className="jazan-case-chart-card">
            <div className="jazan-case-chart-header">
              <h3>{`KPI trajectory · ${caseWorkspace.municipality} · breach onset annotated`}</h3>
            </div>
            {caseTrajectoryChart(caseWorkspace)}
          </section>

          <div className="jazan-case-drill-grid">
            <article className="jazan-case-drill-card">
              <div className="jazan-case-drill-top">
                <span className="jazan-case-summary-eyebrow">Model intelligence</span>
                <Link href={intelligenceHref} className="jazan-case-arrow-link">
                  →
                </Link>
              </div>
              <strong>{`${caseWorkspace.risk_score} / 100`}</strong>
              <span>composite risk score</span>
              <p>{`Forecast breach probability ${caseWorkspace.breach_probability} · ${caseWorkspace.intelligence.ranked_actions.length} ranked interventions. See full breakdown.`}</p>
            </article>

            <article className="jazan-case-drill-card">
              <div className="jazan-case-drill-top">
                <span className="jazan-case-summary-eyebrow">Decision command</span>
                <Link href={decisionHref} className="jazan-case-arrow-link">
                  →
                </Link>
              </div>
              <div className="jazan-version-row">
                {linkedAction ? <span className="jazan-pill">Close</span> : null}
                {linkedNotification ? <span className="jazan-pill">Email · fired</span> : null}
              </div>
              <p>
                {linkedNotification
                  ? "Email-owner action already executed. Reviewer may close case or escalate."
                  : "No outbound action has been fired yet. Reviewer should open the decision command."}
              </p>
            </article>
          </div>

          <div className="jazan-case-id-grid">
            <article className="jazan-case-id-card">
              <span>Case</span>
              <strong>{caseWorkspace.case_id}</strong>
            </article>
            <article className="jazan-case-id-card">
              <span>Action</span>
              <strong>{linkedAction?.action_id ?? "Pending"}</strong>
            </article>
            <article className="jazan-case-id-card">
              <span>Notification</span>
              <strong>{linkedNotification?.notification_id ?? "Pending"}</strong>
            </article>
            <article className="jazan-case-id-card">
              <span>Evidence pack</span>
              <strong>{evidenceSummary || "Certified evidence"}</strong>
            </article>
          </div>
        </>
      ) : null}

      {route.tab === "intelligence" ? (
        <>
          <div className="jazan-case-intel-grid">
            <article className="jazan-case-risk-card">
              <span className="jazan-case-summary-eyebrow">Composite risk score</span>
              <div className="jazan-case-risk-value">
                <strong>{caseWorkspace.risk_score}</strong>
                <span>/ 100</span>
              </div>
              <span className="jazan-case-risk-badge">High risk</span>
              <p>{`Forecast breach persists at ${caseWorkspace.breach_probability}. Anomaly sustained across the seeded observation window.`}</p>
              <span className="jazan-case-ghost-score">{caseWorkspace.risk_score}</span>
            </article>

            <article className="jazan-case-contribution-card">
              <h3>Feature contribution to risk score</h3>
              <p>{`Sums to ${Math.round(contributionTotal)}`}</p>
              <div className="jazan-case-contribution-list">
                {caseWorkspace.intelligence.feature_contributions.map((item) => {
                  const width = contributionTotal > 0 ? `${(extractNumber(item.value) / contributionTotal) * 100}%` : "0%";
                  return (
                    <div key={item.label} className="jazan-case-contribution-row">
                      <div className="jazan-case-contribution-meta">
                        <span>{item.label}</span>
                        <strong>{Math.round(extractNumber(item.value))}</strong>
                      </div>
                      <div className="jazan-case-contribution-track">
                        <span className="jazan-case-contribution-fill" style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <article className="jazan-case-comparable-card">
            <div className="jazan-case-comparable-header">
              <span className="jazan-case-summary-eyebrow">Comparable interventions · effectiveness gap detected</span>
              <p>
                {`Model recommended email-owner, but historically comparable breach cases recover more reliably under ${
                  primaryRecommendation?.title.toLowerCase() ?? "manual intervention"
                }${
                  secondaryRecommendation ? ` and ${secondaryRecommendation.title.toLowerCase()}` : ""
                }.`}
              </p>
            </div>
            <div className="jazan-case-comparable-grid">
              {comparableCases.map((item, index) => (
                <article key={item.case_id} className="jazan-case-comparable-item">
                  <div className="jazan-case-comparable-top">
                    <span className="jazan-pill">{`Rank ${index + 1}`}</span>
                    <span className="jazan-case-chip is-recovered">{item.status}</span>
                  </div>
                  <strong>{item.municipality}</strong>
                  <p>{caseWorkspace.intelligence.ranked_actions[index]?.title ?? item.kpi_name}</p>
                  <div className="jazan-case-comparable-metric">
                    <span>Recovery impact</span>
                    <strong>{caseWorkspace.intelligence.ranked_actions[index]?.impact ?? item.current_value}</strong>
                  </div>
                </article>
              ))}
              <article className="jazan-case-comparable-item is-current">
                <div className="jazan-case-comparable-top">
                  <span className="jazan-pill">This case</span>
                  <span className="jazan-case-chip is-progress">{headlineStatus}</span>
                </div>
                <strong>{caseWorkspace.municipality}</strong>
                <p>{linkedNotification ? "email owner · fired" : "email owner · pending"}</p>
                <div className="jazan-case-comparable-metric">
                  <span>Current action</span>
                  <strong>{linkedAction?.status ?? "Pending"}</strong>
                </div>
              </article>
            </div>
            <div className="jazan-case-comparable-footer">
              <span>{`Measured in ${caseWorkspace.intelligence.outputs[0]}.`}</span>
              <Link href={decisionHref} className="jazan-inline-link">
                Decide action
              </Link>
            </div>
          </article>
        </>
      ) : null}

      {route.tab === "decisions" ? (
        <>
          <SectionCard eyebrow="Decision cycle" title="Move the reviewer through a clear authorisation sequence">
            <div className="jazan-decision-cycle">
              {decisionCycle.map((step, index) => (
                <Link
                  key={step.id}
                  href={buildDecisionStepHref(caseWorkspace.case_id, step.id, demoMode)}
                  className={`jazan-decision-step${decisionStep === step.id ? " is-active" : ""}${index < decisionCycle.length - 1 ? " has-connector" : ""}`}
                >
                  <span className="jazan-decision-step-index">{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.summary}</small>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow={decisionCycle.find((step) => step.id === decisionStep)?.label ?? "Decision step"}
            title={decisionCycle.find((step) => step.id === decisionStep)?.title ?? "Decision workflow"}
          >
            {decisionStep === "review" ? (
              <div className="jazan-card-grid">
                {caseWorkspace.overview_metrics.map((item) => (
                  <article key={item.label} className="jazan-detail-card">
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                    {item.note ? <small>{item.note}</small> : null}
                  </article>
                ))}
                {caseWorkspace.decisions.evidence_pack.map((item) => (
                  <article key={item.label} className="jazan-detail-card">
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {decisionStep === "action" ? (
              <div className="jazan-card-grid">
                <article className="jazan-detail-card">
                  <strong>Top recommendation</strong>
                  <p>{primaryRecommendation?.title ?? "—"}</p>
                  <small>{primaryRecommendation?.impact ?? "Awaiting runtime evidence"}</small>
                </article>
                <article className="jazan-detail-card">
                  <strong>Second-best option</strong>
                  <p>{secondaryRecommendation?.title ?? "—"}</p>
                  <small>{secondaryRecommendation?.impact ?? "No seeded uplift attached yet"}</small>
                </article>
                <article className="jazan-detail-card">
                  <strong>Operational owner</strong>
                  <p>{caseWorkspace.owner}</p>
                  <small>{`Decision due ${caseWorkspace.due_date}`}</small>
                </article>
              </div>
            ) : null}

            {decisionStep === "consequences" ? (
              <div className="jazan-consequence-grid">
                {actionButtons.map((button) => (
                  <article key={`${button.id}-preview`} className="jazan-consequence-card">
                    <span className="jazan-pill">{button.label}</span>
                    <strong>{button.label}</strong>
                    <p>{actionConsequence(button).effect}</p>
                    <small>{actionConsequence(button).records}</small>
                    <small>{actionConsequence(button).audience}</small>
                  </article>
                ))}
              </div>
            ) : null}

            {decisionStep === "authorise" ? (
              <div className="jazan-screen-stack compact">
                <div className="jazan-two-column-grid">
                  <article className="jazan-detail-card">
                    <strong>English rationale</strong>
                    <p>{caseWorkspace.rationale}</p>
                    <div className="jazan-version-row">
                      <span className="jazan-pill">Edit draft</span>
                      <span className="jazan-pill">Version history</span>
                    </div>
                  </article>
                  <article className="jazan-detail-card">
                    <strong>Arabic rationale</strong>
                    <p className="jazan-bilingual-copy">{bilingualNarrative}</p>
                    <div className="jazan-version-row">
                      <span className="jazan-pill">تحرير</span>
                      <span className="jazan-pill">سجل الإصدارات</span>
                    </div>
                  </article>
                </div>
                {renderDecisionButtons(actionButtons, decisionHref)}
                <p className="jazan-action-notice">{caseWorkspace.decisions.human_authorisation_note}</p>
              </div>
            ) : null}

            {decisionStep === "recovery" ? (
              <div className="jazan-card-grid">
                <article className="jazan-detail-card">
                  <strong>Recovery visibility</strong>
                  <p>{isRecoveryLocked ? "Locked until closure" : "Recovery evidence available"}</p>
                  <small>The recovery tab stays visible for continuity even before measured closure evidence is unlocked.</small>
                </article>
                <article className="jazan-detail-card">
                  <strong>Current action record</strong>
                  <p>{linkedAction?.action_id ?? "Pending"}</p>
                  <small>{linkedAction?.status ?? "No corrective action has been created yet"}</small>
                </article>
                <article className="jazan-detail-card">
                  <strong>Outbound notification</strong>
                  <p>{linkedNotification?.notification_id ?? "Pending"}</p>
                  <small>{linkedNotification?.status ?? "No external message has been sent yet"}</small>
                </article>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard eyebrow="Audit assurance" title="Human authorisation, no autonomous escalation, append-only evidence">
            <div className="jazan-card-grid">
              <article className="jazan-detail-card">
                <strong>HITL assurance</strong>
                <p>No approval runs autonomously from this page.</p>
              </article>
              <article className="jazan-detail-card">
                <strong>Selected action preview</strong>
                <p>{selectedActionPreview?.effect ?? "Human-authorised workflow action"}</p>
                <small>{selectedActionPreview?.records ?? "Audit event only"}</small>
              </article>
            </div>
          </SectionCard>
        </>
      ) : null}

      {route.tab === "recovery" ? (
        isRecoveryLocked ? (
          <section className="jazan-case-summary-card">
            <div className="jazan-case-summary-copy">
              <span className="jazan-case-summary-eyebrow">Recovery locked</span>
              <p>
                {`This case remains ${caseWorkspace.status.toLowerCase()}. Recovery proof, pillar credits, and accuracy scoring unlock after the authorised action closes the case.`}
              </p>
            </div>
            <Link href={decisionHref} className="jazan-case-link-button">
              Return to decision command
            </Link>
          </section>
        ) : (
          <>
            <SectionCard eyebrow="Before, target, after" title="Measured values before action and after closure">
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
                  <strong>After 90 days</strong>
                  <p>—</p>
                  <small>No day-90 measurement has been seeded yet</small>
                </article>
              </div>
            </SectionCard>

            <SectionCard eyebrow="Recovery trajectory" title="Recovery path and approval marker">
              {trendChart([
                {
                  label: "Baseline",
                  actual: extractNumber(caseWorkspace.recovery.baseline),
                  target: extractNumber(caseWorkspace.recovery.target),
                },
                {
                  label: "Approved",
                  actual: extractNumber(caseWorkspace.recovery.baseline),
                  target: extractNumber(caseWorkspace.recovery.target),
                },
                {
                  label: "Day 30",
                  actual: extractNumber(caseWorkspace.recovery.after_30_days),
                  target: extractNumber(caseWorkspace.recovery.target),
                },
                {
                  label: "Day 90",
                  forecast: extractNumber(caseWorkspace.recovery.after_30_days),
                  target: extractNumber(caseWorkspace.recovery.target),
                },
              ])}
              <p className="jazan-seed-note">Action-approved marker is carried from the first decision approval event in the seeded audit history.</p>
            </SectionCard>

            <div className="jazan-two-column-grid">
              <SectionCard eyebrow="Model learning feedback" title="Forecast accuracy and recommendation effectiveness">
                <div className="jazan-card-grid">
                  <article className="jazan-detail-card">
                    <strong>Forecast accuracy</strong>
                    <p>{caseWorkspace.recovery.forecast_accuracy}</p>
                  </article>
                  <article className="jazan-detail-card">
                    <strong>Intervention effectiveness</strong>
                    <p>{caseWorkspace.recovery.intervention_effectiveness}</p>
                  </article>
                </div>
              </SectionCard>

              <SectionCard eyebrow="Pillar credits" title="Binary credited or not-credited learning outcomes">
                <ul className="jazan-bullet-list">
                  {caseWorkspace.recovery.learning_pillars.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SectionCard>
            </div>

            <SectionCard eyebrow="Evidence pack footer" title="Audited evidence pack for recovery review">
              <div className="jazan-card-grid">
                {props.data.governance_evidence.evidence_packs
                  .filter((item) => item.name === "Outcome learning pack")
                  .map((item) => (
                    <article key={item.name} className="jazan-detail-card">
                      <strong>{item.name}</strong>
                      <p>{item.contents}</p>
                    </article>
                  ))}
              </div>
            </SectionCard>
          </>
        )
      ) : null}
    </div>
  );
}

function BundleDecisionCommandScreen(props: { data: ShellData; selected: CaseWorkspace; demoMode: boolean }) {
  const counters = buildDecisionCounters(props.data);
  const detailHref = buildCaseHref(props.selected.case_id, "decisions", props.demoMode);

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "04",
        title: "Decision command centre",
        subtitle: "Generated decisions awaiting human review and approval",
        routeText: "Route 04 - decision command",
        snapshot: screenSnapshot(props.data),
        demoMode: props.demoMode,
      })}

      <section className="jazan-summary-band jazan-summary-band--decision">
        {counters.map((item) => (
          <article key={item.label} className="jazan-summary-counter">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <div className="jazan-two-column-grid jazan-two-column-grid--wide-left">
        <SectionCard eyebrow="Decision candidate queue" title="Generated decisions waiting for human review">
          <div className="jazan-list-stack">
            {props.data.decision_command.queue.map((row) => {
              const isSelected = row.decision_id === props.selected.case_id;
              const isUrgent = row.status === "Awaiting review";
              return (
                <article
                  key={row.decision_id}
                  className={`jazan-list-row jazan-queue-row${isSelected ? " is-selected" : ""}${isUrgent ? " is-urgent" : ""}`}
                >
                  <div className="jazan-screen-stack compact">
                    <div className="jazan-queue-meta">
                      <strong className="jazan-mono-text">{row.decision_id}</strong>
                      {renderStatusBadge(row.status, isUrgent ? "warning" : "positive")}
                    </div>
                    <div>
                      <strong>{`${row.municipality} - ${row.kpi}`}</strong>
                      <p>{`${row.recommendation} | risk ${row.risk_score} | breach ${row.breach_probability}`}</p>
                      <small>{`${row.owner} - due ${row.due_date}`}</small>
                    </div>
                  </div>
                  <div className="jazan-queue-actions">
                    <Link href={buildHref(`${baseRoute}/decisions?selected=${row.decision_id}`, props.demoMode)} className="jazan-inline-link">
                      Focus
                    </Link>
                    <Link href={buildCaseHref(row.decision_id, "decisions", props.demoMode)} className="jazan-inline-link">
                      Open case
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <div className="jazan-screen-stack compact">
          <SectionCard eyebrow="Selected decision detail" title={`${props.selected.case_id} - ${props.selected.municipality}`}>
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
          </SectionCard>

          <SectionCard eyebrow="Recommended actions" title="Ranked intervention list for the selected municipality">
            <div className="jazan-recommendation-grid">
              {props.selected.intelligence.ranked_actions.map((action, index) => (
                <article key={`${props.selected.case_id}-${action.title}`} className="jazan-recommendation-card">
                  <span className="jazan-pill is-light">{`#${index + 1}`}</span>
                  <strong>{action.title}</strong>
                  <p>{action.impact}</p>
                  <small>{action.note}</small>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Human-authorised action area" title="External side effects require explicit confirmation">
            <p className="jazan-action-notice">{props.data.decision_command.human_authorisation_note}</p>
            {renderDecisionButtons(props.data.decision_command.action_buttons, detailHref)}
          </SectionCard>
        </div>
      </div>

      <div className="jazan-two-column-grid">
        <SectionCard eyebrow="Confirmation drawer" title="No external workflow runs without review">
          <div className="jazan-consequence-grid">
            {ensureActionButtons(props.data.decision_command.action_buttons).map((button) => (
              <article key={`${button.id}-drawer`} className="jazan-consequence-card">
                <strong>{button.label}</strong>
                <p>{actionConsequence(button).effect}</p>
                <small>{actionConsequence(button).records}</small>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Corrective action lifecycle" title="Action stages remain visible after approval">
          <div className="jazan-lifecycle-strip">
            {props.data.decision_action_audit.corrective_actions.map((action) => (
              <article key={action.action_id} className="jazan-lifecycle-card">
                <strong>{action.action_id}</strong>
                <p>{action.action_plan}</p>
                <small>{`${action.owner} - ${action.status}`}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function BundleRuntimeEvidenceScreen(props: { data: ShellData; demoMode: boolean }) {
  const onlineCount = props.data.runtime_evidence.runtime_cards.filter((runtime) => runtime.status === "online").length;
  const summaryItems: Metric[] = [
    { label: "Online runtimes", value: `${onlineCount} / ${props.data.runtime_evidence.runtime_cards.length}` },
    { label: "Last executions", value: props.data.runtime_evidence.execution_history.length.toString() },
    { label: "Next run", value: props.data.runtime_evidence.runtime_cards[0]?.next_run ?? "-" },
    { label: "Mode", value: props.data.runtime_evidence.seed_note },
  ];

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "05",
        title: "Runtime evidence and execution history",
        subtitle: "Show predictive runtimes, input marts, output tables, and the last execution trail",
        routeText: "Route 05 - runtime evidence",
        snapshot: screenSnapshot(props.data),
        demoMode: props.demoMode,
      })}

      <section className="jazan-summary-band">
        {summaryItems.map((item) => (
          <article key={item.label} className="jazan-summary-counter">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="jazan-runtime-card-grid">
        {props.data.runtime_evidence.runtime_cards.map((runtime) => (
          <article key={runtime.runtime_id} className="jazan-runtime-card">
            <div className="jazan-runtime-card-header">
              <div>
                <span className="jazan-mono-text">{runtime.runtime_id}</span>
                <h3>{runtime.name}</h3>
                <small>{runtime.model_family ?? "Seeded runtime"}</small>
              </div>
              <div className="jazan-screen-stack compact">
                {renderStatusBadge(runtime.status, runtime.status === "online" ? "positive" : "warning")}
                {runtime.hitl ? <span className="jazan-pill">HITL</span> : null}
              </div>
            </div>
            <p className="jazan-mono-text">{runtime.image}</p>
            <div className="jazan-runtime-stats">
              <span>{`Last run ${runtime.last_run}`}</span>
              <span>{runtime.duration}</span>
              <span>{`${runtime.rows_out} rows`}</span>
              <span>{`Next ${runtime.next_run}`}</span>
            </div>
            <div className="jazan-runtime-run-strip">
              {(runtime.last_seven_runs ?? []).map((status, index) => (
                <span
                  key={`${runtime.runtime_id}-run-${index}`}
                  className={`jazan-runtime-run-dot${runtimeRunTone(status)}`}
                  title={status === "degraded" ? "retry_succeeded" : status}
                />
              ))}
            </div>
            <div className="jazan-runtime-io">
              <strong>Inputs</strong>
              <span className="jazan-mono-text">{runtime.inputs.join(", ")}</span>
              <strong>Outputs</strong>
              <span className="jazan-mono-text">{runtime.outputs.join(", ")}</span>
            </div>
            <small>{runtime.note ?? "No execution recorded yet"}</small>
          </article>
        ))}
      </section>

      <SectionCard eyebrow="Execution history" title="Last seven execution traces with honest degraded days">
        <div className="jazan-list-stack">
          {props.data.runtime_evidence.runtime_cards.map((runtime) => (
            <article key={`${runtime.runtime_id}-history`} className="jazan-list-row">
              <div>
                <strong>{runtime.name}</strong>
                <p className="jazan-mono-text">{runtime.runtime_id}</p>
                <small>{runtime.note ?? "No execution recorded yet"}</small>
              </div>
              <div className="jazan-runtime-run-strip">
                {(runtime.last_seven_runs ?? []).map((status, index) => (
                  <span
                    key={`${runtime.runtime_id}-history-${index}`}
                    className={`jazan-runtime-run-dot${runtimeRunTone(status)}`}
                    title={status === "degraded" ? "retry_succeeded" : status}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="jazan-two-column-grid">
        <SectionCard eyebrow="Input and output lineage" title="Runtime path stays above raw layer and under governance">
          <div className="jazan-pill-row">
            {props.data.runtime_evidence.lineage_flow.map((step) => (
              <span key={step} className="jazan-pill">
                {step}
              </span>
            ))}
          </div>
          <p className="jazan-seed-note">Raw-layer reads are forbidden on this dashboard surface. Inputs remain analytics.* and outputs remain decision/output identifiers.</p>
        </SectionCard>

        <SectionCard eyebrow="Schedules and next run" title="Declared cadence and next execution window">
          <div className="jazan-list-stack">
            {props.data.runtime_evidence.runtime_cards.map((runtime) => (
              <article key={`${runtime.runtime_id}-schedule`} className="jazan-list-row">
                <div>
                  <strong>{runtime.name}</strong>
                  <p>{runtime.image}</p>
                </div>
                <small>{runtime.next_run}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function BundleAuditScreen(props: { data: ShellData; demoMode: boolean }) {
  const counters = buildAuditCounters(props.data);

  return (
    <div className="jazan-screen-stack">
      {renderScreenHeader({
        screenId: "06",
        title: "Decision queue and action audit",
        subtitle: "See actions taken, emails sent, tickets created, and corrective-action closure",
        routeText: "Route 06 - action audit",
        snapshot: screenSnapshot(props.data),
        demoMode: props.demoMode,
      })}

      <section className="jazan-summary-band jazan-summary-band--audit">
        {counters.map((item) => (
          <article key={item.label} className="jazan-summary-counter">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <SectionCard eyebrow="Decision queue" title="Queue state carried into audit and corrective action follow-through">
        {dataTable({
          columns: ["Decision", "Municipality", "KPI", "Risk", "Status", "Due", "Trace"],
          rows: props.data.decision_action_audit.queue.map((row) => [
            row.decision_id,
            row.municipality,
            row.kpi,
            row.risk_score,
            renderStatusBadge(row.status, row.status === "Awaiting review" ? "warning" : "positive"),
            row.due_date,
            <Link key={`${row.decision_id}-trace`} href={buildHref(`${baseRoute}/audit?selected=${row.decision_id}`, props.demoMode)} className="jazan-inline-link">
              Action history
            </Link>,
          ]),
        })}
      </SectionCard>

      <div className="jazan-three-column-grid">
        <SectionCard eyebrow="Action event timeline" title="Who acted, through which channel, and with what result">
          <div className="jazan-list-stack">
            {props.data.decision_action_audit.action_history.map((row) => (
              <article key={`${row.time}-${row.action}`} className="jazan-timeline-row">
                <div>
                  <strong>{row.action}</strong>
                  <p>{`${row.actor} via ${row.channel}`}</p>
                  <small>{row.time}</small>
                </div>
                <div className="jazan-screen-stack compact">
                  {renderStatusBadge(row.result, row.result === "Sent" ? "positive" : "neutral")}
                  {row.created_record ? (
                    <span className="jazan-mono-text">{row.created_record}</span>
                  ) : (
                    <span className="jazan-mono-text">â€”</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Email delivery log" title="Notification outbox and delivery evidence">
          {dataTable({
            columns: ["Notification", "Recipient", "Subject", "Template", "Status", "Sent at", "Decision"],
            rows:
              props.data.decision_action_audit.email_log.length > 0
                ? props.data.decision_action_audit.email_log.map((row) => [
                    row.notification_id ?? "â€”",
                    row.recipient_role ?? row.recipient,
                    row.subject ?? row.template,
                    row.template,
                    row.status,
                    row.sent_at,
                    row.linked_decision_id ?? "â€”",
                  ])
                : [["No seeded emails yet", "-", "-", "-", "-", "-", "-"]],
          })}
        </SectionCard>

        <SectionCard eyebrow="Ticket request log" title="External ticketing references linked to actions">
          {dataTable({
            columns: ["System", "Ticket", "Priority", "Status", "External ref", "Action"],
            rows:
              props.data.decision_action_audit.ticket_log.length > 0
                ? props.data.decision_action_audit.ticket_log.map((row) => [
                    row.system,
                    row.ticket_id,
                    row.priority,
                    row.status,
                    row.external_ticket_ref ?? row.linked_case,
                    row.linked_action_id ?? "â€”",
                  ])
                : [["No seeded tickets yet", "-", "-", "-", "-", "-"]],
          })}
        </SectionCard>
      </div>

      <SectionCard eyebrow="Corrective action tracker" title="Tracked to closure instead of disappearing after approval">
        {dataTable({
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
        })}
        <p className="jazan-seed-note">{props.data.decision_action_audit.audit_note}</p>
      </SectionCard>
    </div>
  );
}

function breadcrumb(route: RouteState, data: ShellData) {
  if (route.kind === "strategic" || route.kind === "decisions" || route.kind === "runtimes" || route.kind === "audit") {
    return null;
  }

  const kpi = findKpiWorkspace(data, route.kpiSlug);
  const segments = ["Portfolio", kpi.short_label];

  if (route.kind === "case") {
    const caseWorkspace = findCaseWorkspace(data, route.kpiSlug, route.caseId);
    segments.push(caseWorkspace.municipality, caseWorkspace.case_id.replace(/^JZN-/, ""));
    if (route.tab !== "overview") {
      segments.push(route.tab === "intelligence" ? "Model intelligence" : route.tab === "decisions" ? "Decision command" : "Outcome recovery");
    }
  } else {
    segments.push(kpi.name.toLowerCase());
  }

  return <p className="jazan-breadcrumb">{segments.join(" · ")}</p>;
}

export default async function UrbanServiceQualityLoopPage({ params, searchParams }: PageProps) {
  const [{ screen = [] }, query = {}] = await Promise.all([params, searchParams]);
  const demoMode = query.demo === "1";
  const selectedId = query.selected ?? query.decision;
  const decisionStep = normalizeDecisionStep(query.step);

  const data = await getApiJson<ShellData>({
    path: "/api/v1/jazan/service-quality/shell",
    fallback: fallbackShellData,
    cacheMode: "no-store",
  });

  const route = resolveRoute(screen, data, query.decision);
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
    content = <EnhancedStrategicScreen data={data} demoMode={demoMode} />;
  } else if (route.kind === "kpi") {
    content = <EnhancedKpiWorkspaceScreen kpi={findKpiWorkspace(data, route.kpiSlug)} demoMode={demoMode} data={data} />;
  } else if (route.kind === "case") {
    content = (
      <BundleCaseWorkspaceScreen
        route={route}
        caseWorkspace={findCaseWorkspace(data, route.kpiSlug, route.caseId)}
        demoMode={demoMode}
        data={data}
        decisionStep={decisionStep}
      />
    );
  } else if (route.kind === "decisions") {
    content = <BundleDecisionCommandScreen data={data} selected={selectedCase(data, selectedId)} demoMode={demoMode} />;
  } else if (route.kind === "runtimes") {
    content = <BundleRuntimeEvidenceScreen data={data} demoMode={demoMode} />;
  } else {
    content = <BundleAuditScreen data={data} demoMode={demoMode} />;
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
      {breadcrumb(route, data)}
      <div className="jazan-dashboard-content">{content}</div>
    </PageFrame>
  );
}
