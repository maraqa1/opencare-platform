import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { anomalyRows } from "@/lib/site-data";

export default async function AnomaliesPage() {
  const anomalies = await getApiJson<{
    items?: Array<{
      department_name?: string;
      department_code?: string;
      event_date: string;
      severity: string;
      message: string;
    }>;
  }>({
    path: "/api/anomalies/latest",
    fallback: { items: [] },
  });

  const rows =
    (anomalies.items ?? []).map((row) => ({
      department: row.department_name ?? row.department_code ?? "Unknown",
      date: row.event_date,
      severity: row.severity,
      summary: row.message,
    })) || [];

  return (
    <PageFrame
      title="Anomalies"
      description="Recent anomaly signals surfaced for customer review and operational follow-up."
      chips={[
        { label: "Severity ranked", tone: "primary" },
        { label: "Runtime monitored", tone: "accent" },
      ]}
    >
      <section className="status-grid">
        {(rows.length > 0 ? rows : anomalyRows).map((row) => (
          <article className="status-card" key={`${row.department}-${row.date}`}>
            <p className="eyebrow">{row.department}</p>
            <h3>{row.severity} Severity</h3>
            <p className="subtle">{row.date}</p>
            <p>{row.summary}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
