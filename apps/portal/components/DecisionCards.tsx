"use client";

import { useEffect, useState } from "react";

import type { DecisionItem, ResolvedDecision } from "@/lib/use-cases";

type DecisionState = "recommended" | "assigned" | "in_progress" | "completed" | "dismissed" | "expired";

type ApiAction = {
  action: string;
  order: number;
  completed?: boolean;
};

type ApiDecision = {
  id: number;
  entity_name: string;
  priority: string;
  priority_score: number;
  title: string;
  signal_summary: string;
  decision_summary: string;
  rationale: string;
  confidence_level?: string;
  confidence_detail?: string;
  recommended_actions: ApiAction[];
  expected_beds_released?: number;
  expected_occupancy_before?: number;
  expected_occupancy_after?: number;
  expected_risk_reduction?: string;
  status: DecisionState;
  assignee_user?: string | null;
  owner_team?: string | null;
};

function statusLabel(state: DecisionState) {
  switch (state) {
    case "assigned":
      return "ASSIGNED";
    case "in_progress":
      return "IN PROGRESS";
    case "completed":
      return "COMPLETED";
    case "dismissed":
      return "DISMISSED";
    case "expired":
      return "EXPIRED";
    default:
      return "RECOMMENDED";
  }
}

function fallbackToApi(decision: DecisionItem, index: number): ApiDecision {
  return {
    id: -1 - index,
    entity_name: decision.ward,
    priority: decision.urgency.toLowerCase(),
    priority_score: decision.urgency === "URGENT" ? 92 : decision.urgency === "HIGH" ? 74 : 48,
    title: `${decision.ward}: ${decision.title}`,
    signal_summary: decision.signal,
    decision_summary: decision.decision,
    rationale: decision.rationale,
    confidence_level: decision.confidence.split(" ")[0],
    confidence_detail: decision.confidence,
    recommended_actions: decision.actions.map((action, actionIndex) => ({
      action,
      order: actionIndex + 1,
      completed: false,
    })),
    expected_beds_released: decision.title.includes("3") ? 3 : decision.title.includes("surge") ? 4 : 0,
    expected_occupancy_before: decision.ward === "ICU-01" ? 97.3 : decision.ward === "Card-01" ? 93.1 : 91,
    expected_occupancy_after: decision.ward === "ICU-01" ? 87.3 : decision.ward === "Card-01" ? 81.8 : 91,
    expected_risk_reduction: decision.ward === "ICU-01" ? "CRIT -> WATCH" : "HIGH -> WATCH",
    status: "recommended",
    owner_team: "Bed Management Team",
  };
}

function toneForDecision(decision: ApiDecision) {
  return decision.priority === "urgent" || decision.priority === "high" ? "critical" : "warning";
}

export function DecisionCards({
  decisions,
  resolved,
}: {
  decisions: DecisionItem[];
  resolved: ResolvedDecision[];
}) {
  const [apiDecisions, setApiDecisions] = useState<ApiDecision[]>(() => decisions.map(fallbackToApi));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Decision API loading. Static demo queue remains visible until live data responds.");
  const [checkedActions, setCheckedActions] = useState<Record<string, Record<number, boolean>>>({});

  async function loadDecisions() {
    setLoading(true);
    try {
      const response = await fetch("/api/portal/api/v1/decisions?use_case=bed_pressure&limit=50", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Decision API returned ${response.status}`);
      }
      const payload = (await response.json()) as { items?: ApiDecision[] };
      if (payload.items?.length) {
        setApiDecisions(payload.items);
        setMessage("Live decision queue loaded from decision.decision_queue.");
      } else {
        setMessage("No persisted decisions yet. Showing demo queue until the generator creates live recommendations.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? `Decision API unavailable: ${error.message}` : "Decision API unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecisions();
  }, []);

  async function transitionDecision(decision: ApiDecision, action: "start" | "complete" | "dismiss") {
    if (decision.id < 0) {
      setMessage("Demo decision updated locally. Persisted state starts after the backend generator creates a database row.");
      setApiDecisions((current) =>
        current.map((item) =>
          item.id === decision.id
            ? { ...item, status: action === "complete" ? "completed" : action === "start" ? "in_progress" : "dismissed" }
            : item,
        ),
      );
      return;
    }

    const body: Record<string, unknown> = {};
    if (action === "complete") {
      body.actions_completed = decision.recommended_actions.map((item) => item.order);
      body.notes = "Executed from OpenCare Decisions tab.";
    }
    if (action === "dismiss") {
      const reason = window.prompt("Dismiss reason is required for audit trail:");
      if (!reason?.trim()) {
        setMessage("Dismiss cancelled. A reason is required so the decision remains auditable.");
        return;
      }
      body.reason = reason.trim();
    }

    const response = await fetch(`/api/portal/api/v1/decisions/${decision.id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setMessage(`Decision update failed with HTTP ${response.status}.`);
      return;
    }
    const updated = (await response.json()) as ApiDecision;
    setApiDecisions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    const notificationNote = action === "complete" ? " Completion email was sent or recorded in notification_log." : "";
    setMessage(`Decision ${updated.id} moved to ${statusLabel(updated.status)} and logged in decision.decision_log.${notificationNote}`);
  }

  function executeAll(decision: ApiDecision) {
    setCheckedActions((current) => ({
      ...current,
      [decision.title]: Object.fromEntries(decision.recommended_actions.map((_, index) => [index, true])),
    }));
    void transitionDecision(decision, "complete");
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
        <p className="section-subtitle mono">{loading ? "Loading persisted decisions..." : message}</p>
        {apiDecisions.map((decision, index) => {
          const tone = toneForDecision(decision);
          const state = decision.status;
          const before = Number(decision.expected_occupancy_before ?? 0);
          const after = Number(decision.expected_occupancy_after ?? before);
          return (
            <article className={`decision-card ${tone}`} key={decision.id}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Decision {index + 1}</p>
                  <h3>{decision.title}</h3>
                  <p className="section-subtitle">
                    Owner: {decision.assignee_user ?? decision.owner_team ?? "Unassigned"} | Score:{" "}
                    <span className="mono">{Number(decision.priority_score).toFixed(1)}</span>
                  </p>
                </div>
                <div className="summary-badges">
                  <span className={`summary-badge ${tone === "critical" ? "critical" : "warning"}`}>
                    {decision.priority.toUpperCase()}
                  </span>
                  <span className="summary-badge normal">{statusLabel(state)}</span>
                </div>
              </div>
              <div className="decision-grid">
                <div>
                  <p className="eyebrow">Signal</p>
                  <p>{decision.signal_summary}</p>
                </div>
                <div>
                  <p className="eyebrow">Decision</p>
                  <p>{decision.decision_summary}</p>
                </div>
                <div>
                  <p className="eyebrow">Rationale</p>
                  <p>{decision.rationale}</p>
                </div>
                <div>
                  <p className="eyebrow">Confidence</p>
                  <p className="mono">{decision.confidence_detail ?? decision.confidence_level ?? "Confidence pending"}</p>
                </div>
              </div>
              <div className="impact-simulation">
                <p className="eyebrow">Impact Simulation</p>
                <div className="impact-columns">
                  <div>
                    <span>Before</span>
                    <strong>{before.toFixed(1)}%</strong>
                    <div className="impact-bar">
                      <span style={{ width: `${Math.max(0, Math.min(100, before))}%` }} />
                    </div>
                  </div>
                  <div>
                    <span>After</span>
                    <strong>{after.toFixed(1)}%</strong>
                    <div className="impact-bar after">
                      <span style={{ width: `${Math.max(0, Math.min(100, after))}%` }} />
                    </div>
                  </div>
                </div>
                <p className="section-subtitle">
                  Impact: -{decision.expected_beds_released ?? 0} beds, {(before - after).toFixed(1)} pp,{" "}
                  {decision.expected_risk_reduction ?? "risk unchanged"}
                </p>
              </div>
              <div className="action-list">
                {decision.recommended_actions.map((action, actionIndex) => (
                  <label className="action-check" key={`${decision.id}-${action.order}`}>
                    <input
                      checked={checkedActions[decision.title]?.[actionIndex] ?? Boolean(action.completed)}
                      onChange={() => toggleAction(decision.title, actionIndex)}
                      type="checkbox"
                    />
                    <span>{action.action}</span>
                  </label>
                ))}
              </div>
              <div className="button-row">
                <button className="button primary" disabled={state === "completed" || state === "dismissed"} onClick={() => executeAll(decision)} type="button">
                  Execute All
                </button>
                <button className="secondary-link" disabled={state === "completed" || state === "dismissed"} onClick={() => transitionDecision(decision, "start")} type="button">
                  Mark In Progress
                </button>
                <button className="secondary-link" disabled={state === "completed" || state === "dismissed"} onClick={() => transitionDecision(decision, "dismiss")} type="button">
                  Dismiss with Reason
                </button>
              </div>
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
