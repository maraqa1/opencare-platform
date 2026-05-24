"use client";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

export function UseCaseTemplateRuntimeStatusPanel({ pkg }: { pkg: UseCaseTemplatePackage | undefined }) {
  if (!pkg) {
    return null;
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Runtime Status</p>
      <h3 className="section-heading">Validation, compile, materialization, activation, and live verification</h3>
      <div className="metric-grid compact">
        <div className="forecast-stat"><p className="eyebrow">Validation</p><strong>{pkg.package_validation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Compile</p><strong>{pkg.compile_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Materialization</p><strong>{pkg.materialization_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Activation</p><strong>{pkg.activation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Live verification</p><strong>{pkg.live_verification_status ?? "n/a"}</strong></div>
      </div>
      {pkg.last_error ? <p className="section-subtitle">Last error: {pkg.last_error}</p> : null}
    </article>
  );
}
