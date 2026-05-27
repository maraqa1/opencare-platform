import type { Metadata } from "next";
import Link from "next/link";

import { getApiJson } from "@/lib/api";
import {
  emptyJazanOverview,
  emptyJazanPillarsResponse,
  formatJazanFreshness,
  formatJazanMetric,
  formatJazanRisks,
  formatJazanStatus,
  type JazanOverview,
  type JazanPillarsResponse,
} from "@/lib/jazan";

export const metadata: Metadata = {
  title: "Jazan RFP - Performance Management Target Operating Model",
};

const outcomes = [
  { icon: "SA", title: "Strategic Alignment", note: "Every initiative linked to objectives and KPIs" },
  {
    icon: "PG",
    title: "Performance Governance",
    note: "Every approved KPI has formula, owner, target, source, and threshold",
  },
  {
    icon: "DD",
    title: "Data-Driven Decisions",
    note: "Executive dashboards and review packs generated from governed data",
  },
  {
    icon: "EW",
    title: "Early Warning",
    note: "Project delay, revenue decline, service deterioration, and visual distortion risks flagged early",
  },
  { icon: "AC", title: "Accountability", note: "Corrective actions assigned, tracked, escalated, and closed" },
  { icon: "SU", title: "Sustainability", note: "Amanah and municipality teams trained to operate the model" },
];

const rhythm = [
  ["Daily / Weekly", "Operational follow-up"],
  ["Monthly", "KPI and corrective-action review"],
  ["Quarterly", "Strategic performance review"],
  ["Annually", "KPI, target, and initiative refresh"],
  ["Continuous", "Data quality, risk monitoring, and improvement"],
];

export default async function HomePage() {
  const [overviewResponse, pillarDataResponse] = await Promise.all([
    getApiJson<JazanOverview>({
      path: "/api/v1/jazan/overview",
      fallback: emptyJazanOverview,
      cacheMode: "no-store",
    }),
    getApiJson<JazanPillarsResponse>({
      path: "/api/v1/jazan/pillars",
      fallback: emptyJazanPillarsResponse,
      cacheMode: "no-store",
    }),
  ]);

  const overview =
    overviewResponse.governance && overviewResponse.foundation_enablers.includes("Integration & Security")
      ? overviewResponse
      : emptyJazanOverview;
  const pillars =
    pillarDataResponse.pillars?.[0]?.title === "Strategic Alignment & Objective Cascade"
      ? pillarDataResponse.pillars
      : emptyJazanPillarsResponse.pillars;

  return (
    <div className="page jazan-tom-page">
      <header className="jazan-tom-header">
        <div className="jazan-region-lockup">
          <div className="jazan-region-mark">JR</div>
          <div>
            <em lang="ar" dir="rtl">منطقة جازان</em>
            <strong>{overview.region}</strong>
            <span>{overview.platform}</span>
          </div>
        </div>
        <div className="jazan-title-block">
          <h1>Jazan RFP - Performance Management Target Operating Model</h1>
          <p>Data-Driven | Integrated | Accountable | Impact-Focused</p>
        </div>
        <div className="jazan-impact-lockup">
          <em lang="ar" dir="rtl">نحو إدارة أداء تحقق الأثر</em>
          <strong>Performance that Delivers Impact</strong>
          <span>Foundation shell for measurable outcomes</span>
        </div>
      </header>

      <section className="jazan-tom-layout">
        <aside className="jazan-stakeholders">
          <h2>Stakeholder Coverage</h2>
          {overview.stakeholders.map((group, index) => (
            <article key={group.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{group.title}</h3>
                <ul>
                  {group.coverage.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </aside>

        <main className="jazan-operating-model">
          <section className="jazan-vision">
            <p>Our Vision</p>
            <h2>{overview.vision}</h2>
          </section>

          <section className="jazan-pillars">
            <h2>Jazan Performance Management - 6 RFP Pillars</h2>
            <div className="jazan-pillar-grid">
              {pillars.map((pillar) => (
                <Link className={`jazan-pillar-card ${pillar.tone}`} href={pillar.route} key={pillar.id}>
                  <span>{pillar.number}</span>
                  <div>
                    <h3>{pillar.title}</h3>
                    <ul>
                      {pillar.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    <dl className="jazan-pillar-meta">
                      <div>
                        <dt>Status</dt>
                        <dd>{formatJazanStatus(pillar.status)}</dd>
                      </div>
                      <div>
                        <dt>Primary KPI</dt>
                        <dd>{pillar.primary_kpi.label}</dd>
                      </div>
                      <div>
                        <dt>KPI Value</dt>
                        <dd>{formatJazanMetric(pillar.primary_kpi)}</dd>
                      </div>
                      <div>
                        <dt>Open Risks</dt>
                        <dd>{formatJazanRisks(pillar.open_risks)}</dd>
                      </div>
                      <div>
                        <dt>Data Freshness</dt>
                        <dd>{formatJazanFreshness(pillar.data_freshness)}</dd>
                      </div>
                      <div>
                        <dt>Route</dt>
                        <dd>{pillar.route}</dd>
                      </div>
                    </dl>
                  </div>
                </Link>
              ))}
            </div>
            <div className="jazan-value-cycle" aria-label="Performance management value cycle">
              {["Align", "Define", "Collect", "Analyze", "Decide", "Act & Improve"].map((step) => (
                <span key={step}>{step}</span>
              ))}
              <strong>Performance Management Value Cycle</strong>
            </div>
          </section>

          <section className="jazan-enablers">
            <h2>Foundation Enablers</h2>
            <div>
              {overview.foundation_enablers.map((enabler) => (
                <span key={enabler}>{enabler}</span>
              ))}
            </div>
          </section>
        </main>

        <aside className="jazan-outcomes">
          <h2>Target Outcomes</h2>
          {outcomes.map((outcome) => (
            <article key={outcome.title}>
              <span>{outcome.icon}</span>
              <div>
                <h3>{outcome.title}</h3>
                <p>{outcome.note}</p>
              </div>
            </article>
          ))}
        </aside>
      </section>

      <section className="jazan-bottom-grid">
        <article className="jazan-rhythm-panel">
          <h2>Operating Rhythm</h2>
          <div>
            {rhythm.map(([label, cadence]) => (
              <section key={label}>
                <span>{label.slice(0, 2).toUpperCase()}</span>
                <strong>{label}</strong>
                <p>{cadence}</p>
              </section>
            ))}
          </div>
        </article>

        <article className="jazan-governance-panel">
          <h2>Governance Structure / Controls</h2>
          <div className="jazan-governance-tree">
            <strong>{overview.governance.top}</strong>
            <p>{overview.governance.description}</p>
            <div>
              {overview.governance.boxes.map((control) => (
                <span key={control}>{control}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="jazan-measures-panel">
          <h2>Success Measures</h2>
          <div>
            {overview.success_measures.map((measure) => (
              <section key={measure.label}>
                <p>{measure.label}</p>
                <strong>{formatJazanMetric(measure)}</strong>
              </section>
            ))}
          </div>
        </article>
      </section>

      <footer className="jazan-tom-footer">
        <span>Aligned Strategy</span>
        <span>Governed KPIs</span>
        <span>Trusted Data</span>
        <span>Early Warning</span>
        <span>Accountable Actions</span>
        <span>Sustainable Capability</span>
        <span>=</span>
        <strong>Measurable Impact for Jazan</strong>
        <div>
          <Link className="button primary" href="/jazan-performance/admin">
            Configure Foundation
          </Link>
          <Link className="secondary-link" href="/jazan-performance/early-warning">
            Prepare Use Case
          </Link>
        </div>
        <p>Platform data status: Not connected</p>
        <div className="jazan-status-legend" aria-label="Operating model status legend">
          <span><i className="on-track" /> on track</span>
          <span><i className="watch" /> watch</span>
          <span><i className="at-risk" /> at risk</span>
          <span><i className="unavailable" /> needs data</span>
        </div>
      </footer>
    </div>
  );
}
