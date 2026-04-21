import Link from "next/link";

import { PageFrame } from "@/components/page-frame";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

export default function BedPressureOverviewPage() {
  return (
    <PageFrame
      eyebrow="Bed Pressure"
      title="What this use case solves"
      description="Investor and onboarding context for why Bed Pressure Intelligence exists. The operational landing page is Current Status."
    >
      <UseCaseWorkspace activeTab="overview">
        <section className="grid">
          <article className="panel span-8">
            <p className="eyebrow">What This Solves</p>
            <h3>From whiteboards and phone calls to governed minutes-to-awareness</h3>
            <p className="section-subtitle">
              Hospital bed managers spend hours daily chasing occupancy data via whiteboards
              and phone calls. OpenCare provides real-time occupancy, 7-day predictive
              forecasts, and automatic anomaly detection, reducing time-to-awareness from
              hours to minutes.
            </p>
          </article>
          <article className="panel span-4">
            <p className="eyebrow">Data Pipeline</p>
            <h3>MySQL to portal</h3>
            <p className="section-subtitle">
              MySQL to Airbyte to dbt to R Forecast to R Anomaly to Portal.
            </p>
            <div className="trust-line">
              <span>Hourly refresh</span>
              <span>42 quality tests</span>
              <span>6 sources</span>
            </div>
          </article>
        </section>

        <section className="operations-grid">
          {[
            ["Current Occupancy", "87.3%", "Live occupancy pressure"],
            ["7-Day Forecast", "3 risks", "Wards likely to breach"],
            ["Active Anomalies", "5 alerts", "Signals requiring action"],
          ].map(([label, value, note]) => (
            <article className="stat" key={label}>
              <p className="eyebrow">{label}</p>
              <p className="value">{value}</p>
              <p className="section-subtitle">{note}</p>
            </article>
          ))}
        </section>

        <section className="grid">
          <article className="panel span-6">
            <p className="eyebrow">Personas</p>
            <ul className="list">
              <li>Bed Manager: real-time pressure, forecast, escalation.</li>
              <li>Ops Director: trends, board evidence, capacity planning.</li>
              <li>Platform Admin: pipeline health, data freshness, governance.</li>
            </ul>
          </article>
          <article className="panel span-6">
            <p className="eyebrow">Decisions Supported</p>
            <ul className="list">
              <li>Pre-emptive discharge planning.</li>
              <li>Surge capacity activation.</li>
              <li>Elective admission scheduling.</li>
              <li>Staffing escalation.</li>
            </ul>
          </article>
        </section>

        <div className="button-row">
          <Link className="button primary" href="/use-cases/bed-pressure/status">
            Enter Current Status
          </Link>
        </div>
      </UseCaseWorkspace>
    </PageFrame>
  );
}
