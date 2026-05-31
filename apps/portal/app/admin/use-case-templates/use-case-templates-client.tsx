"use client";

import { useEffect, useState } from "react";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { UseCaseTemplateTable } from "@/components/admin/UseCaseTemplateTable";
import { UseCaseTemplateUploadPanel } from "@/components/admin/UseCaseTemplateUploadPanel";
import { PageFrame } from "@/components/page-frame";

type UseCaseTemplatesResponse = {
  packages?: UseCaseTemplatePackage[];
};

export function UseCaseTemplatesClient() {
  const [packages, setPackages] = useState<UseCaseTemplatePackage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPackages() {
      try {
        const response = await fetch("/api/portal/api/v1/admin/use-case-templates", {
          cache: "no-store",
          headers: { "x-opencare-admin-context": "admin" },
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as UseCaseTemplatesResponse;
        if (!cancelled) {
          setPackages((payload.packages ?? []).filter((pkg) => pkg.status !== "uninstalled"));
        }
      } catch {
        // Keep the shell visible if the list fetch fails.
      }
    }

    loadPackages().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageFrame
      eyebrow="Administration"
      title="Use Case Templates"
      description="Upload zipped OpenCare use-case packages, validate them safely, preview their structure, and control lifecycle actions."
    >
      <section className="grid">
        <UseCaseTemplateUploadPanel />
        <UseCaseTemplateTable packages={packages} />
      </section>
    </PageFrame>
  );
}
