"use client";

import { useEffect, useState } from "react";

import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";
import { OccupancyGrid } from "@/components/bed-pressure/OccupancyGrid";
import { KPISummaryBar } from "@/components/KPISummaryBar";

type OccupancyPayload = {
  summary?: { critical: number; warning: number; normal: number };
  items?: Array<{
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
  }>;
};

type RuntimePayload = {
  runtimes?: Array<{
    name?: string;
    last_run?: string | null;
  }>;
};

type SummaryPayload = {
  generated_at?: string | null;
  summary?: { critical: number; warning: number; info: number };
  total?: number;
};

type AnomalyPayload = {
  generated_at?: string | null;
  items?: Array<{
    ward_id: string;
    department_name?: string;
    event_date: string;
    anomaly_type: string;
    severity: "critical" | "warning" | "info";
    occupancy_rate: number | null;
    z_score: number | null;
    threshold_breached: string;
    message?: string;
  }>;
};

export function BedPressureStatusClient({
  initialOccupancy,
  initialRuntime,
  initialSummary,
  initialAnomalies,
}: {
  initialOccupancy: OccupancyPayload;
  initialRuntime: RuntimePayload;
  initialSummary: SummaryPayload;
  initialAnomalies: AnomalyPayload;
}) {
  const [occupancy, setOccupancy] = useState(initialOccupancy);
  const [runtime, setRuntime] = useState(initialRuntime);
  const [summary, setSummary] = useState(initialSummary);
  const [anomalies, setAnomalies] = useState(initialAnomalies);

  useEffect(() => {
    let cancelled = false;

    async function refreshLandingData() {
      try {
        const responses = await Promise.all([
          fetch("/api/portal/api/v1/occupancy/current", { cache: "no-store" }),
          fetch("/api/portal/api/v1/admin/runtime-status", { cache: "no-store" }),
          fetch("/api/portal/api/v1/anomalies/summary", { cache: "no-store" }),
          fetch("/api/portal/api/v1/anomalies?severity=critical", { cache: "no-store" }),
        ]);
        if (responses.some((response) => !response.ok)) {
          return;
        }
        const [nextOccupancy, nextRuntime, nextSummary, nextAnomalies] = await Promise.all(
          responses.map((response) => response.json()),
        );
        if (cancelled) {
          return;
        }
        setOccupancy(nextOccupancy as OccupancyPayload);
        setRuntime(nextRuntime as RuntimePayload);
        setSummary(nextSummary as SummaryPayload);
        setAnomalies(nextAnomalies as AnomalyPayload);
      } catch {
        // Keep the last good landing snapshot if refresh fails.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshLandingData();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="status-command-grid">
      <div className="status-command-main">
        <KPISummaryBar occupancyData={occupancy} runtimeData={runtime} />
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
          <OccupancyGrid
            forecastBasePath="/use-cases/bed-pressure/predictions"
            occupancyData={occupancy}
          />
        </section>
      </div>
      <aside className="status-alert-rail">
        <AnomalyAlerts
          severity="critical"
          basePath="/use-cases/bed-pressure/status"
          statusHref="/use-cases/bed-pressure/status"
          forecastBasePath="/use-cases/bed-pressure/predictions"
          summaryData={summary}
          anomaliesData={anomalies}
        />
      </aside>
    </section>
  );
}
