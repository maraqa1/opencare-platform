import type { Metadata } from "next";

import { ApiState, EvidenceCoverage, EvidenceExportList, EvidencePackList, SummaryStrip } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernanceEvidenceExports, listGovernanceEvidencePacks } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Governance Evidence - OpenCare Portal",
};

export default async function GovernanceEvidencePage() {
  const [packsResult, exportsResult] = await Promise.all([
    listGovernanceEvidencePacks(),
    listGovernanceEvidenceExports(),
  ]);

  return (
    <PageFrame
      eyebrow="Governance Evidence"
      title="Governance Evidence"
      description="Evidence pack descriptors and export readiness. Export actions are absent until the backend export phase is implemented."
      chips={[{ label: `${packsResult.data.length} packs`, tone: "primary" }]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={packsResult.error ?? exportsResult.error} />
      <SummaryStrip
        metrics={[
          { label: "Asset Inventory", value: packsResult.data.find((pack) => pack.id === "asset-inventory")?.state ?? "Unknown", detail: "Assets documented." },
          { label: "Metric Dictionary", value: packsResult.data.find((pack) => pack.id === "metric-definitions")?.state ?? "Unknown", detail: "Metrics defined." },
          { label: "Classification Register", value: packsResult.data.find((pack) => pack.id === "classification-register")?.state ?? "Unknown", detail: "Attribute policy traceability." },
          { label: "Lineage Summary", value: "Unknown", detail: "dbt manifest evidence is not loaded." },
          { label: "DQ Summary", value: "Unknown", detail: "dbt run_results evidence is not loaded." },
        ]}
      />
      <section className="gv2-workspace-split wide-left">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Exportable Evidence</h2>
            <span className="gv2-muted">Generated from current resolver state</span>
          </div>
          <EvidencePackList packs={packsResult.data} />
        </article>
        <article className="gv2-panel">
          <h2>Evidence Coverage</h2>
          <EvidenceCoverage packs={packsResult.data} />
        </article>
      </section>
      <section className="gv2-section">
        <div className="gv2-section-head">
          <h2>Recent Exports</h2>
        </div>
        <EvidenceExportList exports={exportsResult.data.items} />
      </section>
    </PageFrame>
  );
}
