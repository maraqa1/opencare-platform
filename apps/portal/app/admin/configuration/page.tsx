import type { Metadata } from "next";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { UseCaseConfigurationPanel } from "@/components/admin/UseCaseConfigurationPanel";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { getFallbackUseCaseManifestEntries } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Configuration - OpenCare Portal",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UseCaseManifestEntry = {
  name?: string;
  description?: string;
  enabled?: boolean;
  source_tables?: string[];
  portal_pages?: Array<{ slug?: string; label?: string }>;
  api_prefix?: string;
  superset_dashboard_id?: string;
  record_specs?: Array<{ table?: string; grain?: string }>;
};

export default async function AdminConfigurationPage() {
  const config = await getApiJson<{
    all_use_cases?: Record<string, UseCaseManifestEntry>;
    imported_use_cases?: UseCaseTemplatePackage[];
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
      title="Configuration"
      description="Current use case settings, thresholds, alert rules, and enablement state."
    >
      <section className="grid">
        <UseCaseConfigurationPanel initialUseCases={useCases} initialImportedPackages={config.imported_use_cases ?? []} />
        <article className="panel span-6">
          <p className="eyebrow">Thresholds and Rules</p>
          <table className="table">
            <tbody>
              <tr>
                <th>Critical occupancy</th>
                <td>90%</td>
              </tr>
              <tr>
                <th>Warning occupancy</th>
                <td>75%</td>
              </tr>
              <tr>
                <th>Forecast horizon</th>
                <td>7 days</td>
              </tr>
              <tr>
                <th>Decision priority</th>
                <td>Severity, breach window, confidence</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </PageFrame>
  );
}
