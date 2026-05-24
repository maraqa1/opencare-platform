import type { Metadata } from "next";

import { UseCaseTemplateActionLog } from "@/components/admin/UseCaseTemplateActionLog";
import { UseCaseTemplateFileTree } from "@/components/admin/UseCaseTemplateFileTree";
import { UseCaseTemplateLifecyclePanel } from "@/components/admin/UseCaseTemplateLifecyclePanel";
import { UseCaseTemplatePreviewPanel } from "@/components/admin/UseCaseTemplatePreviewPanel";
import { UseCaseTemplateRuntimeStatusPanel } from "@/components/admin/UseCaseTemplateRuntimeStatusPanel";
import { UseCaseTemplateValidationReportPanel } from "@/components/admin/UseCaseTemplateValidationReport";
import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import type { UseCaseTemplatePackage, UseCaseTemplatePreview, UseCaseTemplateValidationReport } from "@/components/admin/use-case-template-types";

export const metadata: Metadata = {
  title: "Use Case Template Detail - OpenCare Portal",
};

type RouteContext = {
  params: Promise<{
    packageId: string;
  }>;
};

export default async function UseCaseTemplateDetailPage({ params }: RouteContext) {
  const { packageId } = await params;
  const [packageResponse, previewResponse, validationResponse, actionsResponse, filesResponse] = await Promise.all([
    getApiJson<{ package?: UseCaseTemplatePackage }>({
      path: `/api/v1/admin/use-case-templates/${packageId}`,
      fallback: { package: undefined },
      cacheMode: "no-store",
      adminContext: true,
    }),
    getApiJson<{ preview?: UseCaseTemplatePreview }>({
      path: `/api/v1/admin/use-case-templates/${packageId}/preview`,
      fallback: { preview: undefined },
      cacheMode: "no-store",
      adminContext: true,
    }),
    getApiJson<{ validation?: UseCaseTemplateValidationReport }>({
      path: `/api/v1/admin/use-case-templates/${packageId}/validation`,
      fallback: { validation: undefined },
      cacheMode: "no-store",
      adminContext: true,
    }),
    getApiJson<{ actions?: UseCaseTemplatePackage["actions"] }>({
      path: `/api/v1/admin/use-case-templates/${packageId}/actions`,
      fallback: { actions: [] },
      cacheMode: "no-store",
      adminContext: true,
    }),
    getApiJson<{ files?: Array<{ path: string; type: string; size?: number | null }> }>({
      path: `/api/v1/admin/use-case-templates/${packageId}/files`,
      fallback: { files: [] },
      cacheMode: "no-store",
      adminContext: true,
    }),
  ]);

  const pkg = packageResponse.package;

  return (
    <PageFrame
      eyebrow="Administration"
      title={pkg?.name ?? packageId}
      description="Review validation, preview install impact, inspect package files, and run lifecycle actions."
    >
      <section className="grid">
        <UseCaseTemplateRuntimeStatusPanel pkg={pkg} />
        {pkg ? <UseCaseTemplateLifecyclePanel pkg={pkg} /> : null}
        <UseCaseTemplateValidationReportPanel validation={validationResponse.validation} />
        <UseCaseTemplatePreviewPanel preview={previewResponse.preview} />
        <UseCaseTemplateFileTree files={filesResponse.files ?? []} />
        <UseCaseTemplateActionLog actions={actionsResponse.actions ?? []} />
      </section>
    </PageFrame>
  );
}
