import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data governance detail - Jazan Performance",
};

const governanceSummary = [
  ["Coverage", "6 / 18 sources", "Early-warning sources classified; remaining domains pending"],
  ["Lineage", "Partial", "Source to mart lineage exists for active Pillar 4 feeds"],
  ["Classification", "Partial", "Municipality, project, finance, and service domains mapped"],
  ["Data quality", ">90%", "Connected early-warning slice passing threshold checks"],
  ["Evidence", "Needs expansion", "Monthly review evidence pack not fully certified"],
];

const lineageSteps = [
  ["Source", "source_jazan.*", "Municipal source extracts and reference data"],
  ["Raw/Staging", "staging_jazan.*", "Loaded, typed, and timestamped source records"],
  ["Analytics marts", "analytics.fct_* / analytics.dim_*", "Governed facts, dimensions, and model features"],
  ["Runtime outputs", "output_jazan.*", "Predictive scores, anomalies, forecasts, and recommendations"],
  ["Portal/API", "/api/v1/jazan/*", "Dashboards, drilldowns, decisions, and review packs"],
];

const classificationRows = [
  ["Municipality reference", "Internal", "Municipality ID, name, region, coordinator"],
  ["Project milestones", "Internal", "Schedule dates, actuals, contractor, owner"],
  ["Service requests", "Operational", "Backlog, SLA status, service category"],
  ["Revenue collections", "Restricted", "Collections, budget, variance, period"],
  ["Visual distortion cases", "Operational", "Open cases, location, closure status"],
  ["Decision logs", "Restricted", "Owner assignment, escalation, action outcome"],
];

const qualityChecks = [
  ["Freshness", "Loaded within SLA for early-warning slice", "partial"],
  ["Completeness", "Required fields checked before scoring", "partial"],
  ["Validity", "Status and threshold values constrained to dictionaries", "partial"],
  ["Reconciliation", "Budget and project totals require finance-domain connection", "pending"],
  ["Certification", "Certified marts pending KPI dictionary approval", "pending"],
];

const controls = [
  ["Data owner", "Named owner required before KPI certification"],
  ["KPI owner", "Accountable owner required for scorecard publication"],
  ["Lineage evidence", "Source, transform, mart, runtime, and API links retained"],
  ["Audit trail", "Refresh, scoring, and decision events logged"],
  ["Access boundary", "Frontend consumes APIs and governed marts, not raw tables"],
];

function StatusPill({ status }: { status: string }) {
  return <span className={`delivery-status-chip ${status === "pending" ? "pending" : "partial"}`}>{status}</span>;
}

export default function DataGovernanceDetailPage() {
  return (
    <main className="page jazan-workspace-page jazan-governance-detail-page">
      <section className="hero">
        <div className="hero-header">
          <div className="hero-copy">
            <p className="eyebrow">Pillar 3 &gt; Delivery components &gt; Data governance</p>
            <h1>Data governance</h1>
            <p>Lineage, classification, data quality, ownership, audit evidence, and certification controls.</p>
          </div>
          <div className="hero-actions">
            <Link className="secondary-link" href="/jazan-performance/data-analytics-dashboards/delivery-components">
              Back to delivery components
            </Link>
          </div>
        </div>
        <div className="hero-strip">
          <span className="chip primary">Status: partial</span>
          <span className="chip accent">Governance module</span>
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Governance health</p>
            <h2>Current control coverage</h2>
          </div>
        </div>
        <div className="jazan-warning-metrics">
          {governanceSummary.map(([label, value, note]) => (
            <article className="jazan-warning-metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Lineage</p>
            <h2>Source to decision path</h2>
          </div>
        </div>
        <div className="governance-lineage-flow">
          {lineageSteps.map(([stage, asset, description]) => (
            <article key={stage}>
              <span>{stage}</span>
              <strong>{asset}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Classification</p>
              <h2>Domain inventory</h2>
            </div>
          </div>
          <div className="jazan-table-wrap">
            <table className="table jazan-data-table governance-compact-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Class</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                {classificationRows.map(([domain, dataClass, examples]) => (
                  <tr key={domain}>
                    <td>{domain}</td>
                    <td>{dataClass}</td>
                    <td>{examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Quality</p>
              <h2>Data quality gates</h2>
            </div>
          </div>
          <div className="governance-check-list">
            {qualityChecks.map(([check, description, status]) => (
              <div key={check}>
                <div>
                  <strong>{check}</strong>
                  <p>{description}</p>
                </div>
                <StatusPill status={status} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Evidence and controls</p>
            <h2>Certification requirements</h2>
          </div>
        </div>
        <div className="governance-control-grid">
          {controls.map(([title, description]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
