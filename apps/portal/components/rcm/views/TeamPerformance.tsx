"use client";

import { useMemo, useState } from "react";
import { useRCMFetch } from "../useRCMFetch";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid } from "../layout/KPIGrid";
import { CompletionBar } from "../shared/CompletionBar";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { TeamPerformancePayload, TeamPerformanceRow } from "../types";
import { currency, currencyCompact, hours } from "@/lib/format";
import { ownerLabel } from "@/lib/displayNames";

const PERIODS = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
];

const SLA_TARGETS_HOURS: Record<string, number> = {
  "j.mitchell": 48,
  "s.okafor": 48,
  "t.brennan": 48,
  "revenue.integrity": 36,
  "payer.relations": 72,
};

function getInitials(id?: string | null): string {
  if (!id) return "--";
  const label = ownerLabel(id);
  return label
    .split(/[\s-]/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ id, completionPct }: { id?: string | null; completionPct: number | null }) {
  const bg =
    completionPct == null
      ? "var(--oc-gray-100)"
      : completionPct < 50
      ? "var(--oc-critical-bg)"
      : "var(--oc-blue-light)";
  const color =
    completionPct == null
      ? "var(--oc-gray-600)"
      : completionPct < 50
      ? "var(--oc-critical)"
      : "var(--oc-navy)";

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {getInitials(id)}
    </div>
  );
}

function normaliseRow(row: TeamPerformanceRow): TeamPerformanceRow {
  return {
    ...row,
    assigned_count: row.assigned_count ?? 0,
    completed_count: row.completed_count ?? 0,
    overdue_count: row.overdue_count ?? 0,
    avg_resolution_hours: row.avg_resolution_hours ?? null,
  };
}

function completionPercent(assigned: number, completed: number): number | null {
  if (assigned === 0) return null;
  return (completed / assigned) * 100;
}

function resolveSlaTargetHours(row: TeamPerformanceRow): number | null {
  if (row.sla_target_hours != null) {
    return row.sla_target_hours;
  }
  const ownerId = row.owner_user_id ?? row.owner_team ?? "";
  return SLA_TARGETS_HOURS[ownerId] ?? null;
}

function formatCompletion(pct: number | null) {
  return pct == null ? "n/a" : `${pct.toFixed(0)}%`;
}

function formatSlaComparison(avgHours: number | null, slaHours: number | null) {
  if (avgHours == null) {
    return { text: "Resolution time unavailable", color: "var(--oc-gray-600)" };
  }
  if (slaHours == null) {
    return { text: `${hours(avgHours)} vs turnaround target not configured`, color: "var(--oc-gray-600)" };
  }
  const delta = avgHours - slaHours;
  const color =
    delta <= 0
      ? "var(--oc-normal)"
      : delta <= slaHours * 0.2
      ? "var(--oc-warning)"
      : "var(--oc-critical)";
  return { text: `${hours(avgHours)} vs ${hours(slaHours)} target`, color };
}

export function TeamPerformance() {
  const [period, setPeriod] = useState("this_week");
  const { data, loading, error, stale, refetch } =
    useRCMFetch<TeamPerformancePayload>("team-performance", { period });

  const items = useMemo(() => (data?.items ?? []).map(normaliseRow), [data]);
  const summary = data?.summary;

  const totals = useMemo(
    () => ({
      assigned: items.reduce((sum, row) => sum + (row.assigned_count ?? 0), 0),
      completed: items.reduce((sum, row) => sum + (row.completed_count ?? 0), 0),
      overdue: items.reduce((sum, row) => sum + (row.overdue_count ?? 0), 0),
      recovered: items.reduce((sum, row) => sum + (row.actual_recovery ?? 0), 0),
      expected: items.reduce((sum, row) => sum + (row.expected_recovery ?? 0), 0),
    }),
    [items],
  );

  const flagged = items.filter((row) => {
    const assigned = row.assigned_count ?? 0;
    const completed = row.completed_count ?? 0;
    const pct = completionPercent(assigned, completed);
    return (pct != null && pct < 50) || (row.overdue_count ?? 0) > 2;
  });

  const summaryCompletion = summary?.assigned ? ((summary.completed ?? 0) / summary.assigned) * 100 : null;
  const yieldPct =
    summary?.expected_recovery && summary.expected_recovery > 0
      ? ((summary.actual_recovery ?? 0) / summary.expected_recovery) * 100
      : null;

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--oc-gray-900)" }}>
      <RCMPageHeader subtitle="Owner-level recovery execution tracking for completion, yield, and turnaround-target performance." />
      <RCMNavTabs active="team-performance" />

      {stale && <StaleBanner />}

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {PERIODS.map((option) => (
          <button
            key={option.key}
            onClick={() => setPeriod(option.key)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${period === option.key ? "var(--oc-navy)" : "rgba(31,56,100,0.14)"}`,
              fontSize: 12,
              fontWeight: period === option.key ? 500 : 400,
              background: period === option.key ? "var(--oc-navy)" : "rgba(255,255,255,0.92)",
              color: period === option.key ? "#fff" : "var(--oc-gray-900)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <KPIGrid
        items={[
          { label: "ASSIGNED ITEMS", value: String(summary?.assigned ?? 0) },
          {
            label: "COMPLETED",
            value: String(summary?.completed ?? 0),
            sub:
              summaryCompletion == null
                ? "No assigned work yet"
                : `${summaryCompletion.toFixed(0)}% completion rate`,
          },
          { label: "EXPECTED RECOVERY", value: currencyCompact(summary?.expected_recovery) },
          {
            label: "ACTUAL RECOVERY",
            value: currencyCompact(summary?.actual_recovery),
            delta: yieldPct == null ? "Yield pending" : `${yieldPct.toFixed(0)}% yield`,
            deltaType: yieldPct == null ? "neutral" : yieldPct >= 70 ? "up-good" : "up-bad",
          },
        ]}
      />

      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Team performance appears once recovery performance marts are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
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
                  {["Owner", "Assigned", "Completed", "Overdue", "Completion %", "Recovered", "Expected vs Actual", "Avg Resolution", "vs Target"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        color: "var(--oc-gray-600)",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const ownerId = row.owner_user_id ?? row.owner_team;
                  const assigned = row.assigned_count ?? 0;
                  const completed = row.completed_count ?? 0;
                  const overdue = row.overdue_count ?? 0;
                  const rowCompletion = completionPercent(assigned, completed);
                  const rowYield =
                    (row.expected_recovery ?? 0) > 0
                      ? ((row.actual_recovery ?? 0) / (row.expected_recovery ?? 1)) * 100
                      : null;
                  const avgHours = row.avg_resolution_hours ?? null;
                  const slaTargetHours = resolveSlaTargetHours(row);
                  const slaComparison = formatSlaComparison(avgHours, slaTargetHours);

                  return (
                    <tr
                      key={`${ownerId}-${index}`}
                      style={{
                        borderBottom: index < items.length - 1 ? "1px solid rgba(31, 56, 100, 0.06)" : "none",
                      }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar id={ownerId} completionPct={rowCompletion} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>{ownerLabel(ownerId)}</p>
                            {row.owner_team && row.owner_user_id && (
                              <p style={{ margin: 0, fontSize: 11, color: "var(--oc-gray-600)" }}>{row.owner_team}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{assigned}</td>
                      <td style={{ padding: "10px 12px" }}>{completed}</td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: overdue > 0 ? "var(--oc-critical)" : "var(--oc-gray-900)",
                          fontWeight: overdue > 0 ? 600 : 400,
                        }}
                      >
                        {overdue}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 120 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontWeight: 500,
                              minWidth: 36,
                              color:
                                rowCompletion == null
                                  ? "var(--oc-gray-600)"
                                  : rowCompletion >= 75
                                  ? "var(--oc-normal)"
                                  : rowCompletion >= 50
                                  ? "var(--oc-warning)"
                                  : "var(--oc-critical)",
                            }}
                          >
                            {formatCompletion(rowCompletion)}
                          </span>
                          <CompletionBar pct={rowCompletion ?? 0} />
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{currency(row.actual_recovery)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: rowYield != null && rowYield < 70 ? "var(--oc-critical)" : "var(--oc-gray-900)" }}>
                        {currency(row.actual_recovery)} / {currency(row.expected_recovery)}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{avgHours == null ? "n/a" : hours(avgHours)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ color: slaComparison.color, fontWeight: 500 }}>{slaComparison.text}</span>
                      </td>
                    </tr>
                  );
                })}

                {items.length > 0 && (
                  <tr style={{ background: "var(--oc-gray-100)", fontWeight: 600 }}>
                    <td style={{ padding: "10px 12px" }}>Total</td>
                    <td style={{ padding: "10px 12px" }}>{totals.assigned}</td>
                    <td style={{ padding: "10px 12px" }}>{totals.completed}</td>
                    <td style={{ padding: "10px 12px", color: totals.overdue > 0 ? "var(--oc-critical)" : "var(--oc-gray-900)" }}>{totals.overdue}</td>
                    <td style={{ padding: "10px 12px" }}>{formatCompletion(completionPercent(totals.assigned, totals.completed))}</td>
                    <td style={{ padding: "10px 12px" }}>{currency(totals.recovered)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11 }}>{currency(totals.recovered)} / {currency(totals.expected)}</td>
                    <td style={{ padding: "10px 12px" }}>n/a</td>
                    <td style={{ padding: "10px 12px" }}>Mixed targets</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {flagged.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 16px",
                background: "var(--oc-critical-bg)",
                borderRadius: 10,
                border: "1px solid rgba(183, 28, 28, 0.18)",
              }}
            >
              {flagged.map((row) => {
                const ownerId = row.owner_user_id ?? row.owner_team;
                const pct = completionPercent(row.assigned_count ?? 0, row.completed_count ?? 0);
                return (
                  <div key={ownerId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 13, color: "var(--oc-critical)", margin: 0 }}>
                      {ownerLabel(ownerId)} flagged - {row.overdue_count ?? 0} overdue, {formatCompletion(pct)} completion rate
                    </p>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--oc-critical)" }}>Needs review</span>
                  </div>
                );
              })}
            </div>
          )}
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
          Average payment days: 38d (target 40d)
        </span>
      </div>
    </div>
  );
}
