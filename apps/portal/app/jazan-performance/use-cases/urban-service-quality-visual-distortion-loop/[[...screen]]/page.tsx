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
  ["JZN-DEC-1007", "Samtah · visual distortion", "78%", "Field Compliance", "Joint inspection sweep", "Proposed"],
  ["JZN-DEC-1011", "Sabya · service closure", "84%", "Services Agency", "Field response rebalance", "Approved"],
  ["JZN-DEC-1015", "Abu Arish · permits", "72%", "Licensing Department", "Permit SLA recovery", "In review"],
];

const recoveryRows = [
  ["Samtah visual distortion", "82%", "91%", "+9pp", "Evidence submitted"],
  ["Sabya service closure", "68%", "88%", "+20pp", "In progress"],
  ["Abu Arish permit SLA", "2.4d", "1.6d", "improving", "Review"],
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

function OverviewScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Golden thread overview</p>
        <h2>Strategy to recovery loop</h2>
        {demo ? (
          <div className="usecase-thread">
            {goldenThread.map(([stage, title, text]) => (
              <article key={stage}>
                <span>{stage}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>

      <section className="panel usecase-section">
        <p className="eyebrow">Headline KPI strip</p>
        <h2>Urban service signal</h2>
        <MetricStrip demo={demo} />
      </section>

      <section className="usecase-two-column">
        <article className="panel usecase-section">
          <p className="eyebrow">Risk case preview</p>
          <h2>Samtah district 4 visual distortion</h2>
          {demo ? (
            <div className="usecase-risk-card">
              <strong>78% breach probability</strong>
              <p>RNN forecast predicts complaint-closure SLA breach within 4 weeks; anomaly detector confirms +287% complaint surge.</p>
              <span>Decision candidate: JZN-DEC-1007</span>
            </div>
          ) : (
            <EmptyPanel />
          )}
        </article>
        <article className="panel usecase-section">
          <p className="eyebrow">Recommendation preview</p>
          <h2>Human-in-the-loop action</h2>
          {demo ? (
            <div className="usecase-risk-card">
              <strong>Joint inspection sweep</strong>
              <p>Recommendation lookup found 22 comparable clusters with average resolution in 28-35 days.</p>
              <span>Owner: Field Compliance</span>
            </div>
          ) : (
            <EmptyPanel />
          )}
        </article>
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
      <section className="panel usecase-section">
        <p className="eyebrow">Strategic objective</p>
        <h2>Sustain and improve municipal service quality and visual-distortion response</h2>
        <p>Aligned to Vision 2030 service excellence, ministry municipal transformation, and Jazan quality-of-life improvement.</p>
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">KPI contract table</p>
        <h2>Definitions, targets, owners, and sources</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["KPI", "Formula", "Target", "Owner", "Source"].map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {kpis.map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
    </>
  );
}

function ModelIntelligenceScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Data lineage</p>
        <h2>Certified data to transparent decision candidates</h2>
        {demo ? (
          <div className="usecase-lineage">
            {["source_jazan", "staging", "analytics marts", "output models", "decision candidates"].map((stage) => (
              <span key={stage}>{stage}</span>
            ))}
          </div>
        ) : (
          <EmptyPanel />
        )}
      </section>
      <section className="panel usecase-section">
        <p className="eyebrow">Model intelligence</p>
        <h2>Forecast, anomaly, risk, and recommendation layer</h2>
        {demo ? (
          <div className="usecase-card-grid">
            {models.map(([title, method, text, output]) => (
              <article key={title}>
                <span>{method}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <code>{output}</code>
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

function DecisionTrackerScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Generated decision candidates</p>
        <h2>Model flags awaiting review</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["Decision", "Risk", "Probability", "Owner", "Recommendation", "Status"].map((column) => <th key={column}>{column}</th>)}</tr>
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
      <section className="panel usecase-section">
        <p className="eyebrow">Controlled action buttons</p>
        <h2>Portal actions backed by audited workflow endpoints</h2>
        <div className="usecase-action-grid">
          {decisionButtons.map(([label, endpoint]) => (
            <article key={label}>
              <strong>{label}</strong>
              <code>{endpoint}</code>
              <p>{demo ? "Demo only - backend workflow contract defined" : "Not connected"}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function OutcomeFeedbackScreen({ demo }: { demo: boolean }) {
  return (
    <>
      <section className="panel usecase-section">
        <p className="eyebrow">Before / after KPI recovery</p>
        <h2>Did the action work?</h2>
        {demo ? (
          <div className="jazan-table-wrap strategic-scroll-table">
            <table className="table jazan-data-table">
              <thead>
                <tr>{["Case", "Before", "After", "Recovery", "Lifecycle"].map((column) => <th key={column}>{column}</th>)}</tr>
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
      <section className="panel usecase-section">
        <p className="eyebrow">Learning feedback</p>
        <h2>Updates to model and operating model</h2>
        {demo ? (
          <div className="usecase-thread compact">
            {["Forecast accuracy recorded", "Recommendation effectiveness updated", "Monthly review pack refreshed", "Pillar 6 training need created if repeated"].map((item) => (
              <article key={item}><h3>{item}</h3></article>
            ))}
          </div>
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
