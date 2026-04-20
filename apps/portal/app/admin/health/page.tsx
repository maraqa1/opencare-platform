import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export default async function AdminHealthPage() {
  const health = await getApiJson<{
    status?: string;
    checks?: Array<{ name: string; healthy: boolean; endpoint: string }>;
  }>({
    path: "/api/v1/admin/health",
    fallback: { status: "degraded", checks: [] },
  });

  return (
    <PageFrame
      title="Platform Health"
      description="Connectivity checks for PostgreSQL, Redis, MinIO, and Superset from the backend service."
      chips={[
        { label: "Backend verified", tone: "primary" },
        { label: "Ops-ready", tone: "accent" },
      ]}
    >
      <section className="status-grid">
        {(health.checks ?? []).map((service) => (
          <article className="status-card" key={service.name}>
            <div className="status">
              <span className="status-dot" />
              {service.healthy ? "Healthy" : "Degraded"}
            </div>
            <h3>{service.name}</h3>
            <p className="subtle">{service.endpoint}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
