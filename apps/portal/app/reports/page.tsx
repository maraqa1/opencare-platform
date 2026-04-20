import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { getApiJson } from "@/lib/api";

export default async function ReportsPage() {
  const reports = await getApiJson<{
    items?: Array<{ title: string; format: string; path: string }>;
  }>({
    path: "/api/reports",
    fallback: { items: [] },
  });

  const rows =
    (reports.items ?? []).map((report) => ({
      name: report.title,
      format: report.format.toUpperCase(),
      updated: report.path,
    })) || [];

  return (
    <PageFrame
      title="Reports"
      description="Published report artifacts available through the portal's governed storage contract."
      chips={[
        { label: "MinIO-backed", tone: "primary" },
        { label: "Customer-ready outputs", tone: "accent" },
      ]}
    >
      <section className="report-grid">
        {rows.map((report) => (
          <article className="report-card" key={report.name}>
            <p className="eyebrow">{report.format}</p>
            <h3>{report.name}</h3>
            <p className="subtle">{report.updated}</p>
            <a
              className="button primary"
              href={
                report.name.toLowerCase().includes("forecast")
                  ? "/api/v1/reports/export/forecast"
                  : "/api/v1/reports/export/anomaly"
              }
            >
              Download CSV
            </a>
          </article>
        ))}
      </section>
      <RecordSpecification table="output.forecast" />
      <RecordSpecification table="output.anomaly" />
    </PageFrame>
  );
}
