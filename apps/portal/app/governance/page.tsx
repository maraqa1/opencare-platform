import type { Metadata } from "next";
import Link from "next/link";

import { GovernanceOverview } from "@/components/governance/GovernanceOverview";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Governance - OpenCare Portal",
};

export default function GovernancePage() {
  return (
    <PageFrame
      eyebrow="Governance"
      title="Data governance"
      description="Trust posture, use case coverage, KPI catalog, and program health for all governed operational data."
      chips={[
        { label: "Trust map", tone: "primary" },
        { label: "Evidence-based", tone: "accent" },
      ]}
      actions={[
        <Link key="health" className="button secondary" href="/governance/health">
          Health overview
        </Link>,
        <Link key="explore" className="secondary-link" href="/governance/explore">
          Explore
        </Link>,
      ]}
    >
      <GovernanceOverview />
    </PageFrame>
  );
}
