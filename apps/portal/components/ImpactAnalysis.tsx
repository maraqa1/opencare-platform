"use client";

import { useEffect, useState } from "react";

type ImpactPayload = {
  source: string;
  impact_count: number;
  affected_models: Array<{ id: string; label: string; stage: string }>;
};

type ImpactAnalysisProps = {
  sourceOptions?: string[];
  initialSource?: string;
};

const DEFAULT_SOURCE_OPTIONS = ["bed_events", "wards", "patients"];

export function ImpactAnalysis({ sourceOptions, initialSource }: ImpactAnalysisProps) {
  const resolvedOptions = sourceOptions && sourceOptions.length > 0 ? sourceOptions : DEFAULT_SOURCE_OPTIONS;
  const defaultSource =
    initialSource && resolvedOptions.includes(initialSource) ? initialSource : resolvedOptions[0] ?? "bed_events";
  const [sourceName, setSourceName] = useState(defaultSource);
  const [payload, setPayload] = useState<ImpactPayload | null>(null);

  useEffect(() => {
    if (!resolvedOptions.includes(sourceName)) {
      setSourceName(defaultSource);
    }
  }, [defaultSource, resolvedOptions, sourceName]);

  useEffect(() => {
    let cancelled = false;
    async function loadImpact() {
      const response = await fetch(`/api/portal/api/v1/lineage/impact/${encodeURIComponent(sourceName)}`, {
        cache: "no-store",
      });
      const nextPayload = (await response.json()) as ImpactPayload;
      if (!cancelled) {
        setPayload(nextPayload);
      }
    }

    loadImpact().catch(() => {
      if (!cancelled) {
        setPayload({ source: sourceName, impact_count: 0, affected_models: [] });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sourceName]);

  return (
    <section className="governance-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Change Management</p>
          <h3>Impact Analysis</h3>
          <p className="section-subtitle">If a source changes, this shows the downstream models and product surfaces that need revalidation.</p>
        </div>
        <label className="selector-form">
          <span className="subtle">Source table</span>
          <select value={sourceName} onChange={(event) => setSourceName(event.target.value)}>
            {resolvedOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="impact-shell">
        <div className="impact-count-card">
          <span className="impact-number">{payload?.impact_count ?? 0}</span>
          <span>models affected</span>
        </div>
        <div className="impact-list">
          {(payload?.affected_models ?? []).map((model) => (
            <div key={model.id} className="affected-model">
              <div>
                <strong>{model.label}</strong>
                <p className="subtle">{model.stage} stage</p>
              </div>
              <span className="warning-badge">Needs revalidation</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
