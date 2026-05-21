import type { Metadata } from "next";
import { EmbeddedDashboard } from "@/components/EmbeddedDashboard";
import { PageFrame } from "@/components/page-frame";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

export const metadata: Metadata = {
  title: "Bed Pressure Analysis - OpenCare Portal",
};

export default function BedPressureAnalysisPage() {
  return (
    <PageFrame
      eyebrow="Board Evidence"
      title="Analysis"
      description="Operations Director evidence: trends, comparisons, admissions versus discharges, and export-ready analytics."
    >
      <UseCaseWorkspace activeTab="analysis">
        <section className="dashboard-toolbar">
          <div>
            <p className="eyebrow">Embedded Superset Dashboard</p>
            <h3 className="section-heading">30-day occupancy evidence</h3>
            <p className="section-subtitle">
              Filters stay close to the chart, but the breach summary remains above the evidence layer.
            </p>
          </div>
          <div className="filter-row">
            <span className="filter-chip active">Ward: All</span>
            <span className="filter-chip active">Last 30 days</span>
            <a className="button primary" href="/api/v1/reports/export/ward-summary">
              Export
            </a>
          </div>
        </section>
        <EmbeddedDashboard
          dashboard={{
            id: "bed-occupancy-trends",
            title: "Ward Occupancy Trends",
            useCase: "Bed Pressure Intelligence",
          }}
        />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
