"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type DiagnosticStrategyHandoff,
  loadLatestDiagnosticStrategyHandoff,
} from "@/lib/data-ai-diagnostic-handoff";

type ContextKey =
  | "organisationOverview"
  | "strategicPriorities"
  | "businessPainPoints"
  | "currentTransformationAgenda"
  | "regulatoryContext"
  | "executiveExpectations"
  | "knownConstraints"
  | "technologyLandscape"
  | "dataAmbition"
  | "priorityFunctions"
  | "knownCandidateUseCases"
  | "exclusions"
  | "successDefinition"
  | "consultantNotes";

type OrganisationContext = Record<ContextKey, string>;

type AgentStatus = "Not run" | "Draft" | "Evidence required" | "Ready for review" | "Approved";
type OutputDepth = "brief" | "standard" | "detailed";
type EvidenceStrictness = "strict" | "balanced" | "exploratory";
type AssumptionHandling = "block" | "flag" | "allow_with_label";

type StrategyAgentConfig = {
  id: string;
  agent_name: string;
  label: string;
  purpose: string;
  focus_areas: string[];
  additional_instructions: string;
  required_inputs: string[];
  expected_outputs: string[];
  output_depth: OutputDepth;
  evidence_strictness: EvidenceStrictness;
  use_diagnostic_evidence: boolean;
  use_organisation_context: boolean;
  allow_assumptions: boolean;
  assumption_handling: AssumptionHandling;
  status: AgentStatus;
  enabled: boolean;
  qualityControl?: boolean;
};

type ProceedCondition = "Proceed" | "Proceed with assumptions" | "Do not proceed";

const contextStorageKey = "dmo:data-strategy-builder:organisation-context";
const agentSettingsStorageKey = "dmo:data-strategy-builder:agent-settings";

const contextFields: Array<{ key: ContextKey; label: string; hint: string }> = [
  { key: "organisationOverview", label: "Organisation overview", hint: "Mandate, scale, geography, entities, and operating scope." },
  { key: "strategicPriorities", label: "Strategic priorities", hint: "Outcomes the strategy must support." },
  { key: "businessPainPoints", label: "Business pain points", hint: "Constraints, risks, data gaps, and operating issues." },
  { key: "currentTransformationAgenda", label: "Current transformation agenda", hint: "Major programmes, reforms, and in-flight initiatives." },
  { key: "regulatoryContext", label: "Regulatory / compliance context", hint: "Policy, privacy, control, and evidence expectations." },
  { key: "executiveExpectations", label: "Executive expectations", hint: "Board, committee, or leadership asks." },
  { key: "knownConstraints", label: "Known constraints", hint: "Budget, timeline, ownership, sourcing, or delivery constraints." },
  { key: "technologyLandscape", label: "Existing technology landscape", hint: "Current platforms, source groups, integration patterns, and constraints." },
  { key: "dataAmbition", label: "Data ambition", hint: "Target decision capability and data-driven operating ambition." },
  { key: "priorityFunctions", label: "Priority departments / functions", hint: "Functions, departments, entities, or teams in scope." },
  { key: "knownCandidateUseCases", label: "Candidate use cases already known", hint: "Known ideas, data products, decision workflows, or reporting needs." },
  { key: "exclusions", label: "Exclusions / boundaries", hint: "What the strategy should not cover in this cycle." },
  { key: "successDefinition", label: "Success definition", hint: "How the client will decide the strategy worked." },
  { key: "consultantNotes", label: "Consultant notes", hint: "Working notes, unresolved questions, and advisory observations." },
];

const emptyContext: OrganisationContext = Object.fromEntries(
  contextFields.map((field) => [field.key, ""]),
) as OrganisationContext;

const defaultAgents: StrategyAgentConfig[] = [
  {
    id: "0",
    agent_name: "Survey Gap Agent",
    label: "Survey quality control",
    purpose:
      "Reviews the Module 01 diagnostic survey/report and identifies what the survey did not capture, what evidence is weak or missing, and what follow-up questions are required before finalising the strategy.",
    focus_areas: [
      "business strategy context",
      "stakeholder and decision-owner context",
      "data domains and critical data entities",
      "source systems and data flows",
      "reporting, analytics, and data product estate",
      "data quality measurement and evidence",
      "governance operating model evidence",
      "privacy, security, risk, and compliance context",
      "AI/model-risk controls",
      "delivery constraints",
      "benefits tracking",
      "adoption and change readiness",
    ],
    additional_instructions: "",
    required_inputs: [
      "Module 01 diagnostic handoff",
      "domain summaries",
      "Gartner summaries",
      "priority gaps",
      "evidence coverage",
      "organisation context",
      "consultant notes",
      "agent settings",
    ],
    expected_outputs: [
      "missing question areas",
      "weak evidence areas",
      "recommended follow-up questions",
      "strategy risk flags",
      "proceed condition",
    ],
    output_depth: "standard",
    evidence_strictness: "strict",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: false,
    assumption_handling: "block",
    status: "Not run",
    enabled: true,
    qualityControl: true,
  },
  {
    id: "1",
    agent_name: "Strategic Direction Agent",
    label: "Strategy agent",
    purpose: "Converts diagnostic baseline and organisation context into strategic intent.",
    focus_areas: ["strategic intent", "value themes", "directional choices"],
    additional_instructions: "",
    required_inputs: ["diagnostic handoff", "organisation context", "executive expectations"],
    expected_outputs: ["strategy narrative", "strategic choices", "decision asks"],
    output_depth: "standard",
    evidence_strictness: "balanced",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
  {
    id: "2",
    agent_name: "Strategic Pillars Agent",
    label: "Strategy agent",
    purpose: "Converts priority gaps into 4-6 strategic pillars.",
    focus_areas: ["strategic pillars", "gap themes", "pillar outcomes"],
    additional_instructions: "",
    required_inputs: ["priority gaps", "domain summaries", "strategic priorities"],
    expected_outputs: ["strategic pillars", "pillar rationale", "source labels"],
    output_depth: "standard",
    evidence_strictness: "balanced",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
  {
    id: "3",
    agent_name: "Data Domain & Source Landscape Agent",
    label: "Strategy agent",
    purpose: "Identifies priority data domains, critical source groups, ownership gaps, and dependency risks.",
    focus_areas: ["priority data domains", "source groups", "ownership gaps", "dependency risks"],
    additional_instructions: "",
    required_inputs: ["data source context", "diagnostic gaps", "known constraints"],
    expected_outputs: ["domain roadmap", "source priorities", "ownership risks"],
    output_depth: "standard",
    evidence_strictness: "strict",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Evidence required",
    enabled: true,
  },
  {
    id: "4",
    agent_name: "Capability Target Agent",
    label: "Strategy agent",
    purpose: "Sets target maturity by domain and horizon.",
    focus_areas: ["target maturity", "horizon planning", "capability sequencing"],
    additional_instructions: "",
    required_inputs: ["domain maturity", "strategic ambition", "constraints"],
    expected_outputs: ["target model", "horizon targets", "maturity decisions"],
    output_depth: "standard",
    evidence_strictness: "balanced",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
  {
    id: "5",
    agent_name: "Use Case Portfolio Agent",
    label: "Strategy agent",
    purpose:
      "Generates and ranks candidate use cases by business value, feasibility, evidence strength, risk, and dependency.",
    focus_areas: ["candidate use cases", "value", "feasibility", "dependency risk"],
    additional_instructions: "",
    required_inputs: ["known candidate use cases", "business pain points", "readiness gate"],
    expected_outputs: ["ranked use-case portfolio", "risk flags", "decision workflow candidates"],
    output_depth: "standard",
    evidence_strictness: "balanced",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
  {
    id: "6",
    agent_name: "Initiative & Roadmap Agent",
    label: "Strategy agent",
    purpose: "Converts gaps and use cases into initiatives and delivery waves.",
    focus_areas: ["initiatives", "delivery waves", "dependencies", "first 90 days"],
    additional_instructions: "",
    required_inputs: ["capability gaps", "use-case portfolio", "constraints"],
    expected_outputs: ["initiative portfolio", "delivery roadmap", "sequencing logic"],
    output_depth: "standard",
    evidence_strictness: "balanced",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
  {
    id: "7",
    agent_name: "Governance & Operating Model Agent",
    label: "Strategy agent",
    purpose:
      "Identifies ownership, stewardship, policy, quality, classification, access, privacy, risk, compliance, and decision-forum implications.",
    focus_areas: ["ownership", "stewardship", "policies", "quality controls", "decision forums"],
    additional_instructions: "",
    required_inputs: ["governance gaps", "regulatory context", "priority domains"],
    expected_outputs: ["operating model implications", "forum needs", "control design needs"],
    output_depth: "standard",
    evidence_strictness: "strict",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Evidence required",
    enabled: true,
  },
  {
    id: "8",
    agent_name: "Success Metrics Agent",
    label: "Strategy agent",
    purpose: "Defines strategy KPIs, baselines, targets, and evidence sources.",
    focus_areas: ["strategy KPIs", "baselines", "targets", "evidence sources"],
    additional_instructions: "",
    required_inputs: ["success definition", "domain targets", "evidence register"],
    expected_outputs: ["success metrics", "evidence sources", "measurement cadence"],
    output_depth: "standard",
    evidence_strictness: "strict",
    use_diagnostic_evidence: true,
    use_organisation_context: true,
    allow_assumptions: true,
    assumption_handling: "flag",
    status: "Not run",
    enabled: true,
  },
];

const outputSections = [
  "Data Strategy Narrative",
  "Strategic Pillars",
  "Capability Target Model",
  "Prioritized Initiative Portfolio",
  "Candidate Use Case Portfolio",
  "Data Domain Roadmap",
  "Analytics, Reporting & Data Product Roadmap",
  "Governance & Operating Model Implications",
  "Platform & Architecture Implications",
  "Success Metrics",
  "Survey Gap Findings",
  "Evidence & Assumptions Register",
  "Module 03 Handoff Pack",
];

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function maturityText(value: number | null) {
  return value === null ? "No data" : `${value.toFixed(1)} / 4`;
}

function percentText(value: number | null) {
  return value === null ? "No data" : `${value}%`;
}

function contextCompleted(context: OrganisationContext) {
  return contextFields.filter((field) => context[field.key].trim()).length;
}

function handoffState(handoff: DiagnosticStrategyHandoff | null) {
  if (!handoff) return "No diagnostic evidence loaded";
  const summary = handoff.assessmentSummary;
  if (
    summary.questionsScored < summary.totalQuestions ||
    handoff.priorityGaps.length === 0 ||
    summary.evidenceCoveragePct === null
  ) {
    return "Partial diagnostic evidence loaded";
  }
  return "Diagnostic evidence loaded";
}

function deriveSurveyGapFindings(
  handoff: DiagnosticStrategyHandoff | null,
  context: OrganisationContext,
): {
  proceedCondition: ProceedCondition;
  missingAreas: string[];
  weakEvidenceAreas: string[];
  followUpQuestions: string[];
  riskFlags: string[];
} {
  if (!handoff) {
    return {
      proceedCondition: "Do not proceed",
      missingAreas: ["Module 01 diagnostic evidence"],
      weakEvidenceAreas: ["No diagnostic baseline available"],
      followUpQuestions: ["Run Module 01 and generate the diagnostic handoff before final strategy production."],
      riskFlags: ["Strategy generation is insufficient evidence until the diagnostic handoff exists."],
    };
  }

  const completed = contextCompleted(context);
  const missingFields = contextFields
    .filter((field) => !context[field.key].trim())
    .map((field) => field.label);
  const evidenceCoverage = handoff.assessmentSummary.evidenceCoveragePct ?? 0;
  const weakEvidenceAreas = [
    evidenceCoverage < 80 ? "Evidence coverage below strategy confidence threshold" : "",
    ...handoff.domainSummaries
      .filter((domain) => domain.priority === "Critical" || domain.priority === "High")
      .slice(0, 4)
      .map((domain) => `${domain.domainName} requires stronger evidence or follow-up`),
  ].filter(Boolean);
  const followUpQuestions = [
    ...missingFields.slice(0, 5).map((field) => `Clarify ${field.toLowerCase()} before locking the strategy.`),
    ...handoff.priorityGaps.slice(0, 3).map((gap) => `Validate remediation path for: ${gap.question}`),
  ];

  return {
    proceedCondition: completed < 8 ? "Proceed with assumptions" : "Proceed",
    missingAreas: missingFields.length ? missingFields : ["No material context gaps identified"],
    weakEvidenceAreas: weakEvidenceAreas.length ? weakEvidenceAreas : ["No material weak evidence areas identified"],
    followUpQuestions: followUpQuestions.length
      ? followUpQuestions
      : ["Confirm the strategy scope and approval route with accountable decision owners."],
    riskFlags:
      completed < 8
        ? ["Downstream strategy outputs must label assumptions until user-provided context is completed."]
        : ["Strategy outputs can proceed with current evidence labels."],
  };
}

function sourceLabels(condition: ProceedCondition) {
  return [
    "Diagnostic evidence",
    "User-provided context",
    condition === "Proceed" ? "Validated strategy input" : "Assumption requiring validation",
    "Survey gap / follow-up required",
  ];
}

function evidenceAvailability(agent: StrategyAgentConfig, handoff: DiagnosticStrategyHandoff | null, completed: number) {
  if (!agent.enabled) return "Disabled";
  if (agent.use_diagnostic_evidence && !handoff) return "Missing diagnostic evidence";
  if (agent.use_organisation_context && completed < 8) return "Partial user-provided context";
  return "Evidence available for drafting";
}

export default function DataStrategyBuilderClient() {
  const [handoff, setHandoff] = useState<DiagnosticStrategyHandoff | null>(null);
  const [context, setContext] = useState<OrganisationContext>(emptyContext);
  const [agents, setAgents] = useState<StrategyAgentConfig[]>(defaultAgents);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState("0");
  const [focusDrafts, setFocusDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setHandoff(loadLatestDiagnosticStrategyHandoff());
    setContext(loadJson(contextStorageKey, emptyContext));
    setAgents(loadJson(agentSettingsStorageKey, defaultAgents));
  }, []);

  const completedContext = contextCompleted(context);
  const surveyGap = useMemo(() => deriveSurveyGapFindings(handoff, context), [handoff, context]);
  const labels = sourceLabels(surveyGap.proceedCondition);

  const updateContext = (key: ContextKey, value: string) => {
    setContext((current) => ({ ...current, [key]: value }));
  };

  const saveContext = () => {
    saveJson(contextStorageKey, context);
    setNotice("User-provided context saved locally.");
  };

  const resetContext = () => {
    setContext(emptyContext);
    setNotice("Context reset in the current browser session.");
  };

  const clearLocalDraft = () => {
    setContext(emptyContext);
    setAgents(defaultAgents);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(contextStorageKey);
      window.localStorage.removeItem(agentSettingsStorageKey);
    }
    setNotice("Local strategy draft cleared. Diagnostic handoff was not removed.");
  };

  const reloadHandoff = () => {
    setHandoff(loadLatestDiagnosticStrategyHandoff());
    setNotice("Diagnostic handoff reloaded from local storage.");
  };

  const saveAgentSettings = () => {
    saveJson(agentSettingsStorageKey, agents);
    setNotice("Agent settings saved locally.");
  };

  const updateAgent = (agentId: string, patch: Partial<StrategyAgentConfig>) => {
    setAgents((current) => current.map((agent) => (agent.id === agentId ? { ...agent, ...patch } : agent)));
  };

  const resetAgent = (agentId: string) => {
    const defaultAgent = defaultAgents.find((agent) => agent.id === agentId);
    if (!defaultAgent) return;
    setAgents((current) => current.map((agent) => (agent.id === agentId ? defaultAgent : agent)));
  };

  const addFocusArea = (agentId: string) => {
    const draft = focusDrafts[agentId]?.trim();
    if (!draft) return;
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId ? { ...agent, focus_areas: [...agent.focus_areas, draft] } : agent,
      ),
    );
    setFocusDrafts((current) => ({ ...current, [agentId]: "" }));
  };

  const removeFocusArea = (agentId: string, focusArea: string) => {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? { ...agent, focus_areas: agent.focus_areas.filter((item) => item !== focusArea) }
          : agent,
      ),
    );
  };

  return (
    <main className="data-strategy-page">
      <header className="data-strategy-nav">
        <Link className="data-strategy-brand" href="/use-cases/data-management-office-establishment">
          <span aria-hidden="true">Y</span>
          <strong>Yottalogica</strong>
          <small>Data Management Advisory</small>
        </Link>
        <nav aria-label="Data strategy module navigation">
          <a href="#diagnostic">Diagnostic</a>
          <a href="#context">Context</a>
          <a href="#agents">Agents</a>
          <a href="#outputs">Outputs</a>
          <a href="#handoff">Module 03 handoff</a>
        </nav>
      </header>

      <section className="data-strategy-hero">
        <div>
          <p className="data-strategy-eyebrow">Module 02 - DMO Establishment Pathway</p>
          <h1>Module 02 — Data Strategy Builder</h1>
          <p>
            Convert diagnostic evidence into strategy, initiatives, use cases, roadmap, and operating implications.
          </p>
          <div className="data-strategy-actions">
            <button type="button" onClick={() => setSettingsOpen(true)}>Agent Settings</button>
            <button type="button" onClick={reloadHandoff}>Reload Diagnostic Handoff</button>
            <button type="button" onClick={clearLocalDraft}>Clear Local Draft</button>
            <Link href="/use-cases/data-management-office-establishment#approach">Continue to DMO Design</Link>
          </div>
          {notice ? <p className="data-strategy-notice">{notice}</p> : null}
        </div>
        <aside className={`data-strategy-handoff-panel ${handoff ? "ready" : ""}`} id="diagnostic">
          <span>{handoffState(handoff)}</span>
          <strong>{handoff ? maturityText(handoff.assessmentSummary.overallMaturity) : "No diagnostic evidence loaded"}</strong>
          <p>
            {handoff
              ? handoff.customerContext.organisationName ?? "Organisation name not supplied"
              : "Run Module 01 first. Strategy can be drafted manually but cannot be evidence-backed yet."}
          </p>
          <dl>
            <div><dt>Source</dt><dd>{handoff ? "Module 01" : "Missing"}</dd></div>
            <div><dt>Generated</dt><dd>{handoff ? new Date(handoff.generatedAt).toLocaleString() : "No data"}</dd></div>
            <div><dt>Readiness</dt><dd>{handoff ? percentText(handoff.assessmentSummary.readinessScorePct) : "No data"}</dd></div>
            <div><dt>Evidence</dt><dd>{handoff ? percentText(handoff.assessmentSummary.evidenceCoveragePct) : "No data"}</dd></div>
            <div><dt>Questions</dt><dd>{handoff ? `${handoff.assessmentSummary.questionsScored} / ${handoff.assessmentSummary.totalQuestions}` : "No data"}</dd></div>
            <div><dt>Domains</dt><dd>{handoff ? `${handoff.assessmentSummary.domainsAssessed} / ${handoff.assessmentSummary.totalDomains}` : "No data"}</dd></div>
            <div><dt>Priority gaps</dt><dd>{handoff ? handoff.priorityGaps.length : "No data"}</dd></div>
          </dl>
          <small>AI readiness gate summary</small>
          <p>{handoff?.aiReadinessGate.thesis ?? "No diagnostic evidence loaded."}</p>
        </aside>
      </section>

      <section className="data-strategy-section" id="context">
        <div className="data-strategy-section-head">
          <div>
            <p>User-provided context</p>
            <h2>Organisation Context Panel</h2>
          </div>
          <span className="data-strategy-context-meter">{completedContext} of {contextFields.length} context fields completed</span>
        </div>
        <div className="data-strategy-context-grid">
          {contextFields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <textarea
                value={context[field.key]}
                placeholder={field.hint}
                onChange={(event) => updateContext(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="data-strategy-actions compact">
          <button type="button" onClick={saveContext}>Save context</button>
          <button type="button" onClick={resetContext}>Reset</button>
          <button type="button" onClick={clearLocalDraft}>Clear local-only draft</button>
          <span>Local-only until backend persistence is enabled.</span>
        </div>
      </section>

      <section className="data-strategy-section" id="agents">
        <div className="data-strategy-section-head">
          <div>
            <p>Strategy Agent Pipeline</p>
            <h2>Survey Gap Agent → 8 strategy agents</h2>
          </div>
          <span className={`data-strategy-proceed ${surveyGap.proceedCondition.replaceAll(" ", "-").toLowerCase()}`}>
            {surveyGap.proceedCondition}
          </span>
        </div>
        <p className="data-strategy-runtime-note">Runtime generation is not enabled. Agent outputs are structured workspace sections and evidence labels only.</p>
        <div className="data-strategy-agent-sequence">
          {agents.map((agent) => (
            <article key={agent.id} className={agent.qualityControl ? "quality" : ""}>
              <span>{agent.label}</span>
              <h3>{agent.id}. {agent.agent_name}</h3>
              <p>{agent.purpose}</p>
              <dl>
                <div><dt>State</dt><dd>{agent.enabled ? "Enabled" : "Disabled"}</dd></div>
                <div><dt>Evidence</dt><dd>{evidenceAvailability(agent, handoff, completedContext)}</dd></div>
                <div><dt>Strictness</dt><dd>{agent.evidence_strictness}</dd></div>
                <div><dt>Depth</dt><dd>{agent.output_depth}</dd></div>
                <div><dt>Status</dt><dd>{agent.status}</dd></div>
                <div><dt>Assumptions</dt><dd>{agent.assumption_handling}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="data-strategy-section">
        <div className="data-strategy-section-head">
          <div>
            <p>Survey quality control</p>
            <h2>Survey Gap Findings</h2>
          </div>
          <span className="data-strategy-source-label">{surveyGap.proceedCondition}</span>
        </div>
        <div className="data-strategy-four-col">
          <article>
            <h3>Missing question areas</h3>
            <ul>{surveyGap.missingAreas.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <h3>Weak evidence areas</h3>
            <ul>{surveyGap.weakEvidenceAreas.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <h3>Recommended follow-up questions</h3>
            <ul>{surveyGap.followUpQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <h3>Strategy risk flags</h3>
            <ul>{surveyGap.riskFlags.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className="data-strategy-section" id="outputs">
        <div className="data-strategy-section-head">
          <div>
            <p>Strategy Output Package</p>
            <h2>Evidence-backed strategy sections</h2>
          </div>
          <span className="data-strategy-source-label">
            {surveyGap.proceedCondition === "Do not proceed" ? "Insufficient evidence" : "Draft workspace"}
          </span>
        </div>
        <div className="data-strategy-output-grid expanded">
          {outputSections.map((section, index) => (
            <article key={section}>
              <span>{String(index + 8).padStart(2, "0")}</span>
              <h3>{section}</h3>
              <p>
                {surveyGap.proceedCondition === "Do not proceed"
                  ? "Insufficient evidence. Load Module 01 diagnostic evidence before producing this strategy section."
                  : "Draft section ready for consultant review, with assumptions labelled until context and evidence are validated."}
              </p>
              <div className="data-strategy-label-row">
                {labels.map((label) => <em key={label}>{label}</em>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="data-strategy-section">
        <div className="data-strategy-section-head">
          <div>
            <p>Evidence & Assumptions Register</p>
            <h2>Trace strategy recommendations to evidence</h2>
          </div>
        </div>
        <div className="data-strategy-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evidence item</th>
                <th>Source</th>
                <th>Used by agent</th>
                <th>Confidence</th>
                <th>Recommendation supported</th>
                <th>Assumption flag</th>
                <th>Validation required</th>
                <th>Follow-up question</th>
              </tr>
            </thead>
            <tbody>
              {(handoff?.priorityGaps.slice(0, 5) ?? surveyGap.followUpQuestions.slice(0, 3).map((question) => ({
                question,
                domain: "No diagnostic evidence loaded",
                severity: "Unknown",
                action: "Run Module 01 first",
              }))).map((item, index) => (
                <tr key={`${item.domain}-${item.question}`}>
                  <td>{item.question}</td>
                  <td>{handoff ? "Diagnostic evidence" : "Survey gap / follow-up required"}</td>
                  <td>{agents[(index % 8) + 1]?.agent_name ?? "Strategy agent"}</td>
                  <td>{handoff ? item.severity : "Unknown"}</td>
                  <td>{item.action || "Strategy evidence baseline"}</td>
                  <td>{surveyGap.proceedCondition === "Proceed" ? "No" : "Yes"}</td>
                  <td>{surveyGap.proceedCondition === "Proceed" ? "Review only" : "Required before final strategy sign-off"}</td>
                  <td>{surveyGap.followUpQuestions[index] ?? "Confirm accountable owner and evidence source."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-strategy-section" id="handoff">
        <div className="data-strategy-section-head">
          <div>
            <p>Handoff to Module 03</p>
            <h2>Structured inputs for DMO Design & Operating Model</h2>
          </div>
        </div>
        <div className="data-strategy-handoff-grid">
          {[
            ["Target DMO mandate", "Translate strategy priorities into a clear governance mandate."],
            ["Required roles", "Define owners, stewards, policy leads, quality leads, and decision forum roles."],
            ["Ownership gaps", surveyGap.missingAreas.slice(0, 3).join("; ") || "No ownership gaps captured yet."],
            ["Governance forum needs", "Define steering, data council, domain review, and issue escalation forums."],
            ["Policy/control design needs", "Convert priority gaps into control design scope."],
            ["Quality/control priorities", "Prioritise measurement, evidence, issue workflow, and certification routines."],
            ["Classification/access implications", "Define classification, access, privacy, and risk expectations."],
            ["Risk/compliance implications", "Use risk flags and follow-up questions as design constraints."],
            ["Priority domains", handoff?.domainSummaries.slice(0, 5).map((domain) => domain.domainName).join("; ") || "No diagnostic domains loaded."],
            ["First 90-day control design focus", handoff?.strategyInputs.first90DayFocus.join("; ") || "No first 90-day focus loaded."],
            ["Survey gaps Module 03 must consider", surveyGap.followUpQuestions.join("; ")],
            ["Unresolved assumptions", surveyGap.proceedCondition === "Proceed" ? "No material assumption gate active." : surveyGap.riskFlags.join("; ")],
          ].map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {settingsOpen ? (
        <div className="data-strategy-modal" role="dialog" aria-modal="true" aria-label="Agent Settings">
          <div className="data-strategy-modal-panel">
            <header>
              <div>
                <p className="data-strategy-eyebrow">Local-only configuration</p>
                <h2>Agent Settings</h2>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)}>Close</button>
            </header>
            <div className="data-strategy-settings-list">
              {agents.map((agent) => (
                <article key={agent.id}>
                  <button type="button" onClick={() => setExpandedAgentId(expandedAgentId === agent.id ? "" : agent.id)}>
                    <span>{agent.id}. {agent.agent_name}</span>
                    <em>{agent.qualityControl ? "Survey quality control" : "Strategy agent"}</em>
                  </button>
                  {expandedAgentId === agent.id ? (
                    <div className="data-strategy-settings-body">
                      <label><input type="checkbox" checked={agent.enabled} onChange={(event) => updateAgent(agent.id, { enabled: event.target.checked })} /> Enabled</label>
                      <label><input type="checkbox" checked={agent.use_diagnostic_evidence} onChange={(event) => updateAgent(agent.id, { use_diagnostic_evidence: event.target.checked })} /> Use diagnostic evidence</label>
                      <label><input type="checkbox" checked={agent.use_organisation_context} onChange={(event) => updateAgent(agent.id, { use_organisation_context: event.target.checked })} /> Use organisation context</label>
                      <label><input type="checkbox" checked={agent.allow_assumptions} onChange={(event) => updateAgent(agent.id, { allow_assumptions: event.target.checked })} /> Allow assumptions</label>
                      <label>
                        Output depth
                        <select value={agent.output_depth} onChange={(event) => updateAgent(agent.id, { output_depth: event.target.value as OutputDepth })}>
                          <option value="brief">brief</option>
                          <option value="standard">standard</option>
                          <option value="detailed">detailed</option>
                        </select>
                      </label>
                      <label>
                        Evidence strictness
                        <select value={agent.evidence_strictness} onChange={(event) => updateAgent(agent.id, { evidence_strictness: event.target.value as EvidenceStrictness })}>
                          <option value="strict">strict</option>
                          <option value="balanced">balanced</option>
                          <option value="exploratory">exploratory</option>
                        </select>
                      </label>
                      <label>
                        Assumption handling
                        <select value={agent.assumption_handling} onChange={(event) => updateAgent(agent.id, { assumption_handling: event.target.value as AssumptionHandling })}>
                          <option value="block">block</option>
                          <option value="flag">flag</option>
                          <option value="allow_with_label">allow_with_label</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select value={agent.status} onChange={(event) => updateAgent(agent.id, { status: event.target.value as AgentStatus })}>
                          <option value="Not run">Not run</option>
                          <option value="Draft">Draft</option>
                          <option value="Evidence required">Evidence required</option>
                          <option value="Ready for review">Ready for review</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </label>
                      <label className="full">
                        Additional instructions
                        <textarea value={agent.additional_instructions} onChange={(event) => updateAgent(agent.id, { additional_instructions: event.target.value })} />
                      </label>
                      <div className="full data-strategy-focus-editor">
                        <strong>Focus areas</strong>
                        <div>
                          {agent.focus_areas.map((focus) => (
                            <span key={focus}>{focus}<button type="button" onClick={() => removeFocusArea(agent.id, focus)}>×</button></span>
                          ))}
                        </div>
                        <input value={focusDrafts[agent.id] ?? ""} onChange={(event) => setFocusDrafts((current) => ({ ...current, [agent.id]: event.target.value }))} placeholder="Add focus area" />
                        <button type="button" onClick={() => addFocusArea(agent.id)}>Add focus area</button>
                      </div>
                      <div className="full data-strategy-settings-columns">
                        <div><strong>Required inputs</strong><ul>{agent.required_inputs.map((item) => <li key={item}>{item}</li>)}</ul></div>
                        <div><strong>Expected outputs</strong><ul>{agent.expected_outputs.map((item) => <li key={item}>{item}</li>)}</ul></div>
                      </div>
                      <button type="button" onClick={() => resetAgent(agent.id)}>Reset this agent</button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => setAgents(defaultAgents)}>Reset all agents</button>
              <button type="button" onClick={saveAgentSettings}>Save settings</button>
            </footer>
          </div>
        </div>
      ) : null}
    </main>
  );
}
