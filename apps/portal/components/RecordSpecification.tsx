import { getApiJson } from "@/lib/api";

function renderPreviewValue(value: unknown) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function relativeTime(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  return `${Math.round(minutes / 60)}h ago`;
}

function freshnessState(value?: string | null) {
  if (!value) {
    return { label: "Unknown", tone: "warning" };
  }
  const date = new Date(value);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes <= 240) {
    return { label: "Within SLA", tone: "normal" };
  }
  if (minutes <= 480) {
    return { label: "Approaching SLA", tone: "warning" };
  }
  return { label: "Stale", tone: "critical" };
}

function typeTone(type: string) {
  const value = type.toLowerCase();
  if (value.includes("int")) {
    return "blue";
  }
  if (value.includes("numeric") || value.includes("decimal")) {
    return "green";
  }
  if (value.includes("date") || value.includes("timestamp")) {
    return "amber";
  }
  return "purple";
}

export async function RecordSpecification({
  table,
  lineageHref = "/admin/governance",
  dictionaryHref = "/admin/governance",
}: {
  table: string;
  lineageHref?: string;
  dictionaryHref?: string;
}) {
  const spec = await getApiJson<{
    name?: string;
    sourceTable?: string;
    grain?: string;
    lastUpdated?: string | null;
    rowCount?: number;
    columns?: Array<{ name: string; type: string; description: string }>;
    previewRows?: Array<Record<string, unknown>>;
  }>({
    path: `/api/v1/record-spec/${encodeURIComponent(table)}`,
    fallback: {},
  });
  const lineageModel = table.split(".").pop() ?? table;
  const quality = await getApiJson<{
    total_tests?: number;
    passing_tests?: number;
    tests?: Array<{ name: string; test_type?: string; column?: string | null }>;
  }>({
    path: `/api/v1/lineage/quality/${encodeURIComponent(lineageModel)}`,
    fallback: { total_tests: 0, passing_tests: 0, tests: [] },
  });
  const state = freshnessState(spec.lastUpdated);

  if (!spec.name) {
    return null;
  }

  return (
    <details className="record-spec" id={`record-spec-${table}`}>
      <summary>
        <span>Record Specification</span>
        <code>{spec.name}</code>
      </summary>
      <div className="record-spec-body">
        <div className="record-spec-meta-grid">
          <div className="record-spec-meta-card">
            <p className="eyebrow">Grain</p>
            <strong>{spec.grain}</strong>
          </div>
          <div className="record-spec-meta-card">
            <p className="eyebrow">Rows</p>
            <strong>{(spec.rowCount ?? 0).toLocaleString()}</strong>
          </div>
          <div className="record-spec-meta-card">
            <p className="eyebrow">Last Updated</p>
            <strong>{relativeTime(spec.lastUpdated)}</strong>
          </div>
          <div className="record-spec-meta-card">
            <p className="eyebrow">Freshness</p>
            <strong className={`freshness-pill ${state.tone}`}>{state.label}</strong>
          </div>
        </div>
        <div className="record-spec-section">
          <div className="record-spec-section-header">
            <h4>Columns ({spec.columns?.length ?? 0})</h4>
            <span className="subtle">
              Source: <code>{spec.sourceTable}</code>
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {(spec.columns ?? []).map((column) => (
                <tr key={column.name}>
                  <td>
                    <code>{column.name}</code>
                  </td>
                  <td>
                    <span className={`type-badge ${typeTone(column.type)}`}>{column.type}</span>
                  </td>
                  <td>{column.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(spec.previewRows ?? []).length > 0 ? (
          <div className="record-spec-section">
            <div className="record-spec-section-header">
              <h4>Sample Data ({spec.previewRows?.length ?? 0} rows)</h4>
            </div>
            <div className="preview-grid">
              {(spec.previewRows ?? []).map((row, index) => (
                <article className="preview-card" key={`${spec.name}-preview-${index}`}>
                  <p className="eyebrow">Preview Row {index + 1}</p>
                  <dl className="preview-list">
                    {Object.entries(row).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{renderPreviewValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="record-spec-section">
          <div className="record-spec-section-header">
            <h4>Tests ({quality.passing_tests ?? 0} passing)</h4>
          </div>
          <div className="test-badge-grid">
            {(quality.tests ?? []).map((test) => (
              <span className="test-badge" key={`${test.name}-${test.column ?? "model"}`}>
                PASS {test.name}
              </span>
            ))}
          </div>
        </div>
        <div className="record-spec-actions">
          <a className="secondary-link" href={lineageHref}>
            View Full Lineage
          </a>
          <a className="secondary-link" href={dictionaryHref}>
            Dictionary
          </a>
          <a className="button secondary" href={`/api/portal/api/v1/record-spec/${encodeURIComponent(table)}`}>
            Download Schema
          </a>
        </div>
      </div>
    </details>
  );
}
