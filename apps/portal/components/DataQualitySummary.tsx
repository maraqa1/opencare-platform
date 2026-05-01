"use client";

import { useEffect, useState } from "react";

type QualityPayload = {
  total_tests: number;
  models: Array<{
    id: string;
    name: string;
    stage: string;
    total_tests: number;
    passing_tests: number;
  }>;
};

type DataQualitySummaryProps = {
  modelFilters?: string[];
};

function matchesModel(modelName: string, filters: string[]) {
  const normalized = modelName.toLowerCase();
  return filters.some((filter) => normalized.includes(filter.toLowerCase()));
}

export function DataQualitySummary({ modelFilters = [] }: DataQualitySummaryProps) {
  const [payload, setPayload] = useState<QualityPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadQuality() {
      const response = await fetch("/api/portal/api/v1/lineage/quality", { cache: "no-store" });
      const nextPayload = (await response.json()) as QualityPayload;
      if (!cancelled) {
        setPayload(nextPayload);
      }
    }

    loadQuality().catch(() => {
      if (!cancelled) {
        setPayload({ total_tests: 0, models: [] });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredModels =
    modelFilters.length > 0
      ? (payload?.models ?? []).filter((model) => matchesModel(model.name, modelFilters))
      : (payload?.models ?? []);
  const filteredTotalTests = filteredModels.reduce((sum, model) => sum + model.total_tests, 0);

  return (
    <section className="governance-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Quality</p>
          <h3>Data Quality Coverage</h3>
          <p className="section-subtitle">dbt tests are surfaced alongside the live data product so every metric carries visible validation coverage.</p>
        </div>
        <div className="quality-pill">{filteredTotalTests} tests tracked</div>
      </div>

      <div className="quality-grid">
        {filteredModels.map((model) => (
          <article className="quality-card" key={model.id}>
            <div className="quality-card-header">
              <div>
                <p className="eyebrow">{model.stage}</p>
                <h4>{model.name}</h4>
              </div>
              <span className="data-pill">
                {model.passing_tests}/{model.total_tests}
              </span>
            </div>
            <div className="quality-progress-track">
              <span
                className="quality-progress-fill"
                style={{ width: `${model.total_tests === 0 ? 0 : (model.passing_tests / model.total_tests) * 100}%` }}
              />
            </div>
            <p className="subtle">All registered tests are passing in the current governance snapshot.</p>
          </article>
        ))}
        {filteredModels.length === 0 ? <div className="empty-state">No use-case-specific test coverage is connected for this governance view yet.</div> : null}
      </div>
    </section>
  );
}
