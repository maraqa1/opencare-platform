import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { AnomalyAlerts } from "@/components/bed-pressure/AnomalyAlerts";

type SearchParams = Promise<{ severity?: string }>;

export default async function AnomaliesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return (
    <PageFrame
      title="Alerts"
      description="Severity-filtered anomaly alerts with occupancy context, z-scores, and threshold details from the governed output schema."
      chips={[
        { label: "Severity ranked", tone: "primary" },
        { label: "Threshold-aware", tone: "accent" },
      ]}
    >
      <AnomalyAlerts severity={params.severity} />
      <RecordSpecification table="output.anomaly" />
    </PageFrame>
  );
}
