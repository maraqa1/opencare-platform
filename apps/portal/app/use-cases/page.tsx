import type { Metadata } from "next";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { PageFrame } from "@/components/page-frame";
import { UseCaseBriefing } from "@/components/UseCaseBriefing";
import { getApiJson } from "@/lib/api";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Use Cases - OpenCare Portal",
};

export default async function UseCasesPage() {
  const config = await getApiJson<{
    all_use_cases?: Record<string, { enabled?: boolean }>;
    active_imported_use_cases?: UseCaseTemplatePackage[];
  }>({
      path: "/api/v1/config/use-cases",
      fallback: { all_use_cases: {} },
      cacheMode: "no-store",
    });

  const visibleUseCases = filterVisibleUseCases(useCases, config.all_use_cases ?? {});
  const importedUseCases = projectImportedPackagesToUseCases(config.active_imported_use_cases ?? []);
  const activeUseCases = [...visibleUseCases, ...importedUseCases];

  return (
    <PageFrame
      eyebrow="Use Cases"
      title="Customer-ready use case briefings"
      description="Each tab explains the business objective, source data, operating outputs, governance evidence, and source-to-decision story for a platform use case."
      chips={[
        { label: "Business objective", tone: "primary" },
        { label: "Data inputs", tone: "accent" },
        { label: "Governed outcomes", tone: "primary" },
      ]}
    >
      <UseCaseBriefing useCases={activeUseCases} />
    </PageFrame>
  );
}
