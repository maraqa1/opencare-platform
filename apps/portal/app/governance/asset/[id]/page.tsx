import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetDetailPanel } from "@/components/governance/AssetDetailPanel";
import { ComplianceSummary } from "@/components/ComplianceSummary";
import { DataQualitySummary } from "@/components/DataQualitySummary";
import { ImpactAnalysis } from "@/components/ImpactAnalysis";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceAssetById } from "@/lib/governance-registry";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const match = getGovernanceAssetById(id);
  return {
    title: match ? `${match.asset.name} asset detail - OpenCare Portal` : "Asset detail - OpenCare Portal",
  };
}

export default async function GovernanceAssetPage({ params }: PageProps) {
  const { id } = await params;
  const match = getGovernanceAssetById(id);
  if (!match) {
    notFound();
  }

  const { asset, useCase } = match;
  const relatedTerms = useCase.dictionaryTerms.filter((term) =>
    term.relatedDatasets?.includes(asset.id),
  );

  return (
    <PageFrame
      eyebrow="Governance asset"
      title={asset.name}
      description="Inspect the governed asset behind the KPI story, including contract shape, lineage proof, freshness, tests, and downstream impact."
      actions={[
        <Link key="health" className="button secondary" href="/governance/health">
          Governance health
        </Link>,
      ]}
    >
      <AssetDetailPanel asset={asset} useCase={useCase} relatedTerms={relatedTerms} />
      <section className="governance-proof-stack">
        <LineageDAG modelName={asset.table} layout="stacked" />
        <div className="governance-proof-grid">
          <SourceFreshness sourceFilters={useCase.diagnosticsScope?.freshnessSources} />
          <ImpactAnalysis sourceOptions={useCase.sourceTables} initialSource={useCase.sourceTables?.[0]} />
        </div>
        <DataQualitySummary modelFilters={useCase.diagnosticsScope?.qualityModels} />
        <ComplianceSummary />
      </section>
    </PageFrame>
  );
}
