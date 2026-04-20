import { getApiJson } from "@/lib/api";

export async function AnomalyAlerts({ severity }: { severity?: string }) {
  const [summary, anomalies] = await Promise.all([
    getApiJson<{
      summary?: { critical: number; warning: number; info: number };
      total?: number;
    }>({
      path: "/api/v1/anomalies/summary",
      fallback: { summary: { critical: 0, warning: 0, info: 0 }, total: 0 },
    }),
    getApiJson<{
      items?: Array<{
        ward_id: string;
        department_name?: string;
        event_date: string;
        anomaly_type: string;
        severity: string;
        occupancy_rate: number | null;
        z_score: number | null;
        threshold_breached: string;
      }>;
    }>({
      path: `/api/v1/anomalies${severity ? `?severity=${encodeURIComponent(severity)}` : ""}`,
      fallback: { items: [] },
    }),
  ]);

  const filters = [
    { key: "all", label: "All", href: "/anomalies" },
    { key: "critical", label: `Critical (${summary.summary?.critical ?? 0})`, href: "/anomalies?severity=critical" },
    { key: "warning", label: `Warning (${summary.summary?.warning ?? 0})`, href: "/anomalies?severity=warning" },
  ];

  const activeFilter = severity ?? "all";

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Alert Summary</p>
          <h3>{summary.total ?? 0} active alerts</h3>
        </div>
        <div className="filter-row">
          {filters.map((filter) => (
            <a
              key={filter.key}
              href={filter.href}
              className={filter.key === activeFilter ? "filter-chip active" : "filter-chip"}
            >
              {filter.label}
            </a>
          ))}
        </div>
      </div>
      <table className="table anomaly-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Ward</th>
            <th>Date</th>
            <th>Type</th>
            <th>Occupancy</th>
            <th>Z-Score</th>
            <th>Threshold Breached</th>
          </tr>
        </thead>
        <tbody>
          {(anomalies.items ?? []).map((item) => (
            <tr key={`${item.ward_id}-${item.event_date}-${item.anomaly_type}`} className={`severity-${item.severity}`}>
              <td>{item.severity}</td>
              <td>{item.department_name ?? item.ward_id}</td>
              <td>{item.event_date}</td>
              <td>{item.anomaly_type}</td>
              <td>{item.occupancy_rate?.toFixed(1) ?? "n/a"}%</td>
              <td>{item.z_score?.toFixed(3) ?? "n/a"}</td>
              <td>{item.threshold_breached}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
