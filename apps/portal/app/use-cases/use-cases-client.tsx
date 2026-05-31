"use client";

import { useEffect, useState } from "react";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { PageFrame } from "@/components/page-frame";
import { UseCaseBriefing } from "@/components/UseCaseBriefing";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

type UseCaseConfigResponse = {
  all_use_cases?: Record<string, { enabled?: boolean }>;
  active_imported_use_cases?: UseCaseTemplatePackage[];
};

const defaultUseCaseConfig: UseCaseConfigResponse = { all_use_cases: {}, active_imported_use_cases: [] };

export function UseCasesClient() {
  const [config, setConfig] = useState<UseCaseConfigResponse>(defaultUseCaseConfig);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/portal/api/v1/config/use-cases", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const nextConfig = (await response.json()) as UseCaseConfigResponse;
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch {
        // Keep the initial lightweight shell if config fetch fails.
      }
    }

    loadConfig().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUseCases = filterVisibleUseCases(useCases, config.all_use_cases ?? {});
  const importedUseCases = projectImportedPackagesToUseCases(config.active_imported_use_cases ?? []);
  const activeUseCases = [...importedUseCases, ...visibleUseCases];

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
