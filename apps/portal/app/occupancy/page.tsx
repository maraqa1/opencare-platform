import { EmbeddedDashboard } from "@/components/EmbeddedDashboard";
import { DictionaryView } from "@/components/DictionaryView";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { TabNav } from "@/components/TabNav";
import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";
import { ForecastView } from "@/components/bed-pressure/ForecastView";
import { OccupancyGrid } from "@/components/bed-pressure/OccupancyGrid";

type SearchParams = Promise<{
  tab?: string;
  ward?: string;
  severity?: string;
}>;

export default async function BedPressureDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeTab = params.tab ?? "occupancy";
  const tabs = [
    { key: "occupancy", label: "Occupancy", href: "/occupancy?tab=occupancy" },
    { key: "forecast", label: "7-Day Forecast", href: "/occupancy?tab=forecast" },
    { key: "alerts", label: "Alerts", href: "/occupancy?tab=alerts" },
    { key: "analytics", label: "Analytics", href: "/occupancy?tab=analytics" },
    { key: "dictionary", label: "Data Dictionary", href: "/occupancy?tab=dictionary" },
  ];

  return (
    <PageFrame
      title="Bed Pressure Intelligence"
      description="Monitor live occupancy, review forecast pressure, investigate anomalies, and inspect the governed record contracts behind each view."
      chips={[
        { label: "Real backend data", tone: "primary" },
        { label: "Record specs on every data tab", tone: "accent" },
      ]}
    >
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
      {activeTab === "occupancy" ? (
        <>
          <OccupancyGrid />
          <RecordSpecification table="analytics.fct_bed_occupancy" />
        </>
      ) : null}
    </PageFrame>
  );
}
