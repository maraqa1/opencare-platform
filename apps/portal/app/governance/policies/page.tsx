import type { Metadata } from "next";

import { ApiState, PolicyList } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernancePolicies } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Classification Policies - OpenCare Portal",
};

export default async function GovernancePoliciesPage() {
  const policiesResult = await listGovernancePolicies();

  return (
    <PageFrame
      eyebrow="Classification Policies"
      title="Classification Policies"
      description="Versioned classification policy registry with rules, scope, owner, and YAML-backed evidence."
      chips={[{ label: `${policiesResult.data.length} policies`, tone: "primary" }]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={policiesResult.error} />
      <PolicyList policies={policiesResult.data} />
    </PageFrame>
  );
}
