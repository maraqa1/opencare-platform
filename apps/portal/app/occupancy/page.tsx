import type { Metadata } from "next";
import { EmbeddedDashboard } from "@/components/EmbeddedDashboard";
import { GovernanceView } from "@/components/GovernanceView";
import { KPISummaryBar } from "@/components/KPISummaryBar";
import { DictionaryView } from "@/components/DictionaryView";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { TabNav } from "@/components/TabNav";
import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";
import { ForecastView } from "@/components/bed-pressure/ForecastView";
import { OccupancyGrid } from "@/components/bed-pressure/OccupancyGrid";
import { assertUseCaseEnabled } from "@/lib/use-case-gates";

type SearchParams = Promise<{
  tab?: string;
  ward?: string;
  severity?: string;
}>;

export const metadata: Metadata = {
  title: "Bed Pressure Intelligence - OpenCare Portal",
};

export default async function BedPressureDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await assertUseCaseEnabled("bed_pressure");
  const params = await searchParams;
  const activeTab = params.tab ?? "occupancy";
  const tabs = [
    { key: "occupancy", label: "Occupancy", href: "/occupancy?tab=occupancy" },
    { key: "forecast", label: "7-Day Forecast", href: "/occupancy?tab=forecast" },
    { key: "alerts", label: "Alerts", href: "/occupancy?tab=alerts" },
    { key: "analytics", label: "Analytics", href: "/occupancy?tab=analytics" },
    { key: "dictionary", label: "Data Dictionary", href: "/occupancy?tab=dictionary" },
    { key: "governance", label: "Governance", href: "/occupancy?tab=governance" },
  ];

  return (
    <PageFrame
      title="Bed Pressure Intelligence"
      description="The investor-facing command surface for live occupancy, forecast breach risk, anomaly escalation, and board-ready analytics."
      chips={[
        { label: "Real backend data", tone: "primary" },
        { label: "Config-driven use case", tone: "accent" },
      ]}
      actions={[
        <a key="report" className="secondary-link" href="/reports">
          Download Reports
        </a>,
        <a key="analytics" className="button primary" href="/occupancy?tab=analytics">
          Open Analytics
        </a>,
      ]}
    >
      <KPISummaryBar />
      <TabNav items={tabs} activeKey={activeTab} />
      {activeTab === "forecast" ? (
        <>
          <ForecastView selectedWardId={params.ward} />
          <RecordSpecification table="output.forecast" />
        </>
      ) : null}
      {activeTab === "alerts" ? (
        <>
          <AnomalyAlerts severity={params.severity} />
          <RecordSpecification table="output.anomaly" />
        </>
      ) : null}
      {activeTab === "analytics" ? (
        <EmbeddedDashboard
          dashboard={{
            id: "bed-occupancy-trends",
            title: "Ward Occupancy Trends",
            useCase: "Bed Pressure Intelligence",
          }}
        />
      ) : null}
      {activeTab === "dictionary" ? <DictionaryView useCase="bed_pressure" /> : null}
      {activeTab === "governance" ? (
        <>
          <GovernanceView />
          <RecordSpecification table="analytics.fct_bed_occupancy" />
        </>
      ) : null}
      {activeTab === "occupancy" ? (
        <>
          <OccupancyGrid />
          <RecordSpecification table="analytics.fct_bed_occupancy" />
        </>
      ) : null}
    </PageFrame>
  );
}
