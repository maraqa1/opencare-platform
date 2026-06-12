import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Management Office Establishment - Yottalogica",
};

const topLevelPages = [
  [
    "Page 01",
    "Executive proposition",
    "Premium board-level landing page explaining why a DMO is required, what changes, and what executive clients receive.",
  ],
  [
    "Page 02",
    "Consulting slide pack",
    "Decision deck covering maturity, Gartner lens, NDMO control gaps, roadmap, risks, investment case, and operating model.",
  ],
  [
    "Page 03",
    "Modular approach",
    "A vertical sequence of embedded modules, each with its own outputs, evidence model, and route into the next step.",
  ],
] as const;

const establishmentModules = [
  [
    "Module 01",
    "Data & AI Capability Diagnostic",
    "Live module",
    "Capture business context, maturity scores, evidence, Gartner 7-pillar lens, gap matrix, and AI-generated executive report.",
    "/use-cases/data-ai-capability-diagnostic",
    "Open diagnostic",
  ],
  [
    "Module 02",
    "DMO Target Operating Model",
    "Structure pending",
    "Define DMO mandate, domains, committees, data owner and steward model, decision rights, escalation paths, and operating cadence.",
    "#slides",
    "Prepare module",
  ],
  [
    "Module 03",
    "NDMO Control Mapping",
    "Structure pending",
    "Map NDMO controls to deliverables, owners, policies, data quality rules, metadata requirements, lineage, and evidence.",
    "#p1-accreditation",
    "View controls",
  ],
  [
    "Module 04",
    "Implementation Roadmap & Remediation",
    "Structure pending",
    "Convert diagnostic and control gaps into a sequenced delivery plan with accountable owners, due dates, and board reporting.",
    "#deliverables",
    "View outputs",
  ],
  [
    "Module 05",
    "DMO Operating Rhythm",
    "Structure pending",
    "Run governance forums, decision logs, issue queues, evidence reviews, data quality performance, and monthly executive reporting.",
    "#approach",
    "View rhythm",
  ],
  [
    "Module 06",
    "P1 Accreditation Readiness",
    "Accreditation module",
    "Prepare the final P1 evidence pack, control traceability, remediation closure proof, executive sign-off, and certification narrative.",
    "#p1-accreditation",
    "View P1 module",
  ],
] as const;

const slideOutputs = [
  ["Deck 01", "Executive diagnostic deck", "Current maturity, strategic narrative, gaps, decisions, and 90-day roadmap."],
  ["Deck 02", "DMO establishment pack", "Operating model, module sequence, responsibilities, and delivery governance."],
  ["Deck 03", "P1 accreditation evidence pack", "Control mapping, evidence status, remediation closure, and certification narrative."],
  ["Output", "PDF / PowerPoint export", "Consulting-grade artefacts generated from captured module data and approved evidence."],
] as const;

const deliverables = [
  ["01", "Parent use-case structure", "A complete DMO establishment container, not a set of unrelated tools."],
  ["02", "Embedded diagnostic module", "The Data & AI diagnostic becomes Module 01 and feeds all later DMO establishment work."],
  ["03", "Consulting-grade board pack", "Slides and PDF outputs become a formal layer of the advisory product."],
  ["04", "Module evidence model", "Each module will carry evidence, owners, outputs, status, and route to the next module."],
  ["05", "NDMO control pathway", "Controls move from mapping to remediation to operating proof and readiness evidence."],
  ["06", "P1 accreditation workspace", "P1 readiness is treated as its own module with control traceability and sign-off logic."],
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
            <a href="#pages">Pages</a>
            <a href="#approach">Modules</a>
            <a href="#slides">Slides</a>
            <a href="#deliverables">Deliverables</a>
            <a href="#p1-accreditation">P1 Accreditation</a>
          </div>
          <a className="dmo-nav-cta" href="/use-cases/data-ai-capability-diagnostic">Open diagnostic</a>
        </nav>
      </header>

      <section className="dmo-hero" aria-labelledby="dmo-hero-title">
        <div>
          <p className="dmo-eyebrow">Data Management Office Establishment</p>
          <h1 id="dmo-hero-title">
            A complete DMO programme, from <span>diagnosis</span> to P1 accreditation.
          </h1>
          <p className="dmo-hero-copy">
            The Data & AI diagnostic is the first embedded module in a larger Yottalogica DMO establishment pathway:
            executive landing, consulting-grade decision slides, modular implementation, operating cadence, and NDMO P1
            accreditation readiness.
          </p>
          <div className="dmo-hero-actions">
            <a className="dmo-primary-btn" href="/use-cases/data-ai-capability-diagnostic">Start with Module 01</a>
            <a className="dmo-text-link" href="#approach">See the modular approach</a>
          </div>
        </div>

        <aside className="dmo-executive-card" aria-label="DMO establishment architecture">
          <div>
            <p className="dmo-card-kicker">Use-case architecture</p>
            <div className="dmo-stage-list">
              {topLevelPages.map(([number, title, text]) => (
                <div className="dmo-stage-item" key={number}>
                  <div className="dmo-stage-number">{number.replace("Page ", "")}</div>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dmo-certification-note">
            <span>Design direction</span>
            <strong>Parent use case with embedded modules, slides, and P1 readiness.</strong>
          </div>
        </aside>
      </section>

      <section className="dmo-metrics" aria-label="Programme metrics">
        {[
          ["03", "High-level executive pages"],
          ["06", "Embedded DMO modules"],
          ["01", "Live diagnostic module"],
        ].map(([value, label]) => (
          <article className="dmo-metric-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="dmo-section" id="pages">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">High-level Experience</p>
            <h2>Three executive pages before the detailed modules begin.</h2>
          </div>
          <p>
            The use case is being repositioned as a complete advisory product. The top level tells the board-level
            story; the approach section then embeds the working modules that carry the client toward accreditation.
          </p>
        </div>
        <div className="dmo-approach-grid dmo-approach-grid-three">
          {topLevelPages.map(([stage, title, text]) => (
            <article className="dmo-approach-card" key={stage}>
              <span>{stage}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dmo-section" id="approach">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">Approach Architecture</p>
            <h2>The DMO pathway becomes a vertical sequence of embedded modules.</h2>
          </div>
          <p>
            Each module should become its own workspace inside this use case. Module 01 is already live as the Data & AI
            Capability Diagnostic; the remaining modules are prepared as structure so we can add detail, tools, and
            outputs progressively.
          </p>
        </div>
        <div className="dmo-module-timeline">
          {establishmentModules.map(([number, title, status, text, href, action]) => (
            <article className="dmo-module-card" key={number}>
              <div className="dmo-module-index">{number}</div>
              <div className="dmo-module-body">
                <div className="dmo-module-head">
                  <div>
                    <span>{status}</span>
                    <strong>{title}</strong>
                  </div>
                  <a href={href}>{action}</a>
                </div>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dmo-section" id="slides">
        <div className="dmo-methodology">
          <div className="dmo-methodology-panel">
            <p className="dmo-eyebrow">Consulting Grade Slides</p>
            <h2>The slide deck becomes a formal module of the DMO use case.</h2>
            <p>
              The board deck will sit above the tools: diagnostic scorecard, Gartner lens, NDMO control gaps, roadmap,
              P1 readiness, risks, and executive decisions.
            </p>
          </div>
          <div className="dmo-method-list">
            {slideOutputs.map(([label, title, text]) => (
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
            <p className="dmo-eyebrow">Structure Prepared</p>
            <h2>The old standalone pages are now organised into one parent programme.</h2>
          </div>
          <p>
            This prepares the product shape: parent landing page, board slides, vertical modules, module-level outputs,
            evidence, and P1 accreditation. The next step is to enrich each module with its own workspace.
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

      <section className="dmo-section" id="p1-accreditation">
        <div className="dmo-section-header">
          <div>
            <p className="dmo-eyebrow">P1 Accreditation Module</p>
            <h2>P1 is not the end of the page. It becomes its own module.</h2>
          </div>
          <p>
            P1 accreditation readiness needs its own workspace: control traceability, evidence packs, gap closure,
            sign-offs, audit status, and a leadership readiness narrative.
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
            <strong>Accreditation evidence</strong>
            <p>
              The P1 module should prove that the DMO is operating, not just designed, through review cadence, signed
              artefacts, issue closure, and leadership-ready certification packs.
            </p>
            <ul>
              <li>P1 evidence pack and certification readiness dashboard.</li>
              <li>Control owner sign-off and remediation closure proof.</li>
              <li>Executive narrative for accreditation review.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="dmo-final-cta" id="diagnostic" aria-labelledby="dmo-diagnostic-title">
        <div>
          <h2 id="dmo-diagnostic-title">Start with the diagnostic module. Build toward the DMO operating system.</h2>
          <p>
            The first live module captures maturity, evidence, Gartner 7-pillar positioning, and AI-generated executive
            reporting. The next modules will expand the same pattern into DMO design, NDMO controls, operating cadence,
            and P1 accreditation.
          </p>
        </div>
        <a className="dmo-primary-btn" href="/use-cases/data-ai-capability-diagnostic">
          Open Module 01
        </a>
      </section>
    </main>
  );
}
