import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Management Office Establishment - Yottalogica",
};

const stages = [
  ["01", "Capability diagnostic", "Baseline maturity, gaps, evidence quality, and executive decision points."],
  ["02", "Governance design", "Target operating model, decision rights, policies, committees, and stewardship roles."],
  ["03", "Control implementation", "NDMO-aligned controls, data quality rules, catalogues, lineage, and evidence packs."],
  ["04", "DMO activation", "Cadence, reporting, issue management, ownership workflows, and adoption routines."],
  ["05", "P1 certification readiness", "Control traceability, remediation closure, and certification evidence preparation."],
] as const;

const approach = [
  ["Stage 01", "Diagnose", "Assess current data maturity, evidence availability, control gaps, ownership, and readiness constraints."],
  ["Stage 02", "Design", "Define the DMO operating model, committees, roles, policies, domains, and governance lifecycle."],
  ["Stage 03", "Implement", "Build the control library, data quality model, catalogue requirements, issue queue, and reporting cadence."],
  ["Stage 04", "Operate", "Run governance routines, stewardship forums, remediation reviews, and data-control performance tracking."],
  ["Stage 05", "Certify", "Prepare the evidence pack, close P1 gaps, and enable leadership review for certification readiness."],
] as const;

const methodRows = [
  [
    "Foundation",
    "Baseline maturity and evidence assessment",
    "Capture current state, score maturity, identify gaps, and distinguish claims from evidence.",
  ],
  [
    "Controls",
    "NDMO P1 control mapping",
    "Map policies, ownership, metadata, quality, privacy, and reporting artefacts to the control framework.",
  ],
  [
    "Operating model",
    "DMO roles, cadence, and governance forums",
    "Define decision rights, escalation paths, stewardship responsibilities, and monthly review routines.",
  ],
  [
    "Activation",
    "Evidence-backed adoption and remediation",
    "Convert gaps into an accountable action queue with owners, due dates, proof, and executive reporting.",
  ],
] as const;

const deliverables = [
  ["01", "DMO establishment blueprint", "Target operating model, governance structure, roles, decision rights, and implementation roadmap."],
  ["02", "NDMO P1 control matrix", "Traceability between required controls, artefacts, owners, evidence, and readiness status."],
  ["03", "Data governance policy suite", "Governance charter, domain ownership model, stewardship rules, and escalation procedures."],
  ["04", "Data quality operating model", "Critical data elements, quality rules, issue management, monitoring routines, and accountability."],
  ["05", "Catalogue and lineage requirements", "Metadata model, business glossary, lineage expectations, and platform implementation requirements."],
  ["06", "Certification evidence pack", "Executive status, closure evidence, control artefacts, governance minutes, and P1 readiness narrative."],
] as const;

export default function DataManagementOfficeEstablishmentPage() {
  return (
    <main className="dmo-landing" id="top">
      <header className="dmo-site-header" aria-label="Primary navigation">
        <nav className="dmo-nav">
          <a className="dmo-brand" href="#top" aria-label="Yottalogica home">
            <div className="dmo-brand-mark" aria-hidden="true">Y</div>
            <div className="dmo-brand-text">
              <strong>Yottalogica</strong>
              <span>Data Management Advisory</span>
            </div>
          </a>
          <div className="dmo-nav-links" aria-label="Page sections">
            <a href="#approach">Approach</a>
            <a href="#methodology">Methodology</a>
            <a href="#deliverables">Deliverables</a>
            <a href="#ndmo">NDMO Alignment</a>
          </div>
          <a className="dmo-nav-cta" href="#diagnostic">Request a diagnostic</a>
        </nav>
      </header>

      <section className="dmo-hero" aria-labelledby="dmo-hero-title">
        <div>
          <p className="dmo-eyebrow">Data Management Office Establishment</p>
          <h1 id="dmo-hero-title">
            Five stages from diagnosis to <span>certified</span> data governance.
          </h1>
          <p className="dmo-hero-copy">
            The only structured methodology that takes an organisation from a baseline capability diagnostic to a fully
            operational Data Management Office, with every deliverable mapped to NDMO P1 controls.
          </p>
          <div className="dmo-hero-actions">
            <a className="dmo-primary-btn" href="#diagnostic">Request your diagnostic</a>
            <a className="dmo-text-link" href="#approach">See the approach ↓</a>
          </div>
        </div>

        <aside className="dmo-executive-card" aria-label="Five-stage DMO establishment overview">
          <div>
            <p className="dmo-card-kicker">Establishment Pathway</p>
            <div className="dmo-stage-list">
              {stages.map(([number, title, text]) => (
                <div className="dmo-stage-item" key={number}>
                  <div className="dmo-stage-number">{number}</div>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dmo-certification-note">
            <span>Executive Outcome</span>
            <strong>Operational DMO with certification-ready evidence.</strong>
          </div>
        </aside>
      </section>

      <section className="dmo-metrics" aria-label="Programme metrics">
        {[
          ["152", "NDMO controls mapped"],
          ["68", "P1 controls addressed"],
          ["90", "Days to P1 certification"],
        ].map(([value, label]) => (
          <article className="dmo-metric-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="dmo-section" id="approach">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">Approach</p>
            <h2>A staged route from advisory assessment to operating capability.</h2>
          </div>
          <p>
            Yottalogica establishes the DMO as an operating function, not a documentation exercise. Every stage produces
            executive evidence, governance artefacts, operating routines, and control traceability aligned to NDMO P1.
          </p>
        </div>
        <div className="dmo-approach-grid">
          {approach.map(([stage, title, text]) => (
            <article className="dmo-approach-card" key={stage}>
              <span>{stage}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dmo-section" id="methodology">
        <div className="dmo-methodology">
          <div className="dmo-methodology-panel">
            <p className="dmo-eyebrow">Methodology</p>
            <h2>Control-led establishment for regulated, executive environments.</h2>
            <p>
              The methodology combines maturity assessment, NDMO control mapping, operating-model design, evidence
              management, and adoption routines into one board-level programme.
            </p>
          </div>
          <div className="dmo-method-list">
            {methodRows.map(([label, title, text]) => (
              <div className="dmo-method-row" key={label}>
                <span>{label}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dmo-section" id="deliverables">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">Deliverables</p>
            <h2>Board-ready outputs that can be reviewed, operated, and audited.</h2>
          </div>
          <p>
            Each deliverable is designed for practical use by leadership, the DMO, data owners, technology teams, and
            assurance stakeholders.
          </p>
        </div>
        <div className="dmo-deliverables-grid">
          {deliverables.map(([number, title, text]) => (
            <article className="dmo-deliverable" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dmo-section" id="ndmo">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">NDMO Alignment</p>
            <h2>Mapped to P1 governance maturity from day one.</h2>
          </div>
          <p>
            The engagement is structured around certification readiness, with every workstream linked to NDMO controls,
            ownership evidence, operating cadence, and measurable closure.
          </p>
        </div>
        <div className="dmo-ndmo-layout">
          <article className="dmo-ndmo-card">
            <strong>Control traceability</strong>
            <p>
              The control matrix creates a single view of requirements, owners, artefacts, evidence gaps, remediation
              actions, and executive readiness.
            </p>
            <ul>
              <li>Policy, ownership, stewardship, and governance forums.</li>
              <li>Data classification, glossary, metadata, quality, and lineage.</li>
              <li>Evidence status, risk rating, action owner, and due date.</li>
            </ul>
          </article>
          <article className="dmo-ndmo-card">
            <strong>Operational adoption</strong>
            <p>
              The DMO is activated through recurring governance routines, decision logs, action queues, and leadership
              reporting that prove the model is operating.
            </p>
            <ul>
              <li>Monthly data governance review cadence.</li>
              <li>Data owner and steward accountability model.</li>
              <li>P1 evidence pack and certification readiness dashboard.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="dmo-final-cta" id="diagnostic" aria-labelledby="dmo-diagnostic-title">
        <div>
          <h2 id="dmo-diagnostic-title">Start with a diagnostic. Finish with an operating DMO.</h2>
          <p>
            Request a focused executive diagnostic to assess your current data governance maturity, NDMO P1 readiness,
            evidence gaps, and 90-day establishment pathway.
          </p>
        </div>
        <a className="dmo-primary-btn" href="mailto:advisory@yottalogica.com?subject=DMO%20Establishment%20Diagnostic">
          Request your diagnostic
        </a>
      </section>
    </main>
  );
}
