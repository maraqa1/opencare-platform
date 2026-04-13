import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { platformHealthRows } from "@/lib/site-data";

export default async function PlatformHealthPage() {
  const platformHealth = await getApiJson<{
    services?: Array<{
      name: string;
      endpoint: string;
      healthy: boolean;
    }>;
  }>({
    path: "/api/status/platform",
    fallback: { services: [] },
  });

  const rows =
    (platformHealth.services ?? []).map((service) => ({
      service: service.name,
      endpoint: service.endpoint,
      state: service.healthy ? "Healthy" : "Degraded",
    })) || [];

  return (
    <PageFrame
      title="Platform Health"
      description="Core service health summary for the single-VM deployment footprint."
      chips={[
        { label: "K3s footprint", tone: "primary" },
        { label: "Health checks ready", tone: "accent" },
      ]}
    >
      <section className="status-grid">
        {(rows.length > 0 ? rows : platformHealthRows).map((service) => (
          <article className="status-card" key={service.service}>
            <div className="status">
              <span className="status-dot" />
              {service.state}
            </div>
            <h3>{service.service}</h3>
            <p className="subtle">{service.endpoint}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
