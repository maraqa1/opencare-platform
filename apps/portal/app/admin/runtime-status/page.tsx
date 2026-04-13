import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { runtimeStatusRows } from "@/lib/site-data";

export default async function RuntimeStatusPage() {
  const runtimeStatus = await getApiJson<{
    runtimes?: Array<{
      name: string;
      reads_from: string;
      writes_to: string;
    }>;
  }>({
    path: "/api/status/runtime",
    fallback: { runtimes: [] },
  });

  const rows =
    (runtimeStatus.runtimes ?? []).map((runtime) => ({
      runtime: runtime.name,
      schema: runtime.reads_from,
      output: runtime.writes_to,
    })) || [];

  return (
    <PageFrame
      title="Runtime Status"
      description="Operational status for the forecast and anomaly runtimes."
      chips={[
        { label: "Analytics schema reads", tone: "primary" },
        { label: "Managed outputs", tone: "accent" },
      ]}
    >
      <section className="status-grid">
        {(rows.length > 0 ? rows : runtimeStatusRows).map((runtime) => (
          <article className="status-card" key={runtime.runtime}>
            <div className="status">
              <span className="status-dot" />
              Healthy
            </div>
            <h3>{runtime.runtime}</h3>
            <p className="subtle">Reads from {runtime.schema}</p>
            <p>Writes to {runtime.output}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
