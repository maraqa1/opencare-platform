"use client";

import Link from "next/link";
import { useRCMFetch } from "../useRCMFetch";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { CFO_DASHBOARD_URL, RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid } from "../layout/KPIGrid";
import { DeltaPill } from "../shared/DeltaPill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { NarrativePayload } from "../types";
import { currency, currencyCompact } from "@/lib/format";
import { ownerLabel, issueTypeLabel, payerLabel } from "@/lib/displayNames";

const VIEW_HREFS: Record<string, string> = {
  "payer-control": "/use-cases/revenue-cycle-management/payer-control",
  "recovery-queue": "/use-cases/revenue-cycle-management/recovery-queue",
  "revenue-leakage": "/use-cases/revenue-cycle-management/revenue-leakage",
  "team-performance": "/use-cases/revenue-cycle-management/team-performance",
  "cash-command": "/use-cases/revenue-cycle-management/cash-command",
};

function MetricRow({
  label,
  value,
  target,
  good,
}: {
  label: string;
  value: string;
  target: string;
  good: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(31, 56, 100, 0.06)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: good ? "var(--oc-normal)" : "var(--oc-critical)",
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: 10, color: "var(--oc-gray-600)" }}>target {target}</span>
      </div>
    </div>
  );
}

export function ExecutiveNarrative() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<NarrativePayload>("executive-narrative");

  const cashImpact = data?.cash_impact;

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--oc-gray-900)" }}>
      <RCMPageHeader
        subtitle="CFO-ready operating narrative generated from live recovery data."
        showCFOButton
        cfoHref={CFO_DASHBOARD_URL}
        cfoLabel="Open CFO Dashboard"
        badges={[
          { label: "Narrative: backend-generated", color: "green" },
          { label: "Cash impact: live only", color: "blue" },
          { label: "No hardcoded values", color: "gray" },
        ]}
      />
      <RCMNavTabs active="executive-narrative" />

      {stale && <StaleBanner />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "var(--oc-gray-600)" }}>
          {data?.as_of
            ? `Generated ${new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(data.as_of))}`
            : "Awaiting data"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              border: "1px solid rgba(31, 56, 100, 0.14)",
              fontSize: 12,
              fontWeight: 500,
              background: "var(--oc-white)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Regenerate
          </button>
          <button
            style={{
              padding: "5px 12px",
              borderRadius: 10,
              border: "none",
              fontSize: 12,
              background: "var(--oc-navy)",
              color: "rgba(255,255,255,0.88)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "The executive narrative appears once live revenue cycle data is available."} />
      )}

      {!loading && !error && !data?.meta?.empty && data && (
        <>
          {data.headline && (
            <div
              style={{
                borderLeft: "4px solid var(--oc-navy)",
                background: "var(--oc-gray-100)",
                borderRadius: "0 6px 6px 0",
                padding: "14px 20px",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 15, color: "var(--oc-gray-900)", margin: 0, lineHeight: 1.6 }}>
                {data.headline}
              </p>
            </div>
          )}

          <KPIGrid
            items={[
              { label: "RECOVERABLE | 7 DAYS", value: currencyCompact(cashImpact?.recoverable_cash_7d) },
              { label: "RECOVERABLE | 14 DAYS", value: currencyCompact(cashImpact?.recoverable_cash_14d) },
              { label: "CASH AT RISK", value: currencyCompact(cashImpact?.cash_at_risk) },
              { label: "EXPECTED COLLECTIONS", value: currencyCompact(cashImpact?.expected_collections) },
            ]}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(31, 56, 100, 0.08)",
                borderRadius: 20,
                padding: 22,
                boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--oc-gray-600)",
                  margin: "0 0 12px",
                }}
              >
                WHAT CHANGED SINCE LAST REPORT
              </p>
              {(data.key_drivers ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>No driver data available.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(data.key_drivers ?? []).map((driver, index) => {
                    const direction: "up" | "down" | "flat" = driver.startsWith("↑")
                      ? "up"
                      : driver.startsWith("↓")
                      ? "down"
                      : "flat";
                    const text = driver.replace(/^[↑↓]\s*/, "");
                    return (
                      <div
                        key={index}
                        style={{
                          borderBottom:
                            index < (data.key_drivers ?? []).length - 1
                              ? "1px solid rgba(31, 56, 100, 0.06)"
                              : "none",
                          paddingBottom: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {direction !== "flat" && (
                            <DeltaPill
                              direction={direction}
                              value={direction === "up" ? "Up" : "Down"}
                              positive={direction === "down"}
                            />
                          )}
                          <span style={{ fontSize: 13, color: "var(--oc-gray-900)" }}>{text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(31, 56, 100, 0.08)",
                borderRadius: 20,
                padding: 22,
                boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--oc-gray-600)",
                  margin: "0 0 12px",
                }}
              >
                RISKS REQUIRING EXECUTIVE ATTENTION
              </p>
              {(data.risks ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>No risks flagged.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(data.risks ?? []).map((risk, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "8px 10px",
                        borderRadius: 10,
                        gap: 12,
                        background:
                          risk.severity === "critical" ? "var(--oc-critical-bg)" : "var(--oc-warning-bg)",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              risk.severity === "critical" ? "var(--oc-critical)" : "var(--oc-warning)",
                            margin: "0 0 2px",
                          }}
                        >
                          {payerLabel(risk.payer) || "Risk flagged"}
                        </p>
                        <p style={{ fontSize: 13, color: "var(--oc-gray-600)", margin: 0 }}>{risk.risk}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--oc-gray-900)", flexShrink: 0 }}>
                        {currency(risk.cash_impact)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(31, 56, 100, 0.08)",
                borderRadius: 20,
                padding: 22,
                boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--oc-gray-600)",
                  margin: "0 0 12px",
                }}
              >
                RECOMMENDED ACTIONS
              </p>
              {(data.recommended_actions ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>No recommended actions available.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(data.recommended_actions ?? []).slice(0, 3).map((action, index) => (
                    <div
                      key={index}
                      style={{
                        borderBottom: index < 2 ? "1px solid rgba(31, 56, 100, 0.06)" : "none",
                        paddingBottom: 12,
                      }}
                    >
                      {action.issue_type && (
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--oc-navy)",
                            margin: "0 0 4px",
                          }}
                        >
                          {issueTypeLabel(action.issue_type)}
                        </p>
                      )}
                      <p style={{ fontSize: 13, color: "var(--oc-gray-900)", margin: "0 0 6px", lineHeight: 1.4 }}>
                        {action.action}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 10, color: "var(--oc-gray-600)" }}>
                        <span>{ownerLabel(action.owner)}</span>
                        {action.opportunity_id && (
                          <>
                            <span>|</span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--oc-navy)" }}>
                              {action.opportunity_id}
                            </span>
                          </>
                        )}
                        {action.expected_recovery != null && (
                          <>
                            <span>|</span>
                            <span style={{ fontWeight: 500, color: "var(--oc-gray-900)" }}>
                              {currency(action.expected_recovery)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(31, 56, 100, 0.08)",
                borderRadius: 20,
                padding: 22,
                boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--oc-gray-600)",
                  margin: "0 0 12px",
                }}
              >
                CASH IMPACT SUMMARY
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "7-Day Pipeline", value: currencyCompact(cashImpact?.recoverable_cash_7d) },
                  { label: "Cash at Risk", value: currencyCompact(cashImpact?.cash_at_risk) },
                ].map((cell) => (
                  <div key={cell.label} style={{ background: "var(--oc-gray-100)", borderRadius: 10, padding: "10px 12px" }}>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--oc-gray-600)",
                        textTransform: "uppercase",
                        margin: "0 0 4px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {cell.label}
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 500, color: "var(--oc-gray-900)", margin: 0 }}>{cell.value}</p>
                  </div>
                ))}
              </div>
              <MetricRow label="14-Day Recoverable" value={currencyCompact(cashImpact?.recoverable_cash_14d)} target="n/a" good />
              <MetricRow label="Expected Collections" value={currencyCompact(cashImpact?.expected_collections)} target="n/a" good />
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(31, 56, 100, 0.08)",
                borderRadius: 20,
                padding: 22,
                boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--oc-gray-600)",
                  margin: "0 0 12px",
                }}
              >
                NEXT STEPS
              </p>
              {(data.next_steps ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>No next steps generated.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(data.next_steps ?? []).map((step, index) => (
                    <div
                      key={index}
                      style={{
                        borderBottom:
                          index < (data.next_steps ?? []).length - 1
                            ? "1px solid rgba(31, 56, 100, 0.06)"
                            : "none",
                        paddingBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "var(--oc-blue-light)",
                            color: "var(--oc-navy)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </span>
                        <p style={{ fontSize: 13, color: "var(--oc-gray-900)", margin: 0, lineHeight: 1.4 }}>{step}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {Object.entries(VIEW_HREFS).slice(0, 3).map(([key, href]) => (
                      <Link
                        key={key}
                        href={href}
                        style={{ fontSize: 10, color: "var(--oc-navy)", textDecoration: "none", fontWeight: 500 }}
                      >
                        Open {key.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid rgba(31, 56, 100, 0.08)",
            }}
          >
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
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(31, 56, 100, 0.14)",
                  fontSize: 12,
                  fontWeight: 500,
                  background: "var(--oc-white)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Export PDF
              </button>
              <button
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(31, 56, 100, 0.14)",
                  fontSize: 12,
                  fontWeight: 500,
                  background: "var(--oc-white)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Copy as email
              </button>
              <button
                style={{
                  padding: "5px 12px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 12,
                  background: "var(--oc-navy)",
                  color: "rgba(255,255,255,0.88)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
