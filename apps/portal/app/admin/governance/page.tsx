import { GovernanceControlTower } from "@/components/GovernanceControlTower";
import { PageFrame } from "@/components/page-frame";

export default function AdminGovernancePage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Governance Control Tower"
      description="Trusted data products, lineage, quality, and business definitions across OpenCare operational workspaces."
      chips={[
        { label: "Use-case contracts", tone: "primary" },
        { label: "Business glossary", tone: "accent" },
        { label: "Trust signals", tone: "primary" },
        { label: "Enterprise metadata", tone: "accent" },
      ]}
    >
      <GovernanceControlTower />
    </PageFrame>
  );
}
