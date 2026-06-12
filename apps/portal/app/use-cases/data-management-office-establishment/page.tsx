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
    state: "completed",
    status: "Completed",
    label: "Step 1 - Diagnose",
    title: "Data & AI capability diagnostic",
    question: "Where are we today, honestly, and with evidence?",
    what:
      "Produces a scored, evidence-backed baseline across data capability domains on a 0-4 maturity scale. Every gap is quantified, every domain has a priority level, and every score is tied to evidence.",
    why:
      "A data strategy written without a baseline is aspirational but not grounded. The diagnostic becomes the evidence base for everything that follows.",
    output: "Scored maturity report, priority gap register, AI readiness gate, 90-day readiness roadmap",
    feeds: "Feeds Step 2 data strategy, Step 3 control mapping, and Step 4 DMO scope.",
    href: "/use-cases/data-ai-capability-diagnostic",
  },
  {
    number: "2",
    state: "next",
    status: "Next",
    label: "Step 2 - Strategise",
    title: "Data strategy",
    question: "Where are we going, and in what order of priority?",
    what:
      "Defines the target state, strategic pillars, domain maturity targets, three-horizon roadmap, data principles, and success metrics grounded in the Step 1 diagnostic.",
    why:
      "The DMO cannot be designed until the organisation knows what it needs to govern, which domains matter first, and which use cases justify investment.",
    output: "Data strategy, value themes, domain targets, three-horizon roadmap, success KPIs",
    feeds: "Feeds Step 3 DMO design, Step 4 charter scope, and Step 5 control priorities.",
    href: "#deliverables",
  },
  {
    number: "3",
    state: "future",
    status: "Future",
    label: "Step 3 - Design",
    title: "DMO design & operating model",
    question: "What institution do we need to build to execute the strategy?",
    what:
      "Designs the Data Management Office as a governance institution: structure, role definitions, decision rights, escalation paths, governance calendar, and reporting lines.",
    why:
      "Design and establishment are different activities. The office must be specified before it is launched with real people and real governance cadence.",
    output: "DMO operating model, role definitions, decision rights matrix, governance calendar blueprint",
    feeds: "Feeds Step 4 charter drafting, RACI matrix, and domain-owner appointment briefs.",
    href: "#deliverables",
  },
  {
    number: "4",
    state: "future",
    status: "Future",
    label: "Step 4 - Establish",
    title: "DMO establishment",
    question: "Who owns what, starting today?",
    what:
      "Stands up the DMO as a live operating function with approved governance charter, published RACI, named owners, data council cadence, and evidence routines.",
    why:
      "Every implementation deliverable needs a named owner, evidence standard, and approval path before execution begins, not retrospectively.",
    output: "Governance charter, RACI matrix, named owners, data council live, evidence routines",
    feeds: "Closes governance ownership gaps and gives Step 5 named owners for every deliverable.",
    href: "#deliverables",
  },
  {
    number: "5",
    state: "future",
    status: "Future",
    label: "Step 5 - Execute",
    title: "Programme execution & control closure",
    question: "What do we build to close the gaps, and how do we evidence it?",
    what:
      "Builds remediation work packages, control artefacts, lifecycle evidence, issue logs, decision logs, dashboards, and executive progress reporting.",
    why:
      "Execution converts diagnostic gaps, strategy, and operating model decisions into auditable evidence and measurable control closure.",
    output: "Control closure plan, remediation tracker, evidence artefacts, risk log, executive progress pack",
    feeds: "Produces the evidence pack submitted in Step 6 for P1 certification and DMO operational proof.",
    href: "#deliverables",
  },
  {
    number: "6",
    state: "future",
    status: "Future",
    label: "Step 6 - Certify",
    title: "P1 certification & DMO operationalisation",
    question: "Are we compliant, and can we prove it?",
    what:
      "Validates that mandatory controls carry approved evidence, confirms owner sign-off, assembles the evidence pack, and transitions the DMO into business-as-usual operation.",
    why:
      "Certification is credible only when control evidence, governance cadence, and accountable ownership already exist and can be operated repeatedly.",
    output: "Validated P1 scorecard, NDMO evidence pack, operating DMO, board certification report",
    feeds: "The programme closes, the DMO runs, and the next maturity horizon begins.",
    href: "#contact",
  },
] as const;

const logicItems = [
  [
    "01",
    "Diagnosis before strategy",
    "A strategy written without a baseline is aspirational. The diagnostic score is the only honest foundation for targets, sequencing, and resourcing.",
  ],
  [
    "02",
    "Strategy before DMO design",
    "The DMO is the institution that executes the strategy. Design the job before designing the office that will do it.",
  ],
  [
    "03",
    "DMO design before establishment",
    "The operating model, decision rights, and role definitions must be agreed before the charter is launched and domain owners are appointed.",
  ],
  [
    "04",
    "Establishment before execution",
    "Every execution deliverable needs a named owner, approval path, and evidence standard before work begins.",
  ],
  [
    "05",
    "Each step has a different decision-maker",
    "The sequence moves from board baseline to sponsor strategy, DMO design, owner activation, delivery execution, and certification proof.",
  ],
  [
    "06",
    "Evidence is produced in sequence",
    "The methodology avoids retroactive evidence creation by making each step produce the proof required by the next.",
  ],
] as const;

const deliverables = [
  [
    "Foundation",
    "Pre-work",
    "Executive mandate & interim steering committee",
    "Signed mandate, nominated data lead, confirmed scope, budget envelope, and first steering committee date.",
    "CEO / Board",
    "Establishes the governance authority that all subsequent compliance work reports to.",
  ],
  [
    "1 - Diagnose",
    "Completed",
    "Data & AI Capability Diagnostic Report",
    "Maturity heatmap, gap register, evidence model, AI readiness gate, and 90-day mobilisation roadmap.",
    "Board / Executive team",
    "Establishes the compliance baseline all subsequent control closures are measured against.",
  ],
  [
    "2 - Strategise",
    "Next",
    "Data Strategy",
    "Target direction, value themes, priority sequence, domain maturity targets, roadmap, investment logic, and executive decisions.",
    "Executive sponsor / Data council",
    "Turns the diagnostic baseline into a sequenced programme of work.",
  ],
  [
    "3 - Design",
    "Future",
    "DMO Design & Operating Model",
    "DMO mandate, governance forums, data ownership, RACI, role catalogue, policy model, and operating cadence.",
    "CDO / Data office lead",
    "Defines the institution required to operate governance beyond the project.",
  ],
  [
    "4 - Establish",
    "Future",
    "DMO Establishment Pack",
    "Named owners, governance calendar, evidence routines, issue logs, decision logs, and working forums.",
    "DMO / Domain owners",
    "Moves the DMO from design into operating reality.",
  ],
  [
    "5 - Execute",
    "Future",
    "Programme Execution & Control Closure",
    "Remediation work packages, control closure plan, evidence artefacts, risk tracking, and executive progress reporting.",
    "Programme team / Control owners",
    "Closes the gaps needed for P1 readiness.",
  ],
  [
    "6 - Certify",
    "Future",
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
          Six steps from diagnostic to <em>operational</em> data governance.
        </h1>
        <p>
          A structured methodology that takes an organisation from executive mandate through diagnosis, strategy, DMO
          design, establishment, programme execution, and P1-ready operational proof.
        </p>
        <div className="dmo-wide-actions">
          <Link className="dmo-wide-primary" href="/use-cases/data-ai-capability-diagnostic">
            Request your diagnostic
          </Link>
          <a className="dmo-wide-ghost" href="#approach">
            See the six steps
          </a>
        </div>
        <div className="dmo-wide-stats" aria-label="Methodology metrics">
          {[
            ["6", "Sequential steps"],
            ["152", "NDMO controls mapped"],
            ["68", "P1 controls addressed"],
            ["90", "Days to P1 readiness"],
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
                The six-step methodology resolves this by establishing a clear dependency chain, so every decision,
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
              <h2>A six-step approach to establishing your Data Management Office</h2>
            </div>
            <p>
              Each step answers a different management question, from diagnostic through strategy, institution design,
              execution, and certification proof. Executive mandate and sponsorship sit as the foundation before Step 1.
            </p>
          </div>

          <div className="dmo-wide-foundation-note">
            <span>Foundation prerequisite</span>
            <strong>Executive mandate & sponsorship</strong>
            <p>"Why are we doing this, and who is accountable?"</p>
            <div className="dmo-wide-foundation-pills">
              {[
                "Signed executive mandate",
                "Interim steering committee",
                "Budget and scope confirmed",
                "CDO or data lead nominated",
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="dmo-wide-stage-grid">
            {stages.map((stage, index) => (
              <details className={`dmo-wide-stage ${stage.state}`} key={stage.number} open={index === 0}>
                <summary>
                  <span className="dmo-wide-stage-circle">{stage.number}</span>
                  <span className="dmo-wide-stage-content">
                    <small>{stage.label}</small>
                    <strong>{stage.title}</strong>
                    <em>{stage.question}</em>
                  </span>
                  <span className={`dmo-wide-stage-status ${stage.state}`}>{stage.status}</span>
                  <span className="dmo-wide-stage-ghost" aria-hidden="true">
                    {stage.number}
                  </span>
                </summary>
                <div className="dmo-wide-stage-body">
                  <div className="dmo-wide-stage-detail-grid">
                    <article>
                      <strong>What it does</strong>
                      <p>{stage.what}</p>
                    </article>
                    <article>
                      <strong>Why it comes here</strong>
                      <p>{stage.why}</p>
                    </article>
                  </div>
                  <p className="dmo-wide-output">
                    <span aria-hidden="true" />
                    <strong>Deliverable:</strong> {stage.output}
                  </p>
                  <p className="dmo-wide-feeds">{stage.feeds}</p>
                  <a href={stage.href}>
                    {stage.number === "1" ? "Open live diagnostic module" : "Review stage dependency"}
                  </a>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="dmo-wide-logic" id="why">
        <div className="dmo-wide-section-inner">
          <p className="dmo-wide-section-eye">The logic</p>
          <h2>Why the six-step sequence cannot be reordered</h2>
          <p>
            Each step produces the exact input the next step requires. The dependency chain is not a consulting
            convention; it reflects the evidence requirements of a real NDMO P1 inspection.
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
          <h2>Deliverables at every step</h2>
          <p className="dmo-wide-section-copy">
            Every output is both a governance artefact and an NDMO evidence document. Nothing is produced that does not
            serve a dual purpose.
          </p>
          <div className="dmo-wide-table-wrap">
            <table className="dmo-wide-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Primary output</th>
                  <th>What it contains</th>
                  <th>Decision-maker</th>
                  <th>NDMO value</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map(([stage, status, output, contains, audience, value]) => (
                  <tr key={stage}>
                    <td>
                      <strong>{stage}</strong>
                      <span className={`dmo-wide-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
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
              ["6", "Method steps", "Diagnose, strategise, design, establish, execute, certify"],
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
        <p className="dmo-wide-section-eye">Start at Step 1</p>
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
            Review the six steps
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
