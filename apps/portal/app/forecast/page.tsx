import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { ForecastView } from "@/components/bed-pressure/ForecastView";

type SearchParams = Promise<{ ward?: string }>;

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return (
    <PageFrame
      title="Forecasts"
      description="Seven-day ward forecasts with confidence bands and breach-risk cues from the Phase 2 runtime outputs."
      chips={[
        { label: "R runtime aligned", tone: "primary" },
        { label: "Confidence intervals included", tone: "accent" },
      ]}
    >
      <ForecastView selectedWardId={params.ward} />
      <RecordSpecification table="output.forecast" />
    </PageFrame>
  );
}
