"use client";

import { useRCMFetch }   from "../useRCMFetch";
import { RCMNavTabs }    from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { KPIGrid }       from "../layout/KPIGrid";
import { FlagPill }      from "../shared/FlagPill";
import { LoadingView, ErrorView, EmptyView, StaleBanner } from "../shared/ViewStates";
import type { PayerControlPayload, PayerControlItem } from "../types";
import { currency, currencyCompact, percentFromRatio } from "@/lib/format";
import { payerLabel } from "@/lib/displayNames";

type Compliance = "Flagged" | "Watch" | "Compliant";

function getCompliance(item: PayerControlItem): Compliance {
  const gap      = ((item.contract_rate_pct ?? 0) - (item.actual_collection_rate ?? 0)) * 100;
  const slaDrift = (item.actual_payment_days ?? 0) - (item.payment_sla_days ?? 0);
  if (gap > 8 || slaDrift > 15) return "Flagged";
  if ((gap >= 4 && gap <= 8) || (slaDrift >= 6 && slaDrift <= 15)) return "Watch";
  return "Compliant";
}

function ActualVsBar({ item, compliance }: { item: PayerControlItem; compliance: Compliance }) {
  const barColor = compliance === "Flagged" ? "#c0392b" : compliance === "Watch" ? "#b7600a" : "#4a7c1f";
  const actual   = (item.actual_collection_rate ?? 0) * 100;
  const contract = (item.contract_rate_pct ?? 1) * 100;
  const pct      = Math.min(100, (actual / contract) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 12 }}>{actual.toFixed(1)}%</span>
      <div style={{ height: 3, borderRadius: 2, background: "#f0ede6", width: 56 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function GapCell({ item }: { item: PayerControlItem }) {
  const gap = ((item.contract_rate_pct ?? 0) - (item.actual_collection_rate ?? 0)) * 100;
  const color = gap > 5 ? "#c0392b" : gap >= 3 ? "#b7600a" : "#4a7c1f";
  return <span style={{ color, fontWeight: 500 }}>−{gap.toFixed(1)}pp</span>;
}

export function PayerControl() {
  const { data, loading, error, stale, refetch } =
    useRCMFetch<PayerControlPayload>("payer-control");

  const items   = data?.items ?? [];
  const summary = data?.summary;

  const flaggedCount   = items.filter((i) => getCompliance(i) === "Flagged").length;
  const watchCount     = items.filter((i) => getCompliance(i) === "Watch").length;
  const medicarePayer  = (id?: string | null) => (id ?? "").toLowerCase().includes("mcr") || (id ?? "").toLowerCase().includes("medicare");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <RCMPageHeader subtitle="Payer contract compliance, underpayment tracking, and SLA breach monitoring." />
      <RCMNavTabs active="payer-control" />

      {stale && <StaleBanner />}

      <KPIGrid items={[
        { label: "TOTAL UNDERPAYMENT",  value: currencyCompact(summary?.total_underpayment) },
        { label: "SLA BREACHES",        value: String(summary?.sla_breaches ?? 0), sub: "Across active payer contracts" },
        { label: "COMPLIANCE STATUS",   value: `${flaggedCount} flagged · ${watchCount} watch`, sub: `of ${items.length} contracted payers` },
      ]} />

      {loading && <LoadingView />}
      {error   && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && (
        <EmptyView message={data.meta.message ?? "Payer control appears once contract performance marts are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && items.length > 0 && (
        <>
          <div style={{ background: "#ffffff", border: "0.5px solid #e5e3dc", borderRadius: 10, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #f0ede6" }}>
                  {["Payer", "Underpayment", "Contract Rate", "Actual vs Contract", "Gap", "SLA Breaches", "Payment Delay", "Compliance", "Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 500, textTransform: "uppercase", color: "#999", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const compliance = getCompliance(item);
                  const isMedicare = medicarePayer(item.payer_id);
                  const slaBreach  = (item.actual_payment_days ?? 0) > (item.payment_sla_days ?? 0);
                  const actionLabel =
                    compliance === "Flagged" ? "Escalation letter" :
                    compliance === "Watch"   ? "Schedule review"   : "View contract";

                  return (
                    <tr key={item.payer_id ?? i} style={{ borderBottom: i < items.length - 1 ? "0.5px solid #f0ede6" : "none" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {payerLabel(item.payer_id)}
                        {isMedicare && <sup style={{ color: "#888", fontSize: 9 }}>†</sup>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{currency(item.underpayment_amount)}</td>
                      <td style={{ padding: "10px 12px" }}>{percentFromRatio(item.contract_rate_pct)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <ActualVsBar item={item} compliance={compliance} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <GapCell item={item} />
                      </td>
                      <td style={{ padding: "10px 12px", color: (item.sla_breach_count ?? 0) > 0 ? "#c0392b" : "#4a7c1f", fontWeight: (item.sla_breach_count ?? 0) > 0 ? 600 : 400 }}>
                        {item.sla_breach_count ?? 0}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ color: slaBreach ? "#c0392b" : "#1a1a1a" }}>
                          {item.actual_payment_days ?? "—"}d vs SLA {item.payment_sla_days ?? "—"}d{slaBreach ? " ⚠" : " ✓"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <FlagPill status={compliance} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: compliance === "Flagged" ? "none" : "0.5px solid #ddd",
                            fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                            background: compliance === "Flagged" ? "#1a3050" : "#ffffff",
                            color: compliance === "Flagged" ? "#b8d4f0" : "#1a1a1a",
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

          <p style={{ fontSize: 11, color: "#888", marginTop: 10 }}>
            † Medicare reimbursement follows federal fee schedules. Gap reflects sequestration adjustments only.
          </p>
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
