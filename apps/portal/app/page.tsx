import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export default async function HomePage() {
  const [occupancy, forecasts, anomalies] = await Promise.all([
    getApiJson<{
      summary?: { critical: number; warning: number; normal: number };
      items?: Array<{ occupancy_rate: number }>;
    }>({
      path: "/api/v1/occupancy/current",
      fallback: { summary: { critical: 0, warning: 0, normal: 0 }, items: [] },
    }),
    getApiJson<{ horizon_days?: number; items?: Array<unknown> }>({
      path: "/api/v1/forecast",
      fallback: { horizon_days: 7, items: [] },
    }),
    getApiJson<{ total?: number }>({
      path: "/api/v1/anomalies/summary",
      fallback: { total: 0 },
    }),
  ]);

  const averageOccupancy =
    (occupancy.items ?? []).length > 0
      ? (
          (occupancy.items ?? []).reduce((total, row) => total + row.occupancy_rate, 0) /
          (occupancy.items ?? []).length
        ).toFixed(1)
      : "0.0";

  return (
    <PageFrame
      title="Single-tenant intelligence for bed occupancy decisions"
      description="The portal brings together live occupancy trends, forecast signals, anomaly detection, reports, and governed terminology through the backend API."
      chips={[
        { label: "Analytics schema governed", tone: "primary" },
        { label: "Config-driven use cases", tone: "accent" },
      ]}
    >
      <section className="grid">
        <article className="stat span-4">
          <p className="eyebrow">Current Occupancy</p>
          <p className="value">{averageOccupancy}%</p>
          <p className="subtle">Average across live ward occupancy cards.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Forecast Horizon</p>
          <p className="value">{forecasts.horizon_days ?? 7} Days</p>
          <p className="subtle">Refreshed after each runtime and dbt cycle.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Open Alerts</p>
          <p className="value">{anomalies.total ?? 0}</p>
          <p className="subtle">Active anomaly signals requiring review.</p>
        </article>
        <article className="panel span-8">
          <p className="eyebrow">Portal Scope</p>
          <ul className="list">
            <li>Customer access to occupancy, forecasts, anomalies, reports, and dictionary views.</li>
            <li>Embedded analytics stay behind the portal rather than becoming the primary UI.</li>
            <li>Operational health and runtime coordination are separated into admin views.</li>
          </ul>
        </article>
        <article className="panel span-4">
          <p className="eyebrow">Environment Contract</p>
          <p className="subtle">
            Portal → backend → governed analytics, outputs, Airbyte, and storage.
          </p>
          <p className="subtle">
            Critical wards: {occupancy.summary?.critical ?? 0} | Warning wards: {occupancy.summary?.warning ?? 0}
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
