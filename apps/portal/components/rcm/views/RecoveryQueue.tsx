"use client";

import { useMemo, useState } from "react";
import { RCMNavTabs }    from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid }       from "../layout/KPIGrid";
import { StatusPill }    from "../shared/StatusPill";
import { ScorePill }     from "../shared/ScorePill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch }   from "../useRCMFetch";
import type { RecoveryQueuePayload, RecoveryQueueItem } from "../types";
import { currency, currencyCompact, shortDate } from "@/lib/format";
import { priorityScore, scoreBand } from "@/lib/scoring";
import { issueTypeLabel, ownerLabel, payerLabel, departmentLabel } from "@/lib/displayNames";

const NEXT_STEPS: Record<string, string> = {
  late_submission_risk:  "Submit claim before filing deadline",
  denial_coding_error:   "Correct CPT/ICD code and resubmit",
  denial_clinical:       "Obtain clinical documentation and appeal",
  underpayment:          "Request EOB and log underpayment dispute",
  denial_eligibility:    "Verify eligibility and resubmit",
  missing_authorization: "Obtain retroactive authorisation",
  unbilled_encounter:    "Route to charge capture for billing",
};

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function daysToDeadline(dueDate?: string | null): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      style={{
        padding: "5px 10px", borderRadius: 6, border: "0.5px solid #ddd",
        fontSize: 12, color: "#1a1a1a", background: "#ffffff",
        cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function scoreItem(item: RecoveryQueueItem): number {
  const dtd = daysToDeadline(item.due_date);
  return priorityScore(
    item.expected_recovery_amount ?? item.recoverable_amount,
    item.effort_hours,
    dtd,
  );
}

export function RecoveryQueue() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<RecoveryQueuePayload>("recovery-queue");

  const [filterIssue,  setFilterIssue]  = useState("");
  const [filterPayer,  setFilterPayer]  = useState("");
  const [filterOwner,  setFilterOwner]  = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const items = data?.items ?? [];

  // Derive unique filter options from live data
  const issueOptions  = useMemo(() => [...new Set(items.map((i) => i.issue_type).filter(Boolean))]
    .map((v) => ({ value: v!, label: issueTypeLabel(v) })), [items]);
  const payerOptions  = useMemo(() => [...new Set(items.map((i) => i.payer_id).filter(Boolean))]
    .map((v) => ({ value: v!, label: payerLabel(v) })), [items]);
  const ownerOptions  = useMemo(() => [...new Set(items.map((i) => i.owner ?? i.owner_user_id).filter(Boolean))]
    .map((v) => ({ value: v!, label: ownerLabel(v) })), [items]);
  const statusOptions = useMemo(() => [...new Set(items.map((i) => i.decision_status ?? i.status).filter(Boolean))]
    .map((v) => ({ value: v!, label: v!.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })), [items]);

  const filteredAndScored = useMemo(() => {
    return items
      .filter((item) => {
        if (filterIssue  && item.issue_type                          !== filterIssue)  return false;
        if (filterPayer  && item.payer_id                            !== filterPayer)  return false;
        if (filterOwner  && (item.owner ?? item.owner_user_id)       !== filterOwner)  return false;
        if (filterStatus && (item.decision_status ?? item.status)    !== filterStatus) return false;
        return true;
      })
      .map((item) => ({ ...item, _score: scoreItem(item) }))
      .sort((a, b) => b._score - a._score);
  }, [items, filterIssue, filterPayer, filterOwner, filterStatus]);

  const overdueCount    = items.filter((i) => isOverdue(i.due_date)).length;
  const dueThisWeek     = items.filter((i) => {
    const dtd = daysToDeadline(i.due_date);
    return dtd != null && dtd >= 0 && dtd <= 7;
  }).length;
  const highPriority    = items.filter((i) => scoreBand(scoreItem(i)) === "High").length;
  const totalQueueValue = items.reduce((s, i) => s + (i.expected_recovery_amount ?? i.recoverable_amount ?? 0), 0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <RCMPageHeader
        subtitle="Ranked operating queue for revenue recovery actions, prioritised by expected cash per effort hour."
      />
      <RCMNavTabs active="recovery-queue" />

      {stale && <StaleBanner />}

      <KPIGrid items={[
        { label: "TOTAL QUEUE VALUE",   value: currencyCompact(totalQueueValue || null) },
        { label: "OVERDUE ITEMS",       value: String(overdueCount),   sub: "Require immediate action" },
        { label: "DUE THIS WEEK",       value: String(dueThisWeek),    sub: "Items due within 7 days" },
        { label: "HIGH PRIORITY",       value: String(highPriority),   sub: "Score â‰¥ 3,000" },
      ]} />

      {loading && <LoadingView />}
      {error   && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "The recovery queue will populate when cash opportunities are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          {/* Filter bar â€” options derived from live data */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <FilterSelect label="All issue types" options={issueOptions}  value={filterIssue}  onChange={setFilterIssue} />
            <FilterSelect label="All payers"      options={payerOptions}  value={filterPayer}  onChange={setFilterPayer} />
            <FilterSelect label="All owners"      options={ownerOptions}  value={filterOwner}  onChange={setFilterOwner} />
            <FilterSelect label="All statuses"    options={statusOptions} value={filterStatus} onChange={setFilterStatus} />
            {(filterIssue || filterPayer || filterOwner || filterStatus) && (
              <button
                onClick={() => { setFilterIssue(""); setFilterPayer(""); setFilterOwner(""); setFilterStatus(""); }}
                style={{ padding: "5px 10px", borderRadius: 6, border: "0.5px solid #ddd", fontSize: 12, background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#888" }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #f0ede6" }}>
                  {[
                    { label: "Claim Ref" },
                    { label: "Payer" },
                    { label: "Issue Type" },
                    { label: "Value" },
                    { label: "Effort" },
                    {
                      label: "Score â“˜",
                      title: "Score = (Expected Recovery Ã· Effort) Ã— Urgency Multiplier\nUrgency: overdue=2.5Ã— / â‰¤2d=2.0Ã— / â‰¤7d=1.5Ã— / â‰¤14d=1.2Ã— / else=1.0Ã—",
                    },
                    { label: "Owner" },
                    { label: "Due" },
                    { label: "Status" },
                    { label: "Next Step" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      title={col.title}
                      style={{
                        padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 500,
                        textTransform: "uppercase", color: "#999", letterSpacing: "0.05em",
                        whiteSpace: "nowrap", cursor: col.title ? "help" : "default",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndScored.map((item, i) => {
                  const ref     = item.claim_id ?? item.opportunity_id ?? `â€”`;
                  const overdue = isOverdue(item.due_date);
                  const status  = item.decision_status ?? item.status ?? "open";
                  const nextStep = NEXT_STEPS[item.issue_type ?? ""] ?? item.next_step ?? "Review and action";

                  return (
                    <tr
                      key={ref + i}
                      style={{
                        borderBottom: i < filteredAndScored.length - 1 ? "0.5px solid #f0ede6" : "none",
                        background: overdue ? "#fff8f8" : "transparent",
                        borderLeft: overdue ? "3px solid #c0392b" : "3px solid transparent",
                      }}
                    >
                      <td style={{ padding: "10px 12px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}>
                        {ref}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {payerLabel(item.payer_id)}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 150 }}>
                        {issueTypeLabel(item.issue_type)}
                        {item.department_id && (
                          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                            {departmentLabel(item.department_id)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                        {currency(item.expected_recovery_amount ?? item.recoverable_amount ?? 0)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#555", whiteSpace: "nowrap" }}>
                        {item.effort_hours != null ? `${item.effort_hours}h` : "â€”"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <ScorePill score={item._score} />
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {ownerLabel(item.owner ?? item.owner_user_id)}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: overdue ? "#c0392b" : "#555" }}>
                        {item.due_date ? shortDate(item.due_date) : "â€”"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <StatusPill status={status} />
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 180 }}>
                        {nextStep}
                      </td>
                    </tr>
                  );
                })}

                {filteredAndScored.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "18px 12px",
                        color: "#777",
                        textAlign: "center",
                      }}
                    >
                      No recovery queue items match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
