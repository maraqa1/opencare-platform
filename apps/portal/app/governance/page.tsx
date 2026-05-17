import type { Metadata } from "next";
import Link from "next/link";

import {
  ApiState,
  EvidencePackList,
  IssueWorklist,
  SummaryStrip,
  UseCasePortfolioTable,
} from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernanceEvidencePacks, listGovernanceIssues, listGovernanceTables, listGovernanceUseCases } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Data Governance - OpenCare Portal",
};

export default async function GovernancePage() {
  const [useCasesResult, issuesResult, packsResult] = await Promise.all([
    listGovernanceUseCases(),
    listGovernanceIssues(),
    listGovernanceEvidencePacks(),
  ]);
  const useCases = useCasesResult.data;
  const issues = issuesResult.data;
  const packs = packsResult.data;
  const tableResults = await Promise.all(useCases.map((useCase) => listGovernanceTables(useCase.slug)));
  const tables = tableResults.flatMap((result) => result.data);
  const attributes = tables.flatMap((table) => table.attributes);
  const classifiedAttributes = attributes.filter((attribute) => attribute.classification !== "unknown");
  const ownerCoverage = useCases.length === 0
    ? "Unknown"
    : `${Math.round((useCases.filter((useCase) => useCase.owner && useCase.steward).length / useCases.length) * 100)}%`;

  return (
    <PageFrame
      eyebrow="Data Governance"
      title="Data Governance Overview"
      description="Use-case-scoped governance evidence for data assets, metrics, ownership, classification, issues, and exports."
      chips={[
        { label: `${useCases.length} governed use cases`, tone: "primary" },
        { label: `${issues.length} open issue records`, tone: "accent" },
      ]}
      actions={[
        <Link key="issues" className="button secondary" href="/governance/issues">
          Issues
        </Link>,
        <Link key="evidence" className="secondary-link" href="/governance/evidence">
          Evidence
        </Link>,
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={useCasesResult.error ?? issuesResult.error ?? packsResult.error ?? tableResults.find((result) => result.error)?.error} />
      <SummaryStrip
        metrics={[
          { label: "Governed Use Cases", value: useCases.length, detail: "Loaded from the governance resolver." },
          { label: "Data Quality Health", value: "Unknown", detail: "dbt run_results evidence is not loaded." },
          { label: "Ownership Coverage", value: ownerCoverage, detail: "Computed from owner and steward declarations." },
          { label: "Classified Attributes", value: `${classifiedAttributes.length}/${attributes.length}`, detail: "Policy-backed attribute classifications." },
          { label: "Open Issues", value: issues.length, detail: "Returned by the issue store resolver." },
        ]}
      />

      <section className="gv2-workspace-split wide-left">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Governed Use Cases</h2>
            <Link className="secondary-link" href="/use-cases">
              View all use cases
            </Link>
          </div>
          <UseCasePortfolioTable useCases={useCases} />
        </article>
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Open Governance Issues</h2>
            <Link className="secondary-link" href="/governance/issues">
              View all
            </Link>
          </div>
          <IssueWorklist issues={issues} />
        </article>
      </section>

      <section className="gv2-section">
        <div className="gv2-section-head">
          <h2>Governance Evidence</h2>
          <Link className="secondary-link" href="/governance/evidence">
            Evidence workspace
          </Link>
        </div>
        <EvidencePackList packs={packs} />
      </section>
    </PageFrame>
  );
}
