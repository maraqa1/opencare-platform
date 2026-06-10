"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  dataAiDiagnosticDomains,
  dataAiDiagnosticQuestions,
  dataAiReportPrompts,
  type DataAiDiagnosticQuestion,
} from "@/lib/data-ai-diagnostic";

type ActiveTab = "capture" | "dashboard" | "gaps" | "report" | "evidence";

type QuestionState = {
  score: number | null;
  evidenceStrength: EvidenceStrength;
  evidenceAvailable: string;
  notes: string;
  actionPlan: string;
};

type EvidenceStrength = "none" | "interview" | "documented" | "system" | "audited";

type DomainSummary = {
  id: number;
  nameEn: string;
  nameAr: string;
  total: number;
  scored: number;
  avgScore: number | null;
  avgGap: number | null;
  priority: "critical" | "high" | "medium" | "watch" | "not_scored";
};

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: "capture", label: "Data capture" },
  { id: "dashboard", label: "Maturity dashboard" },
  { id: "gaps", label: "Gap matrix" },
  { id: "report", label: "AI report" },
  { id: "evidence", label: "Evidence model" },
];

const priorityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  watch: "Watch",
  not_scored: "Needs data",
} satisfies Record<DomainSummary["priority"], string>;

const scoreOptions = [
  { value: null, label: "No data", shortLabel: "NA", description: "No score assigned yet." },
  { value: 0, label: "0 - absent", shortLabel: "0", description: "No capability exists, or no evidence can be produced." },
  { value: 1, label: "1 - ad hoc", shortLabel: "1", description: "Informal, person-dependent, or interview-only practice." },
  { value: 2, label: "2 - defined", shortLabel: "2", description: "Documented or partially implemented, but inconsistent adoption." },
  { value: 3, label: "3 - managed", shortLabel: "3", description: "Implemented, repeatable, owner-led, and supported by evidence." },
  { value: 4, label: "4 - optimised", shortLabel: "4", description: "Governed, measured, reviewed, and continuously improved." },
] satisfies Array<{ value: number | null; label: string; shortLabel: string; description: string }>;

const evidenceStrengthOptions = [
  { value: "none", label: "No evidence", cap: 1, description: "No artifact or confirmation is available." },
  { value: "interview", label: "Interview only", cap: 2, description: "Claim or workshop response without an approved artifact." },
  { value: "documented", label: "Documented", cap: 3, description: "Approved policy, procedure, plan, RACI, or report sample." },
  { value: "system", label: "System evidence", cap: 4, description: "Dashboard, platform record, lineage, workflow, or telemetry evidence." },
  { value: "audited", label: "Audited", cap: 4, description: "Evidence has review history, controls, audit trail, or measured outcomes." },
] satisfies Array<{ value: EvidenceStrength; label: string; cap: number; description: string }>;

function initialState() {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => [
      question.id,
      {
        score: question.score,
        evidenceStrength: "none",
        evidenceAvailable: question.evidenceAvailable,
        notes: question.notes,
        actionPlan: question.actionPlan,
      } satisfies QuestionState,
    ]),
  ) as Record<string, QuestionState>;
}

function demoScoreForQuestion(question: DataAiDiagnosticQuestion) {
  const baseByDomain: Record<number, number> = {
    1: 2,
    2: 2,
    3: 2,
    4: 1,
    5: 1,
    6: 3,
    7: 1,
    8: 2,
    9: 2,
    10: 2,
    11: 1,
    12: 2,
    13: 1,
  };
  const base = baseByDomain[question.domainId] ?? 1;
  const variation = question.number % 6 === 0 ? 1 : question.number % 5 === 0 ? -1 : 0;
  return Math.max(0, Math.min(4, base + variation));
}

function evidenceStrengthForScore(score: number): EvidenceStrength {
  if (score >= 4) return "audited";
  if (score >= 3) return "system";
  if (score >= 2) return "documented";
  if (score >= 1) return "interview";
  return "none";
}

function demoEvidenceForQuestion(question: DataAiDiagnosticQuestion, score: number) {
  if (score === 0) {
    return "Demo evidence: no approved artifact was available during the walkthrough.";
  }
  const artifact =
    score >= 3
      ? "dashboard extract, policy sample, owner confirmation, and implementation record"
      : score === 2
        ? "draft procedure, workshop notes, and sample evidence request"
        : "interview confirmation and open evidence request";
  return `Demo evidence: ${artifact} for ${question.domainEn}. Required evidence: ${question.evidenceRequired}.`;
}

function demoActionForQuestion(question: DataAiDiagnosticQuestion, score: number) {
  const gap = Math.max(question.target - score, 0);
  if (gap >= 2) {
    return `Demo action: assign ${question.domainEn} owner, confirm source evidence, and close the gap through a 90-day remediation plan.`;
  }
  if (gap === 1) {
    return `Demo action: strengthen evidence pack and move ${question.domainEn} from defined to managed maturity.`;
  }
  return `Demo action: maintain evidence and review ${question.domainEn} in the next assessment cycle.`;
}

function dummyState() {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => {
      const score = demoScoreForQuestion(question);
      return [
        question.id,
        {
          score,
          evidenceStrength: evidenceStrengthForScore(score),
          evidenceAvailable: demoEvidenceForQuestion(question, score),
          notes: "Seeded dummy response for proposal walkthrough. Replace with real interview notes and evidence links.",
          actionPlan: demoActionForQuestion(question, score),
        } satisfies QuestionState,
      ];
    }),
  ) as Record<string, QuestionState>;
}

function scoreGap(question: DataAiDiagnosticQuestion, state: QuestionState) {
  if (state.score === null) {
    return null;
  }
  return Math.max(question.target - state.score, 0);
}

function priorityForGap(gap: number | null): DomainSummary["priority"] {
  if (gap === null) return "not_scored";
  if (gap >= 3) return "critical";
  if (gap >= 2) return "high";
  if (gap >= 1) return "medium";
  return "watch";
}

function formatScore(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function scoreWidth(value: number | null) {
  if (value === null) return "0%";
  return `${Math.max(0, Math.min(100, (value / 4) * 100))}%`;
}

function buildDomainSummaries(stateByQuestion: Record<string, QuestionState>): DomainSummary[] {
  return dataAiDiagnosticDomains.map((domain) => {
    const questions = dataAiDiagnosticQuestions.filter((question) => question.domainId === domain.id);
    const scored = questions.filter((question) => stateByQuestion[question.id]?.score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) / scored.length
        : null;
    const avgGap =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) / scored.length
        : null;
    return {
      ...domain,
      total: questions.length,
      scored: scored.length,
      avgScore,
      avgGap,
      priority: priorityForGap(avgGap),
    };
  });
}

function statusForQuestion(question: DataAiDiagnosticQuestion, state: QuestionState) {
  return priorityForGap(scoreGap(question, state));
}

function evidenceCap(strength: EvidenceStrength) {
  return evidenceStrengthOptions.find((option) => option.value === strength)?.cap ?? 1;
}

function evidenceWarning(state: QuestionState) {
  if (state.score === null) {
    return "";
  }
  const cap = evidenceCap(state.evidenceStrength);
  if (state.score > cap) {
    return `Evidence strength usually supports a maximum score of ${cap}. Add stronger evidence or lower the score.`;
  }
  if (state.score >= 3 && !state.evidenceAvailable.trim()) {
    return "Scores 3-4 should include the specific evidence artifact, owner confirmation, or system record.";
  }
  return "";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function DataAiDiagnosticWorkspace() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("capture");
  const [selectedDomain, setSelectedDomain] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [stateByQuestion, setStateByQuestion] = useState(initialState);

  const summaries = useMemo(() => buildDomainSummaries(stateByQuestion), [stateByQuestion]);
  const totalQuestions = dataAiDiagnosticQuestions.length;
  const scoredQuestions = dataAiDiagnosticQuestions.filter((question) => stateByQuestion[question.id]?.score !== null).length;
  const overallScore =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) /
        scoredQuestions
      : null;
  const overallGap =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) /
        scoredQuestions
      : null;
  const criticalItems = dataAiDiagnosticQuestions.filter((question) => {
    const priority = statusForQuestion(question, stateByQuestion[question.id]);
    return priority === "critical" || priority === "high";
  });

  const filteredQuestions = dataAiDiagnosticQuestions.filter((question) => {
    const matchesDomain = selectedDomain === "all" || question.domainId === selectedDomain;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      question.questionEn.toLowerCase().includes(query) ||
      question.questionAr.toLowerCase().includes(query) ||
      question.evidenceRequired.toLowerCase().includes(query) ||
      question.domainEn.toLowerCase().includes(query);
    return matchesDomain && matchesSearch;
  });

  const rankedGaps = [...dataAiDiagnosticQuestions]
    .map((question) => ({
      question,
      state: stateByQuestion[question.id],
      gap: scoreGap(question, stateByQuestion[question.id]),
      priority: statusForQuestion(question, stateByQuestion[question.id]),
    }))
    .filter((item) => item.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0) || a.question.number - b.question.number);

  const updateQuestion = (questionId: string, patch: Partial<QuestionState>) => {
    setStateByQuestion((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }));
  };

  const seedDummyData = () => {
    setStateByQuestion(dummyState());
  };

  const resetCapture = () => {
    setStateByQuestion(initialState());
  };

  const downloadDummyDataFile = () => {
    const seededState = dummyState();
    const rows = dataAiDiagnosticQuestions.map((question) => {
      const state = seededState[question.id];
      return {
        question_id: question.id,
        question_number: question.number,
        domain_id: question.domainId,
        domain: question.domainEn,
        question: question.questionEn,
        score: state.score,
        target: question.target,
        gap: scoreGap(question, state),
        evidence_strength: state.evidenceStrength,
        evidence_available: state.evidenceAvailable,
        action_plan: state.actionPlan,
        notes: state.notes,
      };
    });
    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "data-ai-diagnostic-dummy-data.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const topGapDomains = summaries
    .filter((summary) => summary.avgGap !== null)
    .sort((a, b) => (b.avgGap ?? 0) - (a.avgGap ?? 0))
    .slice(0, 3);

  return (
    <main className="page data-ai-diagnostic-page">
      <section className="data-ai-hero">
        <div>
          <p className="eyebrow">Justice Training Centre · Data & AI Use Case</p>
          <h1>Data & AI Capability Diagnostic</h1>
          <p>
            A bilingual assessment and AI reporting workspace for capturing maturity evidence, scoring capability gaps,
            prioritising remediation, and producing executive-ready diagnostic outputs.
          </p>
          <div className="data-ai-chip-row">
            <span>84 workbook questions</span>
            <span>13 maturity domains</span>
            <span>AI report draft</span>
            <span>Capture first · connect APIs later</span>
          </div>
        </div>
        <div className="data-ai-hero-panel">
          <span className="data-ai-mode-chip">Workbook seeded</span>
          <strong>{formatScore(overallScore)} / 4</strong>
          <p>Current maturity score</p>
          <small>{scoredQuestions} of {totalQuestions} questions scored</small>
        </div>
      </section>

      <nav className="data-ai-tabs" aria-label="Data and AI diagnostic sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "capture" ? (
        <>
          <section className="panel data-ai-control-panel">
            <div>
              <p className="eyebrow">Assessment Intake</p>
              <h2>Data capture workbench</h2>
              <p>Score each question, capture available evidence, and leave action notes for the AI report.</p>
            </div>
            <div className="data-ai-capture-summary" aria-label="Assessment progress summary">
              <div>
                <span>Coverage</span>
                <strong>{scoredQuestions}/{totalQuestions}</strong>
              </div>
              <div>
                <span>Avg score</span>
                <strong>{formatScore(overallScore)}</strong>
              </div>
              <div>
                <span>High gaps</span>
                <strong>{criticalItems.length}</strong>
              </div>
            </div>
            <div className="data-ai-demo-actions" aria-label="Demo data actions">
              <div>
                <span className="data-ai-mode-chip">Demo seed</span>
                <p>Populate deterministic dummy scores, evidence notes, and action plans for a walkthrough.</p>
              </div>
              <div>
                <button type="button" onClick={seedDummyData}>
                  Seed dummy data
                </button>
                <button type="button" onClick={downloadDummyDataFile}>
                  Download dummy data file
                </button>
                <button type="button" onClick={resetCapture}>
                  Reset capture
                </button>
              </div>
            </div>
            <div className="data-ai-filters">
              <label>
                <span>Domain</span>
                <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value === "all" ? "all" : Number(event.target.value))}>
                  <option value="all">All domains</option>
                  {dataAiDiagnosticDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.id}. {domain.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Question, evidence, domain..." />
              </label>
            </div>
          </section>

          <section className="panel data-ai-rubric-panel" aria-label="Scoring guidance">
            <div className="data-ai-rubric-header">
              <div>
                <p className="eyebrow">Scoring Standard</p>
                <h2>Use one maturity definition across every interview</h2>
              </div>
              <span className="data-ai-mode-chip">Evidence caps score</span>
            </div>
            <div className="data-ai-rubric-grid">
              {scoreOptions.filter((option) => option.value !== null).map((option) => (
                <article key={option.shortLabel}>
                  <strong>{option.shortLabel}</strong>
                  <h3>{option.label.replace(`${option.shortLabel} - `, "")}</h3>
                  <p>{option.description}</p>
                </article>
              ))}
            </div>
            <div className="data-ai-evidence-rule">
              <strong>Evidence rule</strong>
              <span>No evidence caps at 1. Interview-only usually caps at 2. Scores 3-4 require documented, system, or audited evidence.</span>
            </div>
          </section>

          <section className="data-ai-question-list">
            {filteredQuestions.map((question) => {
              const state = stateByQuestion[question.id];
              const gap = scoreGap(question, state);
              const priority = statusForQuestion(question, state);
              const warning = evidenceWarning(state);
              return (
                <article className="data-ai-question-card" key={question.id}>
                  <div className="data-ai-question-main">
                    <div className="data-ai-question-topline">
                      <span className="data-ai-question-number">Q{question.number}</span>
                      <span className="data-ai-domain-pill">{question.domainEn}</span>
                      <span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span>
                    </div>
                    <h3>{question.questionEn}</h3>
                    <p className="arabic-copy">{question.questionAr}</p>
                    <dl className="data-ai-question-meta">
                      <div>
                        <dt>Framework</dt>
                        <dd>{question.isoReference || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt>Evidence required</dt>
                        <dd>{question.evidenceRequired}</dd>
                      </div>
                      <div>
                        <dt>Gap</dt>
                        <dd>{gap === null ? "Needs score" : `${gap} / ${question.target}`}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="data-ai-capture-fields">
                    <div className="data-ai-score-panel">
                      <div>
                        <span>Score</span>
                        <strong>{state.score === null ? "No data" : `${state.score} / ${question.target}`}</strong>
                      </div>
                      <div className="data-ai-score-buttons" role="group" aria-label={`Score question ${question.number}`}>
                        {scoreOptions.map((option) => (
                          <button
                            className={state.score === option.value ? "active" : ""}
                            key={option.label}
                            type="button"
                            title={option.label}
                            onClick={() => updateQuestion(question.id, { score: option.value })}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="data-ai-evidence-strength">
                      <span>Evidence strength</span>
                      <select
                        value={state.evidenceStrength}
                        onChange={(event) => updateQuestion(question.id, { evidenceStrength: event.target.value as EvidenceStrength })}
                      >
                        {evidenceStrengthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - caps score at {option.cap}
                          </option>
                        ))}
                      </select>
                      <small>
                        {evidenceStrengthOptions.find((option) => option.value === state.evidenceStrength)?.description}
                      </small>
                    </label>
                    {warning ? <p className="data-ai-evidence-warning">{warning}</p> : null}
                    <div className="data-ai-textarea-grid">
                      <label>
                        <span>Evidence available</span>
                        <textarea
                          value={state.evidenceAvailable}
                          onChange={(event) => updateQuestion(question.id, { evidenceAvailable: event.target.value })}
                          placeholder="Document, link, interview note, owner confirmation..."
                        />
                      </label>
                      <label>
                        <span>Action plan</span>
                        <textarea
                          value={state.actionPlan}
                          onChange={(event) => updateQuestion(question.id, { actionPlan: event.target.value })}
                          placeholder="Next action, owner, due date..."
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {activeTab === "dashboard" ? (
        <>
          <section className="data-ai-kpi-grid">
            {[
              ["Overall maturity", `${formatScore(overallScore)} / 4`, "Average across scored questions"],
              ["Assessment coverage", `${scoredQuestions} / ${totalQuestions}`, "Questions with score captured"],
              ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "Distance from target 4"],
              ["High-priority gaps", String(criticalItems.length), "Critical or high scored items"],
            ].map(([label, value, note]) => (
              <article className="data-ai-kpi-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <p>{note}</p>
              </article>
            ))}
          </section>
          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Domain Dashboard</p>
                <h2>Maturity by capability domain</h2>
              </div>
              <span className="data-ai-mode-chip">Target = 4</span>
            </div>
            <div className="data-ai-domain-list">
              {summaries.map((summary) => (
                <article className="data-ai-domain-row" key={summary.id}>
                  <div>
                    <strong>{summary.nameEn}</strong>
                    <span>{summary.nameAr}</span>
                  </div>
                  <div className="data-ai-score-bar" aria-label={`${summary.nameEn} maturity score`}>
                    <span style={{ width: scoreWidth(summary.avgScore) }} />
                  </div>
                  <div className="data-ai-domain-score">
                    <strong>{formatScore(summary.avgScore)}</strong>
                    <span>{summary.scored}/{summary.total} scored</span>
                  </div>
                  <span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "gaps" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">Prioritisation</p>
              <h2>Gap analysis and action queue</h2>
            </div>
            <span className="data-ai-mode-chip">{rankedGaps.length} scored rows</span>
          </div>
          <div className="data-ai-table-wrap">
            <table className="table data-ai-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Domain</th>
                  <th>Score</th>
                  <th>Gap</th>
                  <th>Priority</th>
                  <th>Evidence</th>
                  <th>Action plan</th>
                </tr>
              </thead>
              <tbody>
                {rankedGaps.length ? rankedGaps.map(({ question, state, gap, priority }) => (
                  <tr key={question.id}>
                    <td>{question.questionEn}</td>
                    <td>{question.domainEn}</td>
                    <td>{state.score}</td>
                    <td>{gap}</td>
                    <td><span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span></td>
                    <td>{state.evidenceAvailable || "No evidence captured"}</td>
                    <td>{state.actionPlan || "No action captured"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>No scored gaps yet. Capture scores in the data capture tab.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "report" ? (
        <section className="data-ai-report-grid">
          <article className="panel data-ai-section data-ai-report-card">
            <p className="eyebrow">Generated Draft</p>
            <h2>AI readiness executive report</h2>
            <p>
              Based on the current captured scores, the organisation is at{" "}
              <strong>{formatScore(overallScore)} / 4</strong> maturity across {scoredQuestions} scored questions.
              {topGapDomains.length
                ? ` The largest capability gaps are concentrated in ${topGapDomains.map((item) => item.nameEn).join(", ")}.`
                : " No scored domain gaps are available yet."}
            </p>
            <h3>Recommended first 90 days</h3>
            <ol>
              <li>Confirm executive ownership, data council cadence, and diagnostic approval route.</li>
              <li>Close the highest scoring gaps with evidence-backed actions and owners.</li>
              <li>Certify the official report inventory, KPI dictionary, lineage, and data-quality controls.</li>
              <li>Prioritise AI use cases only where source quality, governance, and owner accountability are ready.</li>
            </ol>
            <h3>AI feasibility signal</h3>
            <p>
              Feasible-now use cases should rely on governed descriptive and diagnostic reporting. Predictive and generative
              AI use cases should wait until architecture, metadata, quality, privacy, and model-risk evidence are scored and approved.
            </p>
          </article>
          <article className="panel data-ai-section">
            <p className="eyebrow">Prompt Library</p>
            <h2>Workbook AI prompts</h2>
            <div className="data-ai-prompt-list">
              {dataAiReportPrompts.map((prompt) => (
                <details key={prompt.title}>
                  <summary>{prompt.title}</summary>
                  <p>{prompt.prompt}</p>
                </details>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "evidence" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">OpenCare Contract</p>
              <h2>Data capture and AI reporting evidence model</h2>
            </div>
            <Link className="secondary-link" href="/use-cases">Back to use cases</Link>
          </div>
          <div className="data-ai-evidence-grid">
            {[
              ["Sources", "Assessment workbook, interviews, policies, architecture diagrams, report inventory, data catalogue, model records."],
              ["Capture tables", "diagnostic.questions, diagnostic.responses, diagnostic.evidence, diagnostic.action_plan, diagnostic.review_session."],
              ["Analytics marts", "domain maturity summary, gap priority matrix, AI readiness score, roadmap backlog, evidence completeness."],
              ["AI reporting", "Executive narrative, top gap ranking, 90-day actions, risk register, AI feasibility assessment."],
              ["Governance controls", "Human-reviewed scores, evidence required per question, source trace, owner assignment, approval status."],
              ["Backend status", "This page is a front-end capture shell. API persistence and model orchestration are pending wiring."],
            ].map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
