import { getApiJson } from "@/lib/api";
import { currencyCompact, percentFromRatio } from "@/lib/format";
import type { GovernanceKpi } from "@/lib/governance-registry";

type OccupancyResponse = {
  summary?: {
    critical?: number;
    warning?: number;
    normal?: number;
  };
  items?: Array<{
    department_name?: string;
    ward_name?: string;
    occupancy_rate?: number | null;
    status?: string | null;
  }>;
};

type RevenueCycleSummaryResponse = {
  as_of?: string | null;
  cash_at_risk?: number | null;
  recoverable_cash_7d?: number | null;
  expected_collections?: number | null;
  contract_breaches?: number | null;
  queue_items?: number | null;
};

export type GovernanceKpiRuntime = {
  value: string;
  periodLabel: string;
  supportingLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  summary: string;
};

export async function getGovernanceKpiRuntime(kpi: GovernanceKpi): Promise<GovernanceKpiRuntime> {
  if (kpi.useCaseId === "bed_pressure") {
    const occupancy = await getApiJson<OccupancyResponse>({
      path: "/api/v1/occupancy/current",
      fallback: { summary: {}, items: [] },
    });
    const worstWard =
      (occupancy.items ?? []).reduce<{
        department_name?: string;
        ward_name?: string;
        occupancy_rate?: number | null;
      } | null>((currentWorst, item) => {
        if (!currentWorst) {
          return item;
        }
        return (item.occupancy_rate ?? 0) > (currentWorst.occupancy_rate ?? 0)
          ? item
          : currentWorst;
      }, null) ?? null;

    const criticalCount = occupancy.summary?.critical ?? 0;
    const warningCount = occupancy.summary?.warning ?? 0;
    const wardName = worstWard?.department_name ?? worstWard?.ward_name ?? "No live ward";
    const value =
      worstWard?.occupancy_rate != null
        ? percentFromRatio(worstWard.occupancy_rate)
        : "Not yet instrumented";

    return {
      value,
      periodLabel: "Current worst ward occupancy",
      supportingLabel: wardName,
      changeLabel: `${criticalCount} critical | ${warningCount} warning`,
      freshnessLabel: "Live occupancy snapshot",
      summary:
        criticalCount + warningCount > 0
          ? `Operational pressure is concentrated in ${wardName}, with ${criticalCount} critical and ${warningCount} warning wards in the current snapshot.`
          : "No current occupancy pressure spikes are flagged in the live snapshot.",
    };
  }

  const summary = await getApiJson<RevenueCycleSummaryResponse>({
    path: "/api/v1/revenue-cycle/summary",
    fallback: {},
  });

  return {
    value:
      summary.cash_at_risk != null
        ? currencyCompact(summary.cash_at_risk)
        : "Not yet instrumented",
    periodLabel: "Current cash-at-risk view",
    supportingLabel:
      summary.recoverable_cash_7d != null
        ? `${currencyCompact(summary.recoverable_cash_7d)} recoverable in 7 days`
        : "Recoverable window not yet instrumented",
    changeLabel:
      summary.contract_breaches != null || summary.queue_items != null
        ? `${summary.contract_breaches ?? 0} contract breaches | ${summary.queue_items ?? 0} queue items`
        : "Queue and breach telemetry not yet instrumented",
    freshnessLabel: summary.as_of ? `As of ${summary.as_of}` : "Not yet instrumented",
    summary:
      summary.expected_collections != null
        ? `Expected collections are ${currencyCompact(summary.expected_collections)} with the current risk view centered on at-risk cash and recovery capacity.`
        : "Executive cash-command telemetry is not yet fully instrumented for this KPI.",
  };
}
