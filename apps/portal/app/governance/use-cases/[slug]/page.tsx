import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiState, MetricList, SignalGrid, TableList } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceUseCase, listGovernanceMetrics, listGovernanceTables } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Use Case Governance - OpenCare Portal",
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function UseCaseGovernancePage({ params }: PageProps) {
  const { slug } = await params;
  const [useCaseResult, metricsResult, tablesResult] = await Promise.all([
    getGovernanceUseCase(slug),
    listGovernanceMetrics(slug),
    listGovernanceTables(slug),
  ]);
  const useCase = useCaseResult.data;
  if (!useCase) {
    notFound();
  }

  return (
    <PageFrame
      eyebrow="Use Case Governance"
      title={useCase.name}
      description="Governance status, declared KPIs, governed tables, lineage preview, ownership, and evidence status for this use case."
      chips={[
        { label: `Owner: ${useCase.owner ?? "Unknown"}`, tone: "primary" },
        { label: `Steward: ${useCase.steward ?? "Unknown"}`, tone: "accent" },
      ]}
      actions={[
        <Link key="lineage" className="button secondary" href={`/governance/use-cases/${slug}/lineage`}>
          Lineage
        </Link>,
        <Link key="issues" className="secondary-link" href="/governance/issues">
          Issues
        </Link>,
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={useCaseResult.error ?? metricsResult.error ?? tablesResult.error} />
      <SignalGrid signals={useCase.signals} />

      <section className="gv2-grid two">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>KPIs</h2>
          </div>
          <MetricList metrics={metricsResult.data} slug={slug} />
        </article>
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Governed Tables</h2>
          </div>
          <TableList tables={tablesResult.data} slug={slug} />
        </article>
      </section>
    </PageFrame>
  );
}
