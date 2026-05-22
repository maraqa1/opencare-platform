import type { Metadata } from "next";

import { GovernanceHealthOverview } from "@/components/governance/GovernanceHealthOverview";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import {
  filterGovernanceKpisByIds,
  filterGovernanceUseCasesByIds,
  getGovernanceKpis,
  getGovernanceUseCases,
} from "@/lib/governance-registry";
import { getManifestEnabledUseCaseIds } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Governance health - OpenCare Portal",
};

export default async function GovernanceHealthPage() {
  const config = await getApiJson<{
    all_use_cases?: Record<string, { enabled?: boolean }>;
  }>({
    path: "/api/v1/config/use-cases",
    fallback: { all_use_cases: {} },
    cacheMode: "no-store",
  });

  const enabledUseCaseIds = getManifestEnabledUseCaseIds(config.all_use_cases ?? {});
  const useCases = filterGovernanceUseCasesByIds(getGovernanceUseCases(), enabledUseCaseIds);
  const kpis = filterGovernanceKpisByIds(getGovernanceKpis(), enabledUseCaseIds);

  return (
    <PageFrame
      eyebrow="Governance"
      title="Governance health"
      description="Coverage, posture, and instrumentation gaps across the governance program."
    >
      <GovernanceHealthOverview useCases={useCases} kpis={kpis} />
    </PageFrame>
  );
}
