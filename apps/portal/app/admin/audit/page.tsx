import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";

const auditRows = [
  ["2026-04-21 09:15", "bed_manager", "Viewed occupancy", "12 wards"],
  ["2026-04-21 09:14", "admin", "Opened lineage", "3 models"],
  ["2026-04-21 09:10", "bed_manager", "Viewed forecast", "ICU-01"],
  ["2026-04-21 08:55", "ops_director", "Exported board pack", "Ward summary"],
];

export const metadata: Metadata = {
  title: "Audit - OpenCare Portal",
};

export default function AdminAuditPage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Audit"
      description="Full data access log, change history, and exportable audit evidence."
      actions={[
        <a key="export" className="button primary" href="/api/v1/reports/export/audit">
          Export Audit CSV
        </a>,
      ]}
    >
      <section className="panel">
        <p className="eyebrow">Access Log</p>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            {auditRows.map(([time, user, action, scope]) => (
              <tr key={`${time}-${user}-${action}`}>
                <td className="mono">{time}</td>
                <td>{user}</td>
                <td>{action}</td>
                <td>{scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <p className="eyebrow">Change History</p>
        <h3 className="section-heading">Threshold and configuration changes tracked</h3>
        <p className="section-subtitle">
          PII access requires authentication and an audit entry. Retention: 2,555 days.
        </p>
      </section>
    </PageFrame>
  );
}
