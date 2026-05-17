import type { Metadata } from "next";

import { ApiState, EvidencePackList } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernanceEvidencePacks } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Governance Evidence - OpenCare Portal",
};

export default async function GovernanceEvidencePage() {
  const packsResult = await listGovernanceEvidencePacks();

  return (
    <PageFrame
      eyebrow="Governance Evidence"
      title="Governance Evidence"
      description="Evidence pack descriptors and export readiness. Export actions are absent until the backend export phase is implemented."
      chips={[{ label: `${packsResult.data.length} packs`, tone: "primary" }]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={packsResult.error} />
      <EvidencePackList packs={packsResult.data} />
    </PageFrame>
  );
}
