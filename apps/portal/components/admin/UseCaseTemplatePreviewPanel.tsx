"use client";

import { useState } from "react";

import type { UseCaseTemplatePreview } from "./use-case-template-types";

const tabs = [
  { id: "business", label: "Business" },
  { id: "data", label: "Data" },
  { id: "dbt", label: "dbt" },
  { id: "backend", label: "Backend APIs" },
  { id: "portal", label: "Portal" },
  { id: "dashboards", label: "Dashboards" },
  { id: "governance", label: "Governance" },
  { id: "demo", label: "Demo Data" },
  { id: "lifecycle", label: "Lifecycle" },
] as const;

function renderList(items: string[] | undefined) {
  if (!items || items.length === 0) {
    return <p className="section-subtitle">No assets declared.</p>;
  }
  return (
    <ul className="compact-feed">
      {items.map((item) => (
        <li key={item}><code>{item}</code></li>
      ))}
    </ul>
  );
}

export function UseCaseTemplatePreviewPanel({ preview }: { preview: UseCaseTemplatePreview | undefined }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("business");

  if (!preview) {
    return (
      <article className="panel span-12">
        <p className="eyebrow">Preview</p>
        <h3 className="section-heading">No package preview available yet</h3>
      </article>
    );
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Preview</p>
      <h3 className="section-heading">Package preview and install impact</h3>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "button primary" : "secondary-link"}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "business" ? (
        <div className="compact-feed">
          <p><strong>Problem:</strong> {preview.business_summary?.problem ?? "n/a"}</p>
          <p><strong>Route:</strong> <code>{preview.route_to_be_added ?? "n/a"}</code></p>
          <p><strong>API prefix:</strong> <code>{preview.api_prefix ?? "n/a"}</code></p>
          <p><strong>Personas:</strong> {(preview.business_summary?.personas ?? []).join(", ") || "n/a"}</p>
          <p><strong>KPIs:</strong> {(preview.business_summary?.kpis ?? []).join(", ") || "n/a"}</p>
        </div>
      ) : null}
      {activeTab === "data" ? renderList(preview.synthetic_seed_files) : null}
      {activeTab === "dbt" ? renderList(preview.dbt_models) : null}
      {activeTab === "backend" ? renderList(preview.backend_assets) : null}
      {activeTab === "portal" ? renderList(preview.portal_assets) : null}
      {activeTab === "dashboards" ? renderList(preview.dashboard_assets) : null}
      {activeTab === "governance" ? renderList(preview.governance_assets) : null}
      {activeTab === "demo" ? (
        <div className="compact-feed">
          {(preview.demo_entities ?? []).length === 0 ? (
            <p className="section-subtitle">No demo entities declared.</p>
          ) : (
            preview.demo_entities?.map((entity) => (
              <div className="compact-alert" key={`${entity.id}-${entity.output_seed}`}>
                <span className="status-dot live" />
                <div>
                  <strong>{entity.id}</strong>
                  <p>{entity.type ?? "n/a"} | {entity.output_seed ?? "no seed file declared"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
      {activeTab === "lifecycle" ? (
        <div className="compact-feed">
          <p><strong>Lifecycle capabilities:</strong> {(preview.lifecycle_capabilities ?? []).join(", ") || "n/a"}</p>
          <p><strong>Materialization mode:</strong> {preview.install_impact?.materialization_mode ?? "n/a"}</p>
          {(preview.conflicts ?? []).map((conflict) => (
            <div className="compact-alert" key={conflict}>
              <span className="status-dot critical" />
              <div>
                <strong>Conflict</strong>
                <p>{conflict}</p>
              </div>
            </div>
          ))}
          {(preview.warnings ?? []).map((warning) => (
            <div className="compact-alert" key={warning}>
              <span className="status-dot stale" />
              <div>
                <strong>Warning</strong>
                <p>{warning}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

