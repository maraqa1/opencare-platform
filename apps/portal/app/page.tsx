import { PageFrame } from "@/components/page-frame";

export default function HomePage() {
  return (
    <PageFrame
      title="Single-tenant intelligence for bed occupancy decisions"
      description="The customer portal brings together occupancy trends, forecast signals, anomaly detection, reports, and governed terminology without exposing raw warehouse tables or external tools directly."
      chips={[
        { label: "Analytics schema governed", tone: "primary" },
        { label: "Portal-first experience", tone: "accent" },
      ]}
    >
      <section className="grid">
        <article className="stat span-4">
          <p className="eyebrow">Current Occupancy</p>
          <p className="value">87%</p>
          <p className="subtle">Average across tracked inpatient departments.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Forecast Horizon</p>
          <p className="value">7 Days</p>
          <p className="subtle">Refreshed after each runtime and dbt cycle.</p>
        </article>
        <article className="stat span-4">
          <p className="eyebrow">Open Alerts</p>
          <p className="value">2</p>
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
            One backend, one analytics schema, and one storage contract across platform services.
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
