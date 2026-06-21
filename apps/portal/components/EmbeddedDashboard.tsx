import { getApiJson } from "@/lib/api";

export async function EmbeddedDashboard({
  dashboard,
  backHref = "/occupancy?tab=occupancy",
  backLabel = "Back to Occupancy",
  reportHref = "/api/v1/reports/export/forecast",
  reportLabel = "Download Report",
}: {
  dashboard: { id: string; title: string; useCase: string };
  backHref?: string;
  backLabel?: string;
  reportHref?: string;
  reportLabel?: string;
}) {
  const [embedPayload, runtimePayload] = await Promise.all([
    getApiJson<{
      embed_url?: string;
      superset_url?: string;
    }>({
      path: `/api/v1/superset/embed-token?dashboard_id=${encodeURIComponent(dashboard.id)}`,
      fallback: {},
    }),
    getApiJson<{
      runtimes?: Array<{
        name: string;
        last_run?: string | null;
      }>;
    }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
  ]);

  const forecastRuntime = (runtimePayload.runtimes ?? []).find((runtime) => runtime.name === "forecast");

  return (
    <section className="dashboard-shell">
      <div className="dashboard-toolbar">
        <div className="analytics-copy">
          <p className="eyebrow">Analytics Dashboard</p>
          <h3>{dashboard.title}</h3>
          <p>
            Operations Director view for board reporting, trend interrogation, and ward-level
            comparisons without leaving the portal.
          </p>
        </div>
        <div className="button-row">
          <a className="secondary-link" href={backHref}>
            {backLabel}
          </a>
          <a className="secondary-link" href={reportHref}>
            {reportLabel}
          </a>
          <a
            className="button primary"
            href={embedPayload.embed_url ?? "#"}
            target="_blank"
            rel="noreferrer"
          >
            Full Dashboard
          </a>
        </div>
      </div>

      <div className="analytics-actions">
        <article className="analytics-action-card">
          <p className="eyebrow">Filter Story</p>
          <strong>Ward and Date Range</strong>
          <p className="section-subtitle">
            The embedded board view can isolate a ward cluster or compress the decision window to
            the last 7, 14, 30, or 90 days.
          </p>
        </article>
        <article className="analytics-action-card">
          <p className="eyebrow">Chart Set</p>
          <strong>Three Executive Views</strong>
          <p className="section-subtitle">
            Trend, comparison, and admissions versus discharges stay aligned to the same governed
            analytics contract.
          </p>
        </article>
        <article className="analytics-action-card">
          <p className="eyebrow">Refresh</p>
          <strong className="mono">{forecastRuntime?.last_run ?? "Pending"}</strong>
          <p className="section-subtitle">
            Data is powered by analytics.fct_bed_occupancy and refreshed on the runtime schedule.
          </p>
        </article>
      </div>

      {embedPayload.embed_url ? (
        <iframe
          className="dashboard-frame"
          title={dashboard.title}
          src={embedPayload.embed_url}
          loading="lazy"
        />
      ) : (
        <div className="empty-state">Embedded analytics are not available right now.</div>
      )}

      <p className="dashboard-footer">
        Data powered by <code>analytics.fct_bed_occupancy</code>. Last updated{" "}
        <span className="mono">{forecastRuntime?.last_run ?? "pending"}</span> with an hourly
        refresh cycle.
      </p>
    </section>
  );
}
