import type { Metadata } from "next";
import Link from "next/link";

import type {
  UseCaseTemplatePackage,
  UseCaseTemplatePreview,
  UseCaseTemplateValidationReport,
} from "@/components/admin/use-case-template-types";
import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";

export const metadata: Metadata = {
  title: "Imported Use Case Workspace - OpenCare Portal",
};

type PageProps = {
  params: Promise<{
    packageId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const workspaceTabs = [
  { key: "overview", label: "Overview" },
  { key: "data", label: "Data" },
  { key: "dbt", label: "dbt" },
  { key: "backend", label: "Backend APIs" },
  { key: "portal", label: "Portal" },
  { key: "dashboards", label: "Dashboards" },
  { key: "governance", label: "Governance" },
  { key: "lifecycle", label: "Lifecycle" },
] as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeTab(value: string | undefined) {
  return workspaceTabs.find((tab) => tab.key === value)?.key ?? "overview";
}

function renderAssetList(items: string[] | undefined, emptyMessage: string) {
  if (!items || items.length === 0) {
    return <p className="section-subtitle">{emptyMessage}</p>;
  }

  return (
    <ul className="compact-feed">
      {items.map((item) => (
        <li key={item}>
          <code>{item}</code>
        </li>
      ))}
    </ul>
  );
}

function renderEntityList(preview: UseCaseTemplatePreview | undefined) {
  if (!preview?.demo_entities?.length) {
    return <p className="section-subtitle">No demo entities declared.</p>;
  }

  return (
    <div className="compact-feed">
      {preview.demo_entities.map((entity) => (
        <div className="compact-alert" key={`${entity.id}-${entity.output_seed}`}>
          <span className="status-dot live" />
          <div>
            <strong>{entity.id ?? "Entity"}</strong>
            <p>
              {(entity.type ?? "n/a")} | {entity.output_seed ?? "no seed file declared"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderWarnings(items: string[] | undefined, kind: "warning" | "conflict") {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="compact-feed">
      {items.map((item) => (
        <div className="compact-alert" key={`${kind}-${item}`}>
          <span className={`status-dot ${kind === "conflict" ? "critical" : "stale"}`} />
          <div>
            <strong>{kind === "conflict" ? "Conflict" : "Warning"}</strong>
            <p>{item}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ImportedUseCaseWorkspacePage({ params, searchParams }: PageProps) {
  const { packageId } = await params;
  const query = (await searchParams) ?? {};
  const activeTab = safeTab(firstParam(query.tab));

  const [packageResponse, previewResponse, validationResponse] = await Promise.all([
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
  ]);

  const pkg = packageResponse.package;
  const preview = previewResponse.preview;
  const validation = validationResponse.validation;
  const title = pkg?.name ?? preview?.name ?? packageId;
  const tabItems = workspaceTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    href: `/use-cases/imported/${encodeURIComponent(packageId)}?tab=${tab.key}`,
  }));

  return (
    <PageFrame
      eyebrow="Imported Use Case"
      title={title}
      description={
        preview?.business_summary?.problem ??
        pkg?.domain ??
        "Imported use-case workspace generated from the package contracts and preview assets."
      }
      chips={[
        { label: pkg?.enabled ? "Activated" : "Inactive", tone: pkg?.enabled ? "accent" : "primary" },
        {
          label:
            preview?.install_impact?.full_runtime_supported
              ? "Runtime-ready"
              : "Imported workspace",
          tone: preview?.install_impact?.full_runtime_supported ? "accent" : "primary",
        },
      ]}
      actions={
        <div className="button-row">
          <Link className="button secondary" href={`/admin/use-case-templates/${encodeURIComponent(packageId)}`}>
            Open Template Admin
          </Link>
          {preview?.route_to_be_added ? (
            <span className="secondary-link">Target route: {preview.route_to_be_added}</span>
          ) : null}
        </div>
      }
    >
      <TabNav items={tabItems} activeKey={activeTab} />

      <section className="grid">
        <article className="panel span-12">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Workspace Status</p>
              <h3 className="section-heading">Imported package experience</h3>
              <p className="section-subtitle">
                This workspace is rendered from the uploaded package contracts, preview assets, and validation output.
              </p>
            </div>
            <div className="trust-line strong">
              <span>{pkg?.status ?? "unknown"}</span>
              <span>{validation?.status ?? "unvalidated"}</span>
              <span>{pkg?.version ?? "n/a"}</span>
            </div>
          </div>
        </article>

        {activeTab === "overview" ? (
          <>
            <article className="panel span-4">
              <p className="eyebrow">Business Summary</p>
              <h3 className="section-heading">Use-case contract</h3>
              <p className="section-subtitle">
                {preview?.business_summary?.problem ?? "No business problem was declared in the package preview."}
              </p>
              <div className="metric-grid compact">
                <div className="forecast-stat">
                  <p className="eyebrow">Personas</p>
                  <strong>{preview?.business_summary?.personas?.length ?? 0}</strong>
                  <p className="section-subtitle">Declared target users</p>
                </div>
                <div className="forecast-stat">
                  <p className="eyebrow">KPIs</p>
                  <strong>{preview?.business_summary?.kpis?.length ?? 0}</strong>
                  <p className="section-subtitle">Metrics in contract</p>
                </div>
                <div className="forecast-stat">
                  <p className="eyebrow">Decisions</p>
                  <strong>{preview?.business_summary?.decisions?.length ?? 0}</strong>
                  <p className="section-subtitle">Operational actions supported</p>
                </div>
              </div>
            </article>

            <article className="panel span-4">
              <p className="eyebrow">Workspace Targets</p>
              <h3 className="section-heading">Route and API contract</h3>
              <div className="compact-feed">
                <p>
                  <strong>Portal route:</strong> <code>{preview?.route_to_be_added ?? "n/a"}</code>
                </p>
                <p>
                  <strong>API prefix:</strong> <code>{preview?.api_prefix ?? "n/a"}</code>
                </p>
                <p>
                  <strong>Lifecycle:</strong> {(preview?.lifecycle_capabilities ?? []).join(", ") || "n/a"}
                </p>
              </div>
            </article>

            <article className="panel span-4">
              <p className="eyebrow">Validation</p>
              <h3 className="section-heading">Current validation posture</h3>
              <div className="metric-grid compact">
                <div className="forecast-stat">
                  <p className="eyebrow">Passed</p>
                  <strong>{validation?.summary.passed ?? 0}</strong>
                  <p className="section-subtitle">Checks passing</p>
                </div>
                <div className="forecast-stat">
                  <p className="eyebrow">Warnings</p>
                  <strong>{validation?.summary.warnings ?? 0}</strong>
                  <p className="section-subtitle">Review items</p>
                </div>
                <div className="forecast-stat">
                  <p className="eyebrow">Failed</p>
                  <strong>{validation?.summary.failed ?? 0}</strong>
                  <p className="section-subtitle">Blocking issues</p>
                </div>
              </div>
            </article>

            <article className="panel span-6">
              <p className="eyebrow">KPIs</p>
              <h3 className="section-heading">Declared business metrics</h3>
              {renderAssetList(preview?.business_summary?.kpis, "No KPI declarations found.")}
            </article>

            <article className="panel span-6">
              <p className="eyebrow">Personas</p>
              <h3 className="section-heading">Who this use case is for</h3>
              {renderAssetList(preview?.business_summary?.personas, "No personas declared.")}
            </article>
          </>
        ) : null}

        {activeTab === "data" ? (
          <>
            <article className="panel span-6">
              <p className="eyebrow">Demo Entities</p>
              <h3 className="section-heading">Synthetic entity model</h3>
              {renderEntityList(preview)}
            </article>
            <article className="panel span-6">
              <p className="eyebrow">Synthetic Assets</p>
              <h3 className="section-heading">Seed and scenario files</h3>
              {renderAssetList(preview?.synthetic_seed_files, "No synthetic seed files declared.")}
            </article>
          </>
        ) : null}

        {activeTab === "dbt" ? (
          <article className="panel span-12">
            <p className="eyebrow">dbt Assets</p>
            <h3 className="section-heading">Transformation and modeling contract</h3>
            {renderAssetList(preview?.dbt_models, "No dbt assets declared.")}
          </article>
        ) : null}

        {activeTab === "backend" ? (
          <article className="panel span-12">
            <p className="eyebrow">Backend API Assets</p>
            <h3 className="section-heading">Service and route declarations</h3>
            {renderAssetList(preview?.backend_assets, "No backend assets declared.")}
          </article>
        ) : null}

        {activeTab === "portal" ? (
          <article className="panel span-12">
            <p className="eyebrow">Portal Assets</p>
            <h3 className="section-heading">Workspace pages and UI declarations</h3>
            {renderAssetList(preview?.portal_assets, "No portal assets declared.")}
          </article>
        ) : null}

        {activeTab === "dashboards" ? (
          <article className="panel span-12">
            <p className="eyebrow">Dashboards</p>
            <h3 className="section-heading">Dashboard and chart definitions</h3>
            {renderAssetList(preview?.dashboard_assets, "No dashboard assets declared.")}
          </article>
        ) : null}

        {activeTab === "governance" ? (
          <article className="panel span-12">
            <p className="eyebrow">Governance</p>
            <h3 className="section-heading">Governance and evidence assets</h3>
            {renderAssetList(preview?.governance_assets, "No governance assets declared.")}
          </article>
        ) : null}

        {activeTab === "lifecycle" ? (
          <>
            <article className="panel span-6">
              <p className="eyebrow">Lifecycle</p>
              <h3 className="section-heading">Materialization posture</h3>
              <div className="compact-feed">
                <p>
                  <strong>Materialization mode:</strong>{" "}
                  {preview?.install_impact?.materialization_mode ?? "n/a"}
                </p>
                <p>
                  <strong>Full runtime supported:</strong>{" "}
                  {preview?.install_impact?.full_runtime_supported ? "yes" : "no"}
                </p>
              </div>
              {renderWarnings(preview?.conflicts, "conflict")}
              {renderWarnings(preview?.warnings, "warning")}
            </article>
            <article className="panel span-6">
              <p className="eyebrow">Validation Issues</p>
              <h3 className="section-heading">Blocking errors and warnings</h3>
              {renderWarnings(validation?.blocking_errors, "conflict")}
              {renderWarnings(validation?.warnings, "warning")}
            </article>
          </>
        ) : null}
      </section>
    </PageFrame>
  );
}
