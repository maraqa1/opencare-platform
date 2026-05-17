import type { Metadata } from "next";
import Link from "next/link";

import { ApiState, LineageCanvas } from "@/components/governance-v2/GovernancePanels";
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
      <LineageCanvas lineage={result.data} />
    </PageFrame>
  );
}
