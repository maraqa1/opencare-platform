import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KpiTrustHero } from "@/components/governance/KpiTrustHero";
import { KpiTrustJourney } from "@/components/governance/KpiTrustJourney";
import { PageFrame } from "@/components/page-frame";
import {
  getGovernanceAssetById,
  getGovernanceKpiBySlug,
  getGovernanceUseCases,
  getTrustStateForAsset,
} from "@/lib/governance-registry";
import { getGovernanceKpiRuntime } from "@/lib/governance-runtime";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kpi = getGovernanceKpiBySlug(slug);
  return {
    title: kpi ? `${kpi.label} trust - OpenCare Portal` : "KPI trust - OpenCare Portal",
  };
}

export default async function GovernanceKpiPage({ params }: PageProps) {
  const { slug } = await params;
  const kpi = getGovernanceKpiBySlug(slug);
  if (!kpi) {
    notFound();
  }

  const useCase = getGovernanceUseCases().find((item) => item.id === kpi.useCaseId);
  if (!useCase) {
    notFound();
  }

  const assetMatch = kpi.assetId ? getGovernanceAssetById(kpi.assetId) : null;
  const asset = assetMatch?.asset ?? null;
  const runtime = await getGovernanceKpiRuntime(kpi);
  const trustState = asset ? getTrustStateForAsset(asset) : kpi.trustState;

  return (
    <PageFrame
      eyebrow="Governance"
      title={kpi.label}
      description="Trace this KPI through source systems, transformations, trust signals, analytics exposure, and downstream decisions."
      actions={[
        <Link key="trace" className="button primary" href={`/governance/kpi/${kpi.slug}/trace`}>
          See technical trace
        </Link>,
        <Link key="health" className="secondary-link" href="/governance/health">
          Governance health
        </Link>,
      ]}
    >
      <KpiTrustHero
        kpi={kpi}
        useCase={useCase}
        trustState={trustState}
        value={runtime.value}
        periodLabel={runtime.periodLabel}
        supportingLabel={runtime.supportingLabel}
        changeLabel={runtime.changeLabel}
        freshnessLabel={runtime.freshnessLabel}
        summary={runtime.summary}
      />
      <KpiTrustJourney useCase={useCase} kpi={kpi} asset={asset} />
    </PageFrame>
  );
}
