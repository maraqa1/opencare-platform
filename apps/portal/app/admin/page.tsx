import { PageFrame } from "@/components/page-frame";

export default function AdminHomePage() {
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
          <p className="value">2</p>
          <p className="subtle">Forecast and anomaly runtimes tracked in-platform.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Core Services</p>
          <p className="value">5</p>
          <p className="subtle">Database, storage, cache, identity, and embedded analytics.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Refresh Pipelines</p>
          <p className="value">3</p>
          <p className="subtle">Ingestion, transformation, and dashboard refresh status.</p>
        </article>
      </section>
    </PageFrame>
  );
}
