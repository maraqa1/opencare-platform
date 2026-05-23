import Link from "next/link";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

export function UseCaseTemplateTable({ packages }: { packages: UseCaseTemplatePackage[] }) {
  return (
    <article className="panel span-12">
      <p className="eyebrow">Templates</p>
      <h3 className="section-heading">Uploaded and installed use-case packages</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Version</th>
            <th>Domain</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Last action</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {packages.length === 0 ? (
            <tr>
              <td colSpan={8}>No use-case template packages uploaded yet.</td>
            </tr>
          ) : (
            packages.map((pkg) => (
              <tr key={pkg.id ?? pkg.package_id}>
                <td>{pkg.name}</td>
                <td><code>{pkg.slug}</code></td>
                <td>{pkg.version}</td>
                <td>{pkg.domain ?? "n/a"}</td>
                <td>{pkg.status}</td>
                <td>{pkg.uploaded_at ?? "n/a"}</td>
                <td>{pkg.last_action ?? "n/a"}</td>
                <td>
                  <Link className="secondary-link" href={`/admin/use-case-templates/${encodeURIComponent(pkg.id ?? pkg.package_id)}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}
