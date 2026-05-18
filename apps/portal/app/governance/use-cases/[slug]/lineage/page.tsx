import type { Metadata } from "next";
import Link from "next/link";

import { ApiState, LineageCanvas, SummaryStrip } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceLineage } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Use Case Lineage - OpenCare Portal",
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GovernanceLineagePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getGovernanceLineage(slug);

  return (
    <PageFrame
      eyebrow="Lineage"
      title="Use Case Lineage"
      description="Declared and observed lineage evidence for source, table, output, and consumer nodes."
      chips={[{ label: result.data ? `${result.data.nodes.length} nodes` : "Unknown nodes", tone: "primary" }]}
      actions={[
        <Link key="use-case" className="secondary-link" href={`/governance/use-cases/${slug}`}>
          Use case
        </Link>,
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={result.error} />
      <SummaryStrip
        metrics={[
          { label: "Use Case", value: slug, detail: "Lineage scoped to selected use case." },
          { label: "Clickable Nodes", value: result.data?.nodes.filter((node) => node.detail_route).length ?? "Unknown", detail: "Table/model nodes link to detail." },
          { label: "DQ Status", value: "Unknown", detail: "dbt run_results evidence is not loaded." },
          { label: "Observed Edges", value: result.data?.edges.length ?? "Unknown", detail: "dbt manifest evidence is not loaded." },
          { label: "Last Refresh", value: "Unknown", detail: "Freshness artifact evidence is not loaded." },
        ]}
      />
      <LineageCanvas lineage={result.data} />
    </PageFrame>
  );
}
