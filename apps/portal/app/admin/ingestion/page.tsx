import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Ingestion Status - OpenCare Portal",
};

export default async function AdminIngestionPage() {
  const ingestion = await getApiJson<{
    source_schema?: string;
    latest_event_timestamp?: string | null;
    tables?: Array<{ name: string; row_count: number }>;
  }>({
    path: "/api/v1/admin/ingestion-status",
    fallback: { tables: [] },
  });

  return (
    <PageFrame
      title="Ingestion Status"
      description="Airbyte landing-zone status rendered through the backend ingestion contract."
      chips={[
        { label: "Airbyte to raw", tone: "primary" },
        { label: "Counts from live landing tables", tone: "accent" },
      ]}
    >
      <section className="panel">
        <p className="subtle">
          Source schema: <code>{ingestion.source_schema}</code> | Latest event: {ingestion.latest_event_timestamp ?? "Unavailable"}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Row Count</th>
            </tr>
          </thead>
          <tbody>
            {(ingestion.tables ?? []).map((table) => (
              <tr key={table.name}>
                <td>{table.name}</td>
                <td>{table.row_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageFrame>
  );
}
