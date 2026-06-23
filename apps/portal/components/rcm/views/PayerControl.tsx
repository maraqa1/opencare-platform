"use client";

import { useRCMFetch } from "../useRCMFetch";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid } from "../layout/KPIGrid";
import { FlagPill } from "../shared/FlagPill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { PayerControlPayload, PayerControlItem } from "../types";
import { currency, currencyCompact, percentFromRatio } from "@/lib/format";
import { payerLabel } from "@/lib/displayNames";

type Compliance = "Flagged" | "Watch" | "Compliant";

function getCompliance(item: PayerControlItem): Compliance {
  const gap = ((item.contract_rate_pct ?? 0) - (item.actual_collection_rate ?? 0)) * 100;
  const targetDrift = (item.actual_payment_days ?? 0) - (item.payment_sla_days ?? 0);
  if (gap > 8 || targetDrift > 15) return "Flagged";
  if ((gap >= 4 && gap <= 8) || (targetDrift >= 6 && targetDrift <= 15)) return "Watch";
  return "Compliant";
}

function ActualVsBar({ item, compliance }: { item: PayerControlItem; compliance: Compliance }) {
  const barColor =
    compliance === "Flagged"
      ? "var(--oc-critical)"
      : compliance === "Watch"
      ? "var(--oc-warning)"
      : "var(--oc-normal)";
  const actual = (item.actual_collection_rate ?? 0) * 100;
  const contract = (item.contract_rate_pct ?? 1) * 100;
  const pct = Math.min(100, (actual / contract) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 13 }}>{actual.toFixed(1)}%</span>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(31, 56, 100, 0.06)", width: 56 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function GapCell({ item }: { item: PayerControlItem }) {
  const gap = ((item.contract_rate_pct ?? 0) - (item.actual_collection_rate ?? 0)) * 100;
  const color = gap > 5 ? "var(--oc-critical)" : gap >= 3 ? "var(--oc-warning)" : "var(--oc-normal)";
  return <span style={{ color, fontWeight: 500 }}>{`-${gap.toFixed(1)}pp`}</span>;
}

export function PayerControl() {
  const { data, loading, error, stale, refetch } = useRCMFetch<PayerControlPayload>("payer-control");

  const items = data?.items ?? [];
  const summary = data?.summary;

  const flaggedCount = items.filter((item) => getCompliance(item) === "Flagged").length;
  const watchCount = items.filter((item) => getCompliance(item) === "Watch").length;
  const medicarePayer = (id?: string | null) =>
    (id ?? "").toLowerCase().includes("mcr") || (id ?? "").toLowerCase().includes("medicare");

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--oc-gray-900)" }}>
      <RCMPageHeader
        title="Insurance Performance"
        subtitle="Insurer contract compliance, underpayment tracking, and missed payment target monitoring."
      />
      <RCMNavTabs active="payer-control" />

      {stale && <StaleBanner />}

      <KPIGrid
        items={[
          { label: "TOTAL UNDERPAYMENT", value: currencyCompact(summary?.total_underpayment) },
          {
            label: "MISSED PAYMENT TARGETS",
            value: String(summary?.sla_breaches ?? 0),
            sub: "Across active insurer contracts",
          },
          {
            label: "COMPLIANCE STATUS",
            value: `${flaggedCount} flagged · ${watchCount} watch`,
            sub: `of ${items.length} contracted insurers`,
          },
        ]}
      />

      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Insurance performance appears once contract performance marts are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && items.length > 0 && (
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
                  {[
                    "Insurer",
                    "Underpayment",
                    "Contract Rate",
                    "Actual vs Contract",
                    "Gap",
                    "Missed Targets",
                    "Payment Delay",
                    "Compliance",
                    "Action",
                  ].map((label) => (
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
                {items.map((item, index) => {
                  const compliance = getCompliance(item);
                  const isMedicare = medicarePayer(item.payer_id);
                  const targetMissed = (item.actual_payment_days ?? 0) > (item.payment_sla_days ?? 0);
                  const actionLabel =
                    compliance === "Flagged"
                      ? "Escalation letter"
                      : compliance === "Watch"
                      ? "Schedule review"
                      : "View contract";

                  return (
                    <tr
                      key={item.payer_id ?? index}
                      style={{
                        borderBottom:
                          index < items.length - 1 ? "1px solid rgba(31, 56, 100, 0.06)" : "none",
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {payerLabel(item.payer_id)}
                        {isMedicare && <sup style={{ color: "var(--oc-gray-600)", fontSize: 9 }}>†</sup>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{currency(item.underpayment_amount)}</td>
                      <td style={{ padding: "10px 12px" }}>{percentFromRatio(item.contract_rate_pct)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <ActualVsBar item={item} compliance={compliance} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <GapCell item={item} />
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: (item.sla_breach_count ?? 0) > 0 ? "var(--oc-critical)" : "var(--oc-normal)",
                          fontWeight: (item.sla_breach_count ?? 0) > 0 ? 600 : 400,
                        }}
                      >
                        {item.sla_breach_count ?? 0}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ color: targetMissed ? "var(--oc-critical)" : "var(--oc-gray-900)" }}>
                          {`${item.actual_payment_days ?? "-"}d actual vs ${item.payment_sla_days ?? "-"}d target${
                            targetMissed ? " !" : " OK"
                          }`}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <FlagPill status={compliance} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          style={{
                            padding: "4px 10px",
                            borderRadius: 10,
                            border:
                              compliance === "Flagged" ? "none" : "1px solid rgba(31, 56, 100, 0.08)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                            background:
                              compliance === "Flagged" ? "var(--oc-navy)" : "rgba(255,255,255,0.92)",
                            color:
                              compliance === "Flagged" ? "var(--oc-blue-light)" : "var(--oc-gray-900)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: "var(--oc-gray-600)", marginTop: 10 }}>
            † Medicare reimbursement follows federal fee schedules. Gap reflects policy adjustments only.
          </p>
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
          Average payment days: 38d OK (target 40d)
        </span>
      </div>
    </div>
  );
}
