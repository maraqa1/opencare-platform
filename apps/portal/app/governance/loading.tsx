export default function GovernanceLoading() {
  return (
    <div className="page governance-v2-page" aria-label="Loading Data Governance">
      <section className="hero">
        <div className="hero-header">
          <div className="hero-copy">
            <p className="eyebrow">Data Governance</p>
            <h1>Data Governance</h1>
            <p>Loading governance evidence.</p>
          </div>
        </div>
      </section>
      <section className="gv2-grid four" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className="gv2-panel gv2-skeleton" key={item} />
        ))}
      </section>
      <section className="gv2-grid two" aria-hidden="true">
        {[0, 1].map((item) => (
          <div className="gv2-panel gv2-skeleton tall" key={item} />
        ))}
      </section>
    </div>
  );
}
