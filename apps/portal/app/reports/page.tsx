import type { Metadata } from "next";

import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Reports - OpenCare Portal",
};

export default async function ReportsPage() {
  const reports = await getApiJson<{
    items?: Array<{ title: string; format: string; path: string }>;
  }>({
    path: "/api/reports",
    fallback: { items: [] },
  });

  const baseReports = reports.items?.length
    ? reports.items
    : [
        { title: "Forecast CSV", format: "csv", path: "/api/v1/reports/export/forecast" },
        { title: "Anomaly CSV", format: "csv", path: "/api/v1/reports/export/anomaly" },
        { title: "Ward Summary PDF", format: "pdf", path: "/api/v1/reports/export/ward-summary" },
      ];

  const boardPackReports = [
    {
      title: "Revenue Cycle Board Pack",
      format: "html",
      path: "/api/v1/revenue-cycle/board-pack",
    },
    {
      title: "Revenue Cycle Board Pack Prompt",
      format: "md",
      path: "/reports/revenue-cycle-board-pack-prompt.md",
    },
    {
      title: "Revenue Cycle Board Pack Sample",
      format: "html",
      path: "/reports/revenue-cycle-board-pack-sample.html",
    },
  ];

  const rows = [...baseReports, ...boardPackReports].map((report) => ({
      name: report.title,
      format: report.format.toUpperCase(),
      href: report.path,
      updated: report.path.startsWith("/api/") ? "Download available" : report.path,
    }));

  return (
    <PageFrame
      title="Reports"
      description="Cross-use-case exports, board packs, and scheduled report placeholders."
      chips={[
        { label: "MinIO-backed", tone: "primary" },
        { label: "Customer-ready outputs", tone: "accent" },
      ]}
    >
      <section className="panel">
        <p className="eyebrow">On-demand Exports</p>
        <h3 className="section-heading">Forecasts, anomalies, and ward summaries</h3>
        <p className="section-subtitle">
          Download buttons use the governed reports API and preserve record specifications below.
        </p>
      </section>
      <section className="item-grid">
        {rows.map((report) => (
          <article className="report-card" key={report.name}>
            <p className="eyebrow">{report.format}</p>
            <h3>{report.name}</h3>
            <p className="subtle">{report.updated}</p>
            <a
              className="button primary"
              href={report.href}
            >
              Download {report.format}
            </a>
          </article>
        ))}
      </section>
      <section className="panel">
        <p className="eyebrow">Scheduled Reports</p>
        <div className="compact-feed">
          <div className="compact-alert">
            <span className="status-dot success" />
            <div>
              <strong>Weekly board pack</strong>
              <p>Revenue Cycle board pack is now available as a live HTML export with reusable prompt and sample assets.</p>
            </div>
          </div>
          <div className="compact-alert">
            <span className="status-dot stale" />
            <div>
              <strong>Daily digest email</strong>
              <p>Future: critical wards, open decisions, resolved outcomes, and trust cues.</p>
            </div>
          </div>
        </div>
      </section>
      <RecordSpecification table="output.forecast" />
      <RecordSpecification table="output.anomaly" />
    </PageFrame>
  );
}
