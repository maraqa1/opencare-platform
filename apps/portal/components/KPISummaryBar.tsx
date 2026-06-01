"use client";

import { useMemo } from "react";
import { useSharedJsonResource } from "@/lib/useSharedJsonResource";

type DashboardSummary = {
  critical_wards: number;
  warning_wards: number;
  normal_wards: number;
  avg_occupancy: number;
  pipeline_status: "live" | "stale" | "error";
  last_refresh_minutes: number | null;
  next_refresh_minutes: number | null;
};

type OccupancyPayload = {
  summary?: { critical?: number; warning?: number; normal?: number };
  items?: Array<{ occupancy_rate?: number | null }>;
};

type RuntimePayload = {
  runtimes?: Array<{
    name?: string;
    last_run?: string | null;
  }>;
};

function formatMinutes(value: number | null) {
  if (value === null) {
    return "unknown";
  }
  return `${value} min ago`;
}

function formatNext(value: number | null) {
  if (value === null) {
    return "scheduled";
  }
  return `${value}m`;
}

function SkeletonCard() {
  return (
    <div className="kpi-skeleton-card">
      <span className="skeleton-line short" />
      <span className="skeleton-line tall" />
      <span className="skeleton-line medium" style={{ marginTop: 18 }} />
    </div>
  );
}

function KPISkeleton() {
  return (
    <section className="kpi-summary-bar" aria-label="Loading dashboard summary">
      <div className="kpi-cards">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="pipeline-status">
        <span className="skeleton-line medium" style={{ width: 320, height: 16 }} />
      </div>
    </section>
  );
}

function KPICard({
  value,
  label,
  color,
  subtitle,
  pulse = false,
  mono = false,
}: {
  value: string;
  label: string;
  color: "critical" | "warning" | "normal" | "neutral";
  subtitle: string;
  pulse?: boolean;
  mono?: boolean;
}) {
  return (
    <article className={`kpi-card kpi-card-${color} ${pulse ? "kpi-pulse" : ""}`}>
      <span className="kpi-card-label">{label}</span>
      <span className={`kpi-card-value ${mono ? "mono" : ""}`}>{value}</span>
      <span className="kpi-card-subtitle">{subtitle}</span>
    </article>
  );
}

export function KPISummaryBar({
  initialOccupancy,
  initialRuntime,
}: {
  initialOccupancy?: OccupancyPayload;
  initialRuntime?: RuntimePayload;
} = {}) {
  const occupancy = useSharedJsonResource<OccupancyPayload>("/api/portal/api/v1/occupancy/current", {
    fallbackData: { summary: { critical: 0, warning: 0, normal: 0 }, items: [] },
    initialData: initialOccupancy,
    refreshIntervalMs: 60000,
  });
  const runtime = useSharedJsonResource<RuntimePayload>("/api/portal/api/v1/admin/runtime-status", {
    fallbackData: { runtimes: [] },
    initialData: initialRuntime,
    refreshIntervalMs: 60000,
  });

  const summary = useMemo<DashboardSummary | null>(() => {
    if (!occupancy.data || !runtime.data) {
      return null;
    }

    const forecastRuntime = (runtime.data.runtimes ?? []).find((item) => item.name === "forecast");
    const lastRefreshMinutes = formatDiffMinutes(forecastRuntime?.last_run);
    const items = occupancy.data.items ?? [];
    const avgOccupancy =
      items.length > 0
        ? items.reduce((total, item) => total + (item.occupancy_rate ?? 0), 0) / items.length
        : 0;

    return {
      critical_wards: occupancy.data.summary?.critical ?? 0,
      warning_wards: occupancy.data.summary?.warning ?? 0,
      normal_wards: occupancy.data.summary?.normal ?? 0,
      avg_occupancy: avgOccupancy,
      pipeline_status:
        lastRefreshMinutes === null ? "error" : lastRefreshMinutes <= 75 ? "live" : "stale",
      last_refresh_minutes: lastRefreshMinutes,
      next_refresh_minutes:
        lastRefreshMinutes === null ? null : Math.max(0, 60 - (lastRefreshMinutes % 60)),
    };
  }, [occupancy.data, runtime.data]);

  if (!summary) {
    return <KPISkeleton />;
  }

  return (
    <section className="kpi-summary-bar">
      <div className="kpi-cards">
        <KPICard
          value={`${summary.critical_wards}`}
          label="Critical"
          color="critical"
          subtitle="Wards already above the 90% threshold"
          pulse={summary.critical_wards > 0}
        />
        <KPICard
          value={`${summary.warning_wards}`}
          label="Warning"
          color="warning"
          subtitle="Wards that need proactive capacity planning"
        />
        <KPICard
          value={`${summary.normal_wards}`}
          label="Normal"
          color="normal"
          subtitle="Wards operating inside healthy staffing pressure"
        />
        <KPICard
          value={`${summary.avg_occupancy.toFixed(1)}%`}
          label="Average"
          color="neutral"
          subtitle="Mean occupancy across the live hospital footprint"
          mono
        />
      </div>
      <div className="pipeline-status">
        <span className={`status-dot ${summary.pipeline_status}`} />
        <span>Pipeline: {summary.pipeline_status === "live" ? "Live" : summary.pipeline_status === "stale" ? "Stale" : "Error"}</span>
        <span className="separator">|</span>
        <span>Last refresh: {formatMinutes(summary.last_refresh_minutes)}</span>
        <span className="separator">|</span>
        <span>Next: {formatNext(summary.next_refresh_minutes)}</span>
      </div>
    </section>
  );
}

function formatDiffMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60000));
}
