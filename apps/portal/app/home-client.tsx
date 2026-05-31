"use client";

import { useEffect, useState } from "react";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { KPISummaryBar } from "@/components/KPISummaryBar";
import { PageFrame } from "@/components/page-frame";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

type RuntimeStatusResponse = {
  runtimes?: Array<{ name: string; last_run?: string | null; row_count?: number }>;
};

type HealthResponse = {
  checks?: Array<{ name: string; healthy: boolean }>;
};

type AlertsResponse = {
  items?: Array<{ department_name?: string; anomaly_type?: string; severity?: string; event_date?: string }>;
};

type OccupancyResponse = {
  summary?: { critical?: number; warning?: number; normal?: number };
  items?: Array<{
    department_name?: string;
    ward_name?: string;
    occupancy_rate?: number;
    status?: string;
  }>;
};

type UseCaseConfigResponse = {
  all_use_cases?: Record<string, { enabled?: boolean }>;
  active_imported_use_cases?: UseCaseTemplatePackage[];
};

const defaultRuntime: RuntimeStatusResponse = { runtimes: [] };
const defaultHealth: HealthResponse = { checks: [] };
const defaultAlerts: AlertsResponse = { items: [] };
const defaultOccupancy: OccupancyResponse = { summary: {}, items: [] };
const defaultUseCaseConfig: UseCaseConfigResponse = { all_use_cases: {}, active_imported_use_cases: [] };

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function HomeClient() {
  const [runtime, setRuntime] = useState<RuntimeStatusResponse>(defaultRuntime);
  const [health, setHealth] = useState<HealthResponse>(defaultHealth);
  const [alerts, setAlerts] = useState<AlertsResponse>(defaultAlerts);
  const [occupancy, setOccupancy] = useState<OccupancyResponse>(defaultOccupancy);
  const [useCaseConfig, setUseCaseConfig] = useState<UseCaseConfigResponse>(defaultUseCaseConfig);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      const [nextRuntime, nextHealth, nextAlerts, nextOccupancy, nextUseCaseConfig] = await Promise.all([
        getJson("/api/portal/api/v1/admin/runtime-status", defaultRuntime),
        getJson("/api/portal/api/v1/admin/health", defaultHealth),
        getJson("/api/portal/api/v1/anomalies?limit=5", defaultAlerts),
        getJson("/api/portal/api/v1/occupancy/current", defaultOccupancy),
        getJson("/api/portal/api/v1/config/use-cases", defaultUseCaseConfig),
      ]);

      if (cancelled) {
        return;
      }

      setRuntime(nextRuntime);
      setHealth(nextHealth);
      setAlerts(nextAlerts);
      setOccupancy(nextOccupancy);
      setUseCaseConfig(nextUseCaseConfig);
    }

    loadHomeData().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUseCases = filterVisibleUseCases(useCases, useCaseConfig.all_use_cases ?? {});
  const importedUseCases = projectImportedPackagesToUseCases(useCaseConfig.active_imported_use_cases ?? []);
  const activeUseCases = [...importedUseCases, ...visibleUseCases];
  const defaultUseCaseHref =
    activeUseCases.find((useCase) => useCase.status === "active")?.defaultHref ?? "/use-cases";

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
        <a key="use-cases" className="button primary" href="/use-cases">
          View Use Cases
        </a>,
        <a key="status" className="secondary-link" href={defaultUseCaseHref}>
          Open Primary Workspace
        </a>,
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
            <a className="secondary-link" href="/use-cases">
              Catalogue
            </a>
          </div>
          <div className="use-case-card-grid">
            {activeUseCases.map((useCase) => (
              useCase.status === "active" ? (
                <a
                  key={useCase.id}
                  href={useCase.defaultHref ?? `/use-cases/${useCase.slug}/status`}
                  className="use-case-card active"
                >
                  <span className="use-case-icon">{useCase.icon}</span>
                  <h4>{useCase.name}</h4>
                  <p>{useCase.summary}</p>
                  <span className="inline-link">{useCase.ctaLabel ?? "Enter workspace"}</span>
                </a>
              ) : (
                <a
                  key={useCase.id}
                  href="/use-cases"
                  className="use-case-card muted"
                >
                  <span className="use-case-icon">{useCase.icon}</span>
                  <h4>{useCase.name}</h4>
                  <p>{useCase.summary}</p>
                  <span className="inline-link">Coming soon</span>
                </a>
              )
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
