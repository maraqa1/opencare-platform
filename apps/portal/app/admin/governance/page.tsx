import type { Metadata } from "next";

import { UseCaseConfigurationPanel } from "@/components/admin/UseCaseConfigurationPanel";
import { GovernanceControlTower } from "@/components/GovernanceControlTower";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { getGovernanceUseCases } from "@/lib/governance-registry";
import { getFallbackUseCaseManifestEntries } from "@/lib/use-cases";

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

  const manifestUseCases =
    Object.keys(config.all_use_cases ?? {}).length > 0
      ? (config.all_use_cases ?? {})
      : getFallbackUseCaseManifestEntries();

  const useCases = Object.entries(manifestUseCases).map(([id, useCaseConfig]) => ({
    id,
    config: useCaseConfig,
  }));

  return (
    <PageFrame
      eyebrow="Administration"
      title="Governance control tower"
      description="Trust evidence for operational KPIs, datasets, dashboards, and decisions."
      pageClassName="governance-page"
    >
      <section className="grid">
        <UseCaseConfigurationPanel initialUseCases={useCases} />
      </section>
      <GovernanceControlTower useCases={getGovernanceUseCases()} />
    </PageFrame>
  );
}
