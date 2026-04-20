"use client";

import { useEffect, useState } from "react";

type CompliancePayload = {
  classifications: Array<{ classification: string; assets: string[] }>;
  pii_tracking: Array<{
    model: string;
    stage: string;
    masking: string;
    retention_days: number;
    pii_columns: Array<{ name: string; level: string }>;
  }>;
  freshness_slas: {
    critical_models_hours: number;
    analytics_models_hours: number;
    reference_data_hours: number;
    all_within_sla: boolean;
  };
  audit_trail: {
    status: string;
    retention_days: number;
    pii_requires_auth: boolean;
    last_audit_query: string;
  };
};

export function ComplianceSummary() {
  const [payload, setPayload] = useState<CompliancePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCompliance() {
      const response = await fetch("/api/portal/api/v1/lineage/compliance", { cache: "no-store" });
      const nextPayload = (await response.json()) as CompliancePayload;
      if (!cancelled) {
        setPayload(nextPayload);
      }
    }

    loadCompliance().catch(() => {
      if (!cancelled) {
        setPayload(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="governance-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Compliance</p>
          <h3>Compliance &amp; Data Classification</h3>
          <p className="section-subtitle">PII tagging, retention, masking posture, and audit expectations brought into the same product surface as the live metrics.</p>
        </div>
      </div>

      <div className="compliance-grid">
        <article className="compliance-panel">
          <h4>Data Classification</h4>
          {(payload?.classifications ?? []).map((item) => (
            <div className="classification-row" key={item.classification}>
              <strong>{item.classification.replaceAll("_", " ").toUpperCase()}</strong>
              <p>{item.assets.join(", ")}</p>
            </div>
          ))}
        </article>

        <article className="compliance-panel">
          <h4>PII Tracking</h4>
          {(payload?.pii_tracking ?? []).map((item) => (
            <div className="classification-row" key={item.model}>
              <strong>{item.model}</strong>
              <p>
                {item.pii_columns.map((column) => `${column.name} (${column.level})`).join(", ")}
              </p>
              <p className="subtle">
                {item.masking} Retention: {item.retention_days} days.
              </p>
            </div>
          ))}
        </article>

        <article className="compliance-panel">
          <h4>Freshness SLAs</h4>
          <p>Critical models: {payload?.freshness_slas.critical_models_hours ?? 0} hours</p>
          <p>Analytics models: {payload?.freshness_slas.analytics_models_hours ?? 0} hours</p>
          <p>Reference data: {payload?.freshness_slas.reference_data_hours ?? 0} hours</p>
          <p className="subtle">
            Status: {payload?.freshness_slas.all_within_sla ? "All within SLA" : "Some sources need attention"}
          </p>
        </article>

        <article className="compliance-panel">
          <h4>Audit Trail</h4>
          <p>All data access logged with {payload?.audit_trail.retention_days ?? 0}-day retention.</p>
          <p>PII access requires authentication and an audit entry.</p>
          <p className="subtle">Last audit query: {payload?.audit_trail.last_audit_query ?? "unknown"}.</p>
        </article>
      </div>
    </section>
  );
}
