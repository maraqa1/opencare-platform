import { getApiJson } from "@/lib/api";

export async function EmbeddedDashboard({
  dashboard,
}: {
  dashboard: { id: string; title: string; useCase: string };
}) {
  const payload = await getApiJson<{
    embed_url?: string;
    superset_url?: string;
  }>({
    path: `/api/v1/superset/embed-token?dashboard_id=${encodeURIComponent(dashboard.id)}`,
    fallback: {},
  });

  return (
    <section className="panel dashboard-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{dashboard.useCase}</p>
          <h3>{dashboard.title}</h3>
        </div>
        <div className="button-row">
          <a className="button secondary" href={payload.embed_url ?? "#"} target="_blank" rel="noreferrer">
            View Full Dashboard
          </a>
          <a className="button secondary" href="/reports">
            Download Report
          </a>
        </div>
      </div>
      {payload.embed_url ? (
        <iframe
          className="dashboard-frame"
          title={dashboard.title}
          src={payload.embed_url}
          loading="lazy"
        />
      ) : (
        <p className="subtle">Embedded dashboard is not available right now.</p>
      )}
      <p className="subtle">
        Data Last Updated: sourced through the backend contract and Superset embedding endpoint.
      </p>
    </section>
  );
}
