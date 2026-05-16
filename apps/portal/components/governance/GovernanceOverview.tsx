import Link from "next/link";

import { KpiSearchEntry } from "@/components/governance/KpiSearchEntry";
import { SignalChip } from "@/components/governance/SignalChip";
import { TrustBadge } from "@/components/governance/TrustBadge";
import {
  type GovernanceKpi,
  type GovernanceUseCase,
  getGovernanceHealthDetails,
  getGovernanceKpis,
  getGovernanceOverview,
  getGovernanceUseCases,
  getTrustStateForUseCase,
} from "@/lib/governance-registry";

type StatusLike = string | undefined | null;

function signalTone(status: StatusLike): "positive" | "warning" | "critical" | "neutral" {
  switch (status) {
    case "fresh":
    case "passing":
    case "complete":
    case "trusted":
    case "compliant":
    case "certified":
      return "positive";
    case "warning":
    case "partial":
    case "draft":
    case "reviewed":
      return "warning";
    case "stale":
    case "failing":
    case "missing":
    case "gap":
      return "critical";
    default:
      return "neutral";
  }
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function UseCaseSummaryCard({
  useCase,
  kpis,
}: {
  useCase: GovernanceUseCase;
  kpis: GovernanceKpi[];
}) {
  const trustState = getTrustStateForUseCase(useCase);
  const useCaseKpis = kpis.filter((kpi) => kpi.useCaseId === useCase.id);
  const primaryKpi = useCaseKpis[0] ?? null;
  const datasetCount = useCase.governedDatasets.length;
  const termCount = useCase.dictionaryTerms.length;

  return (
    <article className="panel governance-overview-usecase-card">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">{useCase.domain}</p>
          <h3 className="section-heading">{useCase.name}</h3>
        </div>
        <TrustBadge state={trustState} />
      </div>

      <p className="section-subtitle">{useCase.qualitySummary.note}</p>

      <div className="governance-inline-list">
        <SignalChip
          label="Freshness"
          value={capitalise(useCase.qualitySummary.freshness)}
          tone={signalTone(useCase.qualitySummary.freshness)}
        />
        <SignalChip
          label="Quality"
          value={capitalise(useCase.qualitySummary.quality)}
          tone={signalTone(useCase.qualitySummary.quality)}
        />
        <SignalChip
          label="Lineage"
          value={capitalise(useCase.qualitySummary.lineage)}
          tone={signalTone(useCase.qualitySummary.lineage)}
        />
        <SignalChip
          label="Compliance"
          value={capitalise(useCase.complianceContext.posture)}
          tone={signalTone(useCase.complianceContext.posture)}
        />
      </div>

      <dl className="governance-overview-meta">
        <div>
          <dt>Governed assets</dt>
          <dd>{datasetCount}</dd>
        </div>
        <div>
          <dt>Glossary terms</dt>
          <dd>{termCount}</dd>
        </div>
        <div>
          <dt>Compliance</dt>
          <dd>{useCase.complianceContext.policies.length} policies</dd>
        </div>
        <div>
          <dt>KPIs tracked</dt>
          <dd>{useCaseKpis.length}</dd>
        </div>
      </dl>

      <div className="button-row">
        {primaryKpi ? (
          <Link className="button secondary" href={`/governance/kpi/${primaryKpi.slug}`}>
            Trust journey
          </Link>
        ) : null}
        <Link className="secondary-link" href="/governance/health">
          Health
        </Link>
      </div>
    </article>
  );
}

function TrustPostureBar() {
  const overview = getGovernanceOverview();

  const items: [string, string | number][] = [
    ["Use cases", overview.activeUseCases],
    ["Governed assets", overview.governedAssets],
    ["Certified", overview.certifiedAssets],
    ["Lineage", overview.lineageCoverage],
    ["Quality checks", overview.qualityChecksRepresented],
    ["Classified columns", overview.classifiedColumns],
    ["Policies mapped", overview.policiesMapped],
    ["Glossary", overview.glossaryCoverage],
  ];

  return (
    <section className="trust-posture-strip" aria-label="Governance program posture">
      {items.map(([label, value], index) => (
        <span className="trust-posture-inline-item" key={label}>
          <strong>{label}</strong> {value}
          {index < items.length - 1 ? <em>·</em> : null}
        </span>
      ))}
    </section>
  );
}

function GovernanceAreaNav() {
  const areas = [
    {
      href: "/governance/health",
      eyebrow: "Program view",
      title: "Governance Health",
      description: "Coverage, posture scores, unmapped KPIs, stale assets, and missing owners.",
    },
    {
      href: "/admin/governance",
      eyebrow: "Trust map",
      title: "Asset Registry",
      description: "Browse and inspect all governed data assets with certification and quality signals.",
    },
    {
      href: "/admin/governance",
      eyebrow: "Admin view",
      title: "Classification & Policies",
      description: "Column sensitivity classification, pattern rules, and compliance control mapping.",
    },
    {
      href: "/admin/governance",
      eyebrow: "Admin view",
      title: "Data Dictionary",
      description: "Business terms, metric definitions, ownership, and glossary coverage.",
    },
  ];

  return (
    <section className="governance-overview-area-nav" aria-label="Governance areas">
      <p className="eyebrow">Governance areas</p>
      <div className="governance-overview-area-grid">
        {areas.map((area) => (
          <Link key={`${area.href}-${area.title}`} className="panel governance-overview-area-card" href={area.href}>
            <p className="eyebrow">{area.eyebrow}</p>
            <strong>{area.title}</strong>
            <p>{area.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProgramHealthBar() {
  const health = getGovernanceHealthDetails();

  const counters: [string, number, string][] = [
    ["Uncertified assets", health.uncertifiedAssets.length, "/governance/health"],
    ["Missing owners", health.missingOwners.length, "/governance/health"],
    ["Stale assets", health.staleAssets.length, "/governance/health"],
    ["Unmapped KPIs", health.unmappedKpis.length, "/governance/health"],
  ];

  const allClear = counters.every(([, count]) => count === 0);

  return (
    <section className="panel governance-health-card" aria-label="Program health summary">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Program health</p>
          <h3 className="section-heading">
            {allClear ? "All checks clear" : "Active governance gaps"}
          </h3>
        </div>
        <Link className="secondary-link" href="/governance/health">
          Full health view
        </Link>
      </div>

      <div className="governance-health-strip">
        {counters.map(([label, count, href]) => (
          <article className="panel governance-health-card" key={label}>
            <p className="eyebrow">{label}</p>
            <strong
              style={
                count > 0 ? { color: "var(--oc-red, #c0392b)" } : undefined
              }
            >
              {count}
            </strong>
            {count > 0 ? (
              <Link className="secondary-link" href={href}>
                Review
              </Link>
            ) : (
              <p className="subtle">Clear</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function GovernanceOverview() {
  const kpis = getGovernanceKpis();
  const useCases = getGovernanceUseCases();

  return (
    <div className="governance-overview-shell">
      <TrustPostureBar />

      <section aria-label="Use case coverage">
        <p className="eyebrow" style={{ marginBottom: "12px" }}>
          Use case coverage
        </p>
        <div className="governance-overview-usecase-grid">
          {useCases.map((useCase) => (
            <UseCaseSummaryCard key={useCase.id} useCase={useCase} kpis={kpis} />
          ))}
        </div>
      </section>

      <KpiSearchEntry kpis={kpis} />

      <GovernanceAreaNav />

      <ProgramHealthBar />
    </div>
  );
}
