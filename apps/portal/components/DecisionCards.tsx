"use client";

import { useEffect, useState } from "react";

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
  assignee_email?: string | null;
  owner_team?: string | null;
};

type DecisionLogItem = {
  id: number;
  previous_state?: string | null;
  new_state: string;
  action: string;
  performed_by?: string | null;
  performed_by_role?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
};

type DecisionCounts = {
  recommended: number;
  assigned: number;
  in_progress: number;
  total_active: number;
  urgent_count: number;
};

type ResolvedDecision = {
  id: number;
  entity_id: string;
  decision_type: string;
  title: string;
  decision_summary: string;
  rationale: string;
  entity_name: string;
  completed_at?: string | null;
  measured_at?: string | null;
  measurement_status: "measured" | "pending";
  measurement_method?: string | null;
  actual_beds_released?: number | null;
  predicted_occupancy_after?: number | null;
  actual_occupancy_after?: number | null;
  predicted_risk_after?: string | null;
  actual_risk_after?: string | null;
  prediction_accurate?: boolean | null;
  accuracy_notes?: string | null;
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

function toneForDecision(decision: ApiDecision) {
  return decision.priority === "urgent" || decision.priority === "high" ? "critical" : "warning";
}

function formatLogTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Pending";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

export function DecisionCards() {
  const [apiDecisions, setApiDecisions] = useState<ApiDecision[]>([]);
  const [resolved, setResolved] = useState<ResolvedDecision[]>([]);
  const [counts, setCounts] = useState<DecisionCounts>({
    recommended: 0,
    assigned: 0,
    in_progress: 0,
    total_active: 0,
    urgent_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Decision API loading.");
  const [checkedActions, setCheckedActions] = useState<Record<number, Record<number, boolean>>>({});
  const [openLogs, setOpenLogs] = useState<Record<number, boolean>>({});
  const [decisionLogs, setDecisionLogs] = useState<Record<number, DecisionLogItem[]>>({});
  const [logMessages, setLogMessages] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const measuredResolved = resolved.filter((item) => item.measurement_status === "measured");
  const pendingResolved = resolved.filter((item) => item.measurement_status === "pending");

  async function loadDecisions() {
    setLoading(true);
    try {
      const [decisionsResponse, countsResponse, resolvedResponse] = await Promise.all([
        fetch("/api/portal/api/v1/decisions?use_case=bed_pressure&active_only=true&limit=50", { cache: "no-store" }),
        fetch("/api/portal/api/v1/decisions/count?use_case=bed_pressure", { cache: "no-store" }),
        fetch("/api/portal/api/v1/decisions/resolved?use_case=bed_pressure&limit=7&days=7&include_unmeasured=true", { cache: "no-store" }),
      ]);

      if (!decisionsResponse.ok || !countsResponse.ok || !resolvedResponse.ok) {
        throw new Error(
          `Decision API returned ${decisionsResponse.status}/${countsResponse.status}/${resolvedResponse.status}`,
        );
      }

      const decisionPayload = (await decisionsResponse.json()) as { items?: ApiDecision[] };
      const countPayload = (await countsResponse.json()) as Partial<DecisionCounts>;
      const resolvedPayload = (await resolvedResponse.json()) as { items?: ResolvedDecision[] };

      setApiDecisions(decisionPayload.items ?? []);
      setCounts({
        recommended: countPayload.recommended ?? 0,
        assigned: countPayload.assigned ?? 0,
        in_progress: countPayload.in_progress ?? 0,
        total_active: countPayload.total_active ?? 0,
        urgent_count: countPayload.urgent_count ?? 0,
      });
      setResolved(resolvedPayload.items ?? []);

      if (decisionPayload.items?.length) {
        setMessage("Live decision queue loaded from decision.decision_queue.");
      } else {
        setMessage("No live bed-pressure decisions exist yet. Generate the queue from current forecast and anomaly evidence.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? `Decision API unavailable: ${error.message}` : "Decision API unavailable.");
      setApiDecisions([]);
      setResolved([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecisions();
  }, []);

  async function generateQueue() {
    setGenerating(true);
    try {
      const response = await fetch("/api/portal/api/v1/decisions/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { generated?: number; generation_run_id?: string };
      setMessage(
        `Decision generator completed. ${payload.generated ?? 0} recommendations created${payload.generation_run_id ? ` (${payload.generation_run_id})` : ""}.`,
      );
      await loadDecisions();
    } catch (error) {
      setMessage(error instanceof Error ? `Decision generation failed: ${error.message}` : "Decision generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function transitionDecision(
    decision: ApiDecision,
    action: "assign" | "start" | "complete" | "dismiss" | "execute-all",
  ) {
    const body: Record<string, unknown> = {};

    if (action === "assign") {
      const assigneeUser = window.prompt("Assign to user/team member:", decision.assignee_user ?? "bed_manager");
      if (!assigneeUser?.trim()) {
        setMessage("Assignment cancelled.");
        return;
      }
      const assigneeEmail = window.prompt("Assignee email for notification (optional):", decision.assignee_email ?? "");
      body.assignee_user = assigneeUser.trim();
      if (assigneeEmail?.trim()) {
        body.assignee_email = assigneeEmail.trim();
      }
    }

    if (action === "complete") {
      body.actions_completed = decision.recommended_actions
        .filter((item) => checkedActions[decision.id]?.[item.order] ?? Boolean(item.completed))
        .map((item) => item.order);
      body.notes = "Executed from OpenCare Decisions tab.";
    }

    if (action === "execute-all") {
      body.actions_completed = decision.recommended_actions.map((item) => item.order);
      body.notes = "Execute-all run from OpenCare Decisions tab.";
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
      let detail = `HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as { detail?: string };
        detail = payload.detail ?? detail;
      } catch {
        // Keep status fallback.
      }
      setMessage(`Decision update failed: ${detail}.`);
      return;
    }

    const updated = (await response.json()) as ApiDecision;
    setApiDecisions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    await loadDecisions();
    setMessage(`Decision ${updated.id} moved to ${statusLabel(updated.status)} and logged in decision.decision_log.`);
  }

  function toggleAction(decisionId: number, actionOrder: number) {
    setCheckedActions((current) => ({
      ...current,
      [decisionId]: {
        ...(current[decisionId] ?? {}),
        [actionOrder]: !(current[decisionId]?.[actionOrder] ?? false),
      },
    }));
  }

  async function toggleDecisionLog(decision: ApiDecision) {
    const nextOpen = !openLogs[decision.id];
    setOpenLogs((current) => ({ ...current, [decision.id]: nextOpen }));

    if (!nextOpen || decisionLogs[decision.id]) {
      return;
    }

    setLogMessages((current) => ({ ...current, [decision.id]: "Loading decision log..." }));
    try {
      const response = await fetch(`/api/portal/api/v1/decisions/${decision.id}/log`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { items?: DecisionLogItem[] };
      setDecisionLogs((current) => ({ ...current, [decision.id]: payload.items ?? [] }));
      setLogMessages((current) => ({ ...current, [decision.id]: "" }));
    } catch (error) {
      setLogMessages((current) => ({
        ...current,
        [decision.id]: error instanceof Error ? `Unable to load decision log: ${error.message}` : "Unable to load decision log.",
      }));
    }
  }

  return (
    <>
      <section className="decision-summary-grid">
        <article className="metric-card">
          <span className="eyebrow">Active Queue</span>
          <strong>{counts.total_active}</strong>
          <p>Recommended, assigned, and in-progress decisions currently live.</p>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Urgent</span>
          <strong>{counts.urgent_count}</strong>
          <p>Highest-risk decisions requiring immediate operational action.</p>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Assigned</span>
          <strong>{counts.assigned}</strong>
          <p>Items with a named owner and notification trail.</p>
        </article>
        <article className="metric-card">
          <span className="eyebrow">In Progress</span>
          <strong>{counts.in_progress}</strong>
          <p>Actions underway and tracked in the audit log.</p>
        </article>
      </section>

      <section className="panel decision-control-strip">
        <div>
          <p className="eyebrow">Live Decision Queue</p>
          <h3 className="section-heading">Signal -&gt; decision -&gt; action -&gt; outcome</h3>
          <p className="section-subtitle mono">{loading ? "Loading persisted decisions..." : message}</p>
        </div>
        <div className="button-row">
          <button className="button primary" disabled={generating} onClick={() => void generateQueue()} type="button">
            {generating ? "Generating..." : "Generate Live Queue"}
          </button>
        </div>
      </section>

      {apiDecisions.length ? (
        <section className="decision-stack">
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
                  {decision.recommended_actions.map((action) => (
                    <label className="action-check" key={`${decision.id}-${action.order}`}>
                      <input
                        checked={checkedActions[decision.id]?.[action.order] ?? Boolean(action.completed)}
                        onChange={() => toggleAction(decision.id, action.order)}
                        type="checkbox"
                      />
                      <span>{action.action}</span>
                    </label>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    className="button primary"
                    disabled={state !== "recommended"}
                    onClick={() => void transitionDecision(decision, "execute-all")}
                    type="button"
                  >
                    Execute All
                  </button>
                  <button
                    className="button primary"
                    disabled={state !== "assigned" && state !== "in_progress"}
                    onClick={() => void transitionDecision(decision, "complete")}
                    type="button"
                  >
                    Complete Selected Actions
                  </button>
                  <button
                    className="secondary-link"
                    disabled={state !== "recommended"}
                    onClick={() => void transitionDecision(decision, "assign")}
                    type="button"
                  >
                    Assign Owner
                  </button>
                  <button
                    className="secondary-link"
                    disabled={state === "completed" || state === "dismissed" || state === "expired"}
                    onClick={() => void transitionDecision(decision, "start")}
                    type="button"
                  >
                    Mark In Progress
                  </button>
                  <button
                    className="secondary-link"
                    disabled={state === "completed" || state === "dismissed" || state === "expired"}
                    onClick={() => void transitionDecision(decision, "dismiss")}
                    type="button"
                  >
                    Dismiss with Reason
                  </button>
                  <button className="secondary-link" onClick={() => void toggleDecisionLog(decision)} type="button">
                    {openLogs[decision.id] ? "Hide Decision Log" : "View Decision Log"}
                  </button>
                </div>
                {openLogs[decision.id] ? (
                  <div className="decision-log-panel">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Decision Log</p>
                        <h4>Audit timeline</h4>
                      </div>
                      <span className="summary-badge normal">{decisionLogs[decision.id]?.length ?? 0} events</span>
                    </div>
                    {logMessages[decision.id] ? <p className="section-subtitle mono">{logMessages[decision.id]}</p> : null}
                    <div className="decision-log-list">
                      {(decisionLogs[decision.id] ?? []).map((item) => (
                        <div className="decision-log-item" key={item.id}>
                          <span className="status-dot live" />
                          <div>
                            <strong>
                              {item.action.toUpperCase()} {item.previous_state ? `${item.previous_state} -> ${item.new_state}` : item.new_state}
                            </strong>
                            <p>
                              {formatLogTime(item.created_at)} by {item.performed_by ?? "system"} ({item.performed_by_role ?? "system"})
                            </p>
                            {item.reason ? <p>Reason: {item.reason}</p> : null}
                            {item.notes ? <p>Notes: {item.notes}</p> : null}
                          </div>
                        </div>
                      ))}
                      {!logMessages[decision.id] && (decisionLogs[decision.id] ?? []).length === 0 ? (
                        <p className="section-subtitle">No audit events found for this decision yet.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="panel empty-state-panel">
          <p className="eyebrow">No Active Decisions</p>
          <h3 className="section-heading">The queue is empty right now</h3>
          <p className="section-subtitle">
            Generate the live queue from the latest occupancy, forecast, and anomaly evidence to seed the decision workflow.
          </p>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Resolved - Last 7 Decisions</p>
            <h3 className="section-heading">Measured outcomes, not just completed tasks</h3>
          </div>
          <span className="summary-badge normal">{measuredResolved.length} measured results</span>
        </div>
        <div className="compact-feed">
          {measuredResolved.length ? (
            measuredResolved.map((decision) => (
              <div className="compact-alert" key={decision.id}>
                <span className="status-dot live" />
                <div>
                  <strong>
                    {decision.title} ({formatShortDate(decision.measured_at)})
                  </strong>
                  <p>
                    Predicted after {decision.predicted_occupancy_after ?? "n/a"}% | Actual after {decision.actual_occupancy_after ?? "n/a"}%
                    {" | "}
                    {decision.prediction_accurate == null
                      ? "Measured"
                      : decision.prediction_accurate
                        ? "Prediction accurate"
                        : "Prediction drift detected"}
                  </p>
                  <p>
                    Risk after {decision.predicted_risk_after ?? "n/a"} | Observed risk {decision.actual_risk_after ?? "n/a"} | Beds released{" "}
                    {decision.actual_beds_released ?? "n/a"}
                  </p>
                  {decision.accuracy_notes ? <p>{decision.accuracy_notes}</p> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="section-subtitle">No measured outcomes yet. Completed decisions will appear here once the 24h outcome check records them.</p>
          )}
        </div>
        {pendingResolved.length ? (
          <div className="compact-feed" style={{ marginTop: '1rem' }}>
            <p className="eyebrow">Completed, awaiting measurement</p>
            {pendingResolved.map((decision) => (
              <div className="compact-alert" key={`pending-${decision.id}`}>
                <span className="status-dot live" />
                <div>
                  <strong>
                    {decision.title} ({formatShortDate(decision.completed_at)})
                  </strong>
                  <p>{decision.decision_summary}</p>
                  <p>Completed, measurement pending. Impact will be checked after the observation window.</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
