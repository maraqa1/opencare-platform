import { ForecastView } from "@/components/bed-pressure/ForecastView";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

type SearchParams = Promise<{ ward?: string }>;

export default async function BedPressurePredictionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <PageFrame
      eyebrow="What Happens Next"
      title="Predictions"
      description="Breach risk, confidence, model cues, and forecast evidence before the chart."
    >
      <UseCaseWorkspace activeTab="predictions">
        <section className="panel pressure-strip">
          <div>
            <p className="eyebrow">Breach Risk Summary - Next 72 Hours</p>
            <h3>3 wards forecast to breach 90% occupancy</h3>
            <p className="section-subtitle">
              ICU-01 in 14h, Card-01 in 2.1d, Surg-02 in 3.4d. Confidence and model accuracy remain visible inline.
            </p>
          </div>
          <div className="trust-line">
            <span>ARIMA(2,1,1)</span>
            <span>MAPE 4.2%</span>
            <span>6/6 tests</span>
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Breach Table</p>
          <table className="table">
            <thead>
              <tr>
                <th>Ward</th>
                <th>Current</th>
                <th>Peak</th>
                <th>Breach In</th>
                <th>Confidence</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ICU-01", "97.3%", "101.2%", "14h", "HIGH", "Admissions over discharges"],
                ["Card-01", "93.1%", "96.4%", "2.1d", "MEDIUM", "Admission spike"],
                ["Surg-02", "91.0%", "93.2%", "3.4d", "LOW", "Trend rising"],
                ["Med-01", "84.2%", "82.1%", "-", "-", "-"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <ForecastView selectedWardId={params.ward} statusHref="/use-cases/bed-pressure/status" />
        <RecordSpecification table="output.forecast" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
