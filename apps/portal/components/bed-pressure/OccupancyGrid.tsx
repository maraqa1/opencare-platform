"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OccupancyItem = {
  ward_id: string;
  ward_code?: string;
  ward_name: string;
  occupancy_rate: number;
  occupied_beds: number;
  staffed_beds: number;
  avg_7d_occupancy: number;
  admissions_today: number;
  discharges_today: number;
  status: "critical" | "warning" | "normal";
};

type OccupancyPayload = {
  summary?: { critical: number; warning: number; normal: number };
  items?: OccupancyItem[];
};

const STATUS_ORDER: Record<OccupancyItem["status"], number> = {
  critical: 0,
  warning: 1,
  normal: 2,
};

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }
  return `${value.toFixed(1)}%`;
}

function trendFor(item: OccupancyItem) {
  const delta = item.occupancy_rate - item.avg_7d_occupancy;
  if (delta > 1.5) {
    return { label: "Trending up", icon: "UP", className: "up" };
  }
  if (delta < -1.5) {
    return { label: "Trending down", icon: "DOWN", className: "down" };
  }
  return { label: "Stable", icon: "FLAT", className: "flat" };
}

function OccupancySkeleton() {
  return (
    <section className="card-grid" aria-label="Loading occupancy cards">
      {Array.from({ length: 8 }).map((_, index) => (
        <article key={index} className="ward-card normal">
          <span className="skeleton-line medium" />
          <span className="skeleton-line tall" />
          <span className="skeleton-line medium" style={{ marginTop: 18 }} />
        </article>
      ))}
    </section>
  );
}

export function OccupancyGrid({
  forecastBasePath = "/occupancy?tab=forecast",
}: {
  forecastBasePath?: string;
}) {
  const [payload, setPayload] = useState<OccupancyPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOccupancy() {
      const response = await fetch("/api/portal/api/v1/occupancy/current", {
        cache: "no-store",
      });
      const nextPayload = (await response.json()) as OccupancyPayload;
      if (!cancelled) {
        setPayload(nextPayload);
      }
    }

    loadOccupancy().catch(() => {
      if (!cancelled) {
        setPayload({ summary: { critical: 0, warning: 0, normal: 0 }, items: [] });
      }
    });

    const intervalId = window.setInterval(() => {
      loadOccupancy().catch(() => undefined);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const items = useMemo(() => {
    return [...(payload?.items ?? [])].sort((left, right) => {
      const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }
      return right.occupancy_rate - left.occupancy_rate;
    });
  }, [payload]);

  if (!payload) {
    return <OccupancySkeleton />;
  }

  return (
    <>
      <section className="summary-badges">
        <span className="summary-badge critical">{payload.summary?.critical ?? 0} Critical</span>
        <span className="summary-badge warning">{payload.summary?.warning ?? 0} Warning</span>
        <span className="summary-badge normal">{payload.summary?.normal ?? 0} Normal</span>
      </section>
      <section className="card-grid">
        {items.map((item, index) => {
          const trend = trendFor(item);
          return (
            <article
              className={`ward-card ${item.status} ${index < 3 ? "priority" : ""}`}
              key={item.ward_id}
            >
              <div className="ward-card-header">
                <div>
                  <p className="eyebrow">{item.ward_code ?? "Ward"}</p>
                  <h3>{item.ward_name}</h3>
                </div>
                <span className="status-pill">{item.status}</span>
              </div>
              <p className="ward-rate">{formatPercent(item.occupancy_rate)}</p>
              <p className="ward-occupancy-meta">
                {item.occupied_beds}/{item.staffed_beds} staffed beds occupied
              </p>
              <div className="progress-track" aria-hidden="true">
                <span
                  className="progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, item.occupancy_rate))}%` }}
                />
              </div>
              <div className="trend-row">
                <span className={`trend-indicator ${trend.className}`}>
                  <strong>{trend.icon}</strong>
                  <span>{trend.label}</span>
                </span>
                <span className="data-pill">7d avg {formatPercent(item.avg_7d_occupancy)}</span>
              </div>
              <dl className="metric-list">
                <div>
                  <dt>Admissions today</dt>
                  <dd>{item.admissions_today}</dd>
                </div>
                <div>
                  <dt>Discharges today</dt>
                  <dd>{item.discharges_today}</dd>
                </div>
              </dl>
              <Link
                className="inline-link"
                href={`${forecastBasePath}${forecastBasePath.includes("?") ? "&" : "?"}ward=${encodeURIComponent(item.ward_id)}`}
              >
                View Forecast
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
