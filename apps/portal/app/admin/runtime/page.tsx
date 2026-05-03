import type { Metadata } from "next";

import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Runtime Status - OpenCare Portal",
};

export default async function AdminRuntimePage() {
  const runtime = await getApiJson<{
    runtimes?: Array<{
      name: string;
      last_run: string | null;
      row_count: number;
      reads_from: string;
      writes_to: string;
    }>;
  }>({
    path: "/api/v1/admin/runtime-status",
    fallback: { runtimes: [] },
  });

  return (
    <PageFrame
      title="Runtime Status"
      description="Latest forecast and anomaly runtime runs, row counts, and governed read/write contracts."
      chips={[
        { label: "Phase 2 outputs live", tone: "primary" },
        { label: "Operational timestamps", tone: "accent" },
      ]}
    >
      <section className="item-grid">
        {(runtime.runtimes ?? []).map((item) => {
          const isLive = Boolean(item.last_run) && item.row_count > 0;

          return (
            <article className="status-card" key={item.name}>
              <div className="status">
                <span className={`status-dot${isLive ? "" : " degraded"}`} />
                {isLive ? "Live" : "No data"}
              </div>
              <h3>{item.name}</h3>
              <p className="subtle">Last run: {item.last_run ?? "Unavailable"}</p>
              <p className="subtle">Rows: {item.row_count.toLocaleString()}</p>
              <p>Reads from {item.reads_from}</p>
              <p>Writes to {item.writes_to}</p>
            </article>
          );
        })}
        {(runtime.runtimes ?? []).length === 0 ? (
          <p className="subtle" style={{ textAlign: "center", padding: "16px 0" }}>
            Runtime data unavailable.
          </p>
        ) : null}
      </section>
    </PageFrame>
  );
}
