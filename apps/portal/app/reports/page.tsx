import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { reportRows } from "@/lib/site-data";

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
        {(rows.length > 0 ? rows : reportRows).map((report) => (
          <article className="report-card" key={report.name}>
            <p className="eyebrow">{report.format}</p>
            <h3>{report.name}</h3>
            <p className="subtle">{rows.length > 0 ? report.updated : `Last updated ${report.updated}`}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
