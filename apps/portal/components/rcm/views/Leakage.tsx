"use client";

import { useRCMFetch }          from "../useRCMFetch";
import { RCMNavTabs }           from "../layout/RCMNavTabs";
import { RCMPageHeader }        from "../layout/RCMPageHeader";
import { RecoverabilityPill }   from "../shared/RecoverabilityPill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { LeakagePayload, LeakageRow } from "../types";
import { currency, currencyCompact, shortDate } from "@/lib/format";
import { leakageGuidance, leakageRecoverability, genericLabel } from "@/lib/displayNames";

// Display labels for leakage type keys
const CATEGORY_LABELS: Record<string, string> = {
  denied_not_appealed:   "Denied — Not Appealed",
  late_submissions:      "Late Submissions",
  underpayments:         "Underpayments",
  unbilled_encounters:   "Unbilled Encounters",
  writeoffs:             "Write-offs",
  missing_authorization: "Missing Authorisation",
  undercoding:           "Undercoding",
};

const ACTION_LABELS: Record<string, string> = {
  denied_not_appealed:   "Start appeal queue",
  late_submissions:      "View deadlines",
  underpayments:         "Open disputes",
  unbilled_encounters:   "By department",
  writeoffs:             "Review write-offs",
  missing_authorization: "Review auth gaps",
  undercoding:           "CDI review",
};

// Keys to show as top 4 cards (highest ROI first)
const TOP_CATEGORY_ORDER = [
  "denied_not_appealed",
  "underpayments",
  "late_submissions",
  "unbilled_encounters",
];

function categoryLabel(type?: string | null): string {
  if (!type) return "Unknown";
  return CATEGORY_LABELS[type] ?? genericLabel(type);
}

function recoverabilityLevel(type?: string | null): "High" | "Medium" | "Low" {
  const r = leakageRecoverability(type);
  if (r === "High" || r === "Medium" || r === "Low") return r;
  return "Low";
}

export function Leakage() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<LeakagePayload>("revenue-leakage");

  const breakdown: LeakageRow[] = data?.breakdown ?? [];
  const totals = data?.totals ?? {};

  // Total leakage from totals map
  const totalLeakage   = Object.values(totals).reduce((s, v) => s + v, 0);
  const totalItems     = breakdown.reduce((s, r) => s + (r.item_count ?? 0), 0);
  const highRecoverable = breakdown
    .filter((r) => leakageRecoverability(r.leakage_type) === "High")
    .reduce((s, r) => s + (r.leakage_amount ?? 0), 0);

  // Sort breakdown: top categories first, then by amount desc
  const sorted = [...breakdown].sort((a, b) => {
    const ai = TOP_CATEGORY_ORDER.indexOf(a.leakage_type ?? "");
    const bi = TOP_CATEGORY_ORDER.indexOf(b.leakage_type ?? "");
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (b.leakage_amount ?? 0) - (a.leakage_amount ?? 0);
  });

  const topCards    = sorted.slice(0, 4);
  const bottomCards = sorted.slice(4);

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--oc-gray-900)" }}>
      <RCMPageHeader subtitle="Revenue leakage decomposition — categories, recoverability, and recommended actions." />
      <RCMNavTabs active="revenue-leakage" />

      {stale && <StaleBanner />}

      {loading && <LoadingView />}
      {error   && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Leakage decomposition appears once revenue leakage marts are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          {/* Hero KPI */}
          <div style={{ background: "var(--oc-gray-100)", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--oc-gray-600)", margin: "0 0 4px" }}>
                TOTAL REVENUE LEAKAGE
              </p>
              <p style={{ fontSize: 22, fontWeight: 500, color: "var(--oc-gray-900)", margin: 0 }}>
                {currencyCompact(totalLeakage)}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "var(--oc-gray-600)", margin: 0 }}>
              {currency(totalLeakage)} total · {totalItems} items ·{" "}
              <strong>{currency(highRecoverable)} recoverable</strong>{" "}
              {totalLeakage > 0 ? `(${((highRecoverable / totalLeakage) * 100).toFixed(0)}%)` : ""}
            </p>
          </div>

          {/* Top 4 category cards */}
          {topCards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
              {topCards.map((row) => {
                const key     = row.leakage_type ?? "";
                const label   = categoryLabel(row.leakage_type);
                const guidance = leakageGuidance(key);
                const action  = ACTION_LABELS[key] ?? "Review";
                return (
                  <div key={key} style={{ background: "rgba(255, 255, 255, 0.92)", border: "1px solid rgba(31, 56, 100, 0.08)", borderRadius: 20, padding: 22, boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--oc-gray-600)", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 500, color: "var(--oc-gray-900)", margin: 0 }}>{currencyCompact(row.leakage_amount)}</p>
                    <p style={{ fontSize: 13, color: "var(--oc-gray-600)", margin: 0, flexGrow: 1 }}>{guidance || "Review this leakage category."}</p>
                    <button style={{ padding: "5px 10px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 500, background: "var(--oc-navy)", color: "rgba(255,255,255,0.88)", cursor: "pointer", fontFamily: "var(--font-body)", alignSelf: "flex-start" }}>
                      {action}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom cards */}
          {bottomCards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(bottomCards.length, 3)}, 1fr)`, gap: 10, marginBottom: 20 }}>
              {bottomCards.map((row) => {
                const key     = row.leakage_type ?? "";
                const label   = categoryLabel(row.leakage_type);
                const guidance = leakageGuidance(key);
                return (
                  <div key={key} style={{ background: "rgba(255, 255, 255, 0.92)", border: "1px solid rgba(31, 56, 100, 0.08)", borderRadius: 20, padding: 22, boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--oc-gray-600)", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 500, color: "var(--oc-gray-900)", margin: 0 }}>{currencyCompact(row.leakage_amount)}</p>
                    <p style={{ fontSize: 13, color: "var(--oc-gray-600)", margin: 0 }}>{guidance || "Review this leakage category."}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Decomposition table */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--oc-gray-600)", margin: "0 0 10px" }}>
            LEAKAGE DECOMPOSITION
          </p>
          <div style={{ background: "rgba(255, 255, 255, 0.92)", border: "1px solid rgba(31, 56, 100, 0.08)", borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 40px rgba(31, 56, 100, 0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(31, 56, 100, 0.06)" }}>
                  {["Leakage Type", "Items", "Amount", "Recoverability", "Last Detected", "Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 500, textTransform: "uppercase", color: "var(--oc-gray-600)", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.leakage_type ?? i} style={{ borderBottom: i < sorted.length - 1 ? "1px solid rgba(31, 56, 100, 0.06)" : "none" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{categoryLabel(row.leakage_type)}</td>
                    <td style={{ padding: "10px 12px" }}>{row.item_count ?? 0}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{currency(row.leakage_amount)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <RecoverabilityPill level={recoverabilityLevel(row.leakage_type)} />
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--oc-gray-600)" }}>
                      {shortDate(row.last_detected_at)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(31, 56, 100, 0.14)", fontSize: 12, fontWeight: 500, background: "var(--oc-white)", color: "var(--oc-gray-900)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                        {ACTION_LABELS[row.leakage_type ?? ""] ?? "Review"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <span style={{ padding: "4px 10px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "var(--oc-normal-bg)", color: "var(--oc-normal)", border: "1px solid rgba(46, 125, 50, 0.22)" }}>
              AR Days: 38d ✓ (target 40d)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
