import type { Metadata } from "next";

import { HealthcareKpiWorkspace } from "@/components/healthcare-kpis/HealthcareKpiWorkspace";

export const metadata: Metadata = {
  title: "Healthcare KPI Intelligence - OpenCare Portal",
};

export default function HealthcareKpiIntelligencePage() {
  return <HealthcareKpiWorkspace />;
}
