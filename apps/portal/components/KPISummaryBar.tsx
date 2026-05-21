"use client";

import { useEffect, useState } from "react";

type DashboardSummary = {
  critical_wards: number;
  warning_wards: number;
  normal_wards: number;
  avg_occupancy: number;
  pipeline_status: "live" | "stale" | "error";
  last_refresh_minutes: number | null;
  next_refresh_minutes: number | null;
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

export function KPISummaryBar() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      const response = await fetch("/api/portal/dashboard/summary", {
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardSummary;
      if (!cancelled) {
        setSummary(payload);
      }
    }

    loadSummary().catch(() => {
      if (!cancelled) {
        setSummary({
          critical_wards: 0,
          warning_wards: 0,
          normal_wards: 0,
          avg_occupancy: 0,
          pipeline_status: "error",
          last_refresh_minutes: null,
          next_refresh_minutes: null,
        });
      }
    });

    const intervalId = window.setInterval(() => {
      loadSummary().catch(() => undefined);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
