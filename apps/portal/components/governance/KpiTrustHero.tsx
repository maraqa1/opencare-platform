import Link from "next/link";

import type { GovernanceKpi, GovernanceUseCase, TrustState } from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";

function heroMetrics(useCase: GovernanceUseCase) {
  const assets = useCase.governedDatasets;
  const trustedAssets = assets.filter((asset) => asset.certification?.status === "certified").length;
  const warnings = assets.filter(
    (asset) =>
      asset.freshnessStatus === "warning" ||
      asset.freshnessStatus === "stale" ||
      asset.testStatus === "warning" ||
      asset.testStatus === "failing" ||
      (asset.openRisks?.length ?? 0) > 0,
  ).length;
  const sensitiveColumns = assets.reduce(
    (count, asset) =>
      count +
      (asset.columns?.filter(
        (column) => column.sensitivityClass === "sensitive" || column.sensitivityClass === "restricted",
      ).length ?? 0),
    0,
  );
  const lineageCovered = assets.filter(
    (asset) => asset.lineageStatus === "complete" || asset.lineageStatus === "partial",
  ).length;

  return [
    { label: "Trusted assets", value: `${trustedAssets}/${assets.length}` },
    { label: "Active warnings", value: `${warnings}` },
    { label: "Sensitive columns", value: `${sensitiveColumns}` },
    { label: "Lineage coverage", value: `${lineageCovered}/${assets.length}` },
  ];
}

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
  const metrics = heroMetrics(useCase);

  return (
    <section className="panel governance-kpi-hero">
      <div className="governance-kpi-hero-copy">
        <p className="eyebrow">{useCase.name}</p>
        <h2 className="governance-kpi-question">Can I trust this number?</h2>
        <h3 className="governance-kpi-title">{kpi.label}</h3>
        <p className="section-subtitle">{kpi.description}</p>
        <div className="governance-kpi-posture-strip">
          {metrics.map((metric) => (
            <span className="governance-kpi-posture-item" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </span>
          ))}
        </div>
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
