"use client";

import { useEffect, useMemo, useState } from "react";
import {
  departmentLabel,
  genericLabel,
  issueTypeLabel,
  leakageGuidance,
  leakageRecoverability,
  ownerLabel,
  payerLabel,
  statusLabel,
} from "@/lib/displayNames";
import { currency, decimal, hours, percentFromRatio, shortDate, timestamp } from "@/lib/format";
import { scoreBand } from "@/lib/scoring";

type View =
  | "cash-command"
  | "recovery-queue"
  | "payer-control"
  | "revenue-leakage"
  | "team-performance"
  | "executive-narrative";

type Meta = {
  empty?: boolean;
  message?: string | null;
};

type ActionItem = {
  opportunity_id?: string | null;
  issue_type?: string | null;
  claim_id?: string | null;
  payer_id?: string | null;
  department_id?: string | null;
  recoverable_amount?: number | null;
  expected_recovery_amount?: number | null;
  due_date?: string | null;
  owner_team?: string | null;
  owner_user_id?: string | null;
  status?: string | null;
  next_step?: string | null;
  evidence_summary?: string | null;
};

type CashCommandPayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  recoverable_cash_7d?: number | null;
  recoverable_cash_14d?: number | null;
  cash_at_risk?: number | null;
  expected_collections?: number | null;
  top_actions?: ActionItem[];
  expiring_opportunities?: ActionItem[];
};

type RecoveryQueueItem = ActionItem & {
  issue_reason?: string | null;
  encounter_id?: string | null;
  effort_hours?: number | null;
  priority_score?: number | null;
  source_system?: string | null;
  owner?: string | null;
  decision_status?: string | null;
  outcome_status?: string | null;
};

type RecoveryQueuePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  total?: number;
  items?: RecoveryQueueItem[];
};

type PayerControlItem = {
  payer_id?: string | null;
  gross_billed?: number | null;
  contracted_amount?: number | null;
  paid_amount?: number | null;
  underpayment_amount?: number | null;
  contract_rate_pct?: number | null;
  actual_collection_rate?: number | null;
  payment_sla_days?: number | null;
  actual_payment_days?: number | null;
  sla_breach_count?: number | null;
  contract_breach_flag?: boolean | null;
  renegotiation_flag?: boolean | null;
};

type PayerControlPayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  summary?: {
    total_underpayment?: number | null;
    sla_breaches?: number | null;
    breach_flag_count?: number | null;
  };
  items?: PayerControlItem[];
};

type LeakageRow = {
  leakage_type?: string | null;
  item_count?: number | null;
  leakage_amount?: number | null;
  last_detected_at?: string | null;
};

type LeakagePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  totals?: Record<string, number>;
  breakdown?: LeakageRow[];
};

type TeamPerformanceRow = {
  owner_team?: string | null;
  owner_user_id?: string | null;
  assigned_count?: number | null;
  completed_count?: number | null;
  expected_recovery?: number | null;
  actual_recovery?: number | null;
  recovery_variance_pct?: number | null;
  avg_resolution_hours?: number | null;
  overdue_count?: number | null;
};

type TeamPerformancePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  summary?: {
    assigned?: number | null;
    completed?: number | null;
    expected_recovery?: number | null;
    actual_recovery?: number | null;
  };
  items?: TeamPerformanceRow[];
};

type NarrativePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: Meta;
  headline?: string | null;
  key_drivers?: string[];
  cash_impact?: {
    recoverable_cash_7d?: number | null;
    recoverable_cash_14d?: number | null;
    cash_at_risk?: number | null;
    expected_collections?: number | null;
  } | null;
  recommended_actions?: Array<{ action?: string | null; owner?: string | null; expected_recovery?: number | null; opportunity_id?: string | null }>;
  risks?: Array<{ risk?: string | null; cash_impact?: number | null }>;
  next_steps?: string[];
};

function EmptyState({ message }: { message: string }) {
  return (
    <section className="panel empty-state-panel">
      <p className="eyebrow">Revenue Cycle</p>
      <h3 className="section-heading">No revenue cycle data loaded yet</h3>
      <p className="section-subtitle">{message}</p>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="panel empty-state-panel">
      <p className="eyebrow">Revenue Cycle</p>
      <h3 className="section-heading">Backend unavailable</h3>
      <p className="section-subtitle mono">{message}</p>
    </section>
  );
}

export function RevenueCycleConsole({ view }: { view: View }) {
  const [cashCommand, setCashCommand] = useState<CashCommandPayload | null>(null);
  const [queue, setQueue] = useState<RecoveryQueuePayload | null>(null);
  const [payer, setPayer] = useState<PayerControlPayload | null>(null);
  const [leakage, setLeakage] = useState<LeakagePayload | null>(null);
  const [team, setTeam] = useState<TeamPerformancePayload | null>(null);
  const [narrative, setNarrative] = useState<NarrativePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    issueType: "",
    payer: "",
    department: "",
    owner: "",
    status: "",
  });

  useEffect(() => {
    const endpoint = {
      "cash-command": "/api/portal/api/v1/revenue-cycle/cash-command",
      "recovery-queue": "/api/portal/api/v1/revenue-cycle/recovery-queue",
      "payer-control": "/api/portal/api/v1/revenue-cycle/payer-control",
      "revenue-leakage": "/api/portal/api/v1/revenue-cycle/leakage",
      "team-performance": "/api/portal/api/v1/revenue-cycle/team-performance",
      "executive-narrative": "/api/portal/api/v1/revenue-cycle/executive-narrative",
    }[view];

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (view === "cash-command") setCashCommand(payload as CashCommandPayload);
        if (view === "recovery-queue") setQueue(payload as RecoveryQueuePayload);
        if (view === "payer-control") setPayer(payload as PayerControlPayload);
        if (view === "revenue-leakage") setLeakage(payload as LeakagePayload);
        if (view === "team-performance") setTeam(payload as TeamPerformancePayload);
        if (view === "executive-narrative") setNarrative(payload as NarrativePayload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to reach backend.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [view]);

  const filteredQueue = useMemo(() => {
    const items = queue?.items ?? [];
    return items.filter((item) => {
      if (filters.issueType && item.issue_type !== filters.issueType) return false;
      if (filters.payer && item.payer_id !== filters.payer) return false;
      if (filters.department && item.department_id !== filters.department) return false;
      if (filters.owner && (item.owner ?? "") !== filters.owner) return false;
      if (filters.status && (item.decision_status ?? item.status ?? "") !== filters.status) return false;
      return true;
    });
  }, [filters, queue]);

  if (loading) {
    return <section className="panel"><p className="section-subtitle">Loading live revenue cycle data...</p></section>;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (view === "cash-command" && cashCommand) {
    if (cashCommand.meta?.empty) {
      return <EmptyState message={cashCommand.meta.message ?? "The cash command will appear once revenue-cycle marts are loaded."} />;
    }

    return (
      <>
        <section className="decision-summary-grid">
          <article className="metric-card">
            <span className="eyebrow">Recoverable Cash 7 Days</span>
            <strong>{currency(cashCommand.recoverable_cash_7d)}</strong>
            <p>Cash recovery that can still be actively controlled this week.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Recoverable Cash 14 Days</span>
            <strong>{currency(cashCommand.recoverable_cash_14d)}</strong>
            <p>Extended recovery window for the next operational sprint.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Cash at Risk</span>
            <strong>{currency(cashCommand.cash_at_risk)}</strong>
            <p>Expected cash still exposed to denials, delays, or leakage.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Expected Collections</span>
            <strong>{currency(cashCommand.expected_collections)}</strong>
            <p>Expected collections in the next 7 days from the forecast anchor.</p>
          </article>
        </section>

        <section className="panel pressure-strip">
          <div>
            <p className="eyebrow">Cash Command</p>
            <h3>How much cash can we recover this week?</h3>
            <p className="section-subtitle">
              The command view ranks recoverable cash by effort, owner, and deadline so revenue leaders can move from retrospective reporting into operational execution.
            </p>
          </div>
          <div className="trust-line">
            <span>As of {timestamp(cashCommand.as_of)}</span>
            <span>Freshness: {cashCommand.data_freshness?.status ?? "unknown"}</span>
            <span>Financial anchor: ERP postings</span>
          </div>
        </section>

        <section className="grid">
          <article className="panel span-8">
            <p className="eyebrow">Today's Recovery Actions</p>
            <h3>Top 5 action cards</h3>
            <div className="decision-stack">
              {(cashCommand.top_actions ?? []).map((item) => (
                <article className="decision-card critical" key={item.opportunity_id ?? `${item.issue_type}-${item.claim_id}`}>
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">{issueTypeLabel(item.issue_type)}</p>
                      <h3>{item.claim_id ?? item.opportunity_id ?? "Recovery opportunity"}</h3>
                      <p className="section-subtitle">
                        {payerLabel(item.payer_id)} | {departmentLabel(item.department_id)}
                      </p>
                    </div>
                    <span className="summary-badge critical">{statusLabel(item.status).toUpperCase()}</span>
                  </div>
                  <div className="decision-grid">
                    <div>
                      <p className="eyebrow">Recoverable Amount</p>
                      <p>{currency(item.recoverable_amount)}</p>
                    </div>
                    <div>
                      <p className="eyebrow">Expected Recovery</p>
                      <p>{currency(item.expected_recovery_amount)}</p>
                    </div>
                    <div>
                      <p className="eyebrow">Due Date</p>
                      <p>{shortDate(item.due_date)}</p>
                    </div>
                    <div>
                      <p className="eyebrow">Owner</p>
                      <p>{ownerLabel(item.owner_user_id ?? item.owner_team)}</p>
                    </div>
                  </div>
                  <p className="section-subtitle">{item.evidence_summary ?? "Evidence summary pending."}</p>
                  <div className="button-row">
                    <button className="button primary" type="button">{item.next_step ?? "Review opportunity"}</button>
                  </div>
                </article>
              ))}
            </div>
          </article>
          <article className="panel span-4">
            <p className="eyebrow">Expiring Recovery Opportunities</p>
            <h3>Deadlines at risk</h3>
            <div className="compact-feed">
              {(cashCommand.expiring_opportunities ?? []).map((item) => (
                <div className="compact-alert" key={`expiring-${item.opportunity_id ?? item.claim_id}`}>
                  <span className="status-dot live" />
                  <div>
                    <strong>{item.claim_id ?? item.opportunity_id}</strong>
                    <p>{issueTypeLabel(item.issue_type)} due {shortDate(item.due_date)}</p>
                    <p>{currency(item.expected_recovery_amount)} owned by {ownerLabel(item.owner_user_id ?? item.owner_team)}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </>
    );
  }

  if (view === "recovery-queue" && queue) {
    if (queue.meta?.empty) {
      return <EmptyState message={queue.meta.message ?? "The recovery queue will populate when cash opportunities are loaded."} />;
    }

    const issueTypes = [...new Set((queue.items ?? []).map((item) => item.issue_type).filter(Boolean))];
    const payers = [...new Set((queue.items ?? []).map((item) => item.payer_id).filter(Boolean))];
    const departments = [...new Set((queue.items ?? []).map((item) => item.department_id).filter(Boolean))];
    const owners = [...new Set((queue.items ?? []).map((item) => item.owner).filter(Boolean))];
    const statuses = [...new Set((queue.items ?? []).map((item) => item.decision_status ?? item.status).filter(Boolean))];

    return (
      <>
        <section className="panel pressure-strip">
          <div>
            <p className="eyebrow">Recovery Queue</p>
            <h3>Operational queue ranked by impact</h3>
            <p className="section-subtitle">
              This is the working backlog for revenue recovery, sorted by expected cash recovery per hour of effort.
            </p>
          </div>
          <div className="trust-line">
            <span>{queue.total ?? 0} live opportunities</span>
            <span>Ranked by priority score</span>
            <span>As of {timestamp(queue.as_of)}</span>
          </div>
        </section>

        <section className="panel">
          <div className="button-row" style={{ flexWrap: "wrap" }}>
            <select value={filters.issueType} onChange={(event) => setFilters((current) => ({ ...current, issueType: event.target.value }))}>
              <option value="">All issue types</option>
              {issueTypes.map((option) => <option key={option} value={option ?? ""}>{issueTypeLabel(option)}</option>)}
            </select>
            <select value={filters.payer} onChange={(event) => setFilters((current) => ({ ...current, payer: event.target.value }))}>
              <option value="">All payers</option>
              {payers.map((option) => <option key={option} value={option ?? ""}>{payerLabel(option)}</option>)}
            </select>
            <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
              <option value="">All departments</option>
              {departments.map((option) => <option key={option} value={option ?? ""}>{departmentLabel(option)}</option>)}
            </select>
            <select value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}>
              <option value="">All owners</option>
              {owners.map((option) => <option key={option} value={option ?? ""}>{ownerLabel(option)}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {statuses.map((option) => <option key={option} value={option ?? ""}>{statusLabel(option)}</option>)}
            </select>
          </div>
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Opportunity</th>
                  <th align="left">Issue Type</th>
                  <th align="left">Value</th>
                  <th align="left">Effort</th>
                  <th align="left">Score</th>
                  <th align="left">Owner</th>
                  <th align="left">Due</th>
                  <th align="left">Status</th>
                  <th align="left">Next Step</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => (
                  <tr key={item.opportunity_id ?? item.claim_id}>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.opportunity_id ?? item.claim_id}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{issueTypeLabel(item.issue_type)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{currency(item.expected_recovery_amount ?? item.recoverable_amount)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{decimal(item.effort_hours)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{decimal(item.priority_score, 2)} ({scoreBand(item.priority_score)})</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{ownerLabel(item.owner)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{shortDate(item.due_date)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{statusLabel(item.decision_status ?? item.status)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.next_step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  if (view === "payer-control" && payer) {
    if (payer.meta?.empty) {
      return <EmptyState message={payer.meta.message ?? "Payer control appears once contract performance marts are loaded."} />;
    }
    return (
      <>
        <section className="decision-summary-grid">
          <article className="metric-card">
            <span className="eyebrow">Underpayment</span>
            <strong>{currency(payer.summary?.total_underpayment ?? null)}</strong>
            <p>Visible contract underpayment across the latest payer period.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">SLA Breaches</span>
            <strong>{payer.summary?.sla_breaches ?? 0}</strong>
            <p>Late-payment breaches affecting working capital timing.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Breach Flags</span>
            <strong>{payer.summary?.breach_flag_count ?? 0}</strong>
            <p>Payers requiring contract enforcement or renegotiation review.</p>
          </article>
        </section>
        <section className="panel">
          <p className="eyebrow">Payer Control</p>
          <h3>Payer accountability and contract enforcement</h3>
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Payer</th>
                  <th align="left">Underpayment</th>
                  <th align="left">Contract Rate</th>
                  <th align="left">Actual Collection</th>
                  <th align="left">SLA Breaches</th>
                  <th align="left">Payment Delay</th>
                  <th align="left">Renegotiation Flag</th>
                </tr>
              </thead>
              <tbody>
                {(payer.items ?? []).map((item) => (
                  <tr key={item.payer_id ?? "payer"}>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{payerLabel(item.payer_id)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{currency(item.underpayment_amount)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{percentFromRatio(item.contract_rate_pct)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{percentFromRatio(item.actual_collection_rate)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.sla_breach_count ?? 0}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.actual_payment_days ?? "-"}d vs SLA {item.payment_sla_days ?? "-"}d</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.renegotiation_flag ? "Flagged" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  if (view === "revenue-leakage" && leakage) {
    if (leakage.meta?.empty) {
      return <EmptyState message={leakage.meta.message ?? "Leakage decomposition appears once revenue leakage marts are loaded."} />;
    }
    return (
      <>
        <section className="decision-summary-grid">
          {[
            ["Unbilled Encounters", leakage.totals?.unbilled_encounters],
            ["Late Submissions", leakage.totals?.late_submissions],
            ["Denied Not Appealed", leakage.totals?.denied_not_appealed],
            ["Underpayments", leakage.totals?.underpayments],
            ["Undercoding", leakage.totals?.undercoding],
            ["Writeoffs", leakage.totals?.writeoffs],
            ["Missing Authorization", leakage.totals?.missing_authorization],
          ].map(([labelText, value]) => (
            <article className="metric-card" key={labelText}>
              <span className="eyebrow">{labelText}</span>
              <strong>{currency(typeof value === "number" ? value : null)}</strong>
              <p>{leakageGuidance(String(labelText).toLowerCase().replaceAll(" ", "_")) || "Visible leakage in this category."}</p>
            </article>
          ))}
        </section>
        <section className="panel">
          <p className="eyebrow">Leakage</p>
          <h3>Leakage decomposition</h3>
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Leakage Type</th>
                  <th align="left">Items</th>
                  <th align="left">Leakage Amount</th>
                  <th align="left">Recoverability</th>
                  <th align="left">Last Detected</th>
                </tr>
              </thead>
              <tbody>
                {(leakage.breakdown ?? []).map((item) => (
                  <tr key={item.leakage_type ?? "leakage"}>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{genericLabel(item.leakage_type)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.item_count ?? 0}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{currency(item.leakage_amount)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{leakageRecoverability(item.leakage_type) || "-"}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{timestamp(item.last_detected_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  if (view === "team-performance" && team) {
    if (team.meta?.empty) {
      return <EmptyState message={team.meta.message ?? "Team performance appears once recovery performance marts are loaded."} />;
    }
    return (
      <>
        <section className="decision-summary-grid">
          <article className="metric-card">
            <span className="eyebrow">Assigned Items</span>
            <strong>{team.summary?.assigned ?? 0}</strong>
            <p>Recovery items currently assigned across the work pool.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Completed Items</span>
            <strong>{team.summary?.completed ?? 0}</strong>
            <p>Completed actions in the latest reporting period.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Expected Recovery</span>
            <strong>{currency(team.summary?.expected_recovery ?? null)}</strong>
            <p>Expected recovery committed by the active teams.</p>
          </article>
          <article className="metric-card">
            <span className="eyebrow">Actual Recovery</span>
            <strong>{currency(team.summary?.actual_recovery ?? null)}</strong>
            <p>Actual cash recovered in the current reporting period.</p>
          </article>
        </section>
        <section className="panel">
          <p className="eyebrow">Team Performance</p>
          <h3>Accountability by owner and team</h3>
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Owner</th>
                  <th align="left">Assigned</th>
                  <th align="left">Completed</th>
                  <th align="left">Recovered</th>
                  <th align="left">Expected vs Actual</th>
                  <th align="left">Average Resolution</th>
                  <th align="left">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {(team.items ?? []).map((item) => (
                  <tr key={`${item.owner_team}-${item.owner_user_id}`}>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{ownerLabel(item.owner_user_id ?? item.owner_team)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.assigned_count ?? 0}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.completed_count ?? 0}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{currency(item.actual_recovery)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{currency(item.expected_recovery)} vs {currency(item.actual_recovery)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{hours(item.avg_resolution_hours)}</td>
                    <td style={{ padding: "0.5rem 0.25rem" }}>{item.overdue_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  if (view === "executive-narrative" && narrative) {
    if (narrative.meta?.empty) {
      return <EmptyState message={narrative.meta.message ?? "The executive narrative appears once live revenue cycle data is available."} />;
    }
    return (
      <>
        <section className="panel pressure-strip">
          <div>
            <p className="eyebrow">Executive Narrative</p>
            <h3>{narrative.headline}</h3>
            <p className="section-subtitle">
              This platform turns hospital revenue from retrospective reporting into real-time cash control.
            </p>
          </div>
          <div className="trust-line">
            <span>As of {timestamp(narrative.as_of)}</span>
            <span>Freshness: {narrative.data_freshness?.status ?? "unknown"}</span>
          </div>
        </section>

        <section className="grid">
          <article className="panel span-6">
            <p className="eyebrow">What Changed</p>
            <ul className="list">
              {(narrative.key_drivers ?? []).map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          </article>
          <article className="panel span-6">
            <p className="eyebrow">Cash Impact</p>
            <ul className="list">
              <li>Recoverable cash 7 days: {currency(narrative.cash_impact?.recoverable_cash_7d ?? null)}</li>
              <li>Recoverable cash 14 days: {currency(narrative.cash_impact?.recoverable_cash_14d ?? null)}</li>
              <li>Cash at risk: {currency(narrative.cash_impact?.cash_at_risk ?? null)}</li>
              <li>Expected collections: {currency(narrative.cash_impact?.expected_collections ?? null)}</li>
            </ul>
          </article>
        </section>

        <section className="grid">
          <article className="panel span-4">
            <p className="eyebrow">Recommended Actions</p>
            <ul className="list">
              {(narrative.recommended_actions ?? []).map((item) => (
                <li key={`${item.opportunity_id}-${item.owner}`}>{item.action} | {ownerLabel(item.owner)} | {currency(item.expected_recovery ?? null)}</li>
              ))}
            </ul>
          </article>
          <article className="panel span-4">
            <p className="eyebrow">Risks</p>
            <ul className="list">
              {(narrative.risks ?? []).map((risk) => (
                <li key={`${risk.risk}-${risk.cash_impact}`}>{risk.risk} | {currency(risk.cash_impact ?? null)}</li>
              ))}
            </ul>
          </article>
          <article className="panel span-4">
            <p className="eyebrow">Next Steps</p>
            <ul className="list">
              {(narrative.next_steps ?? []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        </section>
      </>
    );
  }

  return <EmptyState message="No revenue cycle data loaded yet" />;
}
