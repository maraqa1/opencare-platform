import type { Metadata } from "next";
import Link from "next/link";

import { ApiState, EmptyState, IssuesList, UseCaseCard } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernanceEvidencePacks, listGovernanceIssues, listGovernanceUseCases } from "@/lib/governance/api";

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

  return (
    <PageFrame
      eyebrow="Data Governance"
      title="Data Governance"
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
      <ApiState error={useCasesResult.error ?? issuesResult.error ?? packsResult.error} />
      <section className="gv2-grid four" aria-label="Data Governance summary">
        <article className="gv2-panel">
          <span className="gv2-muted">Portfolio</span>
          <strong className="gv2-stat">{useCases.length}</strong>
          <p>Governed use cases loaded from the resolver.</p>
        </article>
        <article className="gv2-panel">
          <span className="gv2-muted">Issues</span>
          <strong className="gv2-stat">{issues.length}</strong>
          <p>Issue records returned by the issue store resolver.</p>
        </article>
        <article className="gv2-panel">
          <span className="gv2-muted">Evidence packs</span>
          <strong className="gv2-stat">{packs.length}</strong>
          <p>Export pack descriptors available for review.</p>
        </article>
        <article className="gv2-panel">
          <span className="gv2-muted">Exports</span>
          <strong className="gv2-stat">Not instrumented</strong>
          <p>Export generation is scheduled for Phase 5b.</p>
        </article>
      </section>

      <section className="gv2-section">
        <div className="gv2-section-head">
          <h2>Governed Use Cases</h2>
          <Link className="secondary-link" href="/governance/policies">
            Classification policies
          </Link>
        </div>
        {useCases.length === 0 ? (
          <EmptyState title="No evidence loaded" detail="No governed use-case YAML files were returned by the backend resolver." />
        ) : (
          <div className="gv2-grid two">
            {useCases.map((useCase) => (
              <UseCaseCard useCase={useCase} key={useCase.slug} />
            ))}
          </div>
        )}
      </section>

      <section className="gv2-section">
        <div className="gv2-section-head">
          <h2>Open Issues</h2>
          <Link className="secondary-link" href="/governance/issues">
            Worklist
          </Link>
        </div>
        <IssuesList issues={issues} />
      </section>
    </PageFrame>
  );
}
