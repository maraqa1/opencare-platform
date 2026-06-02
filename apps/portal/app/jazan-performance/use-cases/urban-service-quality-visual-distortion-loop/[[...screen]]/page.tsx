import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

type PageProps = {
  params: Promise<{ screen?: string[] }>;
  searchParams?: Promise<{ demo?: string; decision?: string; model?: string }>;
};

type ScreenId = "overview" | "kpi-contract" | "model-intelligence" | "decision-action-tracker" | "outcome-feedback" | "governance-evidence";
type MetricItem = [string, string, string?];
type TwoColRow = [string, string];
type FourColRow = [string, string, string, string];
type FiveColRow = [string, string, string, string, string];
type SixColRow = [string, string, string, string, string, string];
type SevenColRow = [string, string, string, string, string, string, string];
type ForecastPoint = [string, number, number];

type ModelCard = {
  key: string;
  title: string;
  value: string;
  note: string;
  output: string;
};

type DecisionCase = {
  id: string;
  municipality: string;
  risk: string;
  probability: string;
  action: string;
  owner: string;
  due: string;
  status: string;
  stage: string;
  evidence: Array<[string, string, string]>;
  log: string[];
};

type UseCaseShellData = {
  meta: {
    use_case: string;
    mode: string;
    connected: boolean;
    source: string;
    message: string;
  };
  purpose: {
    eyebrow: string;
    title: string;
    description: string;
  };
  active_case: {
    municipality: string;
    risk_score: string;
    breach_probability: string;
    stage: string;
    owner: string;
    due: string;
  };
  overview: {
    demo_metrics: MetricItem[];
    golden_thread_labels: string[];
    status_value: string;
    headline_kpis: MetricItem[];
    top_risk: {
      municipality: string;
      status: string;
      risk_score: string;
      breach_probability: string;
    };
    recommended_intervention: {
      title: string;
      similar_cases: string;
      expected_lift: string;
      decision_href: string;
    };
    action_summary: string[];
    evidence_groups: string[][];
  };
  kpi_contract: {
    objective_title: string;
    objective_stats: TwoColRow[];
    kpi_rows: SevenColRow[];
    monitor_cards: FiveColRow[];
    trigger_rules: FourColRow[];
  };
  runtime_evidence: {
    lineage_labels: string[];
    high_risk_municipality: {
      name: string;
      status: string;
      risk_score: string;
      breach_probability: string;
      driver: string;
    };
    forecast_series: ForecastPoint[];
    model_cards: ModelCard[];
    runtime_runs: FourColRow[];
  };
  decision_queue: {
    stats: TwoColRow[];
    action_buttons: string[];
    cases: DecisionCase[];
  };
  outcome_feedback: {
    stats: TwoColRow[];
    recovery_rows: SixColRow[];
    forecast_accuracy: string;
    recommendation_effectiveness: string;
    similar_cases: string;
    learning_feedback: string[];
  };
  governance_evidence: {
    rows: FiveColRow[];
    exports: TwoColRow[];
  };
};

const baseRoute = "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop";

const screens: Array<{ id: ScreenId; label: string; title: string; titleAr: string; href: string }> = [
  {
    id: "overview",
    label: "01 · Overview",
    title: "Urban Service Quality & Visual Distortion Assurance Loop",
    titleAr: "حلقة ضمان جودة الخدمات الحضرية ومعالجة التشوه البصري",
    href: baseRoute,
  },
  {
    id: "kpi-contract",
    label: "02 · KPI contract",
    title: "KPI Contract & Target Definition",
    titleAr: "عقد المؤشرات وتحديد المستهدفات",
    href: `${baseRoute}/kpi-contract`,
  },
  {
    id: "model-intelligence",
    label: "03 · Model intelligence",
    title: "Data & Model Intelligence",
    titleAr: "البيانات ونماذج الإنذار المبكر",
    href: `${baseRoute}/model-intelligence`,
  },
  {
    id: "decision-action-tracker",
    label: "04 · Decision tracker",
    title: "Decision & Corrective Action Tracker",
    titleAr: "تتبع القرار والخطة التصحيحية",
    href: `${baseRoute}/decision-action-tracker`,
  },
  {
    id: "outcome-feedback",
    label: "05 · Outcome feedback",
    title: "Outcome Recovery & Learning Feedback",
    titleAr: "قياس التعافي والتغذية الراجعة",
    href: `${baseRoute}/outcome-feedback`,
  },
  {
    id: "governance-evidence",
    label: "06 · Governance evidence",
    title: "Governance Evidence",
    titleAr: "Data governance, lineage, quality, classification, and evidence packs",
    href: `${baseRoute}/governance-evidence`,
  },
];

const kpis = [
  ["Visual distortion complaint closure quality", "valid closed cases / total cases * 100", ">= 90%", "Field Compliance", "source_jazan.visual_distortion_cases"],
  ["Average permit issuance time", "average(permit issued - submitted)", "<= 1.4 days", "Licensing Department", "source_jazan.permit_requests"],
  ["Urban service coverage", "covered service zones / total zones * 100", ">= 95%", "Services Agency", "source_jazan.service_coverage_assets"],
  ["Emergency and resilience readiness", "weighted readiness score", ">= 90%", "Emergency Readiness Team", "source_jazan.emergency_readiness_checks"],
  ["Citizen satisfaction", "average satisfaction score", ">= 4.0", "Service Quality", "source_jazan.citizen_satisfaction_surveys"],
  ["Service request closure rate", "closed service requests / total requests * 100", ">= 90%", "Services Agency", "source_jazan.service_requests"],
];

const demoMetrics = [
  ["Municipalities covered", "25 / 25", "all linked to service-quality objective"],
  ["Visual closure quality", "82%", "watch · target >= 90%"],
  ["Breach probability", "78%", "RNN forecast · 4-week horizon"],
  ["Open corrective actions", "14", "8 municipalities"],
];

const dashboardKpis = [
  ["Closure Quality", "100%", "Target >=90%"],
  ["Permit Time", "1.2 days", "Target <=1.4"],
  ["Coverage", "96%", "Target >=95%"],
  ["Readiness", "97%", "Target >=90%"],
  ["Satisfaction", "4.2 / 5", "Target >=4.0"],
];

const dashboardKpiRows = [
  ["Visual distortion closure quality", "valid closed / total * 100", ">=90%", "100%", "On track", "Field Compliance", "visual_distortion_cases"],
  ["Average permit issuance time", "avg issued - submitted", "<=1.4d", "1.2d", "On track", "Licensing", "permit_requests"],
  ["Urban service coverage", "covered / total * 100", ">=95%", "96%", "On track", "Services Agency", "service_coverage_assets"],
  ["Emergency readiness", "weighted readiness score", ">=90%", "97%", "On track", "Emergency Team", "readiness_checks"],
  ["Citizen satisfaction", "average score", ">=4.0", "4.2", "On track", "Service Quality", "surveys"],
  ["Service request closure rate", "closed / total * 100", ">=90%", "91%", "On track", "Services Agency", "service_requests"],
];

const kpiObjectiveStats = [
  ["Municipalities", "25 / 25"],
  ["KPIs", "6"],
  ["Data sources", "9"],
  ["Alignment", "100%"],
];

const kpiMonitorCards = [
  ["Visual distortion closure quality", "100%", ">=90%", "On track", "No action"],
  ["Service request closure rate", "91%", ">=90%", "On track", "Monitor"],
  ["Average permit issuance time", "1.2d", "<=1.4d", "On track", "No action"],
  ["Urban service coverage", "96%", ">=95%", "On track", "No action"],
  ["Emergency readiness", "97%", ">=90%", "On track", "No action"],
  ["Citizen satisfaction", "4.2/5", ">=4.0", "On track", "Monitor"],
];

const triggerRules = [
  ["KPI breach", "Current below target", "Create decision candidate", "Pillar 5"],
  ["Forecast breach", "RNN predicts target miss within 4 weeks", "Queue advisory action", "Pillar 4 -> 5"],
  ["Anomaly", "z-score exceeds threshold", "Request review", "Pillar 4"],
  ["Repeated gap", "Same municipality at risk twice", "Training / sustainability need", "Pillar 6"],
];

const decisionStats = [
  ["New decisions", "7"],
  ["Under review", "5"],
  ["Approved", "9"],
  ["In progress", "12"],
  ["Overdue", "3"],
  ["Escalated", "2"],
];

const outcomeStats = [
  ["Total actions", "12"],
  ["In progress", "6"],
  ["Awaiting evidence", "2"],
  ["Verified", "2"],
  ["Closed", "2"],
  ["Avg improvement", "+10.2 pp"],
];

const activeCase = {
  municipality: "Samtah",
  riskScore: "84 / 100",
  breachProbability: "78%",
  stage: "Evidence",
  owner: "Field Compliance",
  due: "+5 days",
};

const pipelineStages = [
  ["KPI contract", `${baseRoute}/kpi-contract`],
  ["Forecast model", `${baseRoute}/model-intelligence?model=rnn-forecast`],
  ["Risk decision", `${baseRoute}/decision-action-tracker?decision=JZN-DEC-1007`],
  ["Corrective action", `${baseRoute}/decision-action-tracker?decision=JZN-DEC-1011`],
  ["Outcome learning", `${baseRoute}/outcome-feedback`],
];

const forecastSeries = [
  ["Week 0", 82, 90],
  ["Week 1", 80, 90],
  ["Week 2", 76, 90],
  ["Week 3", 72, 90],
  ["Week 4", 68, 90],
];

const modelCards = [
  {
    key: "rnn-forecast",
    title: "RNN Forecast",
    value: "78% breach probability",
    note: "GRU/LSTM sequence runtime forecasts target breach within 4 weeks.",
    output: "output.jazan_service_rnn_forecast",
  },
  {
    key: "anomaly-detection",
    title: "Anomaly Detection",
    value: "+23% deviation",
    note: "Resolution time and complaint volume are above local historical baseline.",
    output: "output.jazan_service_quality_anomaly",
  },
  {
    key: "composite-risk",
    title: "Composite Risk Score",
    value: "84 / 100 high risk",
    note: "Weighted model combining forecast, anomaly, backlog, SLA, and complaints.",
    output: "output.jazan_municipality_service_risk_score",
  },
  {
    key: "recommendation-lookup",
    title: "Recommendation Lookup",
    value: "Field-response rebalancing",
    note: "Similarity lookup finds recovered cases and proposes advisory actions.",
    output: "output.jazan_recommended_intervention",
  },
];

const goldenThread = [
  ["Pillar 1", "Objective certified", "Service quality and visual-distortion response aligned to Jazan strategy."],
  ["Pillar 2", "KPI contract", "Targets, thresholds, owners, and source systems defined."],
  ["Pillar 3", "Data foundation", "Certified marts feed forecasts, anomaly detection, and risk scoring."],
  ["Pillar 4", "Early warning", "RNN forecast and anomaly detector create decision candidates."],
  ["Pillar 5", "Corrective action", "Owners approve, assign, escalate, submit evidence, and close."],
  ["Pillar 6", "Learning loop", "Repeated patterns become procedures, training, and sustainability evidence."],
];

const models = [
  ["RNN service-quality breach forecast", "GRU or LSTM sequence model", "Predict KPI values and breach probability 4-8 weeks ahead.", "output.jazan_service_rnn_forecast"],
  ["Service-quality anomaly detector", "historical deviation z-score", "Detect unusual deterioration against municipality history.", "output.jazan_service_quality_anomaly"],
  ["Municipality service risk score", "transparent weighted score", "Rank combined risk using interpretable dbt inputs and model outputs.", "output.jazan_municipality_service_risk_score"],
  ["Recommended intervention lookup", "similarity lookup", "Recommend corrective actions based on similar recovered cases.", "output.jazan_recommended_intervention"],
];

const decisionButtons = [
  ["Approve Action", "POST /api/v1/jazan/service-quality/decisions/{decision_id}/approve"],
  ["Escalate", "POST /api/v1/jazan/service-quality/decisions/{decision_id}/escalate"],
  ["Create Ticket", "POST /api/v1/jazan/service-quality/decisions/{decision_id}/create-ticket"],
  ["Email Owner", "POST /api/v1/jazan/service-quality/decisions/{decision_id}/notify-owner"],
  ["Submit Evidence", "POST /api/v1/jazan/service-quality/actions/{action_id}/submit-evidence"],
  ["Verify & Close", "POST /api/v1/jazan/service-quality/actions/{action_id}/close"],
];

const decisionCases = [
  {
    id: "JZN-DEC-1007",
    municipality: "Samtah",
    risk: "Visual distortion complaints",
    probability: "78%",
    action: "Joint inspection sweep + owner notification",
    owner: "Field Compliance",
    due: "+5 days",
    status: "Evidence pending",
    stage: "Evidence",
    evidence: [
      ["Complaint anomaly", "Citizen complaints +287% over 14 days - 47 reports vs baseline 12.", "z = +3.2"],
      ["Backlog forecast", "Complaint backlog projected to breach 30-day SLA in 21 days without action.", "LSTM runtime"],
      ["Composite risk", "42 / 100 - Moderate: complaint surge, cluster concentration, property-owner non-response.", "dbt mart"],
      ["Recommendation", "Joint inspection sweep and property-owner notification under municipal compliance code.", "similarity lookup"],
    ],
    log: [
      "Auto-triggered by early-warning complaint-anomaly detector.",
      "Property-owner notifications dispatched.",
      "Evidence package submitted to verification queue.",
    ],
  },
  {
    id: "JZN-DEC-1011",
    municipality: "Sabya",
    risk: "Service closure delay",
    probability: "84%",
    action: "Rebalance field-response capacity",
    owner: "Services Agency",
    due: "+23 days",
    status: "In progress",
    stage: "In progress",
    evidence: [
      ["Forecast", "78% probability of missing closure-rate target within 4 weeks.", "RNN runtime"],
      ["Anomaly", "Resolution time +23% above Sabya baseline.", "z = +2.4"],
      ["Composite risk", "84 / 100 - High: forecast 78%, anomaly +2.4, backlog +18%, SLA -8pp.", "dbt mart"],
      ["Recommendation", "Field-response rebalancing and SLA escalation protocol.", "advisory"],
    ],
    log: [
      "Auto-triggered by early-warning composite risk score.",
      "Weekly review approved intervention.",
      "Services Agency activated field-response protocol.",
    ],
  },
];

const recoveryRows = [
  ["Visual distortion closure quality", "82%", ">=90%", "91%", "Recovered", "+9 pp"],
  ["Service request closure rate", "68%", ">=90%", "88%", "Improving", "+20 pp"],
  ["Average permit issuance time", "2.4d", "<=1.4d", "1.6d", "Watch", "-0.8d"],
  ["Citizen satisfaction", "3.7 / 5", ">=4.0", "4.2 / 5", "Recovered", "+0.5"],
];

const evidenceGroups = [
  ["Sources", "source_jazan.visual_distortion_cases", "source_jazan.service_requests", "source_jazan.permit_requests", "source_jazan.municipalities"],
  ["Analytics marts", "analytics.fct_jazan_visual_distortion_performance", "analytics.fct_jazan_service_quality", "analytics.fct_jazan_corrective_action"],
  ["Outputs", "output.jazan_service_rnn_forecast", "output.jazan_service_quality_anomaly", "output.jazan_municipality_service_risk_score"],
  ["Decision tables", "decision.jazan_generated_service_decisions", "decision.jazan_service_quality_action_queue", "decision.jazan_visual_distortion_recovery_outcome"],
  ["APIs", "GET /api/v1/jazan/service-quality/overview", "POST /api/v1/jazan/service-quality/decisions/{id}/approve", "POST /api/v1/jazan/service-quality/actions/{id}/close"],
];

const governanceRows = [
  ["visual_distortion_cases", "Restricted", "Field Compliance", "DQ pass", "source -> raw -> staging -> analytics -> output -> decision"],
  ["service_requests", "Internal", "Services Agency", "DQ watch", "source -> raw -> staging -> analytics.fct_jazan_service_quality"],
  ["jazan_service_rnn_forecast", "Internal model output", "Forecast Runtime", "Fresh", "analytics features -> RNN output -> decision candidate"],
  ["jazan_generated_service_decisions", "Restricted", "Decision Engine", "Audited", "model outputs -> human approval -> action queue"],
];

const fallbackShellData: UseCaseShellData = {
  meta: {
    use_case: "jazan_urban_service_quality_visual_distortion_loop",
    mode: "seeded",
    connected: false,
    source: "page_fallback",
    message: "Fallback shell data from the native portal contract.",
  },
  purpose: {
    eyebrow: "Purpose",
    title: "Full golden thread from strategy to recovery",
    description:
      "This use case connects KPI contracts, certified data, RNN forecast outputs, anomaly detection, transparent risk scoring, recommendation lookup, controlled decision buttons, corrective-action closure, and learning feedback.",
  },
  active_case: {
    municipality: activeCase.municipality,
    risk_score: activeCase.riskScore,
    breach_probability: activeCase.breachProbability,
    stage: activeCase.stage,
    owner: activeCase.owner,
    due: activeCase.due,
  },
  overview: {
    demo_metrics: demoMetrics,
    golden_thread_labels: ["Strategic objective", "KPI contract", "Certified data", "Predict & recommend", "Track", "Improve"],
    status_value: "94%",
    headline_kpis: dashboardKpis,
    top_risk: {
      municipality: "Municipality 13",
      status: "High risk",
      risk_score: "84 / 100",
      breach_probability: "78%",
    },
    recommended_intervention: {
      title: "Field-response rebalancing + SLA escalation + repeat-zone prioritization.",
      similar_cases: "3",
      expected_lift: "+9 to +13 pp",
      decision_href: `${baseRoute}/decision-action-tracker?demo=1&decision=JZN-DEC-1011`,
    },
    action_summary: ["Approved 7", "In progress 12", "Evidence 3", "Closed 18"],
    evidence_groups: evidenceGroups,
  },
  kpi_contract: {
    objective_title: "Sustain and improve municipal service quality and visual-distortion response",
    objective_stats: kpiObjectiveStats,
    kpi_rows: dashboardKpiRows,
    monitor_cards: kpiMonitorCards,
    trigger_rules: triggerRules,
  },
  runtime_evidence: {
    lineage_labels: ["source systems", "staging", "analytics mart", "model outputs", "decision layer"],
    high_risk_municipality: {
      name: "Municipality 13",
      status: "High risk",
      risk_score: "84 / 100",
      breach_probability: "78%",
      driver: "Top driver: visual distortion closure quality and repeated complaints.",
    },
    forecast_series: forecastSeries,
    model_cards: modelCards,
    runtime_runs: [
      ["RNN forecast", "12 May 2025 02:00", "300", "Success"],
      ["Anomaly detector", "12 May 2025 02:10", "42", "Success"],
    ],
  },
  decision_queue: {
    stats: decisionStats,
    action_buttons: ["Approve", "Request Revision", "Escalate", "Create Ticket", "Email Owner"],
    cases: decisionCases,
  },
  outcome_feedback: {
    stats: outcomeStats,
    recovery_rows: recoveryRows,
    forecast_accuracy: "78%",
    recommendation_effectiveness: "+10 pp",
    similar_cases: "3",
    learning_feedback: [
      "Pillar 1: Objective remains certified",
      "Pillar 4: Recommendation history updated",
      "Pillar 5: Decision log records recovery",
      "Pillar 6: Training need generated if repeated",
    ],
  },
  governance_evidence: {
    rows: governanceRows,
    exports: [
      ["KPI definition pack", "Formulas, targets, owners, source mappings"],
      ["Runtime evidence pack", "RNN run, anomaly run, scored rows, output tables"],
      ["Decision audit pack", "Human approval, actions, ticket/email outbox, decision log"],
      ["Outcome learning pack", "Before/after results, forecast accuracy, recommendation effectiveness"],
    ],
  },
};

export const metadata: Metadata = {
  title: "Urban Service Quality & Visual Distortion Assurance Loop - Jazan Performance",
};

function getScreen(screen?: string[]): ScreenId {
  const id = screen?.[0] ?? "overview";
  if (screens.some((item) => item.id === id)) return id as ScreenId;
  notFound();
}

function EmptyPanel({ label = "No data loaded" }: { label?: string }) {
  return <div className="usecase-empty-state">{label}</div>;
}

function UseCaseTabs({ active, demo }: { active: ScreenId; demo: boolean }) {
  const suffix = demo ? "?demo=1" : "";
  return (
    <nav className="usecase-screen-tabs" aria-label="Use case screens">
      {screens.map((screen) => (
        <Link className={screen.id === active ? "active" : undefined} href={`${screen.href}${suffix}`} key={screen.id}>
          {screen.label}
        </Link>
      ))}
    </nav>
  );
}

function MetricStrip({ demo, items }: { demo: boolean; items: MetricItem[] }) {
  return (
    <div className="usecase-metric-strip">
      {items.map(([label, value, note]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{demo ? value : "No data loaded"}</strong>
          <p>{demo ? note : "Not connected"}</p>
        </article>
      ))}
    </div>
  );
}

function EvidenceGrid({ groups }: { groups: string[][] }) {
  return (
    <div className="usecase-evidence-grid">
      {groups.map(([title, ...items]) => (
        <article key={title}>
          <h3>{title}</h3>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ActiveCaseBanner({ demo, activeCase }: { demo: boolean; activeCase: UseCaseShellData["active_case"] }) {
  if (!demo) return <EmptyPanel label="No active case loaded" />;

  return (
    <section className="panel usecase-active-case">
      <div>
        <p className="eyebrow">Active case banner</p>
        <h2>{activeCase.municipality} visual-distortion decision loop</h2>
      </div>
      {[
        ["Risk score", activeCase.risk_score],
        ["Breach probability", activeCase.breach_probability],
        ["Stage", activeCase.stage],
        ["Owner", activeCase.owner],
        ["Due", activeCase.due],
      ].map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function GovernanceMiniPanel({ demo }: { demo: boolean }) {
  return (
    <section className="panel usecase-governance-mini">
      <p className="eyebrow">Data governance evidence</p>
      <div>
        <span>Freshness: demo runtime</span>
        <span>Owner: Field Compliance</span>
        <span>Classification: Restricted</span>
        <span>DQ: monitored</span>
        <Link href={`${baseRoute}/governance-evidence${demo ? "?demo=1" : ""}`}>Open governance evidence</Link>
      </div>
    </section>
  );
}

function DashboardMetricStrip({ items }: { items: MetricItem[] | TwoColRow[] }) {
  return (
    <div className="usecase-dashboard-metrics">
      {items.map(([label, value, note]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {note ? <p>{note}</p> : null}
        </article>
      ))}
    </div>
  );
}

function StatusDonut({ value, tone = "green" }: { value: string; tone?: "green" | "orange" | "red" }) {
  return (
    <div className={`usecase-donut ${tone}`} aria-label={`${value} status`}>
      <strong>{value}</strong>
      <span>status</span>
    </div>
  );
}

function NumberedFlow({ labels }: { labels: string[] }) {
  return (
    <div className="usecase-numbered-flow">
      {labels.map((label, index) => (
        <article key={label}>
          <span>{index + 1}</span>
          <p>{label}</p>
        </article>
      ))}
    </div>
  );
}

function PipelineLinks({ demo, stages }: { demo: boolean; stages: TwoColRow[] }) {
  const suffix = demo ? "&demo=1" : "";
  return (
    <div className="usecase-pipeline-links" aria-label="Clickable decision pipeline">
      {stages.map(([label, href], index) => (
        <Link href={`${href}${href.includes("?") ? suffix : demo ? "?demo=1" : ""}`} key={label}>
          <span>{index + 1}</span>
          {label}
        </Link>
      ))}
    </div>
  );
}

function ForecastMiniChart({ series }: { series: ForecastPoint[] }) {
  return (
    <div className="usecase-forecast-chart" aria-label="Four week service quality forecast">
      {series.map(([week, value]) => (
        <div className="usecase-forecast-column" key={week}>
          <strong style={{ height: `${Number(value) / 1.4}%` }} />
          <small>{week}</small>
        </div>
      ))}
      <em>target 90%</em>
    </div>
  );
}

function OverviewScreen({ demo, data }: { demo: boolean; data: UseCaseShellData }) {
  return (
    <>
      <section className="usecase-dashboard-row hero-row">
        <article className="panel usecase-section golden-thread-card">
          <p className="eyebrow">Golden thread</p>
          <h2>Closed-loop operating cycle</h2>
          <p>Set targets, predict risk, recommend action, track execution, measure recovery, and learn.</p>
          {demo ? (
            <>
              <NumberedFlow labels={data.overview.golden_thread_labels} />
              <PipelineLinks demo={demo} stages={pipelineStages} />
            </>
          ) : (
            <EmptyPanel />
          )}
        </article>
        <article className="panel usecase-section status-card">
          <p className="eyebrow">Overall status</p>
          {demo ? <StatusDonut value={data.overview.status_value} /> : <EmptyPanel />}
        </article>
      </section>

      <section className="panel usecase-section">
        <p className="eyebrow">Headline KPI strip</p>
        <h2>Urban service quality signal</h2>
        {demo ? <DashboardMetricStrip items={data.overview.headline_kpis} /> : <MetricStrip demo={false} items={data.overview.demo_metrics} />}
      </section>

      <section className="usecase-dashboard-row three-card-row">
        {demo ? (
          <>
            <article className="panel usecase-section big-risk-card">
              <p className="eyebrow">Top Risk Municipality</p>
              <h2>{data.overview.top_risk.municipality} <span>{data.overview.top_risk.status}</span></h2>
              <p>Risk score</p>
              <strong>{data.overview.top_risk.risk_score}</strong>
              <p>Breach probability: {data.overview.top_risk.breach_probability}</p>
            </article>
            <article className="panel usecase-section">
              <p className="eyebrow">Recommended Intervention</p>
              <h2>{data.overview.recommended_intervention.title}</h2>
              <p>Similar cases: {data.overview.recommended_intervention.similar_cases}</p>
              <p>Expected lift: {data.overview.recommended_intervention.expected_lift}</p>
              <Link className="secondary-link" href={data.overview.recommended_intervention.decision_href}>
                Open decision pipeline
              </Link>
            </article>
            <article className="panel usecase-section action-status-card">
              <p className="eyebrow">Active Corrective Actions</p>
              <StatusDonut value="62%" tone="orange" />
              <table>
                <tbody>
                  {data.overview.action_summary.map((item) => (
                    <tr key={item}><td>{item}</td></tr>
                  ))}
                </tbody>
              </table>
            </article>
          </>
        ) : (
          <EmptyPanel />
        )}
      </section>

      <section className="panel usecase-section">
        <p className="eyebrow">OpenCare contract evidence</p>
        <h2>Data and decision contract</h2>
        <EvidenceGrid groups={data.overview.evidence_groups} />
      </section>
    </>
  );
}

function KpiContractScreen({ demo, data }: { demo: boolean; data: UseCaseShellData }) {
  return (
    <>
      <section className="panel usecase-section objective-contract-card">
        <p className="eyebrow">Strategic objective</p>
        <h2>{data.kpi_contract.objective_title}</h2>
        {demo ? (
          <div className="usecase-dashboard-metrics compact">
            {data.kpi_contract.objective_stats.map(([label, value]) => (
              <article key={label}><span>{label}</span><strong>{value}</strong></article>
            ))}
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Objective-to-KPI mapping & monitoring</p>
        <h2>Strategic objective branches into governed KPIs</h2>
        {demo ? (
          <div className="usecase-kpi-map">
            <article className="objective-node">
              <span>Strategic objective</span>
              <strong>{data.kpi_contract.objective_title}</strong>
            </article>
            <div className="kpi-node-grid">
              {data.kpi_contract.kpi_rows.map(([kpi, formula, target, current, status, owner, source]) => (
                <article key={kpi}>
                  <span>{status}</span>
                  <strong>{kpi}</strong>
                  <p>{current} vs {target}</p>
                  <small>{owner} · {source} · {formula}</small>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">KPI monitoring cards</p>
        <h2>Every KPI has status, risk, and next action</h2>
        {demo ? (
          <div className="usecase-monitor-grid">
            {data.kpi_contract.monitor_cards.map(([kpi, current, target, status, nextAction]) => (
              <article key={kpi}>
                <span>{status}</span>
                <h3>{kpi}</h3>
                <strong>{current}</strong>
                <p>Target: {target}</p>
                <small>Next: {nextAction}</small>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Governed KPI contract</p>
        <h2>Definitions, targets, current status, owners, and sources</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["KPI", "Formula", "Target", "Current", "Status", "Owner", "Source"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.kpi_contract.kpi_rows.map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Monitoring trigger rules</p>
        <h2>How KPI risk becomes a decision pipeline item</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead><tr>{["Trigger", "Condition", "Action", "Carry forward"].map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{data.kpi_contract.trigger_rules.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function ModelIntelligenceScreen({ demo, selectedModel, data }: { demo: boolean; selectedModel?: string; data: UseCaseShellData }) {
  const activeModel = data.runtime_evidence.model_cards.find((item) => item.key === selectedModel) ?? data.runtime_evidence.model_cards[0];

  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Certified lineage</p>
        <h2>Source systems to decision layer</h2>
        {demo ? (
          <NumberedFlow labels={data.runtime_evidence.lineage_labels} />
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="usecase-dashboard-row model-layout">
        {demo ? (
          <>
            <article className="panel usecase-section big-risk-card">
              <p className="eyebrow">High Risk Municipality</p>
              <h2>{data.runtime_evidence.high_risk_municipality.name} <span>{data.runtime_evidence.high_risk_municipality.status}</span></h2>
              <p>Risk score</p>
              <strong>{data.runtime_evidence.high_risk_municipality.risk_score}</strong>
              <p>Breach probability</p>
              <strong className="blue">{data.runtime_evidence.high_risk_municipality.breach_probability}</strong>
              <p>{data.runtime_evidence.high_risk_municipality.driver}</p>
              <ForecastMiniChart series={data.runtime_evidence.forecast_series} />
            </article>
            <div className="usecase-card-grid model-cards">
              {data.runtime_evidence.model_cards.map((model) => (
                <Link
                  className={model.key === activeModel.key ? "selected-model-card" : undefined}
                  href={`${baseRoute}/model-intelligence?demo=1&model=${model.key}`}
                  key={model.key}
                >
                  <h3>{model.title}</h3>
                  <strong>{model.value}</strong>
                  <p>{model.note}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Runtime run summary</p>
        <h2>Latest scoring run</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead><tr>{["Runtime", "Last run", "Rows", "Status"].map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {data.runtime_evidence.runtime_runs.map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyPanel />}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Selected predictive runtime</p>
        <h2>{activeModel.title}</h2>
        {demo ? (
          <div className="usecase-runtime-detail">
            <ForecastMiniChart series={data.runtime_evidence.forecast_series} />
            <div>
              <strong>{activeModel.value}</strong>
              <p>{activeModel.note}</p>
              <code>{activeModel.output}</code>
              <Link className="secondary-link" href={`${baseRoute}/decision-action-tracker?demo=1&decision=JZN-DEC-1007`}>
                Send model output to decision queue
              </Link>
            </div>
          </div>
        ) : <EmptyPanel />}
      </section>
    </>
  );
}

function DecisionTrackerScreen({ demo, selectedDecision, data }: { demo: boolean; selectedDecision?: string; data: UseCaseShellData }) {
  const activeDecision = data.decision_queue.cases.find((item) => item.id === selectedDecision) ?? data.decision_queue.cases[0];

  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Decision Command Centre</p>
        <h2>Queue status</h2>
        {demo ? <DashboardMetricStrip items={data.decision_queue.stats} /> : <MetricStrip demo={false} items={data.overview.demo_metrics} />}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Decision queue</p>
        <h2>Generated decisions requiring action</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["Decision ID", "Municipality", "Risk", "Breach prob.", "Recommended action", "Owner", "Due", "Actions"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.decision_queue.cases.map((row) => (
                  <tr className={row.id === activeDecision.id ? "selected" : undefined} key={row.id}>
                    <td>
                      <Link className="decision-action-link" href={`${baseRoute}/decision-action-tracker?demo=1&decision=${row.id}#decision-detail`}>
                        {row.id}
                      </Link>
                    </td>
                    <td>{row.municipality}</td>
                    <td>{row.risk}</td>
                    <td>{row.probability}</td>
                    <td>{row.action}</td>
                    <td>{row.owner}</td>
                    <td>{row.due}</td>
                    <td>
                      <div className="usecase-command-buttons">
                        {["Approve", "Escalate", "Create ticket", "Email owner"].map((action) => (
                          <Link className="decision-action-link" href={`${baseRoute}/decision-action-tracker?demo=1&decision=${row.id}#decision-detail`} key={action}>
                            {action}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="usecase-dashboard-row">
        <article className="panel usecase-section action-button-legend">
          <p className="eyebrow">Action button legend</p>
          <h2>Controlled actions</h2>
          <div>
            {data.decision_queue.action_buttons.map((item) => <span key={item}>{item}</span>)}
          </div>
        </article>
        <article className="panel usecase-section">
          <p className="eyebrow">Generated escalation event</p>
          <h2>Audit-safe backend workflow</h2>
          <p>When the user clicks Escalate or Create Ticket, the backend writes an action event, creates an escalation request, and adds email or ticket records to the notification outbox.</p>
        </article>
      </section>
      <section className="panel usecase-section usecase-decision-detail" id="decision-detail">
        <div className="usecase-detail-header">
          <div>
            <p className="eyebrow">Focused decision pipeline</p>
            <h2>{activeDecision.action}</h2>
            <p>{activeDecision.municipality} - {activeDecision.risk}</p>
          </div>
          <span>{activeDecision.stage}</span>
        </div>
        {demo ? (
          <>
            <div className="decision-lifecycle-line">
              {["Proposed", "Approved", "In progress", "Evidence", "Verified", "Closed"].map((stage) => (
                <div className={stage === activeDecision.stage || ["Proposed", "Approved"].includes(stage) ? "done" : undefined} key={stage}>
                  <span />
                  <strong>{stage}</strong>
                  <small>{stage === activeDecision.stage ? "current" : "workflow"}</small>
                </div>
              ))}
            </div>
            <div className="decision-detail-grid">
              <article>
                <p className="eyebrow">Model evidence</p>
                <div className="decision-evidence-grid">
                  {activeDecision.evidence.map(([title, text, note]) => (
                    <div key={title}>
                      <span>{note}</span>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article>
                <p className="eyebrow">Decision log</p>
                <div className="decision-log-list">
                  {activeDecision.log.map((entry) => (
                    <div key={entry}>
                      <strong>{entry}</strong>
                      <span>demo audit event</span>
                    </div>
                  ))}
                </div>
                <Link className="secondary-link" href={`${baseRoute}/outcome-feedback?demo=1`}>
                  Track outcome recovery
                </Link>
              </article>
            </div>
          </>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function OutcomeFeedbackScreen({ demo, data }: { demo: boolean; data: UseCaseShellData }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Corrective Action Tracking & Outcome</p>
        <h2>Action recovery status</h2>
        {demo ? <DashboardMetricStrip items={data.outcome_feedback.stats} /> : <MetricStrip demo={false} items={data.overview.demo_metrics} />}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Recovery summary - Municipality 13</p>
        <h2>Before, target, after, and result</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["KPI", "Before", "Target", "After", "Result", "Change"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.outcome_feedback.recovery_rows.map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="usecase-dashboard-row three-card-row">
        {demo ? (
          <>
            <article className="panel usecase-section status-card"><p className="eyebrow">Forecast accuracy</p><StatusDonut value={data.outcome_feedback.forecast_accuracy} /><h2>Breach correctly predicted</h2></article>
            <article className="panel usecase-section"><p className="eyebrow">Recommendation effectiveness</p><h2 className="giant-value">{data.outcome_feedback.recommendation_effectiveness}</h2><p>average KPI lift</p><p>Similar cases matched: {data.outcome_feedback.similar_cases}</p></article>
            <article className="panel usecase-section learning-card"><p className="eyebrow">Learning & feedback</p><h2>Feedback to pillars</h2>{data.outcome_feedback.learning_feedback.map((item) => <p key={item}>{item}</p>)}</article>
          </>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function GovernanceEvidenceScreen({ demo, data }: { demo: boolean; data: UseCaseShellData }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Governance evidence workspace</p>
        <h2>Catalog, ownership, classification, quality, lineage, and evidence packs</h2>
        <p>
          v1.0.7 makes governance a visible operating layer. Every KPI, runtime output, decision candidate, and action event
          has owner metadata, classification, DQ status, lineage, and evidence-pack traceability.
        </p>
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Governed assets</p>
        <h2>Source-to-decision catalog</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead><tr>{["Asset", "Classification", "Owner", "DQ / freshness", "Lineage"].map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{data.governance_evidence.rows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Evidence pack exports</p>
        <h2>Audit-ready evidence</h2>
        {demo ? (
          <div className="usecase-monitor-grid">
            {data.governance_evidence.exports.map(([title, text]) => (
              <article key={title}>
                <span>Exportable</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function ScreenBody({
  screen,
  demo,
  selectedDecision,
  selectedModel,
  data,
}: {
  screen: ScreenId;
  demo: boolean;
  selectedDecision?: string;
  selectedModel?: string;
  data: UseCaseShellData;
}) {
  if (screen === "kpi-contract") return <KpiContractScreen demo={demo} data={data} />;
  if (screen === "model-intelligence") return <ModelIntelligenceScreen demo={demo} selectedModel={selectedModel} data={data} />;
  if (screen === "decision-action-tracker") return <DecisionTrackerScreen demo={demo} selectedDecision={selectedDecision} data={data} />;
  if (screen === "outcome-feedback") return <OutcomeFeedbackScreen demo={demo} data={data} />;
  if (screen === "governance-evidence") return <GovernanceEvidenceScreen demo={demo} data={data} />;
  return <OverviewScreen demo={demo} data={data} />;
}

export default async function UrbanServiceQualityUseCasePage({ params, searchParams }: PageProps) {
  const { screen: screenParam } = await params;
  const query = searchParams ? await searchParams : {};
  const screen = getScreen(screenParam);
  const active = screens.find((item) => item.id === screen) ?? screens[0];
  const shellData = await getApiJson<UseCaseShellData>({
    path: "/api/v1/jazan/service-quality/shell",
    fallback: fallbackShellData,
    cacheMode: "no-store",
  });
  const demoOverride = query.demo === "1" || process.env.NEXT_PUBLIC_JAZAN_DEMO_MODE === "true";
  const seededMode = shellData.meta.mode === "seeded" || shellData.meta.mode === "connected";
  const demo = demoOverride || seededMode;

  return (
    <PageFrame
      eyebrow="Jazan use case"
      title={active.title}
      description={active.titleAr}
      chips={[
        { label: demoOverride ? "Demo walkthrough data" : demo ? "Seeded shell data" : "Needs data", tone: "primary" },
        { label: shellData.meta.connected ? "Platform-connected" : "Platform slice", tone: "accent" },
        { label: `Route: ${active.href}`, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance">
            Back to operating model
          </Link>
          <Link className="secondary-link" href="/jazan-performance/decision-rhythm-corrective-actions">
            Open Pillar 5
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page usecase-loop-page"
    >
      <UseCaseTabs active={screen} demo={demo} />
      <ActiveCaseBanner demo={demo} activeCase={shellData.active_case} />
      <section className="panel usecase-section usecase-hero-contract">
        <p className="eyebrow">{shellData.purpose.eyebrow}</p>
        <h2>{shellData.purpose.title}</h2>
        <p>{shellData.purpose.description}</p>
      </section>
      <ScreenBody screen={screen} demo={demo} selectedDecision={query.decision} selectedModel={query.model} data={shellData} />
      <GovernanceMiniPanel demo={demo} />
    </PageFrame>
  );
}
