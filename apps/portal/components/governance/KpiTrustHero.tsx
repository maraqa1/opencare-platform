import Link from "next/link";

import type { GovernanceKpi, GovernanceUseCase, TrustState } from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";

export function KpiTrustHero({
  kpi,
  useCase,
  trustState,
  value,
  periodLabel,
  supportingLabel,
  changeLabel,
  freshnessLabel,
  summary,
}: {
  kpi: GovernanceKpi;
  useCase: GovernanceUseCase;
  trustState: TrustState;
  value: string;
  periodLabel: string;
  supportingLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  summary: string;
}) {
  return (
    <section className="panel governance-kpi-hero">
      <div className="governance-kpi-hero-copy">
        <p className="eyebrow">{useCase.name}</p>
        <h2 className="governance-kpi-question">Can I trust this number?</h2>
        <h3 className="governance-kpi-title">{kpi.label}</h3>
        <p className="section-subtitle">{kpi.description}</p>
      </div>
      <div className="governance-kpi-hero-meta">
        <TrustBadge state={trustState} />
        <strong className="governance-kpi-value">{value}</strong>
        <span className="governance-kpi-period">{periodLabel}</span>
        <span className="governance-kpi-supporting">{supportingLabel}</span>
        <span className="governance-kpi-change">{changeLabel}</span>
        <span className="governance-kpi-freshness">{freshnessLabel}</span>
      </div>
      <div className="governance-kpi-hero-footer">
        <p>{summary}</p>
        <div className="button-row">
          <Link className="button primary" href={`/governance/kpi/${kpi.slug}/trace`}>
            See technical trace
          </Link>
          {kpi.assetId ? (
            <Link className="secondary-link" href={`/governance/asset/${kpi.assetId}`}>
              See full asset detail
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
