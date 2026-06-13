import type { Metadata } from "next";
import Link from "next/link";

import DiagnosticHandoffPanel from "./diagnostic-handoff-panel";

export const metadata: Metadata = {
  title: "Data Strategy Builder - Yottalogica",
};

const diagnosticInputs = [
  ["Maturity baseline", "Overall score, domain scores, Gartner lens, and evidence posture from Module 01."],
  ["Priority gap register", "Critical and high gaps that must shape the strategy sequence and investment logic."],
  ["AI readiness gate", "Proceed, pilot, and hold recommendations for analytics, predictive, and generative AI use cases."],
  ["Customer context", "Business domain, operating scope, strategic priorities, pain points, and report audience."],
] as const;

const ownInputs = [
  "Strategic objectives and executive outcomes",
  "Current data source inventory",
  "Known initiatives and transformation programmes",
  "Business capability map and operating model constraints",
  "Regulatory obligations, NDMO priorities, and PDPL requirements",
  "Target decision forums, cadence, and funding boundaries",
] as const;

const strategyAgents = [
  {
    id: "01",
    title: "Diagnostic interpreter",
    role: "Converts Module 01 maturity gaps into strategy design constraints.",
    output: "Baseline themes, gap severity, evidence confidence, and non-negotiable remediation priorities.",
  },
  {
    id: "02",
    title: "Business outcome agent",
    role: "Maps data ambitions to measurable organisational outcomes.",
    output: "Value themes, strategic objectives, success KPIs, and executive decision asks.",
  },
  {
    id: "03",
    title: "Data source agent",
    role: "Assesses source systems, ownership, quality, lineage, and readiness for strategy execution.",
    output: "Source readiness map, critical data domains, and data acquisition priorities.",
  },
  {
    id: "04",
    title: "Governance agent",
    role: "Links strategy choices to ownership, policy, evidence, and NDMO control obligations.",
    output: "Governance priorities, control dependencies, owner model, and evidence expectations.",
  },
  {
    id: "05",
    title: "Architecture agent",
    role: "Identifies the platform, integration, semantic, and analytics capabilities required by the strategy.",
    output: "Target architecture themes, capability gaps, and platform sequencing assumptions.",
  },
  {
    id: "06",
    title: "Use-case portfolio agent",
    role: "Turns business needs into a ranked portfolio of dashboard, analytics, AI, and automation use cases.",
    output: "Prioritised use-case backlog with value, feasibility, risk, and dependency signals.",
  },
  {
    id: "07",
    title: "Initiative roadmap agent",
    role: "Packages strategy work into realistic initiatives across horizons, owners, and funding gates.",
    output: "Three-horizon roadmap, initiative cards, sequencing, dependencies, and milestones.",
  },
  {
    id: "08",
    title: "Executive narrative agent",
    role: "Synthesises the strategy into board-ready language and decision materials.",
    output: "Strategy storyline, investment case, decision pack, and implementation narrative.",
  },
] as const;

const strategyOutputs = [
  ["Data strategy", "Target ambition, principles, value themes, strategic objectives, and success measures."],
  ["Data initiatives", "Sequenced initiatives with owner, horizon, dependency, expected value, and evidence needs."],
  ["Use-case portfolio", "Prioritised dashboard, analytics, AI, reporting, and automation use cases."],
  ["Source strategy", "Critical data domains, source readiness, lineage requirements, and quality priorities."],
  ["Roadmap", "Now / next / later execution plan linked to maturity gaps and funding gates."],
  ["Executive pack", "Narrative, decisions required, risks, governance asks, and implementation commitments."],
] as const;

const useCaseRows = [
  ["Executive performance dashboards", "High", "Medium", "Proceed after KPI and source ownership confirmed"],
  ["Data quality command centre", "High", "High", "Proceed early because it closes critical diagnostic gaps"],
  ["Predictive operational risk model", "Medium", "Medium", "Pilot with controls after lineage and quality gates"],
  ["AI-assisted strategy reporting", "Medium", "High", "Pilot with human approval and report evidence trail"],
] as const;

export default function DataStrategyBuilderPage() {
  return (
    <main className="data-strategy-page">
      <header className="data-strategy-nav">
        <Link className="data-strategy-brand" href="/use-cases/data-management-office-establishment">
          <span aria-hidden="true">Y</span>
          <strong>Yottalogica</strong>
          <small>Data Management Advisory</small>
        </Link>
        <nav aria-label="Data strategy module navigation">
          <a href="#inputs">Inputs</a>
          <a href="#agents">Agents</a>
          <a href="#outputs">Outputs</a>
          <a href="#use-cases">Use cases</a>
          <Link href="/use-cases/data-ai-capability-diagnostic">Module 01</Link>
        </nav>
      </header>

      <section className="data-strategy-hero">
        <div>
          <p className="data-strategy-eyebrow">Module 02 - DMO Establishment Pathway</p>
          <h1>Data Strategy Builder</h1>
          <p>
            Convert the diagnostic baseline into a clear data strategy: value themes, data initiatives, source
            priorities, use-case portfolio, roadmap, governance decisions, and executive strategy narrative.
          </p>
          <div className="data-strategy-actions">
            <Link href="/use-cases/data-management-office-establishment">Return to DMO home</Link>
            <Link href="/use-cases/data-ai-capability-diagnostic">Review Module 01 diagnostic</Link>
          </div>
        </div>
        <DiagnosticHandoffPanel />
      </section>

      <section className="data-strategy-flow" aria-label="Module 1 to Module 2 flow">
        <article>
          <span>01</span>
          <strong>Capability diagnostic</strong>
          <p>Maturity, evidence, gaps, Gartner lens, AI readiness, and 90-day remediation signal.</p>
        </article>
        <div aria-hidden="true">-&gt;</div>
        <article>
          <span>02</span>
          <strong>Eight-agent strategy build</strong>
          <p>Translate baseline and business context into strategic choices, initiatives, and use cases.</p>
        </article>
        <div aria-hidden="true">-&gt;</div>
        <article>
          <span>03</span>
          <strong>DMO design input</strong>
          <p>Strategy outputs become the scope and operating requirements for the DMO design module.</p>
        </article>
      </section>

      <section className="data-strategy-section" id="inputs">
        <div className="data-strategy-section-head">
          <p>Inputs</p>
          <h2>What the strategy builder consumes</h2>
        </div>
        <div className="data-strategy-two-col">
          <div>
            <h3>From Module 01 diagnostic</h3>
            <div className="data-strategy-card-list">
              {diagnosticInputs.map(([title, text]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <h3>Own strategy inputs</h3>
            <ul className="data-strategy-input-list">
              {ownInputs.map((input) => (
                <li key={input}>{input}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="data-strategy-section" id="agents">
        <div className="data-strategy-section-head">
          <p>Eight-agent strategy method</p>
          <h2>How the strategy is assembled</h2>
        </div>
        <div className="data-strategy-agent-grid">
          {strategyAgents.map((agent) => (
            <article key={agent.id}>
              <span>{agent.id}</span>
              <h3>{agent.title}</h3>
              <p>{agent.role}</p>
              <small>{agent.output}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="data-strategy-section" id="outputs">
        <div className="data-strategy-section-head">
          <p>Outputs</p>
          <h2>What Module 02 produces</h2>
        </div>
        <div className="data-strategy-output-grid">
          {strategyOutputs.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="data-strategy-section" id="use-cases">
        <div className="data-strategy-section-head">
          <p>Use-case portfolio</p>
          <h2>Candidate use cases shaped by the strategy</h2>
        </div>
        <div className="data-strategy-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Use case</th>
                <th>Value</th>
                <th>Readiness</th>
                <th>Strategy decision</th>
              </tr>
            </thead>
            <tbody>
              {useCaseRows.map(([name, value, readiness, decision]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{value}</td>
                  <td>{readiness}</td>
                  <td>{decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-strategy-footer-callout">
        <p>Next dependency</p>
        <h2>Module 02 should feed Module 03: DMO design and operating model.</h2>
        <p>
          The data strategy defines what the DMO must govern, what sources matter, which initiatives are funded, and
          which use cases require delivery control.
        </p>
      </section>
    </main>
  );
}
