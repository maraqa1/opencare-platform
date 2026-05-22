import type { Metadata } from "next";

import { KpiSearchEntry } from "@/components/governance/KpiSearchEntry";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { filterGovernanceKpisByIds, getGovernanceKpis } from "@/lib/governance-registry";
import { getManifestEnabledUseCaseIds } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Governance - OpenCare Portal",
};

export default async function GovernanceEntryPage() {
  const config = await getApiJson<{
    all_use_cases?: Record<string, { enabled?: boolean }>;
  }>({
    path: "/api/v1/config/use-cases",
    fallback: { all_use_cases: {} },
    cacheMode: "no-store",
  });

  const enabledUseCaseIds = getManifestEnabledUseCaseIds(config.all_use_cases ?? {});
  const kpis = filterGovernanceKpisByIds(getGovernanceKpis(), enabledUseCaseIds);

  return (
    <PageFrame
      eyebrow="Governance"
      title="Can I trust this number?"
      description="Start with one KPI and follow its trust journey from source system through transformation, evidence, analytics, and decision support."
      chips={[
        { label: "Business trust map", tone: "primary" },
        { label: "Technical proof one click away", tone: "accent" },
      ]}
    >
      <KpiSearchEntry kpis={kpis} />
    </PageFrame>
  );
}
