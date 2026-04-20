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

export async function RecordSpecification({ table }: { table: string }) {
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

  if (!spec.name) {
    return null;
  }

  return (
    <details className="record-spec">
      <summary>
        <span>Record Specification</span>
        <code>{spec.name}</code>
      </summary>
      <div className="record-spec-body">
        <div className="record-spec-meta">
          <span>
            Source: <code>{spec.sourceTable}</code>
          </span>
          <span>Grain: {spec.grain}</span>
          <span>Updated: {spec.lastUpdated ?? "Unavailable"}</span>
          <span>Rows: {(spec.rowCount ?? 0).toLocaleString()}</span>
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
                <td>{column.type}</td>
                <td>{column.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(spec.previewRows ?? []).length > 0 ? (
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
        ) : null}
      </div>
    </details>
  );
}
