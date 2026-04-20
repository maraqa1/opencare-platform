import { getApiJson } from "@/lib/api";

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export async function ForecastView({ selectedWardId }: { selectedWardId?: string }) {
  const occupancy = await getApiJson<{
    items?: Array<{ ward_id: string; ward_name: string }>;
  }>({
    path: "/api/v1/occupancy/current",
    fallback: { items: [] },
  });

  const resolvedWardId = selectedWardId ?? occupancy.items?.[0]?.ward_id;
  const forecast = await getApiJson<{
    items?: Array<{
      ward_id: string;
      department_name?: string;
      forecast_date: string;
      predicted_occupancy: number;
      lower_ci_95: number | null;
      upper_ci_95: number | null;
      occupancy_rate: number | null;
      breach_risk: boolean;
    }>;
  }>({
    path: `/api/v1/forecast?days=7${resolvedWardId ? `&ward_id=${encodeURIComponent(resolvedWardId)}` : ""}`,
    fallback: { items: [] },
  });

  const wardName = forecast.items?.[0]?.department_name ?? occupancy.items?.find((item) => item.ward_id === resolvedWardId)?.ward_name;
  const breachRisk = (forecast.items ?? []).some((item) => item.breach_risk);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ward Selector</p>
          <h3>{wardName ?? "Select a ward"}</h3>
        </div>
        <form className="selector-form" method="get" action="/forecast">
          <label htmlFor="ward" className="subtle">
            Ward
          </label>
          <select id="ward" name="ward" defaultValue={resolvedWardId}>
            {(occupancy.items ?? []).map((item) => (
              <option key={item.ward_id} value={item.ward_id}>
                {item.ward_name}
              </option>
            ))}
          </select>
          <button type="submit" className="button primary">
            Load
          </button>
        </form>
      </div>
      {breachRisk ? (
        <div className="callout critical">
          Consider pre-emptive action: move patients, request surge beds, escalate.
        </div>
      ) : null}
      <div className="forecast-chart">
        {(forecast.items ?? []).map((item) => {
          const width = Math.max(8, Math.min(100, item.occupancy_rate ? item.occupancy_rate * 100 : 0));
          return (
            <div className="forecast-row" key={`${item.ward_id}-${item.forecast_date}`}>
              <div>
                <strong>{item.forecast_date}</strong>
                <p className="subtle">
                  Predicted occupancy {item.predicted_occupancy.toFixed(1)} | CI {item.lower_ci_95?.toFixed(1) ?? "n/a"} - {item.upper_ci_95?.toFixed(1) ?? "n/a"}
                </p>
              </div>
              <div className="chart-bar-track">
                <span className="chart-bar" style={{ width: `${width}%` }} />
              </div>
              <span className="subtle">{formatPercent(item.occupancy_rate)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
