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
          <p className="eyebrow">Imported Packages</p>
          <h3 className="section-heading">Installed use-case packages awaiting full runtime materialization</h3>
          <p className="section-subtitle">
            These packages are uploaded, validated, and installed in OpenCare package storage. They are visible here so
            operators can track them before dynamic backend, portal, dbt, and dashboard materialization is automated.
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
                : "Package is staged in managed storage only. It is not a live OpenCare use case and should be uninstalled completely if you do not want to keep it."}
            </p>
            <Link className="secondary-link" href={`/admin/use-case-templates/${encodeURIComponent(pkg.id ?? pkg.package_id)}`}>
              Review package
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
