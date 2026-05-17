import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ApiState,
  GovernedTablesTable,
  IssuesList,
  LineagePreview,
  MetricList,
  SignalGrid,
  SummaryStrip,
} from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceUseCase, listGovernanceIssues, listGovernanceMetrics, listGovernanceTables } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Use Case Governance - OpenCare Portal",
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function UseCaseGovernancePage({ params }: PageProps) {
  const { slug } = await params;
  const [useCaseResult, metricsResult, tablesResult, issuesResult] = await Promise.all([
    getGovernanceUseCase(slug),
    listGovernanceMetrics(slug),
    listGovernanceTables(slug),
    listGovernanceIssues(),
  ]);
  const useCase = useCaseResult.data;
  if (!useCase) {
    notFound();
  }
  const classifiedAttributes = tablesResult.data
    .flatMap((table) => table.attributes)
    .filter((attribute) => attribute.classification !== "unknown").length;
  const scopedIssues = issuesResult.data.filter((issue) => issue.use_case_slug === slug);

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
      <ApiState error={useCaseResult.error ?? metricsResult.error ?? tablesResult.error ?? issuesResult.error} />
      <SummaryStrip
        metrics={[
          { label: "Governance Status", value: useCase.trust_status, detail: "Derived from freshness, quality, ownership, and coverage." },
          { label: "Data Quality Health", value: "Unknown", detail: "dbt test evidence is not loaded." },
          { label: "Classified Assets", value: classifiedAttributes, detail: "Attributes with policy-backed classification." },
          { label: "Ownership", value: useCase.owner ?? "Unknown", detail: useCase.steward ? `Steward: ${useCase.steward}` : "Steward Unknown" },
          { label: "Last Refresh", value: "Unknown", detail: "Freshness evidence is not loaded." },
        ]}
      />
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
          <GovernedTablesTable tables={tablesResult.data} slug={slug} />
        </article>
      </section>
      <section className="gv2-workspace-split wide-left">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Lineage Preview</h2>
            <Link className="secondary-link" href={`/governance/use-cases/${slug}/lineage`}>
              View full lineage
            </Link>
          </div>
          <LineagePreview slug={slug} />
        </article>
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Open Issues</h2>
            <Link className="secondary-link" href="/governance/issues">
              View all
            </Link>
          </div>
          <IssuesList issues={scopedIssues} />
        </article>
      </section>
    </PageFrame>
  );
}
