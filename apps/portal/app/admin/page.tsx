import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export default async function AdminHomePage() {
  const [health, ingestion, runtime] = await Promise.all([
    getApiJson<{ checks?: Array<unknown> }>({
      path: "/api/v1/admin/health",
      fallback: { checks: [] },
    }),
    getApiJson<{ tables?: Array<unknown> }>({
      path: "/api/v1/admin/ingestion-status",
      fallback: { tables: [] },
    }),
    getApiJson<{ runtimes?: Array<unknown> }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
  ]);

  return (
    <PageFrame
      title="Admin Home"
      description="Administrative oversight for runtime health, refresh cadence, platform services, and terminology stewardship."
      chips={[
        { label: "Operational visibility", tone: "primary" },
        { label: "Single-tenant controls", tone: "accent" },
      ]}
    >
      <section className="grid">
        <article className="stat span-4">
          <p className="eyebrow">Runtime Jobs</p>
          <p className="value">{runtime.runtimes?.length ?? 0}</p>
          <p className="subtle">Forecast and anomaly runtimes tracked in-platform.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Core Services</p>
          <p className="value">{health.checks?.length ?? 0}</p>
          <p className="subtle">Database, storage, cache, and embedded analytics.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Refresh Pipelines</p>
          <p className="value">{ingestion.tables?.length ?? 0}</p>
          <p className="subtle">Live ingestion tables tracked through the backend.</p>
        </article>
      </section>
    </PageFrame>
  );
}
