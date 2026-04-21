import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";
import { OccupancyGrid } from "@/components/bed-pressure/OccupancyGrid";
import { KPISummaryBar } from "@/components/KPISummaryBar";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

export default function BedPressureStatusPage() {
  return (
    <PageFrame
      eyebrow="Operational Landing Page"
      title="Current Status"
      description="The bed manager command console: worst-first pressure, active alerts, and lightweight trust cues on every number."
    >
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
    </PageFrame>
  );
}
