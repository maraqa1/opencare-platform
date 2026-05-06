"use client";

import { useEffect, useMemo, useState } from "react";

type ClassificationInventoryRow = {
  asset_id: string;
  asset: string;
  asset_name?: string | null;
  asset_stage?: string | null;
  column: string;
  data_type?: string;
  description?: string;
  sensitivity: "public" | "internal" | "confidential" | "sensitive" | "restricted" | "phi" | "unknown" | string;
  domain: string;
  source: string;
  confidence: number;
  confidence_tier: "high" | "medium" | "low" | string;
  review_state: string;
  policy_actions: string[];
  enforcement_eligible: boolean;
  evidence?: Array<Record<string, unknown>>;
};

type ClassificationSummary = {
  total_columns: number;
  phi_columns: number;
  restricted_columns: number;
  sensitive_columns: number;
  unreviewed_columns: number;
  low_confidence_columns: number;
  enforcement_eligible_columns: number;
  by_sensitivity?: Record<string, number>;
  by_review_state?: Record<string, number>;
  by_confidence_tier?: Record<string, number>;
};

type ClassificationPayload = {
  items: ClassificationInventoryRow[];
  summary: ClassificationSummary;
};

const defaultPayload: ClassificationPayload = {
  items: [],
  summary: {
    total_columns: 0,
    phi_columns: 0,
    restricted_columns: 0,
    sensitive_columns: 0,
    unreviewed_columns: 0,
    low_confidence_columns: 0,
    enforcement_eligible_columns: 0,
  },
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function confidenceTone(value: string) {
  switch (value) {
    case "high":
      return "positive";
    case "medium":
      return "warning";
    case "low":
      return "critical";
    default:
      return "neutral";
  }
}

function reviewTone(value: string) {
  switch (value) {
    case "approved":
      return "positive";
    case "needs_review":
    case "not_reviewed":
      return "warning";
    case "rejected":
    case "expired":
      return "critical";
    default:
      return "neutral";
  }
}

function sensitivityClass(value: string) {
  return value === "phi" || value === "confidential" || value === "unknown" ? value : value;
}

function evidenceLabel(row: ClassificationInventoryRow) {
  const first = row.evidence?.[0];
  if (!first) {
    return "No evidence captured.";
  }
  const type = typeof first.type === "string" ? first.type : "evidence";
  const field = typeof first.field === "string" ? first.field : "";
  const value = first.value === undefined ? "" : String(first.value);
  return [label(type), field, value].filter(Boolean).join(" / ");
}

export function ClassificationInventory() {
  const [payload, setPayload] = useState<ClassificationPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedSensitivity, setSelectedSensitivity] = useState("all");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      const response = await fetch("/api/portal/api/v1/classification/inventory", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load classification inventory.");
      }
      const nextPayload = (await response.json()) as ClassificationPayload;
      if (!cancelled) {
        setPayload(nextPayload);
        setSelectedRowId(nextPayload.items[0] ? `${nextPayload.items[0].asset_id}.${nextPayload.items[0].column}` : null);
      }
    }

    loadInventory().catch(() => {
      if (!cancelled) {
        setPayload(defaultPayload);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const items = payload?.items ?? [];
  const summary = payload?.summary ?? defaultPayload.summary;
  const sensitivityOptions = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.sensitivity))).sort()],
    [items],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSensitivity = selectedSensitivity === "all" || item.sensitivity === selectedSensitivity;
      const haystack = `${item.asset} ${item.column} ${item.domain} ${item.source} ${item.description ?? ""}`.toLowerCase();
      return matchesSensitivity && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [items, query, selectedSensitivity]);
  const visibleItems = filteredItems.slice(0, 80);
  const selectedRow =
    items.find((item) => `${item.asset_id}.${item.column}` === selectedRowId) ??
    visibleItems[0] ??
    null;

  return (
    <section className="classification-inventory">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Classification Inventory</p>
          <h3>Column-Level Classification</h3>
          <p className="section-subtitle">
            Backend-resolved classifications from dbt metadata, rules, inheritance, and lineage inventory.
          </p>
        </div>
        <span className="governance-mini-pill">{summary.total_columns} columns</span>
      </div>

      <div className="classification-summary-grid">
        <article>
          <span className="eyebrow">PHI</span>
          <strong>{summary.phi_columns}</strong>
        </article>
        <article>
          <span className="eyebrow">Restricted</span>
          <strong>{summary.restricted_columns}</strong>
        </article>
        <article>
          <span className="eyebrow">Unreviewed</span>
          <strong>{summary.unreviewed_columns}</strong>
        </article>
        <article>
          <span className="eyebrow">Low Confidence</span>
          <strong>{summary.low_confidence_columns}</strong>
        </article>
        <article>
          <span className="eyebrow">Can Enforce</span>
          <strong>{summary.enforcement_eligible_columns}</strong>
        </article>
      </div>

      <div className="classification-toolbar">
        <label>
          <span className="eyebrow">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Asset, column, source, domain"
          />
        </label>
        <label>
          <span className="eyebrow">Sensitivity</span>
          <select value={selectedSensitivity} onChange={(event) => setSelectedSensitivity(event.target.value)}>
            {sensitivityOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="classification-grid">
        <div className="classification-table-shell">
          <table className="governance-policy-table classification-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Column</th>
                <th>Sensitivity</th>
                <th>Domain</th>
                <th>Confidence</th>
                <th>Review</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const rowId = `${item.asset_id}.${item.column}`;
                return (
                  <tr
                    key={rowId}
                    className={selectedRowId === rowId ? "selected" : ""}
                    onClick={() => setSelectedRowId(rowId)}
                  >
                    <td>
                      <strong>{item.asset}</strong>
                      <p className="subtle">{item.asset_stage ?? "unknown"}</p>
                    </td>
                    <td>
                      <code>{item.column}</code>
                      <p className="subtle">{item.data_type || "unknown"}</p>
                    </td>
                    <td>
                      <span className={`governance-classification-badge ${sensitivityClass(item.sensitivity)}`}>
                        {label(item.sensitivity)}
                      </span>
                    </td>
                    <td>{label(item.domain)}</td>
                    <td>
                      <span className={`governance-status-pill ${confidenceTone(item.confidence_tier)}`}>
                        {label(item.confidence_tier)}
                      </span>
                    </td>
                    <td>
                      <span className={`governance-status-pill ${reviewTone(item.review_state)}`}>
                        {label(item.review_state)}
                      </span>
                    </td>
                    <td>{item.enforcement_eligible ? item.policy_actions.map(label).join(", ") : "review only"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleItems.length === 0 ? (
            <div className="governance-empty-state">No classification rows match the current filters.</div>
          ) : null}
          {filteredItems.length > visibleItems.length ? (
            <p className="subtle">Showing first {visibleItems.length} of {filteredItems.length} matching columns.</p>
          ) : null}
        </div>

        <aside className="classification-detail">
          {selectedRow ? (
            <>
              <div className="governance-card-topline">
                <span className={`governance-classification-badge ${sensitivityClass(selectedRow.sensitivity)}`}>
                  {label(selectedRow.sensitivity)}
                </span>
                <span className={`governance-status-pill ${reviewTone(selectedRow.review_state)}`}>
                  {label(selectedRow.review_state)}
                </span>
              </div>
              <h4>{selectedRow.column}</h4>
              <p className="subtle">{selectedRow.asset}</p>
              <dl className="classification-detail-list">
                <div>
                  <dt>Source</dt>
                  <dd>{label(selectedRow.source)}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{selectedRow.confidence} / {label(selectedRow.confidence_tier)}</dd>
                </div>
                <div>
                  <dt>Domain</dt>
                  <dd>{label(selectedRow.domain)}</dd>
                </div>
                <div>
                  <dt>Policy Action</dt>
                  <dd>{selectedRow.enforcement_eligible ? selectedRow.policy_actions.map(label).join(", ") : "Review only"}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{evidenceLabel(selectedRow)}</dd>
                </div>
              </dl>
              <p className="classification-safety-note">
                Inferred classifications are visible for review and do not trigger enforcement until explicitly approved.
              </p>
              <div className="classification-action-grid" aria-label="Classification review actions">
                <button className="button secondary" type="button">Review</button>
                <button className="button primary" type="button">Approve</button>
                <button className="button secondary" type="button">Request change</button>
                <button className="button secondary" type="button">Mark false positive</button>
                <button className="button secondary" type="button">Assign steward</button>
              </div>
            </>
          ) : (
            <div className="governance-empty-state">Select a column to inspect classification evidence.</div>
          )}
        </aside>
      </div>
    </section>
  );
}
