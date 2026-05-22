import type { Metadata } from "next";

import { GovernanceControlTower } from "@/components/GovernanceControlTower";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { filterGovernanceUseCasesByIds, getGovernanceUseCases } from "@/lib/governance-registry";
import { getManifestEnabledUseCaseIds } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Admin Governance - OpenCare Portal",
};

export default async function AdminGovernancePage() {
  const config = await getApiJson<{
    all_use_cases?: Record<string, { enabled?: boolean }>;
  }>({
    path: "/api/v1/config/use-cases",
    fallback: { all_use_cases: {} },
    cacheMode: "no-store",
  });

  const enabledUseCaseIds = getManifestEnabledUseCaseIds(config.all_use_cases ?? {});
  const useCases = filterGovernanceUseCasesByIds(getGovernanceUseCases(), enabledUseCaseIds);

  return (
    <PageFrame
      eyebrow="Administration"
      title="Governance control tower"
      description="Trust evidence for operational KPIs, datasets, dashboards, and decisions."
      pageClassName="governance-page"
    >
      <GovernanceControlTower useCases={useCases} />
    </PageFrame>
  );
}
