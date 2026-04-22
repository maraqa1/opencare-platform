"use client";

import { useState } from "react";

import type { DecisionItem, ResolvedDecision } from "@/lib/use-cases";

type DecisionState = "open" | "in_progress" | "executed" | "dismissed";

function statusLabel(state: DecisionState) {
  switch (state) {
    case "in_progress":
      return "IN PROGRESS";
    case "executed":
      return "EXECUTED";
    case "dismissed":
      return "DISMISSED";
    default:
      return "OPEN";
  }
}

export function DecisionCards({
  decisions,
  resolved,
}: {
  decisions: DecisionItem[];
  resolved: ResolvedDecision[];
}) {
  const [states, setStates] = useState<Record<string, DecisionState>>({});
  const [checkedActions, setCheckedActions] = useState<Record<string, Record<number, boolean>>>({});

  function setDecisionState(title: string, state: DecisionState) {
    setStates((current) => ({ ...current, [title]: state }));
  }

  function executeAll(decision: DecisionItem) {
    setCheckedActions((current) => ({
      ...current,
      [decision.title]: Object.fromEntries(decision.actions.map((_, index) => [index, true])),
    }));
    setDecisionState(decision.title, "executed");
  }

  function toggleAction(title: string, index: number) {
    setCheckedActions((current) => ({
      ...current,
      [title]: {
        ...(current[title] ?? {}),
        [index]: !(current[title]?.[index] ?? false),
      },
    }));
  }

  return (
    <>
      <section className="decision-stack">
        {decisions.map((decision, index) => {
          const state = states[decision.title] ?? "open";
          return (
            <article className={`decision-card ${decision.tone}`} key={decision.title}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Decision {index + 1}</p>
                  <h3>
                    {decision.ward}: {decision.title}
                  </h3>
                </div>
                <div className="summary-badges">
                  <span className={`summary-badge ${decision.tone === "critical" ? "critical" : "warning"}`}>
                    {decision.urgency}
                  </span>
                  <span className="summary-badge normal">{statusLabel(state)}</span>
                </div>
              </div>
              <div className="decision-grid">
                <div>
                  <p className="eyebrow">Signal</p>
                  <p>{decision.signal}</p>
                </div>
                <div>
                  <p className="eyebrow">Decision</p>
                  <p>{decision.decision}</p>
                </div>
                <div>
                  <p className="eyebrow">Rationale</p>
                  <p>{decision.rationale}</p>
                </div>
                <div>
                  <p className="eyebrow">Confidence</p>
                  <p className="mono">{decision.confidence}</p>
                </div>
              </div>
              <div className="action-list">
                {decision.actions.map((action, actionIndex) => (
                  <label className="action-check" key={action}>
                    <input
                      checked={checkedActions[decision.title]?.[actionIndex] ?? false}
                      onChange={() => toggleAction(decision.title, actionIndex)}
                      type="checkbox"
                    />
                    <span>{action}</span>
                  </label>
                ))}
              </div>
              <div className="button-row">
                <button className="button primary" onClick={() => executeAll(decision)} type="button">
                  Execute All
                </button>
                <button className="secondary-link" onClick={() => setDecisionState(decision.title, "in_progress")} type="button">
                  Mark In Progress
                </button>
                <button className="secondary-link" onClick={() => setDecisionState(decision.title, "dismissed")} type="button">
                  Dismiss with Reason
                </button>
              </div>
              {state !== "open" ? (
                <p className="section-subtitle mono">
                  Decision state updated locally: {statusLabel(state)}. API persistence is the next backend step.
                </p>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="panel">
        <p className="eyebrow">Resolved - Last 7 Days</p>
        <div className="compact-feed">
          {resolved.map((decision) => (
            <div className="compact-alert" key={decision.title}>
              <span className="status-dot live" />
              <div>
                <strong>
                  {decision.title} ({decision.date})
                </strong>
                <p>Outcome: {decision.outcome}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
