import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataQualitySummary } from "@/components/DataQualitySummary";
import { ImpactAnalysis } from "@/components/ImpactAnalysis";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceAssetById, getGovernanceKpiBySlug, getGovernanceLineageSources } from "@/lib/governance-registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kpi = getGovernanceKpiBySlug(slug);
  return {
    title: kpi ? `${kpi.label} technical trace - OpenCare Portal` : "Technical trace - OpenCare Portal",
  };
}

export default async function GovernanceKpiTracePage({ params }: PageProps) {
  const { slug } = await params;
  const kpi = getGovernanceKpiBySlug(slug);
  if (!kpi) {
    notFound();
  }

  const assetMatch = kpi.assetId ? getGovernanceAssetById(kpi.assetId) : null;
  const asset = assetMatch?.asset ?? null;
  const modelName = kpi.technicalModel ?? asset?.table ?? null;

  if (!modelName) {
    notFound();
  }

  return (
    <PageFrame
      eyebrow="Governance proof"
      title={`${kpi.label} technical trace`}
      description="This is the proof layer for the KPI trust journey, powered by the existing dbt and backend lineage graph."
      actions={[
        <Link key="hero" className="button primary" href={`/governance/kpi/${kpi.slug}`}>
          Back to trust journey
        </Link>,
      ]}
    >
      <section className="governance-proof-stack">
        <LineageDAG
          modelName={modelName}
          layout="stacked"
          declaredSources={assetMatch ? getGovernanceLineageSources(assetMatch.useCase) : []}
        />
        <div className="governance-proof-grid">
          <SourceFreshness sourceFilters={assetMatch?.useCase.diagnosticsScope?.freshnessSources} />
          <ImpactAnalysis
            sourceOptions={assetMatch?.useCase.sourceTables}
            initialSource={assetMatch?.useCase.sourceTables?.[0]}
          />
        </div>
        <DataQualitySummary modelFilters={assetMatch?.useCase.diagnosticsScope?.qualityModels} />
      </section>
    </PageFrame>
  );
}
