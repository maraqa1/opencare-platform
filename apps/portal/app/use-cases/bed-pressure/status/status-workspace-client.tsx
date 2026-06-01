"use client";

import dynamic from "next/dynamic";
import { RecordSpecification } from "@/components/RecordSpecification";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

const KPISummaryBar = dynamic(
  () => import("@/components/KPISummaryBar").then((module) => module.KPISummaryBar),
  {
    ssr: false,
    loading: () => (
      <section className="kpi-summary-bar" aria-label="Loading dashboard summary">
        <div className="kpi-cards">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="kpi-skeleton-card" key={index}>
              <span className="skeleton-line short" />
              <span className="skeleton-line tall" />
              <span className="skeleton-line medium" style={{ marginTop: 18 }} />
            </div>
          ))}
        </div>
      </section>
    ),
  },
);

const OccupancyGrid = dynamic(
  () => import("@/components/bed-pressure/OccupancyGrid").then((module) => module.OccupancyGrid),
  {
    ssr: false,
    loading: () => (
      <section className="card-grid" aria-label="Loading occupancy cards">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={index} className="ward-card normal">
            <span className="skeleton-line medium" />
            <span className="skeleton-line tall" />
            <span className="skeleton-line medium" style={{ marginTop: 18 }} />
          </article>
        ))}
      </section>
    ),
  },
);

const AnomalyAlerts = dynamic(
  () => import("@/components/bed-pressure/AnomalyAlerts").then((module) => module.AnomalyAlerts),
  {
    ssr: false,
    loading: () => (
      <section className="panel" aria-label="Loading alerts">
        <div className="button-row">
          <span className="skeleton-line medium" style={{ width: 480, height: 44 }} />
        </div>
        <div className="alert-feed">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="alert-card severity-warning">
              <span className="skeleton-line medium" />
              <span className="skeleton-line short" style={{ marginTop: 14 }} />
              <span className="skeleton-line medium" style={{ marginTop: 14 }} />
            </div>
          ))}
        </div>
      </section>
    ),
  },
);

export function BedPressureStatusWorkspaceClient() {
  return (
    <UseCaseWorkspace activeTab="status">
      <KPISummaryBar />
      <section className="status-command-grid">
        <div className="status-command-main">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Ranked Ward Risk Table</p>
                <h3 className="section-heading">Worst first, always</h3>
                <p className="section-subtitle">
                  Occupancy cards are sorted by severity, then by occupancy. Click into forecasts or provenance.
                </p>
              </div>
              <div className="trust-line">
                <span>DATA 8m OK</span>
                <span>6/6 sources</span>
                <span>42/42 tests</span>
              </div>
            </div>
            <OccupancyGrid forecastBasePath="/use-cases/bed-pressure/predictions" />
          </section>
          <RecordSpecification table="analytics.fct_bed_occupancy" />
        </div>
        <aside className="status-alert-rail">
          <AnomalyAlerts
            severity="critical"
            basePath="/use-cases/bed-pressure/status"
            statusHref="/use-cases/bed-pressure/status"
            forecastBasePath="/use-cases/bed-pressure/predictions"
          />
        </aside>
      </section>
    </UseCaseWorkspace>
  );
}
