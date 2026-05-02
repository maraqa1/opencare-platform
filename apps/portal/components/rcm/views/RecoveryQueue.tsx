"use client";

import { useMemo, useState } from "react";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid } from "../layout/KPIGrid";
import { StatusPill } from "../shared/StatusPill";
import { ScorePill } from "../shared/ScorePill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch } from "../useRCMFetch";
import type { RecoveryQueuePayload, RecoveryQueueItem } from "../types";
import { currency, currencyCompact, shortDate } from "@/lib/format";
import { priorityScore, scoreBand } from "@/lib/scoring";
import { issueTypeLabel, ownerLabel, payerLabel, departmentLabel } from "@/lib/displayNames";

const NEXT_STEPS: Record<string, string> = {
  late_submission_risk: "Submit claim before filing deadline",
  denial_coding_error: "Correct CPT/ICD code and resubmit",
  denial_clinical: "Obtain clinical documentation and appeal",
  underpayment: "Request EOB and log underpayment dispute",
  denial_eligibility: "Verify eligibility and resubmit",
  missing_authorization: "Obtain retroactive authorisation",
  unbilled_encounter: "Route to charge capture for billing",
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
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      style={{
        padding: "5px 10px",
        borderRadius: 10,
        border: "1px solid rgba(31, 56, 100, 0.08)",
        fontSize: 13,
        color: "var(--oc-gray-900)",
        background: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
      }}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function scoreItem(item: RecoveryQueueItem): number {
  const daysRemaining = daysToDeadline(item.due_date);
  return priorityScore(
    item.expected_recovery_amount ?? item.recoverable_amount,
    item.effort_hours,
    daysRemaining,
  );
}

export function RecoveryQueue() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<RecoveryQueuePayload>("recovery-queue");

  const [filterIssue, setFilterIssue] = useState("");
  const [filterPayer, setFilterPayer] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const items = data?.items ?? [];

  const issueOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.issue_type).filter(Boolean))].map((value) => ({
        value: value!,
        label: issueTypeLabel(value),
      })),
    [items],
  );
  const payerOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.payer_id).filter(Boolean))].map((value) => ({
        value: value!,
        label: payerLabel(value),
      })),
    [items],
  );
  const ownerOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.owner ?? item.owner_user_id).filter(Boolean))].map((value) => ({
        value: value!,
        label: ownerLabel(value),
      })),
    [items],
  );
  const statusOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.decision_status ?? item.status).filter(Boolean))].map((value) => ({
        value: value!,
        label: value!.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      })),
    [items],
  );

  const filteredAndScored = useMemo(() => {
    return items
      .filter((item) => {
        if (filterIssue && item.issue_type !== filterIssue) return false;
        if (filterPayer && item.payer_id !== filterPayer) return false;
        if (filterOwner && (item.owner ?? item.owner_user_id) !== filterOwner) return false;
        if (filterStatus && (item.decision_status ?? item.status) !== filterStatus) return false;
        return true;
      })
      .map((item) => ({ ...item, _score: scoreItem(item) }))
      .sort((left, right) => right._score - left._score);
  }, [filterIssue, filterOwner, filterPayer, filterStatus, items]);

  const overdueCount = items.filter((item) => isOverdue(item.due_date)).length;
  const dueThisWeek = items.filter((item) => {
    const daysRemaining = daysToDeadline(item.due_date);
    return daysRemaining != null && daysRemaining >= 0 && daysRemaining <= 7;
  }).length;
  const highPriority = items.filter((item) => scoreBand(scoreItem(item)) === "High").length;
  const totalQueueValue = items.reduce(
    (sum, item) => sum + (item.expected_recovery_amount ?? item.recoverable_amount ?? 0),
    0,
  );

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--oc-gray-900)" }}>
      <RCMPageHeader subtitle="Ranked operating queue for revenue recovery actions prioritised by expected cash per effort hour." />
      <RCMNavTabs active="recovery-queue" />

      {stale && <StaleBanner />}

      <KPIGrid
        items={[
          { label: "TOTAL QUEUE VALUE", value: currencyCompact(totalQueueValue || null) },
          { label: "OVERDUE ITEMS", value: String(overdueCount), sub: "Require immediate action" },
          { label: "DUE THIS WEEK", value: String(dueThisWeek), sub: "Items due within 7 days" },
          { label: "HIGH PRIORITY", value: String(highPriority), sub: "Score >= 3,000" },
        ]}
      />

      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "The recovery queue will populate when cash opportunities are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <FilterSelect label="All issue types" options={issueOptions} value={filterIssue} onChange={setFilterIssue} />
            <FilterSelect label="All payers" options={payerOptions} value={filterPayer} onChange={setFilterPayer} />
            <FilterSelect label="All owners" options={ownerOptions} value={filterOwner} onChange={setFilterOwner} />
            <FilterSelect label="All statuses" options={statusOptions} value={filterStatus} onChange={setFilterStatus} />
            {(filterIssue || filterPayer || filterOwner || filterStatus) && (
              <button
                onClick={() => {
                  setFilterIssue("");
                  setFilterPayer("");
                  setFilterOwner("");
                  setFilterStatus("");
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(31, 56, 100, 0.14)",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "var(--oc-white)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  color: "var(--oc-gray-600)",
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              border: "1px solid rgba(31, 56, 100, 0.08)",
              borderRadius: 20,
              overflow: "auto",
              boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(31, 56, 100, 0.06)" }}>
                  {[
                    { label: "Claim Ref" },
                    { label: "Payer" },
                    { label: "Issue Type" },
                    { label: "Value" },
                    { label: "Effort" },
                    {
                      label: "Score",
                      title:
                        "Score = (Expected Recovery / Effort) x Urgency Multiplier. Urgency bands: overdue=2.5x, <=2 days=2.0x, <=7 days=1.5x, <=14 days=1.2x, otherwise 1.0x.",
                    },
                    { label: "Owner" },
                    { label: "Due" },
                    { label: "Status" },
                    { label: "Next Step" },
                  ].map((column) => (
                    <th
                      key={column.label}
                      title={column.title}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        color: "var(--oc-gray-600)",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                        cursor: column.title ? "help" : "default",
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndScored.map((item, index) => {
                  const ref = item.claim_id ?? item.opportunity_id ?? "--";
                  const overdue = isOverdue(item.due_date);
                  const nextStep = NEXT_STEPS[item.issue_type ?? ""] ?? item.next_step ?? "Review and action";

                  return (
                    <tr
                      key={`${ref}-${index}`}
                      style={{
                        borderBottom:
                          index < filteredAndScored.length - 1 ? "1px solid rgba(31, 56, 100, 0.06)" : "none",
                        background: overdue ? "var(--oc-critical-bg)" : "transparent",
                        borderLeft: overdue ? "3px solid var(--oc-critical)" : "3px solid transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--oc-navy)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ref}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{payerLabel(item.payer_id)}</td>
                      <td style={{ padding: "10px 12px" }}>{issueTypeLabel(item.issue_type)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                        {currency(item.expected_recovery_amount ?? item.recoverable_amount)}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {item.effort_hours != null ? `${item.effort_hours}h` : "n/a"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <ScorePill score={item._score} />
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {ownerLabel(item.owner ?? item.owner_user_id)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          whiteSpace: "nowrap",
                          color: overdue ? "var(--oc-critical)" : "var(--oc-gray-600)",
                        }}
                      >
                        {shortDate(item.due_date)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <StatusPill status={item.decision_status ?? item.status ?? "open"} />
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--oc-gray-600)", maxWidth: 180 }}>
                        {nextStep}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            background: "var(--oc-normal-bg)",
            color: "var(--oc-normal)",
            border: "1px solid rgba(46, 125, 50, 0.22)",
          }}
        >
          AR Days: 38d (target 40d)
        </span>
      </div>
    </div>
  );
}
