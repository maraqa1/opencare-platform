import { KPISummaryBar } from "@/components/KPISummaryBar";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export default async function HomePage() {
  const [runtime, health, dashboards] = await Promise.all([
    getApiJson<{
      runtimes?: Array<{ name: string; last_run?: string | null; row_count?: number }>;
    }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
    getApiJson<{
      checks?: Array<{ name: string; healthy: boolean }>;
    }>({
      path: "/api/v1/admin/health",
      fallback: { checks: [] },
    }),
    getApiJson<{
      items?: Array<{ title?: string; dashboard_id?: string }>;
    }>({
      path: "/api/v1/superset/dashboards",
      fallback: { items: [] },
    }),
  ]);

  return (
    <PageFrame
      eyebrow="Operations Director View"
      title="Investor-grade command centre for hospital capacity decisions"
      description="OpenCare combines live pipeline health, board-ready analytics, and extensible use-case architecture in a portal experience designed for daily operational use."
      chips={[
        { label: "Board meeting ready", tone: "primary" },
        { label: "Platform extensibility visible", tone: "accent" },
      ]}
      actions={[
        <a key="occupancy" className="button primary" href="/occupancy">
          Launch Bed Pressure View
        </a>,
        <a key="admin" className="secondary-link" href="/admin">
          Review Platform Status
        </a>,
      ]}
    >
      <KPISummaryBar />
      <section className="operations-grid">
        <article className="stat">
          <p className="eyebrow">Runtime Coverage</p>
          <p className="value">{runtime.runtimes?.length ?? 0}</p>
          <p className="section-subtitle">
            Forecast and anomaly jobs are live, timestamped, and surfaced directly to the portal.
          </p>
        </article>
        <article className="stat">
          <p className="eyebrow">Platform Health</p>
          <p className="value">
            {(health.checks ?? []).filter((item) => item.healthy).length}/{health.checks?.length ?? 0}
          </p>
          <p className="section-subtitle">
            Core services for data, cache, storage, and analytics are health-checked through the backend.
          </p>
        </article>
        <article className="stat">
          <p className="eyebrow">Analytics Dashboards</p>
          <p className="value">{dashboards.items?.length ?? 0}</p>
          <p className="section-subtitle">
            Embedded executive analytics stay behind the portal rather than becoming a separate user journey.
          </p>
        </article>
      </section>
      <section className="grid">
        <article className="panel span-8">
          <p className="eyebrow">Five-minute Investor Story</p>
          <h3>Problem, prediction, alert, board view, extensibility</h3>
          <p className="section-subtitle">
            Start with critical wards, move into breach forecasting, surface anomaly signals, then land
            in the analytics tab to show executive trend analysis and export-ready reporting.
          </p>
        </article>
        <article className="panel span-4">
          <p className="eyebrow">Extensibility</p>
          <h3>Config-first use cases</h3>
          <p className="section-subtitle">
            Bed pressure is live now. Additional use cases can be introduced through governed config,
            dbt metadata, and synced analytics dashboards rather than a portal rebuild.
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
