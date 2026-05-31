"use client";

import { useEffect, useState } from "react";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { PageFrame } from "@/components/page-frame";
import { UseCaseBriefing } from "@/components/UseCaseBriefing";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

type UseCaseConfigResponse = {
  all_use_cases?: Record<string, { enabled?: boolean }>;
  active_imported_use_cases?: UseCaseTemplatePackage[];
  imported_use_cases?: UseCaseTemplatePackage[];
};

const defaultConfig: UseCaseConfigResponse = {
  all_use_cases: {},
  active_imported_use_cases: [],
  imported_use_cases: [],
};

function getImportedSource(config: UseCaseConfigResponse) {
  if ((config.active_imported_use_cases?.length ?? 0) > 0) {
    return config.active_imported_use_cases ?? [];
  }

  return (config.imported_use_cases ?? []).filter(
    (pkg) =>
      pkg.enabled === true &&
      pkg.status !== "uninstalled" &&
      pkg.materialization_status === "materialized" &&
      (pkg.activation_status === "active" || pkg.activation_status === "live_verified"),
  );
}

export function UseCasesClient() {
  const [config, setConfig] = useState<UseCaseConfigResponse>(defaultConfig);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/portal/api/v1/config/use-cases", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as UseCaseConfigResponse;
        if (!cancelled) {
          setConfig(payload);
        }
      } catch {
        // Keep the shell visible if config fetch fails.
      }
    }

    loadConfig().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUseCases = filterVisibleUseCases(useCases, config.all_use_cases ?? {});
  const importedUseCases = projectImportedPackagesToUseCases(getImportedSource(config));
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
