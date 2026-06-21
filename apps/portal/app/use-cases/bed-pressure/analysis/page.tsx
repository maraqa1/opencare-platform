import type { Metadata } from "next";
import { EmbeddedDashboard } from "@/components/EmbeddedDashboard";
import { BedPressureAnalysisCanvas } from "@/components/bed-pressure/BedPressureAnalysisCanvas";
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
        <BedPressureAnalysisCanvas />
        <EmbeddedDashboard
          dashboard={{
            id: "bed-occupancy-trends",
            title: "Ward Occupancy Trends",
            useCase: "Bed Pressure Intelligence",
          }}
          backHref="/use-cases/bed-pressure/status"
          backLabel="Back to Current Status"
          reportHref="/api/v1/reports/export/forecast"
          reportLabel="Download Forecast CSV"
        />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
