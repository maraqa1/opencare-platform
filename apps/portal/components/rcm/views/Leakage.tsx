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
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
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
          <div style={{ background: "#f5f4f0", borderRadius: 6, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: "0 0 4px" }}>
                TOTAL REVENUE LEAKAGE
              </p>
              <p style={{ fontSize: 22, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>
                {currencyCompact(totalLeakage)}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
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
                  <div key={key} style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>{currencyCompact(row.leakage_amount)}</p>
                    <p style={{ fontSize: 11, color: "#888", margin: 0, flexGrow: 1 }}>{guidance || "Review this leakage category."}</p>
                    <button style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 500, background: "#1a3050", color: "#b8d4f0", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
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
                  <div key={key} style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>{currencyCompact(row.leakage_amount)}</p>
                    <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{guidance || "Review this leakage category."}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Decomposition table */}
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", margin: "0 0 10px" }}>
            LEAKAGE DECOMPOSITION
          </p>
          <div style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #f0ede6" }}>
                  {["Leakage Type", "Items", "Amount", "Recoverability", "Last Detected", "Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 500, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
         