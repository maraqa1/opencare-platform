export function RecordSpecificationFallback({
  label = "Record specification",
}: {
  label?: string;
}) {
  return (
    <section className="record-spec" aria-label={`Loading ${label.toLowerCase()}`}>
      <div className="record-spec-body">
        <div className="record-spec-meta-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="record-spec-meta-card" key={index}>
              <span className="skeleton-line short" />
              <span className="skeleton-line medium" style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className="record-spec-section">
          <div className="record-spec-section-header">
            <span className="skeleton-line short" />
            <span className="skeleton-line medium" />
          </div>
          <div className="preview-grid">
            {Array.from({ length: 2 }).map((_, index) => (
              <article className="preview-card" key={index}>
                <span className="skeleton-line short" />
                <span className="skeleton-line medium" style={{ marginTop: 12 }} />
                <span className="skeleton-line medium" style={{ marginTop: 12 }} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
