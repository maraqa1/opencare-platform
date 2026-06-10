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
  evidenceAvailable: string;
  notes: string;
  actionPlan: string;
};

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

function initialState() {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => [
      question.id,
      {
        score: question.score,
        evidenceAvailable: question.evidenceAvailable,
        notes: question.notes,
        actionPlan: question.actionPlan,
      } satisfies QuestionState,
    ]),
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

          <section className="data-ai-question-list">
            {filteredQuestions.map((question) => {
              const state = stateByQuestion[question.id];
              const gap = scoreGap(question, state);
              const priority = statusForQuestion(question, state);
              return (
                <article className="data-ai-question-card" key={question.id}>
                  <div className="data-ai-question-main">
                    <div className="data-ai-question-topline">
                      <span>Q{question.number}</span>
                      <span>{question.domainEn}</span>
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
                    <label>
                      <span>Score</span>
                      <select
                        value={state.score ?? ""}
                        onChange={(event) => updateQuestion(question.id, { score: event.target.value === "" ? null : Number(event.target.value) })}
                      >
                        <option value="">No data</option>
                        {[0, 1, 2, 3, 4].map((score) => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Evidence available</span>
                      <textarea
                        value={state.evidenceAvailable}
                        onChange={(event) => updateQuestion(question.id, { evidenceAvailable: event.target.value })}
                        placeholder="Paste document name, link, interview note, owner confirmation..."
                      />
                    </label>
                    <label>
                      <span>Action plan</span>
                      <textarea
                        value={state.actionPlan}
                        onChange={(event) => updateQuestion(question.id, { actionPlan: event.target.value })}
                        placeholder="Recommended next action, owner, due date..."
                      />
                    </label>
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
