import type { Metadata } from "next";

import { ApiState, IssueWorklist, SummaryStrip } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { listGovernanceIssues, listGovernanceUseCases } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Governance Issues - OpenCare Portal",
};

export default async function GovernanceIssuesPage() {
  const [issuesResult, useCasesResult] = await Promise.all([listGovernanceIssues(), listGovernanceUseCases()]);

  return (
    <PageFrame
      eyebrow="Governance Issues"
      title="Governance Issues"
      description="Read-only issue worklist for missing owners, failed checks, stale data, policy expiry, and unclassified columns."
      chips={[
        { label: `${issuesResult.data.length} records`, tone: "primary" },
        { label: `${useCasesResult.data.length} use-case filters`, tone: "accent" },
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={issuesResult.error ?? useCasesResult.error} />
      <SummaryStrip
        metrics={[
          { label: "Open Issues", value: issuesResult.data.filter((issue) => issue.status === "open").length, detail: "Open issue records." },
          { label: "Assigned", value: issuesResult.data.filter((issue) => issue.status === "assigned").length, detail: "Assigned issue records." },
          { label: "Resolved This Week", value: "Unknown", detail: "Resolution timestamp evidence is not loaded." },
          { label: "High Severity", value: issuesResult.data.filter((issue) => issue.severity === "high" || issue.severity === "critical").length, detail: "High and critical issues." },
        ]}
      />
      <section className="gv2-panel">
        <div className="gv2-filter-row" aria-label="Issue filters">
          <span>Search issues: Not configured</span>
          <span>Status: all</span>
          <span>Severity: all</span>
          <span>Type: all</span>
          <span>Use case: all</span>
          <span>Owner: all</span>
        </div>
      </section>
      <IssueWorklist issues={issuesResult.data} />
    </PageFrame>
  );
}
