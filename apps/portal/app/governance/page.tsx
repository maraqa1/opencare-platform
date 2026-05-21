import type { Metadata } from "next";

import { KpiSearchEntry } from "@/components/governance/KpiSearchEntry";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceKpis } from "@/lib/governance-registry";

export const metadata: Metadata = {
  title: "Governance - OpenCare Portal",
};

export default function GovernanceEntryPage() {
  const kpis = getGovernanceKpis();

  return (
    <PageFrame
      eyebrow="Governance"
      title="Can I trust this number?"
      description="Start with one KPI and follow its trust journey from source system through transformation, evidence, analytics, and decision support."
      chips={[
        { label: "Business trust map", tone: "primary" },
        { label: "Technical proof one click away", tone: "accent" },
      ]}
    >
      <KpiSearchEntry kpis={kpis} />
    </PageFrame>
  );
}
