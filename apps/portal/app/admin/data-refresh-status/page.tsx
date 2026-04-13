import { PageFrame } from "@/components/page-frame";
import { refreshRows } from "@/lib/site-data";

export default function DataRefreshStatusPage() {
  return (
    <PageFrame
      title="Data Refresh Status"
      description="Current state of ingestion, transformation, and downstream refresh tasks."
      chips={[
        { label: "Airbyte to dbt path", tone: "primary" },
        { label: "Refresh audited", tone: "accent" },
      ]}
    >
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {refreshRows.map((row) => (
              <tr key={row.service}>
                <td>{row.service}</td>
                <td>{row.status}</td>
                <td>{row.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageFrame>
  );
}
