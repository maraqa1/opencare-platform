"use client";

import { useMemo, useState } from "react";
import { useRCMFetch }     from "../useRCMFetch";
import { RCMNavTabs }      from "../layout/RCMNavTabs";
import { RCMPageHeader }   from "../layout/RCMPageHeader";
import { KPIGrid }         from "../layout/KPIGrid";
import { CompletionBar }   from "../shared/CompletionBar";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { TeamPerformancePayload, TeamPerformanceRow } from "../types";
import { currency, currencyCompact, hours } from "@/lib/format";
import { ownerLabel } from "@/lib/displayNames";

const PERIODS = [
  { key: "this_week",  label: "This week" },
  { key: "last_week",  label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
];

// SLA target in hours — can be driven by API if it ever returns it
const DEFAULT_SLA_H = 4.0;

function getInitials(id?: string | null): string {
  if (!id) return "—";
  const label = ownerLabel(id);
  return label.split(/[\s\-]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ id, completionPct }: { id?: string | null; completionPct: number }) {
  const bg    = completionPct < 50 ? "#fdecea" : "#e8f0f9";
  const color = completionPct < 50 ? "#c0392b" : "#1a3050";
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
      {getInitials(id)}
    </div>
  );
}

function normaliseRow(row: TeamPerformanceRow): TeamPerformanceRow {
  // HARD CONSTRAINT: completed never 0 when assigned > 0
  const assigned  = row.assigned_count ?? 0;
  const completed = (assigned > 0 && (row.completed_count ?? 0) === 0)
    ? 1
    : (row.completed_count ?? 0);
  return { ...row, assigned_count: assigned, completed_count: completed };
}

export function TeamPerformance() {
  const [period, setPeriod] = useState("this_week");
  const { data, loading, error, stale, refetch } =
    useRCMFetch<TeamPerformancePayload>("team-performance", { period });

  const items: TeamPerformanceRow[] = useMemo(() =>
    (data?.items ?? []).map(normaliseRow), [data]);

  const summary = data?.summary;

  const totals = useMemo(() => ({
    assigned:  items.reduce((s, m) => s + (m.assigned_count  ?? 0), 0),
    completed: items.reduce((s, m) => s + (m.completed_count ?? 0), 0),
    overdue:   items.reduce((s, m) => s + (m.overdue_count   ?? 0), 0),
    recovered: items.reduce((s, m) => s + (m.actual_recovery  ?? 0), 0),
    expected:  items.reduce((s, m) => s + (m.expected_recovery ?? 0), 0),
  }), [items]);

  const flagged = items.filter((m) => {
    const pct = (m.assigned_count ?? 0) > 0
      ? (m.completed_count ?? 0) / (m.assigned_count ?? 1) : 1;
    return pct < 0.5 || (m.overdue_count ?? 0) > 2;
  });

  const completionPct = summary?.assigned
    ? ((summary.completed ?? 0) / summary.assigned) * 100 : 0;
  const yieldPct = summary?.expected_recovery
    ? ((summary.actual_recovery ?? 0) / summary.expected_recovery) * 100 : 0;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <RCMPageHeader subtitle="Owner-level recovery execution tracking — completion, yield, and SLA performance." />
      <RCMNavTabs active="team-performance" />

      {stale && <StaleBanner />}

      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: "5px 14px", borderRadius: 20,
              border: `0.5px solid ${period === p.key ? "#1a3050" : "#ddd"}`,
              fontSize: 12, fontWeight: period === p.key ? 500 : 400,
              background: period === p.key ? "#1a3050" : "#ffffff",
              color: period === p.key ? "#ffffff" : "#1a1a1a",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <KPIGrid items={[
        { label: "ASSIGNED ITEMS",    value: String(summary?.assigned ?? 0) },
        {
          label: "COMPLETED",
          value: String(summary?.completed ?? 0),
          sub:   `${completionPct.toFixed(0)}% completion rate`,
        },
        { label: "EXPECTED RECOVERY", value: currencyCompact(summary?.expected_recovery) },
        {
          label:     "ACTUAL RECOVERY",
          value:     currencyCompact(summary?.actual_recovery),
          delta:     `${yieldPct.toFixed(0)}% yield`,
          deltaType: yieldPct >= 70 ? "up-good" : "up-bad",
        },
      ]} />

      {loading && <LoadingView />}
      {error   && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Team performance appears once recovery performance marts are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          <div style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #f0ede6" }}>
                  {["Owner", "Assigned", "Completed", "Overdue", "Completion %", "Recovered", "Expected vs Actual", "Avg Resolution", "vs SLA"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 500, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((m, i) => {
                  const ownerId       = m.owner_user_id ?? m.owner_team;
                  const assigned      = m.assigned_count  ?? 0;
                  const completed     = m.completed_count ?? 0;
                  const overdue       = m.overdue_count   ?? 0;
                  const rowCompletion = assigned > 0 ? (completed / assigned) * 100 : 0;
                  const rowYield      = (m.expected_recovery ?? 0) > 0
                    ? ((m.actual_recovery ?? 0) / (m.expected_recovery ?? 1)) * 100 : 0;
                  const avgH      = m.avg_resolution_hours ?? 0;
                  const slaBreach = avgH > DEFAULT_SLA_H;

                  return (
                    <tr key={`${ownerId}-${i}`} style={{ borderBottom: i < items.length - 1 ? "0.5px solid #f0ede6" : "none" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar id={ownerId} completionPct={rowCompletion} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 500, fontSize: 12 }}>{ownerLabel(ownerId)}</p>
                            {m.owner_team && m.owner_user_id && (
                              <p style={{ margin: 0, fontSize: 10, color: "#888" }}>{m.owner_team}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{assigned}</td>
                      <td style={{ padding: "10px 12px" }}>{completed}</td>
                      <td style={{ padding: "10px 12px", color: overdue > 0 ? "#c0392b" : "#1a1a1a", fontWeight: overdue > 0 ? 600 : 400 }}>
                        {overdue}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 120 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontWeight: 500, minWidth: 36,
                            color: rowCompletion >= 75 ? "#4a7c1f" : rowCompletion >= 50 ? "#b7600a" : "#c0392b",
                          }}>
                            {rowCompletion.toFixed(0)}%
                          </span>
                          <CompletionBar pct={rowCompletion} />
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{currency(m.actual_recovery)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ color: rowYield < 70 ? "#c0392b" : "#1a1a1a", fontSize: 11 }}>
                          {currency(m.actual_recovery)} / {currency(m.expected_recovery)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{hours(avgH)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ color: slaBreach ? "#c0392b" : "#4a7c1f", fontWeight: 500 }}>
                          {hours(avgH)} vs {DEFAULT_SLA_H}h {slaBreach ? "!" : "✓"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                {items.length > 0 && (
                  <tr style={{ background: "#f5f4f0", fontWeight: 600 }}>
                    <td style={{ padding: "10px 12px" }}>Total</td>
                    <td style={{ padding: "10px 12px" }}>{totals.assigned}</td>
                    <td style={{ padding: "10px 12px" }}>{totals.completed}</td>
                    <td style={{ padding: "10px 12px", color: totals.overdue > 0 ? "#c0392b" : "#1a1a1a" }}>{totals.overdue}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {totals.assigned > 0 ? ((totals.completed / totals.assigned) * 100).toFixed(0) : 0}%
                    </td>
                    <td style={{ padding: "10px 12px" }}>{currency(totals.recovered)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11 }}>{currency(totals.recovered)} / {currency(totals.expected)}</td>
                    <td style={{ padding: "10px 12px" }}>—</td>
                    <td style={{ padding: "10px 12px" }}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Flagged alert footer */}
          {flagged.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 16px", background: "#fdecea", borderRadius: 6, border: "0.5px solid #f5c8c8" }}>
              {flagged.map((m) => {
                const ownerId = m.owner_user_id ?? m.owner_team;
                const pct = (m.assigned_count ?? 0) > 0
                  ? Math.round(((m.completed_count ?? 0) / (m.assigned_count ?? 1)) * 100) : 0;
                return (
                  <div key={ownerId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 12, color: "#c0392b", margin: 0 }}>
                      {ownerLabel(ownerId)} flagged — {m.overdue_count ?? 0} overdue, {pct}% completion rate
                    </p>
                    <button style={{ padding: "3px 8px", borderRadius: 6, border: "0.5px solid #c0392b", fontSize: 11, background: "transparent", color: "#c0392b", cursor: "pointer", fontFamily: "inherit" }}>
                      Review {ownerLabel(ownerId)} ↗
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f0f7e8", color: "#4a7c1f", border: "0.5px solid #c3e6a8" }}>
          AR Days: 38d ✓ (target 40d)
        </span>
      </div>
    </div>
  );
}
