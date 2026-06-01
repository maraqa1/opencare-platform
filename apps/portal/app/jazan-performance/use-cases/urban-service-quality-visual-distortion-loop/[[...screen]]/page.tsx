import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";

type PageProps = {
  params: Promise<{ screen?: string[] }>;
  searchParams?: Promise<{ demo?: string; decision?: string; model?: string }>;
};

type ScreenId = "overview" | "kpi-contract" | "model-intelligence" | "decision-action-tracker" | "outcome-feedback" | "governance-evidence";

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

function MetricStrip({ demo }: { demo: boolean }) {
  return (
    <div className="usecase-metric-strip">
      {demoMetrics.map(([label, value, note]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{demo ? value : "No data loaded"}</strong>
          <p>{demo ? note : "Not connected"}</p>
        </article>
      ))}
    </div>
  );
}

function EvidenceGrid() {
  return (
    <div className="usecase-evidence-grid">
      {evidenceGroups.map(([title, ...items]) => (
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

function ActiveCaseBanner({ demo }: { demo: boolean }) {
  if (!demo) return <EmptyPanel label="No active case loaded" />;

  return (
    <section className="panel usecase-active-case">
      <div>
        <p className="eyebrow">Active case banner</p>
        <h2>{activeCase.municipality} visual-distortion decision loop</h2>
      </div>
      {[
        ["Risk score", activeCase.riskScore],
        ["Breach probability", activeCase.breachProbability],
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

function GovernanceMiniPanel() {
  return (
    <section className="panel usecase-governance-mini">
      <p className="eyebrow">Data governance evidence</p>
      <div>
        <span>Freshness: demo runtime</span>
        <span>Owner: Field Compliance</span>
        <span>Classification: Restricted</span>
        <span>DQ: monitored</span>
        <Link href={`${baseRoute}/governance-evidence?demo=1`}>Open governance evidence</Link>
      </div>
    </section>
  );
}

function DashboardMetricStrip({ items }: { items: string[][] }) {
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

function PipelineLinks({ demo }: { demo: boolean }) {
  const suffix = demo ? "&demo=1" : "";
  return (
    <div className="usecase-pipeline-links" aria-label="Clickable decision pipeline">
      {pipelineStages.map(([label, href], index) => (
        <Link href={`${href}${href.includes("?") ? suffix : demo ? "?demo=1" : ""}`} key={label}>
          <span>{index + 1}</span>
          {label}
        </Link>
      ))}
    </div>
  );
}

function ForecastMiniChart() {
  return (
    <div className="usecase-forecast-chart" aria-label="Four week service quality forecast">
      {forecastSeries.map(([week, value]) => (
        <div className="usecase-forecast-column" key={week}>
          <strong style={{ height: `${Number(value) / 1.4}%` }} />
          <small>{week}</small>
        </div>
      ))}
      <em>target 90%</em>
    </div>
  );
}

function OverviewScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="usecase-dashboard-row hero-row">
        <article className="panel usecase-section golden-thread-card">
          <p className="eyebrow">Golden thread</p>
          <h2>Closed-loop operating cycle</h2>
          <p>Set targets, predict risk, recommend action, track execution, measure recovery, and learn.</p>
          {demo ? (
            <>
              <NumberedFlow labels={["Strategic objective", "KPI contract", "Certified data", "Predict & recommend", "Track", "Improve"]} />
              <PipelineLinks demo={demo} />
            </>
          ) : (
            <EmptyPanel />
          )}
        </article>
        <article className="panel usecase-section status-card">
          <p className="eyebrow">Overall status</p>
          {demo ? <StatusDonut value="94%" /> : <EmptyPanel />}
        </article>
      </section>

      <section className="panel usecase-section">
        <p className="eyebrow">Headline KPI strip</p>
        <h2>Urban service quality signal</h2>
        {demo ? <DashboardMetricStrip items={dashboardKpis} /> : <MetricStrip demo={false} />}
      </section>

      <section className="usecase-dashboard-row three-card-row">
        {demo ? (
          <>
            <article className="panel usecase-section big-risk-card">
              <p className="eyebrow">Top Risk Municipality</p>
              <h2>Municipality 13 <span>High risk</span></h2>
              <p>Risk score</p>
              <strong>84 / 100</strong>
              <p>Breach probability: 78%</p>
            </article>
            <article className="panel usecase-section">
              <p className="eyebrow">Recommended Intervention</p>
              <h2>Field-response rebalancing + SLA escalation + repeat-zone prioritization.</h2>
              <p>Similar cases: 3</p>
              <p>Expected lift: +9 to +13 pp</p>
              <Link className="secondary-link" href={`${baseRoute}/decision-action-tracker?demo=1&decision=JZN-DEC-1011`}>
                Open decision pipeline
              </Link>
            </article>
            <article className="panel usecase-section action-status-card">
              <p className="eyebrow">Active Corrective Actions</p>
              <StatusDonut value="62%" tone="orange" />
              <table>
                <tbody>
                  {["Approved 7", "In progress 12", "Evidence 3", "Closed 18"].map((item) => (
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
        <EvidenceGrid />
      </section>
    </>
  );
}

function KpiContractScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section objective-contract-card">
        <p className="eyebrow">Strategic objective</p>
        <h2>Sustain and improve municipal service quality and visual-distortion response</h2>
        {demo ? (
          <div className="usecase-dashboard-metrics compact">
            {kpiObjectiveStats.map(([label, value]) => (
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
              <strong>Sustain and improve municipal service quality and visual-distortion response</strong>
            </article>
            <div className="kpi-node-grid">
              {dashboardKpiRows.map(([kpi, formula, target, current, status, owner, source]) => (
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
            {kpiMonitorCards.map(([kpi, current, target, status, nextAction]) => (
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
                {dashboardKpiRows.map((row) => (
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
              <tbody>{triggerRules.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function ModelIntelligenceScreen({ demo, selectedModel }: { demo: boolean; selectedModel?: string }) {
  const activeModel = modelCards.find((item) => item.key === selectedModel) ?? modelCards[0];

  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Certified lineage</p>
        <h2>Source systems to decision layer</h2>
        {demo ? (
          <NumberedFlow labels={["source systems", "staging", "analytics mart", "model outputs", "decision layer"]} />
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="usecase-dashboard-row model-layout">
        {demo ? (
          <>
            <article className="panel usecase-section big-risk-card">
              <p className="eyebrow">High Risk Municipality</p>
              <h2>Municipality 13 <span>High risk</span></h2>
              <p>Risk score</p>
              <strong>84 / 100</strong>
              <p>Breach probability</p>
              <strong className="blue">78%</strong>
              <p>Top driver: visual distortion closure quality and repeated complaints.</p>
              <ForecastMiniChart />
            </article>
            <div className="usecase-card-grid model-cards">
              {modelCards.map((model) => (
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
                <tr><td>RNN forecast</td><td>12 May 2025 02:00</td><td>300</td><td>Success</td></tr>
                <tr><td>Anomaly detector</td><td>12 May 2025 02:10</td><td>42</td><td>Success</td></tr>
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
            <ForecastMiniChart />
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

function DecisionTrackerScreen({ demo, selectedDecision }: { demo: boolean; selectedDecision?: string }) {
  const activeDecision = decisionCases.find((item) => item.id === selectedDecision) ?? decisionCases[0];

  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Decision Command Centre</p>
        <h2>Queue status</h2>
        {demo ? <DashboardMetricStrip items={decisionStats} /> : <MetricStrip demo={false} />}
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
                {decisionCases.map((row) => (
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
            {["Approve", "Request Revision", "Escalate", "Create Ticket", "Email Owner"].map((item) => <span key={item}>{item}</span>)}
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

function OutcomeFeedbackScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Corrective Action Tracking & Outcome</p>
        <h2>Action recovery status</h2>
        {demo ? <DashboardMetricStrip items={outcomeStats} /> : <MetricStrip demo={false} />}
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
                {recoveryRows.map((row) => (
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
            <article className="panel usecase-section status-card"><p className="eyebrow">Forecast accuracy</p><StatusDonut value="78%" /><h2>Breach correctly predicted</h2></article>
            <article className="panel usecase-section"><p className="eyebrow">Recommendation effectiveness</p><h2 className="giant-value">+10 pp</h2><p>average KPI lift</p><p>Similar cases matched: 3</p></article>
            <article className="panel usecase-section learning-card"><p className="eyebrow">Learning & feedback</p><h2>Feedback to pillars</h2>{["Pillar 1: Objective remains certified", "Pillar 4: Recommendation history updated", "Pillar 5: Decision log records recovery", "Pillar 6: Training need generated if repeated"].map((item) => <p key={item}>{item}</p>)}</article>
          </>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function GovernanceEvidenceScreen({ demo }: { demo: boolean }) {
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
              <tbody>{governanceRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
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
            {[
              ["KPI definition pack", "Formulas, targets, owners, source mappings"],
              ["Runtime evidence pack", "RNN run, anomaly run, scored rows, output tables"],
              ["Decision audit pack", "Human approval, actions, ticket/email outbox, decision log"],
              ["Outcome learning pack", "Before/after results, forecast accuracy, recommendation effectiveness"],
            ].map(([title, text]) => (
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
}: {
  screen: ScreenId;
  demo: boolean;
  selectedDecision?: string;
  selectedModel?: string;
}) {
  if (screen === "kpi-contract") return <KpiContractScreen demo={demo} />;
  if (screen === "model-intelligence") return <ModelIntelligenceScreen demo={demo} selectedModel={selectedModel} />;
  if (screen === "decision-action-tracker") return <DecisionTrackerScreen demo={demo} selectedDecision={selectedDecision} />;
  if (screen === "outcome-feedback") return <OutcomeFeedbackScreen demo={demo} />;
  if (screen === "governance-evidence") return <GovernanceEvidenceScreen demo={demo} />;
  return <OverviewScreen demo={demo} />;
}

export default async function UrbanServiceQualityUseCasePage({ params, searchParams }: PageProps) {
  const { screen: screenParam } = await params;
  const query = searchParams ? await searchParams : {};
  const screen = getScreen(screenParam);
  const active = screens.find((item) => item.id === screen) ?? screens[0];
  const demo = query.demo === "1" || process.env.NEXT_PUBLIC_JAZAN_DEMO_MODE === "true";

  return (
    <PageFrame
      eyebrow="Jazan use case"
      title={active.title}
      description={active.titleAr}
      chips={[
        { label: demo ? "Demo data - seeded for proposal walkthrough" : "Needs data", tone: "primary" },
        { label: "OpenCare v1.6 use-case package", tone: "accent" },
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
      <ActiveCaseBanner demo={demo} />
      <section className="panel usecase-section usecase-hero-contract">
        <p className="eyebrow">Purpose</p>
        <h2>Full golden thread from strategy to recovery</h2>
        <p>
          This use case connects KPI contracts, certified data, RNN forecast outputs, anomaly detection, transparent risk
          scoring, recommendation lookup, controlled decision buttons, corrective-action closure, and learning feedback.
        </p>
      </section>
      <ScreenBody screen={screen} demo={demo} selectedDecision={query.decision} selectedModel={query.model} />
      <GovernanceMiniPanel />
    </PageFrame>
  );
}
