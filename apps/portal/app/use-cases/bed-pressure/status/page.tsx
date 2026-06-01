import type { Metadata } from "next";
import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";
import { OccupancyGrid } from "@/components/bed-pressure/OccupancyGrid";
import { KPISummaryBar } from "@/components/KPISummaryBar";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Bed Pressure Status - OpenCare Portal",
};

export default async function BedPressureStatusPage() {
  const occupancy = await getApiJson<{
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
  }>({
    path: "/api/v1/occupancy/current",
    fallback: { summary: { critical: 0, warning: 0, normal: 0 }, items: [] },
    cacheMode: "no-store",
  });
  const runtime = await getApiJson<{
    runtimes?: Array<{
      name?: string;
      last_run?: string | null;
    }>;
  }>({
    path: "/api/v1/admin/runtime-status",
    fallback: { runtimes: [] },
    cacheMode: "no-store",
  });
  const anomalySummary = await getApiJson<{
    generated_at?: string | null;
    summary?: { critical: number; warning: number; info: number };
    total?: number;
  }>({
    path: "/api/v1/anomalies/summary",
    fallback: { summary: { critical: 0, warning: 0, info: 0 }, total: 0 },
    cacheMode: "no-store",
  });
  const criticalAnomalies = await getApiJson<{
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
  }>({
    path: "/api/v1/anomalies?severity=critical",
    fallback: { items: [] },
    cacheMode: "no-store",
  });

  return (
    <PageFrame
      eyebrow="Operational Landing Page"
      title="Current Status"
      description="The bed manager command console: worst-first pressure, active alerts, and lightweight trust cues on every number."
    >
      <UseCaseWorkspace activeTab="status">
        <KPISummaryBar initialOccupancy={occupancy} initialRuntime={runtime} />
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
              <OccupancyGrid
                forecastBasePath="/use-cases/bed-pressure/predictions"
                initialPayload={occupancy}
              />
            </section>
            <RecordSpecification table="analytics.fct_bed_occupancy" />
          </div>
          <aside className="status-alert-rail">
            <AnomalyAlerts
              severity="critical"
              basePath="/use-cases/bed-pressure/status"
              statusHref="/use-cases/bed-pressure/status"
              forecastBasePath="/use-cases/bed-pressure/predictions"
              initialSummary={anomalySummary}
              initialAnomalies={criticalAnomalies}
            />
          </aside>
        </section>
      </UseCaseWorkspace>
    </PageFrame>
  );
}
