import Link from "next/link";

import {
  getGovernanceHealthDetails,
  getGovernanceKpis,
  getGovernanceOverview,
  getGovernanceUseCases,
  getTrustStateForUseCase,
} from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";

export function GovernanceHealthOverview() {
  const overview = getGovernanceOverview();
  const details = getGovernanceHealthDetails();
  const useCases = getGovernanceUseCases();
  const kpis = getGovernanceKpis();

  return (
    <div className="governance-health-shell">
      <section className="governance-health-strip">
        {[
          ["Trusted assets", overview.certifiedAssets],
          ["Active warnings", overview.highRiskAssets],
          ["Sensitive columns", overview.classifiedColumns],
          ["Lineage coverage", overview.lineageCoverage],
        ].map(([label, value]) => (
          <article className="panel governance-health-card" key={label}>
            <p className="eyebrow">{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="governance-health-grid">
        {useCases.map((useCase) => {
          const kpi = kpis.find((item) => item.useCaseId === useCase.id);

          return (
            <article className="panel governance-health-card" key={useCase.id}>
              <div className="governance-panel-head">
                <div>
                  <p className="eyebrow">{useCase.domain}</p>
                  <h3 className="section-heading">{useCase.name}</h3>
                </div>
                <TrustBadge state={getTrustStateForUseCase(useCase)} />
              </div>
              <p className="section-subtitle">{useCase.qualitySummary.note}</p>
              <div className="button-row">
                {kpi ? (
                  <Link className="button secondary" href={`/governance/kpi/${kpi.slug}`}>
                    Open KPI journey
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="governance-health-grid">
        <article className="panel governance-health-card">
          <p className="eyebrow">Unmapped KPIs</p>
          <strong>{details.unmappedKpis.length}</strong>
          <p className="section-subtitle">KPI journeys that still need explicit business trust mapping.</p>
          <div className="governance-health-list">
            {details.unmappedKpis.length > 0 ? (
              details.unmappedKpis.map((item) => (
                <Link className="secondary-link" href={`/governance/kpi/${item.slug}`} key={item.slug}>
                  {item.label}
                </Link>
              ))
            ) : (
              <p className="subtle">All current KPIs have at least a baseline trust map.</p>
            )}
          </div>
        </article>

        <article className="panel governance-health-card">
          <p className="eyebrow">Missing owners</p>
          <strong>{details.missingOwners.length}</strong>
          <p className="section-subtitle">Governed assets that still have no accountable owner assigned.</p>
          <div className="governance-health-list">
            {details.missingOwners.length > 0 ? (
              details.missingOwners.slice(0, 4).map((item) => (
                <Link className="secondary-link" href={`/governance/asset/${item.assetId}`} key={item.assetId}>
                  {item.name}
                </Link>
              ))
            ) : (
              <p className="subtle">All current governed assets have owners assigned.</p>
            )}
          </div>
        </article>

        <article className="panel governance-health-card">
          <p className="eyebrow">Stale assets</p>
          <strong>{details.staleAssets.length}</strong>
          <p className="section-subtitle">Assets with freshness beyond the trusted operating window.</p>
          <div className="governance-health-list">
            {details.staleAssets.length > 0 ? (
              details.staleAssets.slice(0, 4).map((item) => (
                <Link className="secondary-link" href={`/governance/asset/${item.assetId}`} key={item.assetId}>
                  {item.name}
                </Link>
              ))
            ) : (
              <p className="subtle">No stale governed assets are currently flagged.</p>
            )}
          </div>
        </article>

        <article className="panel governance-health-card">
          <p className="eyebrow">Uncertified assets</p>
          <strong>{details.uncertifiedAssets.length}</strong>
          <p className="section-subtitle">Assets that are still draft, reviewed, or otherwise not yet certified.</p>
          <div className="governance-health-list">
            {details.uncertifiedAssets.length > 0 ? (
              details.uncertifiedAssets.slice(0, 4).map((item) => (
                <Link className="secondary-link" href={`/governance/asset/${item.assetId}`} key={item.assetId}>
                  {item.name} ({item.status.replaceAll("_", " ")})
                </Link>
              ))
            ) : (
              <p className="subtle">All current governed assets are certified.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
