import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import { getUseCaseByPath } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Materialized Use Case Workspace - OpenCare Portal",
};

type RouteContext = {
  params: Promise<{
    slug: string;
    tab?: string[];
  }>;
};

type WorkspaceDefinition = {
  identity?: {
    name?: string;
    slug?: string;
    version?: string;
    domain?: string;
  };
  workspace_route?: string;
  tabs?: Array<{
    id?: string;
    label?: string;
    route?: string;
    components?: string[];
    component_specs?: Array<{
      id?: string;
      component_type?: string;
      source_endpoint?: string;
      endpoint?: string;
      purpose?: string;
      empty_state?: string;
      phi_visibility_rule?: string;
      validation_expectation?: string;
      source_file?: string;
      section?: string;
    }>;
  }>;
  backend_endpoint_bindings?: {
    endpoints?: Array<{
      path?: string;
    }>;
  };
  state?: {
    materialization_status?: string;
    activation_status?: string;
    live_verification_status?: string;
  };
  kpis?: string[];
  personas?: Array<string | { title?: string; id?: string }>;
  data_sources?: Array<{
    name?: string;
    type?: string;
    endpoint?: string;
  }>;
  rendering?: {
    component_library?: string;
    supports_empty_state?: boolean;
    supports_populated_state?: boolean;
    supports_governance_drawers?: boolean;
  };
};

type EndpointPayload = {
  data?: unknown[];
  meta?: {
    empty?: boolean;
    as_of?: string;
    materialization_status?: string;
    filters_applied?: Record<string, string>;
  };
  warnings?: string[];
  errors?: string[];
};

function tabEndpoint(tabId: string) {
  switch (tabId) {
    case "overview":
      return "overview";
    case "executive":
    case "operational":
      return "kpis";
    case "governance":
      return "governance";
    case "drilldown":
      return "drilldown";
    default:
      return "overview";
  }
}

function tabLabel(tabId: string) {
  return tabId.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function previewValue(value: unknown) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function specEndpoint(spec: {
  source_endpoint?: string;
  endpoint?: string;
}) {
  return spec.source_endpoint ?? spec.endpoint ?? "n/a";
}

export default async function MaterializedUseCaseWorkspacePage({ params }: RouteContext) {
  const { slug, tab } = await params;
  const builtIn = getUseCaseByPath(`/use-cases/${slug}`);
  if (builtIn) {
    notFound();
  }

  const activeTab = tab?.[0] ?? "overview";
  const workspaceResponse = await getApiJson<{ workspace?: WorkspaceDefinition }>({
    path: `/api/v1/use-cases/${slug}/workspace`,
    fallback: { workspace: undefined },
    cacheMode: "no-store",
  });
  const workspace = workspaceResponse.workspace;
  if (!workspace) {
    notFound();
  }

  const tabs = (workspace.tabs ?? []).map((item) => ({
    key: item.id ?? "overview",
    label: item.label ?? tabLabel(item.id ?? "overview"),
    href: item.id === "overview" ? `/use-cases/${slug}` : `/use-cases/${slug}/${item.id}`,
  }));
  const selectedTab = workspace.tabs?.find((item) => item.id === activeTab) ?? workspace.tabs?.[0];
  const dataResponse = await getApiJson<EndpointPayload>({
    path: `/api/v1/use-cases/${slug}/${tabEndpoint(selectedTab?.id ?? "overview")}`,
    fallback: { data: [], meta: { empty: true }, warnings: [], errors: [] },
    cacheMode: "no-store",
  });

  return (
    <PageFrame
      eyebrow="Materialized Use Case"
      title={workspace.identity?.name ?? slug}
      description={workspace.identity?.domain ?? "Compiled and materialized workspace definition."}
      chips={[
        { label: workspace.state?.materialization_status ?? "unknown", tone: "accent" },
        { label: workspace.state?.activation_status ?? "inactive", tone: "primary" },
      ]}
    >
      <TabNav items={tabs} activeKey={selectedTab?.id ?? "overview"} />

      <section className="grid">
        <article className="panel span-8">
          <p className="eyebrow">{selectedTab?.label ?? tabLabel(activeTab)}</p>
          <h3 className="section-heading">Native BI workspace</h3>
          <p className="section-subtitle">
            This page is rendered from the materialized runtime definition rather than a hand-coded workspace.
          </p>
          <div className="use-case-outcome-list">
            {(selectedTab?.components ?? []).map((component) => (
              <span key={component}>{component}</span>
            ))}
          </div>
        </article>

        <article className="panel span-8">
          <p className="eyebrow">Component bindings</p>
          <h3 className="section-heading">Resolved native BI components</h3>
          <div className="grid">
            {(selectedTab?.component_specs ?? []).map((component) => (
              <article className="panel span-6" key={component.id ?? component.source_file ?? "component"}>
                <p className="eyebrow">{component.component_type ?? "component"}</p>
                <h4 className="section-heading">{component.id ?? "Unnamed component"}</h4>
                <p className="section-subtitle">
                  {component.purpose ?? component.validation_expectation ?? "Materialized from uploaded package specs."}
                </p>
                <dl className="use-case-evidence-list">
                  <div>
                    <dt>Endpoint</dt>
                    <dd>{specEndpoint(component)}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{component.phi_visibility_rule ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Empty state</dt>
                    <dd>{component.empty_state ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Registry source</dt>
                    <dd>{component.source_file ?? component.section ?? "n/a"}</dd>
                  </div>
                </dl>
              </article>
            ))}
            {(selectedTab?.component_specs ?? []).length === 0 ? (
              <article className="panel span-12">
                <p className="section-subtitle">No structured component specs were materialized for this tab.</p>
              </article>
            ) : null}
          </div>
        </article>

        <article className="panel span-4">
          <p className="eyebrow">Runtime status</p>
          <h3 className="section-heading">Live checks</h3>
          <dl className="use-case-evidence-list">
            <div>
              <dt>Materialization</dt>
              <dd>{workspace.state?.materialization_status ?? "unknown"}</dd>
            </div>
            <div>
              <dt>Activation</dt>
              <dd>{workspace.state?.activation_status ?? "unknown"}</dd>
            </div>
            <div>
              <dt>Live verification</dt>
              <dd>{workspace.state?.live_verification_status ?? "unknown"}</dd>
            </div>
            <div>
              <dt>As of</dt>
              <dd>{dataResponse.meta?.as_of ?? "n/a"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">KPIs</p>
          <h3 className="section-heading">Declared business metrics</h3>
          <div className="use-case-outcome-list">
            {(workspace.kpis ?? []).map((kpi) => (
              <span key={kpi}>{kpi}</span>
            ))}
          </div>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">Personas</p>
          <h3 className="section-heading">Target users</h3>
          <div className="use-case-outcome-list">
            {(workspace.personas ?? []).map((persona, index) => (
              <span key={`${index}-${typeof persona === "string" ? persona : persona?.id ?? persona?.title ?? "persona"}`}>
                {typeof persona === "string" ? persona : persona?.title ?? persona?.id ?? "Persona"}
              </span>
            ))}
          </div>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">Renderer</p>
          <h3 className="section-heading">Materialization capabilities</h3>
          <dl className="use-case-evidence-list">
            <div>
              <dt>Component library</dt>
              <dd>{workspace.rendering?.component_library ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Empty state</dt>
              <dd>{workspace.rendering?.supports_empty_state ? "supported" : "unknown"}</dd>
            </div>
            <div>
              <dt>Populated state</dt>
              <dd>{workspace.rendering?.supports_populated_state ? "declared" : "unknown"}</dd>
            </div>
            <div>
              <dt>Governance drawers</dt>
              <dd>{workspace.rendering?.supports_governance_drawers ? "supported" : "unknown"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">Data sources</p>
          <h3 className="section-heading">Declared runtime feeds</h3>
          <div className="use-case-outcome-list">
            {(workspace.data_sources ?? []).map((source) => (
              <span key={`${source.name ?? "source"}-${source.endpoint ?? "endpoint"}`}>
                {(source.name ?? "source") + " -> " + (source.endpoint ?? "n/a")}
              </span>
            ))}
          </div>
        </article>

        <article className="panel span-12">
          <p className="eyebrow">Endpoint binding</p>
          <h3 className="section-heading">Current tab data response</h3>
          <p className="section-subtitle">
            Empty-state rendering is acceptable for active workspaces until populated data is proven. `null` means unknown and `0` means actual zero.
          </p>
          {dataResponse.meta?.empty ? (
            <p className="section-subtitle">Empty state rendered successfully for this tab.</p>
          ) : null}
          <table className="table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(dataResponse.data) && dataResponse.data.length > 0 ? (
                Object.entries((dataResponse.data[0] as Record<string, unknown>) ?? {}).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{previewValue(value)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>No populated rows returned for this tab yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      </section>
    </PageFrame>
  );
}
