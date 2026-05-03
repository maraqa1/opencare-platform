"use client";

import { useEffect, useMemo, useState } from "react";

import { LineageDAG } from "@/components/LineageDAG";

type Metric = {
  metric_id: string;
  metric_name: string;
  metric_description: string;
  calculation_note: string;
  unit: string;
  category: string;
  source_table?: string;
  backing_dataset: string;
  use_case?: string;
  lineage_model?: string;
};

const UNIT_COLOURS: Record<string, string> = {
  "%": "#e3f2fd",
  beds: "#e8f5e9",
  count: "#fff3e0",
  boolean: "#f3e5f5",
  score: "#fce4ec",
};

function recordSpecHref(metric: Metric, recordSpecBaseHref?: string) {
  if (recordSpecBaseHref) {
    const base = recordSpecBaseHref.replace(/#.*$/, "");
    return `${base}#record-spec-${metric.backing_dataset}`;
  }

  if (metric.category === "forecast") {
    return `/occupancy?tab=forecast#record-spec-${metric.backing_dataset}`;
  }
  if (metric.category === "anomaly") {
    return `/occupancy?tab=alerts#record-spec-${metric.backing_dataset}`;
  }
  return `/occupancy?tab=occupancy#record-spec-${metric.backing_dataset}`;
}

export function DataDictionary({
  useCase,
  recordSpecBaseHref,
}: {
  useCase?: string;
  recordSpecBaseHref?: string;
}) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [search, setSearch] = useState("");
  const [activeLineage, setActiveLineage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDictionary() {
      const response = await fetch("/api/portal/api/v1/dictionary", { cache: "no-store" });
      const payload = (await response.json()) as { items?: Metric[] };
      if (!cancelled) {
        setMetrics((payload.items ?? []).filter((item) => !useCase || item.use_case === useCase));
      }
    }

    loadDictionary().catch(() => {
      if (!cancelled) {
        setMetrics([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [useCase]);

  const grouped = useMemo(() => {
    const filtered = metrics.filter((metric) => {
      const haystack = `${metric.metric_name} ${metric.metric_description} ${metric.calculation_note}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

    return filtered.reduce<Record<string, Metric[]>>((accumulator, metric) => {
      const key = metric.category || "uncategorised";
      accumulator[key] ??= [];
      accumulator[key].push(metric);
      return accumulator;
    }, {});
  }, [metrics, search]);

  return (
    <section className="governance-card dictionary-shell">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Definitions</p>
          <h3>Data Dictionary</h3>
          <p className="section-subtitle">Every metric explained. Every calculation traceable.</p>
        </div>
        <label className="dictionary-search-shell">
          <span className="subtle">Search metrics</span>
          <input
            className="dictionary-search"
            type="search"
            placeholder="Search occupancy, forecast, anomaly..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="dictionary-stack">
        {Object.entries(grouped).map(([category, categoryMetrics]) => (
          <section className="metric-category" key={category}>
            <div className="category-header">
              <h4>{category.toUpperCase()} METRICS</h4>
              <span className="count-badge">{categoryMetrics.length}</span>
            </div>
            <div className="metric-grid">
              {categoryMetrics.map((metric, index) => {
                const lineageModel = metric.lineage_model ?? metric.backing_dataset.split(".").pop() ?? "";
                const isExpanded = activeLineage === metric.metric_id;
                return (
                  <article key={metric.metric_id} className="metric-card" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="metric-card-header">
                      <div>
                        <p className="eyebrow">{metric.metric_id}</p>
                        <h5 className="metric-name">{metric.metric_name}</h5>
                        <p className="metric-description">{metric.metric_description}</p>
                      </div>
                      <span
                        className="unit-badge"
                        style={{ backgroundColor: UNIT_COLOURS[metric.unit] ?? "#f5f5f5" }}
                      >
                        {metric.unit}
                      </span>
                    </div>

                    <div className="calculation-block">
                      <span className="calc-label">Calculation</span>
                      <code>{metric.calculation_note}</code>
                      <span className="source-link">
                        Backing dataset: <code>{metric.backing_dataset}</code>
                      </span>
                    </div>

                    <div className="metric-actions">
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => setActiveLineage(isExpanded ? null : metric.metric_id)}
                      >
                        {isExpanded ? "Hide dataset lineage" : "View dataset lineage"}
                      </button>
                      <a className="secondary-link" href={recordSpecHref(metric, recordSpecBaseHref)}>
                        View record specification
                      </a>
                    </div>

                    {isExpanded ? (
                      <div className="inline-lineage">
                        <LineageDAG modelName={lineageModel} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
