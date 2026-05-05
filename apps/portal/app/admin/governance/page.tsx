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
      description="Trust evidence for operational KPIs, datasets, dashboards, and decisions."
      pageClassName="governance-page"
    >
      <GovernanceControlTower />
    </PageFrame>
  );
}
