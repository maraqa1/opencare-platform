import type { Metadata } from "next";

import { ApiState, PolicyRegistryWorkspace, SummaryStrip } from "@/components/governance-v2/GovernancePanels";
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
      <SummaryStrip
        metrics={[
          { label: "Active Policies", value: policiesResult.data.filter((policy) => policy.status === "active").length, detail: "Rules can match attributes." },
          { label: "Total Attributes", value: "Unknown", detail: "Attribute match count evidence is not loaded." },
          { label: "Classified", value: "Unknown", detail: "Classification coverage is computed by resolver." },
          { label: "Pending Review", value: "Unknown", detail: "Review workflow evidence is not loaded." },
        ]}
      />
      <section className="gv2-section">
        <div className="gv2-section-head">
          <h2>Policies</h2>
          <span className="gv2-muted">Policy detail includes rules, attributes, approvals, history, and YAML excerpt.</span>
        </div>
        <PolicyRegistryWorkspace policies={policiesResult.data} />
      </section>
    </PageFrame>
  );
}
