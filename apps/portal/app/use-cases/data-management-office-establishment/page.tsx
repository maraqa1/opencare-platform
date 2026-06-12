import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DMO Establishment Methodology - Yottalogica",
};

const challengeItems = [
  [
    "01",
    "No baseline, no direction",
    "Programmes launched without a scored diagnostic have no way to prioritise. Every domain appears equally urgent.",
  ],
  [
    "02",
    "Controls without owners",
    "NDMO controls are documented but no named individual is accountable for evidence, remediation, or sign-off.",
  ],
  [
    "03",
    "Deliverables without controls",
    "Teams produce governance documents that satisfy internal requirements but cannot be mapped to a specific P1 control.",
  ],
  [
    "04",
    "No certification path",
    "Work is done but there is no defined endpoint: no gate that declares P1 compliance achieved and evidenced.",
  ],
] as const;

const stages = [
  {
    number: "1",
    state: "done",
    label: "Stage 1 - Diagnose",
    title: "Capability diagnostic & baseline",
    description:
      "A structured assessment across all 13 data capability domains produces a scored maturity baseline on a 0-4 scale. Every gap is quantified, evidence-backed, and mapped to a domain owner.",
    output: "Scored diagnostic report, priority gap register, 90-day readiness assessment",
    href: "/use-cases/data-ai-capability-diagnostic",
  },
  {
    number: "2",
    state: "done",
    label: "Stage 2 - Frame",
    title: "NDMO control framework contextualisation",
    description:
      "The 152 NDMO controls across 12 domains are contextualised against the organisation's sector, size, and data profile. P1 controls are separated from P2 and a coverage position is established.",
    output: "NDMO control landscape, P1/P2 split, domain coverage map",
    href: "#ndmo",
  },
  {
    number: "3",
    state: "active",
    label: "Stage 3 - Map",
    title: "Gap-to-control crosswalk",
    description:
      "Every priority gap identified in Stage 1 is mapped to its NDMO control reference, assigned a P1 or P2 priority, and linked to the deliverable that will close it.",
    output: "Gap-to-control crosswalk, prioritised remediation register, owner assignment matrix",
    href: "#deliverables",
  },
  {
    number: "4",
    state: "next",
    label: "Stage 4 - Build",
    title: "Lifecycle deliverables & evidence artefacts",
    description:
      "Domain lifecycle deliverables are built in control-dependency order. Each deliverable is specified with activities, named owners, effort estimates, dependencies, and a readiness gate.",
    output: "Data quality lifecycle artefacts, NDMO pack documents, readiness gates",
    href: "#deliverables",
  },
  {
    number: "5",
    state: "next",
    label: "Stage 5 - Certify",
    title: "P1 certification & DMO operationalisation",
    description:
      "The Data Management Office is declared operational when all P1 controls carry approved evidence artefacts, every domain has a named owner, and the governance review cycle is live.",
    output: "Validated P1 scorecard, NDMO evidence pack, DMO operating model, board certification report",
    href: "#contact",
  },
] as const;

const logicItems = [
  [
    "1",
    "Stage 1 is the only honest starting point",
    "A scored diagnostic with evidence-backed responses replaces assumption with a fact base that every subsequent decision rests on.",
  ],
  [
    "2",
    "Deliverables without a control map produce orphaned artefacts",
    "The crosswalk ensures every deliverable built in Stage 4 is traceable to a specific control closure.",
  ],
  [
    "3",
    "The DMO is the institution, not the documentation",
    "The programme closes only when the standing office has owners, cadence, monitoring, and a repeating evidence cycle.",
  ],
  [
    "4",
    "Each stage speaks to a different decision-maker",
    "The same methodology serves the board, regulator, programme manager, implementation team, and NDMO auditor.",
  ],
  [
    "5",
    "The 90-day sprint is embedded",
    "The remediation roadmap maps directly onto crosswalk, build, and certify stages.",
  ],
  [
    "6",
    "Evidence is produced, not assembled retrospectively",
    "Every deliverable carries a readiness gate before the control is marked closed.",
  ],
] as const;

const deliverables = [
  [
    "1 - Diagnose",
    "Complete",
    "Data & AI Capability Diagnostic Report",
    "Maturity heatmap, gap register, and 90-day roadmap across 13 domains and 84 evidence-backed questions.",
    "Board / Executive team",
    "Establishes the compliance baseline all subsequent control closures are measured against.",
  ],
  [
    "2 - Frame",
    "Complete",
    "NDMO Control Landscape & Coverage Map",
    "Full NDMO control inventory contextualised to the organisation, with P1 controls separated and prioritised.",
    "Programme manager / Regulator",
    "Provides the compliance target state that drives all programme sequencing.",
  ],
  [
    "3 - Map",
    "In progress",
    "Gap-to-Control Crosswalk Register",
    "Every diagnostic gap mapped to its NDMO control reference, priority level, and the deliverable that closes it.",
    "Programme manager / Domain owners",
    "Ensures every remediation activity is traceable to a named control.",
  ],
  [
    "4 - Build",
    "Next",
    "NDMO Compliance Pack + Data Quality Lifecycle",
    "Governance pack and data quality artefacts with activities, owners, dependencies, and readiness gates.",
    "Implementation team / Data owners",
    "Produces the evidence artefacts an NDMO P1 inspection will request by name.",
  ],
  [
    "5 - Certify",
    "Final",
    "DMO Operating Model & P1 Certification Pack",
    "Closed control register, evidence artefacts, named owners, governance calendar, and board-ready certification report.",
    "Board / NDMO / Auditors",
    "Delivers the complete evidence pack an NDMO P1 inspection requires.",
  ],
] as const;

export default function DataManagementOfficeEstablishmentPage() {
  return (
    <main className="dmo-methodology-page" id="top">
      <header className="dmo-wide-header">
        <nav className="dmo-wide-nav" aria-label="DMO methodology navigation">
          <a className="dmo-wide-brand" href="#top" aria-label="Yottalogica DMO methodology">
            <span className="dmo-wide-mark" aria-hidden="true">
              Y
            </span>
            <span>
              <strong>Yottalogica</strong>
              <small>Data Management Advisory</small>
            </span>
          </a>
          <div className="dmo-wide-links">
            <a href="#approach">Approach</a>
            <a href="#why">Methodology</a>
            <a href="#deliverables">Deliverables</a>
            <a href="#ndmo">NDMO Alignment</a>
            <a href="#contact" className="dmo-wide-nav-cta">
              Request a diagnostic
            </a>
          </div>
        </nav>
      </header>

      <section className="dmo-wide-hero">
        <p className="dmo-wide-eyebrow">Data Management Office Establishment</p>
        <h1>
          Five stages from diagnosis to <em>certified</em> data governance.
        </h1>
        <p>
          The structured methodology that takes an organisation from a baseline capability diagnostic to a fully
          operational Data Management Office, with every deliverable mapped to NDMO P1 controls.
        </p>
        <div className="dmo-wide-actions">
          <Link className="dmo-wide-primary" href="/use-cases/data-ai-capability-diagnostic">
            Request your diagnostic
          </Link>
          <a className="dmo-wide-ghost" href="#approach">
            See the approach
          </a>
        </div>
        <div className="dmo-wide-stats" aria-label="Methodology metrics">
          {[
            ["152", "NDMO controls mapped"],
            ["68", "P1 controls addressed"],
            ["90", "Days to P1 certification"],
          ].map(([value, label]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dmo-wide-section dmo-wide-challenge" id="challenge">
        <div className="dmo-wide-section-inner">
          <p className="dmo-wide-section-eye">The problem</p>
          <h2>Why most data governance programmes stall</h2>
          <div className="dmo-wide-challenge-grid">
            <div className="dmo-wide-prose">
              <p>
                Organisations attempting to establish a Data Management Office face a sequencing problem. They either
                begin with compliance documents that have no operational foundation, or they invest in technical
                infrastructure before governance structures exist to manage it.
              </p>
              <p>
                The result is the same in both cases: frameworks that exist on paper, controls that cannot be evidenced,
                and an inspection that surfaces the same gaps the programme was meant to close.
              </p>
              <p>
                The five-stage methodology resolves this by establishing a clear dependency chain, so every decision,
                document, and control is built on verified evidence rather than assumption.
              </p>
            </div>
            <div className="dmo-wide-challenge-list">
              {challengeItems.map(([number, title, text]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dmo-wide-section" id="approach">
        <div className="dmo-wide-section-inner">
          <div className="dmo-wide-split-heading">
            <div>
              <p className="dmo-wide-section-eye">The methodology</p>
              <h2>A five-stage approach to establishing your Data Management Office</h2>
            </div>
            <p>
              Each stage answers a different question for a different stakeholder, from the board to the NDMO auditor.
              The stages are sequential by design: skipping one breaks the evidence chain.
            </p>
          </div>

          <div className="dmo-wide-stage-grid">
            {stages.map((stage, index) => (
              <details className={`dmo-wide-stage ${stage.state}`} key={stage.number} open={index === 0}>
                <summary>
                  <span className="dmo-wide-stage-circle">{stage.state === "done" ? "✓" : stage.number}</span>
                  <span className="dmo-wide-stage-content">
                    <small>{stage.label}</small>
                    <strong>{stage.title}</strong>
                  </span>
                  <span className="dmo-wide-stage-ghost" aria-hidden="true">
                    {stage.number}
                  </span>
                </summary>
                <div className="dmo-wide-stage-body">
                  <p>{stage.description}</p>
                  <div>
                    <span aria-hidden="true" />
                    <strong>Deliverable:</strong> {stage.output}
                  </div>
                  <a href={stage.href}>{stage.number === "1" ? "Open live diagnostic module" : "Review dependency"}</a>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="dmo-wide-logic" id="why">
        <div className="dmo-wide-section-inner">
          <p className="dmo-wide-section-eye">The logic</p>
          <h2>Why the five-stage sequence cannot be reordered</h2>
          <p>
            Each stage produces the input that the next stage requires. The dependency chain is not a consulting
            convention; it reflects the evidence requirements of an NDMO P1 inspection.
          </p>
          <div className="dmo-wide-logic-grid">
            {logicItems.map(([number, title, text]) => (
              <article key={title}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dmo-wide-section dmo-wide-deliverables" id="deliverables">
        <div className="dmo-wide-section-inner">
          <p className="dmo-wide-section-eye">What you receive</p>
          <h2>Deliverables at every stage</h2>
          <p className="dmo-wide-section-copy">
            Every output is both a governance artefact and an NDMO evidence document. Nothing is produced that does not
            serve a dual purpose.
          </p>
          <div className="dmo-wide-table-wrap">
            <table className="dmo-wide-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Primary output</th>
                  <th>What it contains</th>
                  <th>Answers for</th>
                  <th>NDMO value</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map(([stage, status, output, contains, audience, value]) => (
                  <tr key={stage}>
                    <td>
                      <strong>{stage}</strong>
                      <span className={`dmo-wide-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                    </td>
                    <td>{output}</td>
                    <td>{contains}</td>
                    <td>{audience}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="dmo-wide-ndmo" id="ndmo">
        <div className="dmo-wide-section-inner dmo-wide-ndmo-grid">
          <div>
            <p className="dmo-wide-section-eye">NDMO alignment</p>
            <h2>Built for the Saudi data governance regulatory context</h2>
            <p>
              Every deliverable is designed against the NDMO Data Management Framework and PDPL obligations. The
              methodology does not produce compliance-adjacent documentation; it produces artefacts referenced by
              control number and evidence requirement.
            </p>
          </div>
          <div className="dmo-wide-ndmo-numbers">
            {[
              ["152", "Total NDMO controls", "Across 12 data domains"],
              ["68", "P1 mandatory controls", "Immediate implementation"],
              ["85%", "P1 coverage target", "Through governance pack delivery"],
              ["90", "Days to P1 readiness", "Mobilise, close, certify"],
            ].map(([value, label, text]) => (
              <article key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dmo-wide-contact" id="contact">
        <p className="dmo-wide-section-eye">Start your diagnostic</p>
        <h2>Your Data Management Office begins with an honest baseline.</h2>
        <p>
          Start with Module 01 to capture maturity, evidence, gaps, Gartner positioning, and AI-generated executive
          reporting, then move into NDMO control mapping and P1 readiness.
        </p>
        <div className="dmo-wide-actions centered">
          <Link className="dmo-wide-primary" href="/use-cases/data-ai-capability-diagnostic">
            Open Module 01 Diagnostic
          </Link>
          <a className="dmo-wide-ghost" href="#approach">
            Review the methodology
          </a>
        </div>
      </section>

      <footer className="dmo-wide-footer">
        <div>
          <strong>Yottalogica</strong>
          <span>Data Management Advisory</span>
        </div>
        <p>NDMO Data Management Framework / PDPL Compliance / DMO Establishment</p>
      </footer>
    </main>
  );
}
