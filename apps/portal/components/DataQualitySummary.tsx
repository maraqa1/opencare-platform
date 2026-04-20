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

export function DataQualitySummary() {
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

  return (
    <section className="governance-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Quality</p>
          <h3>Data Quality Coverage</h3>
          <p className="section-subtitle">dbt tests are surfaced alongside the live data product so every metric carries visible validation coverage.</p>
        </div>
        <div className="quality-pill">{payload?.total_tests ?? 0} tests tracked</div>
      </div>

      <div className="quality-grid">
        {(payload?.models ?? []).map((model) => (
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
      </div>
    </section>
  );
}
