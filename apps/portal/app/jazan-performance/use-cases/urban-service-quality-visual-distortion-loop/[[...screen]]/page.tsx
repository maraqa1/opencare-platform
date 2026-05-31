import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";

type PageProps = {
  params: Promise<{ screen?: string[] }>;
  searchParams?: Promise<{ demo?: string }>;
};

type ScreenId = "overview" | "kpi-contract" | "model-intelligence" | "decision-action-tracker" | "outcome-feedback";

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

const decisionRows = [
  ["JZN-DEC-1007", "Samtah", "Visual distortion complaints", "78%", "Joint inspection sweep + owner notification", "Field Compliance", "+5 days", "Evidence pending"],
  ["JZN-DEC-1011", "Sabya", "Service closure delay", "84%", "Rebalance field-response capacity", "Services Agency", "+23 days", "In progress"],
  ["JZN-DEC-1015", "Abu Arish", "Permit SLA breach", "72%", "Permit backlog recovery sprint", "Licensing Department", "+14 days", "Under review"],
  ["JZN-DEC-1020", "Municipality 13", "Readiness degradation", "69%", "Emergency readiness checklist refresh", "Emergency Team", "+10 days", "Approved"],
  ["JZN-DEC-1024", "Jazan Central", "Citizen satisfaction drop", "64%", "Service center quality review", "Service Quality", "+21 days", "Escalate"],
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

function OverviewScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="usecase-dashboard-row hero-row">
        <article className="panel usecase-section golden-thread-card">
          <p className="eyebrow">Golden thread</p>
          <h2>Closed-loop operating cycle</h2>
          <p>Set targets, predict risk, recommend action, track execution, measure recovery, and learn.</p>
          {demo ? (
            <NumberedFlow labels={["Strategic objective", "KPI contract", "Certified data", "Predict & recommend", "Track", "Improve"]} />
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
        <p className="eyebrow">Notes</p>
        <h2>Thresholds and accountability</h2>
        <p>Green is on track, amber is at risk, and red is off track. Owners and data owners are explicit so every KPI is auditable and actionable.</p>
      </section>
    </>
  );
}

function ModelIntelligenceScreen({ demo }: { demo: boolean }) {
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
            </article>
            <div className="usecase-card-grid model-cards">
              <article><h3>RNN Forecast</h3><strong>78% probability of missing target</strong><p>GRU/LSTM runtime</p></article>
              <article><h3>Anomaly Detection</h3><strong>+23% resolution-time deviation</strong><p>z-score vs history</p></article>
              <article><h3>Composite Risk Score</h3><strong>84 / 100 high risk</strong><StatusDonut value="84%" tone="red" /></article>
              <article><h3>Recommendation Lookup</h3><strong>Field-response rebalancing</strong><p>similar cases: 3</p></article>
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
    </>
  );
}

function DecisionTrackerScreen({ demo }: { demo: boolean }) {
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
                {decisionRows.map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
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

function ScreenBody({ screen, demo }: { screen: ScreenId; demo: boolean }) {
  if (screen === "kpi-contract") return <KpiContractScreen demo={demo} />;
  if (screen === "model-intelligence") return <ModelIntelligenceScreen demo={demo} />;
  if (screen === "decision-action-tracker") return <DecisionTrackerScreen demo={demo} />;
  if (screen === "outcome-feedback") return <OutcomeFeedbackScreen demo={demo} />;
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
      <section className="panel usecase-section usecase-hero-contract">
        <p className="eyebrow">Purpose</p>
        <h2>Full golden thread from strategy to recovery</h2>
        <p>
          This use case connects KPI contracts, certified data, RNN forecast outputs, anomaly detection, transparent risk
          scoring, recommendation lookup, controlled decision buttons, corrective-action closure, and learning feedback.
        </p>
      </section>
      <ScreenBody screen={screen} demo={demo} />
    </PageFrame>
  );
}
