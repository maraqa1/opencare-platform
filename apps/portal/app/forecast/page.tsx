import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { forecastRows } from "@/lib/site-data";

export default async function ForecastPage() {
  const forecast = await getApiJson<{
    items?: Array<{
      forecast_date: string;
      department_name?: string;
      department_code?: string;
      predicted_occupied_beds: number;
    }>;
  }>({
    path: "/api/forecasts/latest",
    fallback: { items: [] },
  });

  const rows =
    (forecast.items ?? []).map((row) => ({
      date: row.forecast_date,
      department: row.department_name ?? row.department_code ?? "Unknown",
      predicted: row.predicted_occupied_beds,
      confidence: "Model",
    })) || [];

  return (
    <PageFrame
      title="Forecast"
      description="Short-horizon occupancy projections derived from curated analytics outputs."
      chips={[
        { label: "R runtime aligned", tone: "primary" },
        { label: "dbt-fed inputs", tone: "accent" },
      ]}
    >
      <section className="grid">
        <article className="panel span-12">
          <p className="eyebrow">Latest Forecast Run</p>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Predicted Beds</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(rows.length > 0 ? rows : forecastRows).map((row) => (
                <tr key={`${row.date}-${row.department}`}>
                  <td>{row.date}</td>
                  <td>{row.department}</td>
                  <td>{row.predicted}</td>
                  <td>{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </PageFrame>
  );
}
