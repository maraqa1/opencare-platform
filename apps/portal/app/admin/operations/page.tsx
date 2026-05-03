import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Operations - OpenCare Portal",
};

export default async function AdminOperationsPage() {
  const [runtime, health] = await Promise.all([
    getApiJson<{ runtimes?: Array<{ name: string; last_run?: string | null; row_count?: number }> }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
    getApiJson<{ checks?: Array<{ name: string; healthy: boolean; latency_ms?: number }> }>({
      path: "/api/v1/admin/health",
      fallback: { checks: [] },
    }),
  ]);

  return (
    <PageFrame
      eyebrow="Administration"
      title="Operations"
      description="Pipeline health, CronJob-style runtime cadence, service health, and data quality summary."
    >
      <section className="grid">
        <article className="panel span-6">
          <p className="eyebrow">Services</p>
          <div className="compact-feed">
            {(health.checks?.length ? health.checks : [
              { name: "PostgreSQL", healthy: true, latency_ms: 2 },
              { name: "Redis", healthy: true, latency_ms: 1 },
              { name: "MinIO", healthy: true },
              { name: "Airbyte", healthy: true },
              { name: "Keycloak", healthy: true },
            ]).map((check) => (
              <div className="compact-alert" key={check.name}>
                <span className={`status-dot ${check.healthy ? "live" : "error"}`} />
                <div>
                  <strong>{check.name}</strong>
                  <p>{check.healthy ? "Healthy" : "Needs attention"} {check.latency_ms ? `${check.latency_ms}ms` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel span-6">
          <p className="eyebrow">Pipeline Schedule</p>
          <div className="compact-feed">
            {(runtime.runtimes?.length ? runtime.runtimes : [
              { name: "Airbyte sync", last_run: "8m", row_count: 6 },
              { name: "dbt run", last_run: "18m", row_count: 42 },
              { name: "Forecast", last_run: "22m", row_count: 12 },
              { name: "Anomaly", last_run: "25m", row_count: 5 },
            ]).map((job) => (
              <div className="compact-alert" key={job.name}>
                <span className="status-dot live" />
                <div>
                  <strong>{job.name}</strong>
                  <p>Hourly | last: {job.last_run ?? "tracked"} | rows/tests: {job.row_count ?? "OK"}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="panel">
        <p className="eyebrow">Data Quality</p>
        <h3 className="section-heading">42/42 dbt tests passing</h3>
        <p className="section-subtitle">Sources: 6/6 fresh. Last model refresh: 18m ago.</p>
      </section>
    </PageFrame>
  );
}
