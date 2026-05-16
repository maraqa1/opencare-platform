import type { Metadata } from "next";
import Link from "next/link";

import { GovernanceControlTower } from "@/components/GovernanceControlTower";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Governance explorer - OpenCare Portal",
};

export default function GovernanceExplorePage() {
  return (
    <PageFrame
      eyebrow="Governance"
      title="Governance explorer"
      description="Trust evidence for operational KPIs, datasets, dashboards, and decisions."
      pageClassName="governance-page"
      actions={[
        <Link key="back" className="secondary-link" href="/governance">
          Overview
        </Link>,
      ]}
    >
      <GovernanceControlTower />
    </PageFrame>
  );
}
