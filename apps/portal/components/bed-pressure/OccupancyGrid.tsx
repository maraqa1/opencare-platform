import { getApiJson } from "@/lib/api";

function percent(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : `${value.toFixed(1)}%`;
}

export async function OccupancyGrid() {
  const payload = await getApiJson<{
    summary?: { critical: number; warning: number; normal: number };
    items?: Array<{
      ward_id: string;
      ward_name: string;
      occupancy_rate: number;
      occupied_beds: number;
      staffed_beds: number;
      avg_7d_occupancy: number;
      admissions_today: number;
      discharges_today: number;
      status: string;
    }>;
  }>({
    path: "/api/v1/occupancy/current",
    fallback: { summary: { critical: 0, warning: 0, normal: 0 }, items: [] },
  });

  return (
    <>
      <section className="summary-badges">
        <span className="summary-badge critical">
          {payload.summary?.critical ?? 0} Critical
        </span>
        <span className="summary-badge warning">
          {payload.summary?.warning ?? 0} Warning
        </span>
        <span className="summary-badge normal">{payload.summary?.normal ?? 0} Normal</span>
      </section>
      <section className="card-grid">
        {(payload.items ?? []).map((item) => (
          <article className={`ward-card ${item.status}`} key={item.ward_id}>
            <div className="ward-card-header">
              <div>
                <p className="eyebrow">Ward</p>
                <h3>{item.ward_name}</h3>
              </div>
              <span className="status-pill">{item.status}</span>
            </div>
            <p className="ward-rate">{percent(item.occupancy_rate)}</p>
            <p className="subtle">
              {item.occupied_beds} occupied / {item.staffed_beds} staffed beds
            </p>
            <dl className="metric-list">
              <div>
                <dt>7d average</dt>
                <dd>{percent(item.avg_7d_occupancy)}</dd>
              </div>
              <div>
                <dt>Admissions today</dt>
                <dd>{item.admissions_today}</dd>
              </div>
              <div>
                <dt>Discharges today</dt>
                <dd>{item.discharges_today}</dd>
              </div>
            </dl>
            <a className="inline-link" href={`/forecast?ward=${encodeURIComponent(item.ward_id)}`}>
              View Forecast →
            </a>
          </article>
        ))}
      </section>
    </>
  );
}
