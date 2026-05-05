import type { Metadata } from "next";

import { GovernanceControlTower } from "@/components/GovernanceControlTower";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Admin Governance - OpenCare Portal",
};

export default function AdminGovernancePage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Governance control tower"
      description="Admin governance workspace for classification, contracts, assets, lineage, quality, compliance, and steward-ready trust evidence."
      chips={[
        { label: "Classification inventory", tone: "primary" },
        { label: "Lineage-backed evidence", tone: "accent" },
      ]}
    >
      <GovernanceControlTower />
    </PageFrame>
  );
}
