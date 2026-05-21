import type { Metadata } from "next";

import { GovernanceHealthOverview } from "@/components/governance/GovernanceHealthOverview";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Governance health - OpenCare Portal",
};

export default function GovernanceHealthPage() {
  return (
    <PageFrame
      eyebrow="Governance"
      title="Governance health"
      description="Coverage, posture, and instrumentation gaps across the governance program."
    >
      <GovernanceHealthOverview />
    </PageFrame>
  );
}
