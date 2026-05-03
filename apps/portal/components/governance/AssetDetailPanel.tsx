import Link from "next/link";

import { TrustBadge } from "@/components/governance/TrustBadge";
import type { DictionaryTerm, GovernanceUseCase, GovernedDataset } from "@/lib/governance-registry";
import { getTrustStateForAsset } from "@/lib/governance-registry";

export function AssetDetailPanel({
  asset,
  useCase,
  relatedTerms,
}: {
  asset: GovernedDataset;
  useCase: GovernanceUseCase;
  relatedTerms: DictionaryTerm[];
}) {
  const trustState = getTrustStateForAsset(asset);

  return (
    <section className="panel governance-asset-detail">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">{useCase.name}</p>
          <h3 className="section-heading">{asset.name}</h3>
          <p className="section-subtitle">
            {asset.schema}.{asset.table}
          </p>
        </div>
        <TrustBadge state={trustState} />
      </div>

      <div className="governance-asset-detail-grid">
        <article className="governance-detail-card">
          <h4>Business meaning</h4>
          <p>{asset.businessMeaning}</p>
          <p className="subtle">Grain: {asset.grain ?? "Not yet instrumented"}</p>
        </article>
        <article className="governance-detail-card">
          <h4>Owner and steward</h4>
          <p>{asset.owner ?? "Owner not yet assigned"}</p>
          <p className="subtle">
            Steward: {asset.steward ?? "Not yet instrumented"} | Contact path not yet instrumented
          </p>
        </article>
        <article className="governance-detail-card">
          <h4>Trust signals</h4>
          <ul className="governance-bullet-list">
            <li>Freshness: {asset.freshnessStatus}</li>
            <li>Quality: {asset.testStatus}</li>
            <li>Lineage: {asset.lineageStatus}</li>
            <li>Certification: {asset.certification?.status ?? asset.certificationStatus}</li>
          </ul>
        </article>
        <article className="governance-detail-card">
          <h4>Related dashboards and consumers</h4>
          <div className="governance-inline-list">
            {(asset.relatedDashboards ?? []).map((item) => (
              <span className="governance-mini-pill" key={item}>
                {item}
              </span>
            ))}
            {(asset.downstreamConsumers ?? []).map((item) => (
              <span className="governance-mini-pill" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="governance-asset-detail-grid">
        <article className="governance-detail-card">
          <h4>Column contract</h4>
          {(asset.columns ?? []).length > 0 ? (
            <table className="governance-column-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th>Workspace</th>
                </tr>
              </thead>
              <tbody>
                {asset.columns?.map((column) => (
                  <tr key={column.name}>
                    <td>
                      <code>{column.name}</code>
                    </td>
                    <td className="subtle">{column.dataType}</td>
                    <td className="subtle">{column.sensitivityClass}</td>
                    <td>{column.suppressedInWorkspace ? "Suppressed" : "Exposed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtle">Column inventory not yet instrumented.</p>
          )}
        </article>

        <article className="governance-detail-card">
          <h4>Glossary links</h4>
          {relatedTerms.length > 0 ? (
            <>
              <div className="governance-inline-list">
                {relatedTerms.map((term) => (
                  <span className="governance-mini-pill" key={term.id}>
                    {term.term}
                  </span>
                ))}
              </div>
              <Link className="secondary-link" href="/dictionary">
                Open glossary
              </Link>
            </>
          ) : (
            <p className="subtle">Glossary linkage not yet instrumented.</p>
          )}
        </article>
      </div>
    </section>
  );
}
