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

type GeneratedConsultingReport = {
  executiveSummary?: string;
  boardMessage?: string;
  materialFindings?: string[];
  recommendedDecisions?: string[];
  ninetyDayPlan?: string[];
  aiReadinessGate?: string;
  risks?: string[];
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

function maturityLabel(value: number | null) {
  if (value === null) return "Not assessed";
  if (value < 1) return "Absent";
  if (value < 2) return "Ad hoc";
  if (value < 3) return "Defined";
  if (value < 3.6) return "Managed";
  return "Optimised";
}

export function DataAiDiagnosticWorkspace() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("capture");
  const [selectedDomain, setSelectedDomain] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [stateByQuestion, setStateByQuestion] = useState(initialState);
  const [generatedReport, setGeneratedReport] = useState<GeneratedConsultingReport | null>(null);
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "ready" | "missing_key" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");

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

  const printReport = () => {
    setActiveTab("report");
    window.setTimeout(() => window.print(), 100);
  };

  const topGapDomains = summaries
    .filter((summary) => summary.avgGap !== null)
    .sort((a, b) => (b.avgGap ?? 0) - (a.avgGap ?? 0))
    .slice(0, 3);
  const assessedDomains = summaries.filter((summary) => summary.scored > 0);
  const strongestDomains = [...assessedDomains]
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 3);
  const evidenceBackedItems = dataAiDiagnosticQuestions.filter((question) => {
    const state = stateByQuestion[question.id];
    return state?.score !== null && state?.evidenceStrength !== "none" && state?.evidenceAvailable.trim();
  }).length;
  const reportDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date());

  const generateConsultingReport = async () => {
    setReportStatus("loading");
    setReportMessage("");
    try {
      const response = await fetch("/api/data-ai-diagnostic/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          overallScore,
          overallGap,
          scoredQuestions,
          totalQuestions,
          evidenceBackedItems,
          topGapDomains,
          strongestDomains,
          priorityGaps: rankedGaps.slice(0, 10).map(({ question, state, gap }) => ({
            question: question.questionEn,
            domain: question.domainEn,
            score: state.score,
            gap,
            evidenceStrength: state.evidenceStrength,
            actionPlan: state.actionPlan,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "ready") {
        setReportStatus(result.status === "missing_key" ? "missing_key" : "error");
        setReportMessage(result.message ?? "AI report generation failed.");
        return;
      }
      setGeneratedReport(result.report);
      setReportStatus("ready");
      setReportMessage(`Generated with ${result.model ?? "OpenAI"}.`);
    } catch {
      setReportStatus("error");
      setReportMessage("Unable to reach the report generation API.");
    }
  };

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
        <section className="data-ai-report-pack">
          <div className="panel data-ai-report-toolbar">
            <div>
              <p className="eyebrow">Consulting Report</p>
              <h2>Data & AI capability diagnostic report pack</h2>
              <p>Structured pages suitable for executive review, steering committee discussion, and browser print-to-PDF export.</p>
            </div>
            <div>
              <button type="button" onClick={generateConsultingReport} disabled={reportStatus === "loading"}>
                {reportStatus === "loading" ? "Generating..." : "Generate with OpenAI"}
              </button>
              <button type="button" onClick={printReport}>Print / Save PDF</button>
              <span className="data-ai-mode-chip">
                {reportStatus === "ready" ? "AI narrative ready" : "Generated from captured scores"}
              </span>
            </div>
          </div>
          {reportMessage ? (
            <div className={`data-ai-report-status ${reportStatus}`}>
              {reportMessage}
            </div>
          ) : null}

          <article className="data-ai-report-page data-ai-report-cover">
            <div>
              <p className="eyebrow">Justice Training Centre · Data & AI Use Case</p>
              <h2>Data & AI Capability Diagnostic</h2>
              <p>Consulting-grade readiness report generated from the current assessment capture workspace.</p>
            </div>
            <div className="data-ai-report-cover-card">
              <span>Current maturity</span>
              <strong>{formatScore(overallScore)} / 4</strong>
              <p>{maturityLabel(overallScore)}</p>
            </div>
            <dl className="data-ai-report-facts">
              <div><dt>Report date</dt><dd>{reportDate}</dd></div>
              <div><dt>Assessment coverage</dt><dd>{scoredQuestions} / {totalQuestions} questions</dd></div>
              <div><dt>Domains assessed</dt><dd>{assessedDomains.length} / {summaries.length}</dd></div>
              <div><dt>Evidence-backed responses</dt><dd>{evidenceBackedItems} / {totalQuestions}</dd></div>
            </dl>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">01 · Executive Summary</p>
              <h2>Readiness position and management attention</h2>
            </div>
            <div className="data-ai-report-kpis">
              {[
                ["Overall maturity", `${formatScore(overallScore)} / 4`, maturityLabel(overallScore)],
                ["Coverage", `${scoredQuestions}/${totalQuestions}`, "questions scored"],
                ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "from target maturity"],
                ["Priority gaps", String(criticalItems.length), "critical or high items"],
              ].map(([label, value, note]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
              ))}
            </div>
            <div className="data-ai-report-two-col">
              <section>
                <h3>Headline assessment</h3>
                <p>
                  The current capture indicates a {maturityLabel(overallScore).toLowerCase()} data and AI capability profile.
                  {topGapDomains.length
                    ? ` The most material gaps are concentrated in ${topGapDomains.map((item) => item.nameEn).join(", ")}.`
                    : " No scored domain gap pattern is available yet."}
                </p>
                <p>
                  The immediate priority is to strengthen evidence, ownership, operating cadence, and data controls before
                  scaling predictive or generative AI use cases.
                </p>
              </section>
              <section>
                <h3>Executive decisions required</h3>
                <ul>
                  <li>Confirm accountable executive owner and data council cadence.</li>
                  <li>Approve the diagnostic scoring baseline and evidence standard.</li>
                  <li>Prioritise remediation for the highest-gap domains.</li>
                  <li>Gate AI use cases until data quality, privacy, lineage, and model-risk evidence are ready.</li>
                </ul>
              </section>
            </div>
          </article>

          {generatedReport ? (
            <article className="data-ai-report-page data-ai-generated-report">
              <div className="data-ai-report-page-header">
                <p className="eyebrow">AI-Generated Advisory</p>
                <h2>Consultant narrative generated from the captured diagnostic</h2>
              </div>
              <section className="data-ai-report-callout">
                <h3>Executive summary</h3>
                <p>{generatedReport.executiveSummary}</p>
              </section>
              <section>
                <h3>Board message</h3>
                <p>{generatedReport.boardMessage}</p>
              </section>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Material findings</h3>
                  <ul>
                    {(generatedReport.materialFindings ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Recommended decisions</h3>
                  <ul>
                    {(generatedReport.recommendedDecisions ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>90-day plan</h3>
                  <ol>
                    {(generatedReport.ninetyDayPlan ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </section>
                <section>
                  <h3>Risks to control</h3>
                  <ul>
                    {(generatedReport.risks ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>AI readiness gate</h3>
                <p>{generatedReport.aiReadinessGate}</p>
              </section>
            </article>
          ) : null}

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">02 · Maturity Heatmap</p>
              <h2>Domain maturity and gap concentration</h2>
            </div>
            <div className="data-ai-report-domain-grid">
              {summaries.map((summary) => (
                <div key={summary.id}>
                  <span>{summary.id.toString().padStart(2, "0")}</span>
                  <strong>{summary.nameEn}</strong>
                  <div className="data-ai-score-bar" aria-label={`${summary.nameEn} report maturity score`}>
                    <span style={{ width: scoreWidth(summary.avgScore) }} />
                  </div>
                  <p>{formatScore(summary.avgScore)} / 4 · {priorityLabels[summary.priority]}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">03 · Diagnostic Findings</p>
              <h2>Strengths, vulnerabilities, and evidence quality</h2>
            </div>
            <div className="data-ai-report-two-col">
              <section>
                <h3>Relative strengths</h3>
                {strongestDomains.length ? (
                  <ol>
                    {strongestDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> · {formatScore(summary.avgScore)} / 4, with {summary.scored}/{summary.total} questions scored.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No strengths can be confirmed until scoring data is captured.</p>
                )}
              </section>
              <section>
                <h3>Priority vulnerabilities</h3>
                {topGapDomains.length ? (
                  <ol>
                    {topGapDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> · average gap {summary.avgGap?.toFixed(1)} from target maturity.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No vulnerability pattern can be confirmed until scoring data is captured.</p>
                )}
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>Evidence quality view</h3>
              <p>
                {evidenceBackedItems} of {totalQuestions} responses include both a non-empty evidence note and an evidence strength above
                "No evidence". Management should treat unsupported high scores as provisional until documents, system records,
                audit trails, or owner confirmations are attached.
              </p>
            </section>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">04 · 90-Day Roadmap</p>
              <h2>Remediation plan for decision-ready AI</h2>
            </div>
            <div className="data-ai-roadmap">
              {[
                ["Days 0-30", "Mobilise governance", "Confirm owners, scoring approval, evidence standard, and steering cadence."],
                ["Days 31-60", "Close critical gaps", "Resolve priority gaps in quality, sources, metadata, privacy, architecture, and ownership."],
                ["Days 61-90", "Certify AI readiness", "Publish validated scorecard, action register, AI use-case gating decision, and board report."],
              ].map(([period, title, text]) => (
                <div key={period}>
                  <span>{period}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <h3>Recommended workstreams</h3>
            <ul className="data-ai-report-columns">
              <li>Data governance operating model</li>
              <li>Data quality and master data controls</li>
              <li>Catalogue, metadata, and lineage</li>
              <li>Reporting inventory and KPI certification</li>
              <li>AI risk, privacy, and model governance</li>
              <li>Use-case prioritisation and benefits tracking</li>
            </ul>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">05 · AI Readiness Gate</p>
              <h2>What can proceed now and what should wait</h2>
            </div>
            <div className="data-ai-report-two-col">
              <section>
                <h3>Feasible now</h3>
                <ul>
                  <li>Descriptive reporting and management dashboards.</li>
                  <li>Diagnostic gap analysis and evidence-backed action tracking.</li>
                  <li>Controlled AI-assisted report drafting with human review.</li>
                </ul>
              </section>
              <section>
                <h3>Gate before scale</h3>
                <ul>
                  <li>Predictive models using sensitive or incomplete source data.</li>
                  <li>Generative AI decisions without policy, prompt, and output controls.</li>
                  <li>Automated recommendations without auditability and accountable owners.</li>
                </ul>
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>OpenAI integration note</h3>
              <p>
                Narrative generation should be wired through a server-side API route using an environment variable such as
                OPENAI_API_KEY. The key must never be stored in client-side code or exposed in browser requests.
              </p>
            </section>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">06 · Appendix</p>
              <h2>Prompt library and report generation basis</h2>
            </div>
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
