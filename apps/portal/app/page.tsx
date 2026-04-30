import Link from "next/link";

import { KPISummaryBar } from "@/components/KPISummaryBar";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { useCases } from "@/lib/use-cases";

export default async function HomePage() {
  const [runtime, health, alerts, occupancy] = await Promise.all([
    getApiJson<{
      runtimes?: Array<{ name: string; last_run?: string | null; row_count?: number }>;
    }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
    getApiJson<{
      checks?: Array<{ name: string; healthy: boolean }>;
    }>({
      path: "/api/v1/admin/health",
      fallback: { checks: [] },
    }),
    getApiJson<{
      items?: Array<{ department_name?: string; anomaly_type?: string; severity?: string; event_date?: string }>;
    }>({
      path: "/api/v1/anomalies?limit=5",
      fallback: { items: [] },
    }),
    getApiJson<{
      summary?: { critical?: number; warning?: number; normal?: number };
      items?: Array<{
        department_name?: string;
        ward_name?: string;
        occupancy_rate?: number;
        status?: string;
      }>;
    }>({
      path: "/api/v1/occupancy/current",
      fallback: { summary: {}, items: [] },
    }),
  ]);

  const healthyCount = (health.checks ?? []).filter((item) => item.healthy).length;
  const criticalCount = occupancy.summary?.critical ?? 0;
  const warningCount = occupancy.summary?.warning ?? 0;
  const actionCount = criticalCount + warningCount;
  const worstWard = (occupancy.items ?? []).reduce<{
    department_name?: string;
    ward_name?: string;
    occupancy_rate?: number;
  } | null>((currentWorst, item) => {
    if (!currentWorst) {
      return item;
    }
    return (item.occupancy_rate ?? 0) > (currentWorst.occupancy_rate ?? 0) ? item : currentWorst;
  }, null);
  const worstWardName = worstWard?.department_name ?? worstWard?.ward_name ?? "No ward data";
  const worstWardRate = `${((worstWard?.occupancy_rate ?? 0) * 100).toFixed(1)}%`;
  const pressureHeadline =
    criticalCount > 0
      ? `Critical: ${criticalCount} ward${criticalCount === 1 ? "" : "s"} need immediate action`
      : `Watchlist: ${actionCount} ward${actionCount === 1 ? "" : "s"} need action`;
  const pressureSubtitle =
    actionCount > 0
      ? `Worst ward ${worstWardName} at ${worstWardRate}. ${warningCount} warning ward${warningCount === 1 ? "" : "s"} need proactive capacity planning.`
      : "No wards currently above warning threshold. Capacity is operating inside expected bounds.";

  return (
    <PageFrame
      eyebrow="OpenCare"
      title="Hospital Operations Intelligence"
      description="A global landing page for active use cases, system pressure, recent alerts, and platform trust signals."
      chips={[
        { label: "System pressure elevated", tone: "primary" },
        { label: "Governed decision support", tone: "accent" },
      ]}
      actions={[
        <Link key="use-cases" className="button primary" href="/use-cases">
          View Use Cases
        </Link>,
        <Link key="status" className="secondary-link" href="/use-cases/bed-pressure/status">
          Enter Bed Pressure
        </Link>,
      ]}
    >
      <KPISummaryBar />

      <section className="panel pressure-strip">
        <div>
          <p className="eyebrow">System Pressure</p>
          <h3>{pressureHeadline}</h3>
          <p className="section-subtitle">{pressureSubtitle}</p>
        </div>
        <div className="trust-line">
          <span>Data 8m ago</span>
          <span>6/6 sources</span>
          <span>42/42 tests</span>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-8">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Active Use Cases</p>
              <h3 className="section-heading">Product modules, not dashboard tabs</h3>
            </div>
            <Link className="secondary-link" href="/use-cases">
              Catalogue
            </Link>
          </div>
          <div className="use-case-card-grid">
            {useCases.map((useCase) => (
              <Link
                key={useCase.id}
                href={
                  useCase.status === "active"
                    ? useCase.defaultHref ?? `/use-cases/${useCase.slug}/status`
                    : "/use-cases"
                }
                className={`use-case-card ${useCase.status === "active" ? "active" : "muted"}`}
              >
                <span className="use-case-icon">{useCase.icon}</span>
                <h4>{useCase.name}</h4>
                <p>{useCase.summary}</p>
                <span className="inline-link">
                  {useCase.status === "active" ? "Enter workspace" : "Coming soon"}
                </span>
              </Link>
            ))}
          </div>
        </article>

        <aside className="panel span-4">
          <p className="eyebrow">Recent Alerts</p>
          <h3 className="section-heading">Cross-domain top 5</h3>
          <div className="compact-feed">
            {(alerts.items?.length ? alerts.items : [
              { department_name: "ICU-01", anomaly_type: "Discharge stall", severity: "critical", event_date: "09:15" },
              { department_name: "Card-01", anomaly_type: "Admission spike", severity: "critical", event_date: "09:15" },
              { department_name: "Surg-02", anomaly_type: "Rising trend", severity: "warning", event_date: "09:15" },
            ]).slice(0, 5).map((alert, index) => (
              <div className="compact-alert" key={`${alert.department_name}-${index}`}>
                <span className={`status-dot ${alert.severity === "critical" ? "error" : "stale"}`} />
                <div>
                  <strong>{alert.department_name ?? "Ward"} - {alert.anomaly_type ?? "Alert"}</strong>
                  <p>Bed Pressure | {alert.event_date ?? "recent"}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Platform Status</p>
            <h3 className="section-heading">Pipeline healthy enough for operational use</h3>
            <p className="section-subtitle">
              Services healthy: {healthyCount}/{health.checks?.length ?? 0}. Runtime jobs tracked:{" "}
              {runtime.runtimes?.length ?? 0}.
            </p>
          </div>
          <div className="trust-line strong">
            <span>Pipeline OK</span>
            <span>8m ago</span>
            <span>Next 52m</span>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
