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

type MetricGovernance = {
  classification: "public" | "internal" | "confidential" | "restricted";
  arabicLabel: string;
  status: "draft" | "under_review" | "approved" | "deprecated";
  owner: string;
  steward: string;
  pii: boolean;
  auditRequired: boolean;
  reviewCycleDays: number;
  nextReview: string;
  freshnessSlo: string;
  lastUpdated: string;
  completeness: string;
  approvedUseCases: string[];
  deniedUseCases: string[];
  lastClassifiedBy: string;
  lineageSteps: string[];
};

const UNIT_COLOURS: Record<string, string> = {
  "%": "#e3f2fd",
  beds: "#e8f5e9",
  count: "#fff3e0",
  boolean: "#f3e5f5",
  score: "#fce4ec",
};

const metricGovernanceDefaults: Record<string, Partial<MetricGovernance>> = {
  occupied_beds: {
    classification: "confidential",
    arabicLabel: "سري",
    owner: "Capacity Operations Team",
    steward: "Capacity Planning Lead",
    approvedUseCases: ["occupancy_monitoring", "capacity_planning"],
    deniedUseCases: ["patient_risk_scoring"],
    lineageSteps: [
      "raw.bed_events",
      "stg_bed_events (dbt)",
      "analytics.fct_bed_occupancy (dbt)",
      "output.forecast (R runtime)",
      "output.anomaly (R runtime)",
    ],
  },
  staffed_beds: {
    classification: "internal",
    arabicLabel: "داخلي",
    owner: "Capacity Operations Team",
    steward: "Bed Operations Steward",
  },
  occupancy_rate: {
    classification: "internal",
    arabicLabel: "داخلي",
    owner: "Clinical Operations Analytics",
    steward: "Capacity Planning Lead",
  },
  pressure_flag: {
    classification: "internal",
    arabicLabel: "داخلي",
    status: "under_review",
    owner: "Clinical Operations Analytics",
  },
};

function governanceForMetric(metric: Metric): MetricGovernance {
  const override = metricGovernanceDefaults[metric.metric_id] ?? {};
  const lineageModel = metric.lineage_model ?? metric.backing_dataset.split(".").pop() ?? metric.backing_dataset;
  return {
    classification: override.classification ?? (metric.category === "forecast" ? "confidential" : "internal"),
    arabicLabel: override.arabicLabel ?? (metric.category === "forecast" ? "سري" : "داخلي"),
    status: override.status ?? "approved",
    owner: override.owner ?? "Analytics Governance",
    steward: override.steward ?? "Data Stewardship Office",
    pii: override.pii ?? false,
    auditRequired: override.auditRequired ?? true,
    reviewCycleDays: override.reviewCycleDays ?? 365,
    nextReview: override.nextReview ?? "2027-05",
    freshnessSlo: override.freshnessSlo ?? "updated within 60 minutes",
    lastUpdated: override.lastUpdated ?? "2026-05-05 14:15 UTC",
    completeness: override.completeness ?? "all active departments required",
    approvedUseCases: override.approvedUseCases ?? [metric.use_case ?? "bed_pressure"],
    deniedUseCases: override.deniedUseCases ?? [],
    lastClassifiedBy: override.lastClassifiedBy ?? "Analytics Governance",
    lineageSteps:
      override.lineageSteps ??
      [
        metric.source_table ?? "raw source",
        `${lineageModel} (dbt)`,
        metric.backing_dataset,
        "portal metric",
      ],
  };
}

function classificationLabel(value: MetricGovernance["classification"]) {
  return value.toUpperCase();
}

function workflowLabel(value: MetricGovernance["status"]) {
  return value.replaceAll("_", " ");
}

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
  managementMode = false,
  useCase,
  recordSpecBaseHref,
}: {
  managementMode?: boolean;
  useCase?: string;
  recordSpecBaseHref?: string;
}) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

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

  const filteredMetrics = useMemo(() => {
    return metrics.filter((metric) => {
      const haystack = `${metric.metric_name} ${metric.metric_description} ${metric.calculation_note}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [metrics, search]);

  const grouped = useMemo(() => {
    return filteredMetrics.reduce<Record<string, Metric[]>>((accumulator, metric) => {
      const key = metric.category || "uncategorised";
      accumulator[key] ??= [];
      accumulator[key].push(metric);
      return accumulator;
    }, {});
  }, [filteredMetrics]);

  const selectedMetric = useMemo(() => {
    return (
      filteredMetrics.find((metric) => metric.metric_id === selectedMetricId) ??
      filteredMetrics[0] ??
      null
    );
  }, [filteredMetrics, selectedMetricId]);

  const coverage = useMemo(() => {
    const governed = metrics.map(governanceForMetric);
    const approved = governed.filter((item) => item.status === "approved").length;
    const classified = governed.filter((item) => Boolean(item.classification)).length;
    const underReview = governed.filter((item) => item.status === "under_review").length;
    return { approved, classified, total: governed.length, underReview };
  }, [metrics]);

  return (
    <section className={`governance-card dictionary-shell ${managementMode ? "dictionary-admin-shell" : ""}`}>
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">{managementMode ? "Governance Admin" : "Definitions"}</p>
          <h3>{managementMode ? "Metric Management" : "Data Dictionary"}</h3>
          <p className="section-subtitle">
            {managementMode
              ? "Manage metric definitions, ownership, classification, workflow status, and approved use cases."
              : "Every metric explained. Every calculation traceable. Every approved use visible."}
          </p>
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

      <div className="dictionary-coverage-strip">
        <span>
          Classified <strong>{coverage.classified}/{coverage.total}</strong>
        </span>
        <span>
          Approved <strong>{coverage.approved}</strong>
        </span>
        <span>
          Under review <strong>{coverage.underReview}</strong>
        </span>
        <span>
          Workflow <strong>Draft -&gt; Review -&gt; Approved -&gt; Deprecated</strong>
        </span>
      </div>

      <div className="dictionary-workspace">
        <div className="dictionary-stack">
        {Object.entries(grouped).map(([category, categoryMetrics]) => (
          <section className="metric-category" key={category}>
            <div className="category-header">
              <h4>{category.toUpperCase()} METRICS</h4>
              <span className="count-badge">{categoryMetrics.length}</span>
            </div>
            <div className="metric-grid">
              {categoryMetrics.map((metric, index) => {
                const governance = governanceForMetric(metric);
                const selected = selectedMetric?.metric_id === metric.metric_id;
                return (
                  <button
                    key={metric.metric_id}
                    className={`metric-card dictionary-metric-card ${selected ? "selected" : ""}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    type="button"
                    onClick={() => setSelectedMetricId(metric.metric_id)}
                  >
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
                    <div className="dictionary-badge-row">
                      <span className={`ndmo-badge ${governance.classification}`}>
                        {classificationLabel(governance.classification)}
                      </span>
                      <span className={`workflow-badge ${governance.status}`}>{workflowLabel(governance.status)}</span>
                    </div>

                    <div className="calculation-block">
                      <span className="calc-label">Calculation</span>
                      <code>{metric.calculation_note}</code>
                      <span className="source-link">
                        Backing dataset: <code>{metric.backing_dataset}</code>
                      </span>
                    </div>

                    {managementMode ? (
                      <div className="dictionary-admin-actions">
                        <span>Edit</span>
                        <span>Classify</span>
                        <span>Approve</span>
                        <span>Deprecate</span>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        </div>

        <MetricDetailPanel
          managementMode={managementMode}
          metric={selectedMetric}
          recordSpecBaseHref={recordSpecBaseHref}
        />
      </div>
    </section>
  );
}

function MetricDetailPanel({
  managementMode,
  metric,
  recordSpecBaseHref,
}: {
  managementMode: boolean;
  metric: Metric | null;
  recordSpecBaseHref?: string;
}) {
  if (!metric) {
    return <aside className="metric-detail-panel">{renderDictionaryEmpty("Select a metric to inspect governance evidence.")}</aside>;
  }

  const governance = governanceForMetric(metric);
  const lineageModel = metric.lineage_model ?? metric.backing_dataset.split(".").pop() ?? "";

  return (
    <aside className="metric-detail-panel">
      <div className="metric-detail-header">
        <div>
          <p className="eyebrow">{metric.metric_id}</p>
          <h3>{metric.metric_name}</h3>
          <p>{metric.metric_description}</p>
        </div>
        <span className={`ndmo-badge ${governance.classification}`}>
          {classificationLabel(governance.classification)}
        </span>
      </div>

      <section className="metric-detail-section">
        <h4>Classification</h4>
        <dl className="metric-detail-list">
          <div>
            <dt>NDMO Level</dt>
            <dd>{classificationLabel(governance.classification)} / {governance.arabicLabel}</dd>
          </div>
          <div>
            <dt>PII</dt>
            <dd>{governance.pii ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Audit Required</dt>
            <dd>{governance.auditRequired ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Review Cycle</dt>
            <dd>{governance.reviewCycleDays} days · next {governance.nextReview}</dd>
          </div>
        </dl>
      </section>

      <section className="metric-detail-section">
        <h4>Data Lineage</h4>
        <ol className="metric-lineage-list">
          {governance.lineageSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="inline-lineage">
          <LineageDAG modelName={lineageModel} />
        </div>
      </section>

      <section className="metric-detail-section">
        <h4>Approved Use Cases</h4>
        <div className="dictionary-badge-row">
          {governance.approvedUseCases.map((item) => (
            <span className="usecase-approval approved" key={item}>
              {item}
            </span>
          ))}
          {governance.deniedUseCases.map((item) => (
            <span className="usecase-approval denied" key={item}>
              {item} not approved
            </span>
          ))}
        </div>
      </section>

      <section className="metric-detail-section">
        <h4>Data Contract</h4>
        <dl className="metric-detail-list">
          <div>
            <dt>Freshness SLO</dt>
            <dd>{governance.freshnessSlo}</dd>
          </div>
          <div>
            <dt>Last Updated</dt>
            <dd>{governance.lastUpdated}</dd>
          </div>
          <div>
            <dt>Completeness</dt>
            <dd>{governance.completeness}</dd>
          </div>
          <div>
            <dt>Schema Type</dt>
            <dd>{metric.unit}</dd>
          </div>
        </dl>
      </section>

      <section className="metric-detail-section">
        <h4>Ownership</h4>
        <dl className="metric-detail-list">
          <div>
            <dt>Owner</dt>
            <dd>{governance.owner}</dd>
          </div>
          <div>
            <dt>Steward</dt>
            <dd>{governance.steward}</dd>
          </div>
          <div>
            <dt>Last Classified</dt>
            <dd>2026-05-04 by {governance.lastClassifiedBy}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{workflowLabel(governance.status)}</dd>
          </div>
        </dl>
      </section>

      <div className="metric-actions">
        <a className="secondary-link" href={recordSpecHref(metric, recordSpecBaseHref)}>
          View record specification
        </a>
        {managementMode ? (
          <>
            <button className="button secondary" type="button">Edit metric</button>
            <button className="button secondary" type="button">Add use case</button>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function renderDictionaryEmpty(message: string) {
  return <div className="governance-empty-state">{message}</div>;
}
