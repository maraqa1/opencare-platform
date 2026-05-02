"use client";

import { RCMDashboard } from "@/components/RCMDashboard";
import { RCMNavTabs }   from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid }       from "../layout/KPIGrid";
import { StatusPill }    from "../shared/StatusPill";
import { ActionButton }  from "../shared/ActionButton";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch }   from "../useRCMFetch";
import type { CashCommandPayload } from "../types";
import {
  currency, currencyCompact, shortDate,
} from "@/lib/format";
import {
  issueTypeLabel, ownerLabel, payerLabel, departmentLabel,
} from "@/lib/displayNames";

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function CashCommand() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<CashCommandPayload>("cash-command");

  const topActions      = data?.top_actions ?? [];
  const expiring        = data?.expiring_opportunities ?? [];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <RCMPageHeader
        subtitle="The CFO landing view for real-time cash control, recovery execution, and revenue accountability."
        showCFOButton
        badges={[
          { label: "Financial truth: ERP postings", color: "blue" },
          ...(data?.data_freshness?.status
            ? [{ label: `Freshness: ${data.data_freshness.status}`, color: (data.data_freshness.status === "fresh" ? "green" : "amber") as "green" | "amber" }]
            : []),
        ]}
      />
      <RCMNavTabs active="cash-command" />

      {stale && <StaleBanner />}

      {/* KPI strip from operational payload */}
      {data && !data.meta?.empty && (
        <KPIGrid items={[
          { label: "RECOVERABLE · 7 DAYS",   value: currencyCompact(data.recoverable_cash_7d) },
          { label: "RECOVERABLE · 14 DAYS",  value: currencyCompact(data.recoverable_cash_14d) },
          { label: "CASH AT RISK",           value: currencyCompact(data.cash_at_risk) },
          { label: "EXPECTED COLLECTIONS",   value: currencyCompact(data.expected_collections) },
        ]} />
      )}

      {/* Executive dashboard with charts (uses its own fetch internally) */}
      <RCMDashboard />

      {/* Operational action section */}
      {loading && <LoadingView />}
      {error   && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Cash command will populate once revenue-cycle marts are loaded."} />
      )}

      {!loading && !error && topActions.length > 0 && (
        <>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: 0 }}>
              TODAY&apos;S RECOVERY ACTIONS — TOP 5
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {data?.as_of && (
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "#e1f5ee", color: "#0f6e56", fontWeight: 500 }}>
                  As of {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(data.as_of))}
                </span>
              )}
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "#e8f0f9", color: "#1a3050", fontWeight: 500 }}>
                ERP postings
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
            {/* Left: action cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topActions.slice(0, 5).map((item) => {
                const ref     = item.claim_id ?? item.opportunity_id ?? "—";
                const overdue = isOverdue(item.due_date);
                return (
                  <div
                    key={ref}
                    style={{
                      background: "#ffffff",
                      border: "0.5px solid #e5e3dc",
                      borderRadius: 10,
                      borderLeft: overdue ? "3px solid #c0392b" : "3px solid #e5e3dc",
                      padding: "14px 16px",
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: overdue ? "#c0392b" : "#1a1a1a" }}>
                        {issueTypeLabel(item.issue_type)}
                        {overdue && (
                          <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, background: "#fdecea", color: "#c0392b", fontWeight: 500 }}>
                            OVERDUE
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{ref}</span>
                        <StatusPill status={item.status ?? "open"} />
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: "#888888", margin: "0 0 10px" }}>
                      {payerLabel(item.payer_id)} · {departmentLabel(item.department_id)}
                    </p>

                    {/* 2×2 detail grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      {[
                        { label: "Recoverable",       value: currency(item.recoverable_amount) },
                        { label: "Expected recovery",  value: currency(item.expected_recovery_amount) },
                        { label: "Due date",           value: shortDate(item.due_date) },
                        { label: "Owner",              value: ownerLabel(item.owner_user_id ?? item.owner_team) },
                      ].map((cell) => (
                        <div key={cell.label} style={{ background: "#f5f4f0", borderRadius: 6, padding: "8px 10px" }}>
                          <p style={{ fontSize: 10, color: "#999", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cell.label}</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>{cell.value}</p>
                        </div>
                      ))}
                    </div>

                    {item.evidence_summary && (
                      <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px", lineHeight: 1.5 }}>{item.evidence_summary}</p>
                    )}

                    <ActionButton label={item.next_step ?? "Review work item →"} small />
                  </div>
                );
              })}
            </div>

            {/* Right: deadlines at risk */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: "0 0 10px" }}>
                DEADLINES AT RISK
              </p>
              <div style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, padding: "4px 0" }}>
                {expiring.length === 0 ? (
                  <p style={{ padding: "16px", fontSize: 12, color: "#888", margin: 0 }}>No imminent deadlines</p>
                ) : (
                  expiring.map((item, i) => {
                    const overdue = isOverdue(item.due_date);
                    const dotColor = overdue ? "#c0392b" : "#b7600a";
                    return (
                      <div
                        key={item.claim_id ?? item.opportunity_id ?? i}
                        style={{
                          padding: "12px 16px",
                          borderBottom: i < expiring.length - 1 ? "0.5px solid #f0ede6" : "none",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, marginTop: 4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "monospace", color: "#1a3050" }}>
                              {item.claim_id ?? item.opportunity_id}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                              {currency(item.expected_recovery_amount)}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "#1a1a1a", margin: "2px 0" }}>
                            {issueTypeLabel(item.issue_type)}
                          </p>
                          <p style={{ fontSize: 10, color: "#888", margin: 0 }}>
                            Due {shortDate(item.due_date)} · {ownerLabel(item.owner_user_id ?? item.owner_team)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* AR Days footer badge */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f0f7e8", color: "#4a7c1f", border: "0.5px solid #c3e6a8" }}>
          AR Days: 38d ✓ (target 40d)
        </span>
      </div>
    </div>
  );
}
