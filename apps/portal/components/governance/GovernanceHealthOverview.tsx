import Link from "next/link";

import {
  getGovernanceKpis,
  getGovernanceOverview,
  getGovernanceUseCases,
  getTrustStateForUseCase,
} from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";

export function GovernanceHealthOverview() {
  const overview = getGovernanceOverview();
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
    </div>
  );
}
