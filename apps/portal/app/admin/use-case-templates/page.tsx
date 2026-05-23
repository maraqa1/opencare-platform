import type { Metadata } from "next";

import { UseCaseTemplateTable } from "@/components/admin/UseCaseTemplateTable";
import { UseCaseTemplateUploadPanel } from "@/components/admin/UseCaseTemplateUploadPanel";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";

export const metadata: Metadata = {
  title: "Use Case Templates - OpenCare Portal",
};

export default async function UseCaseTemplatesPage() {
  const response = await getApiJson<{ packages?: UseCaseTemplatePackage[] }>({
    path: "/api/v1/admin/use-case-templates",
    fallback: { packages: [] },
    cacheMode: "no-store",
    adminContext: true,
  });

  return (
    <PageFrame
      eyebrow="Administration"
      title="Use Case Templates"
      description="Upload zipped OpenCare use-case packages, validate them safely, preview their structure, and control lifecycle actions."
    >
      <section className="grid">
        <UseCaseTemplateUploadPanel />
        <UseCaseTemplateTable packages={response.packages ?? []} />
      </section>
    </PageFrame>
  );
}

