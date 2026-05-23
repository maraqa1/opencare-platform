"use client";

import Link from "next/link";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";

function statusLabel(status: UseCaseTemplatePackage["status"]) {
  return status.replaceAll("_", " ");
}

export function ImportedUseCasePackages({
  packages,
}: {
  packages: UseCaseTemplatePackage[];
}) {
  if (packages.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Imported Use Cases</p>
          <h3 className="section-heading">Activated imported use cases awaiting full runtime materialization</h3>
          <p className="section-subtitle">
            These packages have been activated for portal visibility. They can be reviewed like use cases today, even
            though dynamic backend, portal, dbt, and dashboard materialization is not automated yet.
          </p>
        </div>
        <Link className="secondary-link" href="/admin/use-case-templates">
          Open Template Admin
        </Link>
      </div>
      <div className="use-case-card-grid">
        {packages.map((pkg) => (
          <article className="use-case-card muted" key={pkg.id ?? `${pkg.package_id}-${pkg.version}`}>
            <span className="use-case-icon">Pkg</span>
            <h4>{pkg.name}</h4>
            <p>{pkg.domain ?? "Imported use-case package"}</p>
            <span className="inline-link">{statusLabel(pkg.status)}</span>
            <p className="section-subtitle">
              Slug <code>{pkg.slug}</code> | Version {pkg.version}
            </p>
            <p className="section-subtitle">
              {pkg.preview_summary?.install_impact?.full_runtime_supported
                ? "Package is eligible for full runtime materialization."
                : "Package is active as an imported use case in the portal, but it is not yet a fully materialized native OpenCare workspace."}
            </p>
            <Link className="secondary-link" href={`/admin/use-case-templates/${encodeURIComponent(pkg.id ?? pkg.package_id)}`}>
              Review imported use case
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
