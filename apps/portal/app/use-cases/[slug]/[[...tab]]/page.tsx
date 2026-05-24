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
      expected_fields?: string[];
      filter_dependencies?: string[];
      display_contract?: {
        title?: string;
        subtitle?: string;
        format?: string;
        unit?: string;
        empty_message?: string;
        value_field?: string;
        precision?: number;
      };
      layout_contract?: {
        zone?: string;
        section?: string;
        order?: number;
      };
      interaction_contract?: {
        click_behavior?: string;
        row_click_behavior?: string;
      };
      governance_contract?: {
        classification?: string;
        phi_mode?: string;
        evidence_target?: string;
      };
      materialization_profile?: {
        renderer?: string;
        mandatory?: boolean;
        blocks_activation?: boolean;
      };
      data_binding_resolved?: {
        data_path?: string;
      };
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
    materialization_mode?: string;
    required_runtime_capabilities?: Record<string, unknown>;
  };
  smoke_tests?: {
    route_checks?: Array<{ id?: string }>;
    endpoint_checks?: Array<{ id?: string }>;
    component_render_checks?: Array<{ id?: string }>;
  };
};

type EndpointPayload = {
  data?: unknown[] | Record<string, unknown> | null;
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

function firstDataRecord(data: EndpointPayload["data"]): Record<string, unknown> {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" && !Array.isArray(first) ? (first as Record<string, unknown>) : {};
  }
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return {};
}

function lookupPath(source: unknown, path: string | undefined): unknown {
  if (!path) {
    return undefined;
  }
  const normalized = path.replace(/^\$\./, "").replace(/^data\./, "");
  if (!normalized) {
    return source;
  }
  return normalized.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function formatMetricValue(value: unknown, format: string | undefined, precision: number | undefined, unit: string | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "No data";
  }
  if (typeof value !== "number") {
    return String(value);
  }
  const digits = typeof precision === "number" ? precision : 1;
  if (format === "percentage") {
    return `${value.toFixed(digits)}${unit ?? "%"}`;
  }
  if (format === "duration_days") {
    return `${value.toFixed(digits)} ${unit ?? "days"}`;
  }
  if (format === "integer") {
    return `${Math.round(value).toLocaleString()}${unit ? ` ${unit}` : ""}`;
  }
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

function metricTone(componentId: string | undefined): "critical" | "warning" | "normal" | "neutral" {
  const id = (componentId ?? "").toLowerCase();
  if (id.includes("readmission") || id.includes("complication")) {
    return "critical";
  }
  if (id.includes("high_risk") || id.includes("theatre")) {
    return "warning";
  }
  if (id.includes("proms")) {
    return "normal";
  }
  return "neutral";
}

function componentTitle(spec: {
  id?: string;
  display_contract?: { title?: string };
}) {
  return spec.display_contract?.title ?? spec.id ?? "Unnamed component";
}

function componentSubtitle(spec: {
  purpose?: string;
  validation_expectation?: string;
  display_contract?: { subtitle?: string };
}) {
  return spec.display_contract?.subtitle ?? spec.purpose ?? spec.validation_expectation ?? "Materialized from uploaded package specs.";
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
  const resolvedComponents = selectedTab?.component_specs ?? [];
  const kpiComponents = resolvedComponents.filter((component) => component.component_type === "kpi_card");
  const groupComponents = resolvedComponents.filter((component) => component.component_type === "kpi_card_group");
  const trustStrip = resolvedComponents.find((component) => component.component_type === "trust_strip");
  const chartComponents = resolvedComponents.filter((component) => component.component_type?.includes("chart"));
  const tableComponents = resolvedComponents.filter((component) => component.component_type?.includes("table") || component.component_type === "queue_table");
  const governanceComponents = resolvedComponents.filter((component) => component.component_type === "governance_badge" || component.component_type === "link_group");
  const endpointRecord = firstDataRecord(dataResponse.data);

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
            {resolvedComponents.map((component) => (
              <span key={component.id ?? component.source_file ?? "component"}>{componentTitle(component)}</span>
            ))}
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

        {trustStrip ? (
          <article className="panel span-12 native-bi-trust-strip">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Trust strip</p>
                <h3 className="section-heading">{componentTitle(trustStrip)}</h3>
                <p className="section-subtitle">{componentSubtitle(trustStrip)}</p>
              </div>
              <div className="summary-badges">
                <span className="summary-badge normal">{workspace.state?.materialization_status ?? "unknown"}</span>
                <span className="summary-badge warning">{workspace.state?.live_verification_status ?? "unknown"}</span>
              </div>
            </div>
          </article>
        ) : null}

        {(kpiComponents.length > 0 || groupComponents.length > 0) ? (
          <article className="panel span-12">
            <p className="eyebrow">Headline metrics</p>
            <h3 className="section-heading">Dashboard KPI cards</h3>
            <div className="kpi-cards native-bi-kpi-grid">
              {kpiComponents.map((component) => {
                const bindingValue = lookupPath(
                  endpointRecord,
                  component.data_binding_resolved?.data_path ?? component.display_contract?.value_field,
                );
                const fallbackValueField = component.display_contract?.value_field;
                const directValue = fallbackValueField ? endpointRecord[fallbackValueField] : undefined;
                const expectedFieldValue =
                  !bindingValue && component.expected_fields?.length ? endpointRecord[component.expected_fields[0]] : undefined;
                const value = bindingValue ?? directValue ?? expectedFieldValue;
                return (
                  <article className={`kpi-card kpi-card-${metricTone(component.id)}`} key={component.id ?? "kpi"}>
                    <span className="kpi-card-label">{component.display_contract?.format ?? "kpi"}</span>
                    <span className="kpi-card-value">
                      {dataResponse.meta?.empty
                        ? component.display_contract?.empty_message ?? "No data"
                        : formatMetricValue(
                            value,
                            component.display_contract?.format,
                            component.display_contract?.precision,
                            component.display_contract?.unit,
                          )}
                    </span>
                    <span className="kpi-card-subtitle">
                      {component.display_contract?.title ?? component.id}
                      {component.display_contract?.subtitle ? ` · ${component.display_contract.subtitle}` : ""}
                    </span>
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        {chartComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Charts</p>
            <h3 className="section-heading">Trend and variation widgets</h3>
            <div className="grid">
              {chartComponents.map((component) => (
                <article className="panel span-6 native-bi-widget" key={component.id ?? "chart"}>
                  <p className="eyebrow">{component.component_type ?? "chart"}</p>
                  <h4 className="section-heading">{componentTitle(component)}</h4>
                  <p className="section-subtitle">{componentSubtitle(component)}</p>
                  <div className="native-bi-widget-shell">
                    <div className="native-bi-chart-placeholder">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="section-subtitle">
                      {dataResponse.meta?.empty
                        ? component.display_contract?.empty_message ?? "No chart data available."
                        : "Chart rendering will use populated runtime data in the next renderer step."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {tableComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Operational tables</p>
            <h3 className="section-heading">Queue and drilldown widgets</h3>
            <div className="grid">
              {tableComponents.map((component) => (
                <article className="panel span-6 native-bi-widget" key={component.id ?? "table"}>
                  <p className="eyebrow">{component.component_type ?? "table"}</p>
                  <h4 className="section-heading">{componentTitle(component)}</h4>
                  <p className="section-subtitle">{componentSubtitle(component)}</p>
                  <div className="native-bi-table-placeholder">
                    <div />
                    <div />
                    <div />
                  </div>
                  <p className="section-subtitle">
                    {dataResponse.meta?.empty
                      ? component.display_contract?.empty_message ?? "No rows returned yet."
                      : "Table rendering will use populated runtime rows in the next renderer step."}
                  </p>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {governanceComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Governance posture</p>
            <h3 className="section-heading">Governance widgets</h3>
            <div className="use-case-outcome-list">
              {governanceComponents.map((component) => (
                <span key={component.id ?? "governance"}>
                  {componentTitle(component)} · {component.governance_contract?.classification ?? "restricted"}
                </span>
              ))}
            </div>
          </article>
        ) : null}

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
            <div>
              <dt>Materialization mode</dt>
              <dd>{workspace.rendering?.materialization_mode ?? "n/a"}</dd>
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
          <p className="eyebrow">Smoke tests</p>
          <h3 className="section-heading">Declared verification checks</h3>
          <div className="use-case-outcome-list">
            <span>{`routes: ${workspace.smoke_tests?.route_checks?.length ?? 0}`}</span>
            <span>{`endpoints: ${workspace.smoke_tests?.endpoint_checks?.length ?? 0}`}</span>
            <span>{`components: ${workspace.smoke_tests?.component_render_checks?.length ?? 0}`}</span>
          </div>
        </article>

        <article className="panel span-12">
          <p className="eyebrow">Technical detail</p>
          <h3 className="section-heading">Resolved native BI components</h3>
          <div className="grid">
            {resolvedComponents.map((component) => (
              <article className="panel span-6" key={component.id ?? component.source_file ?? "component"}>
                <p className="eyebrow">{component.component_type ?? "component"}</p>
                <h4 className="section-heading">{componentTitle(component)}</h4>
                <p className="section-subtitle">{componentSubtitle(component)}</p>
                <dl className="use-case-evidence-list">
                  <div>
                    <dt>Endpoint</dt>
                    <dd>{specEndpoint(component)}</dd>
                  </div>
                  <div>
                    <dt>Zone</dt>
                    <dd>{component.layout_contract?.zone ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{component.governance_contract?.phi_mode ?? component.phi_visibility_rule ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Empty state</dt>
                    <dd>{component.display_contract?.empty_message ?? component.empty_state ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Interaction</dt>
                    <dd>{component.interaction_contract?.click_behavior ?? component.interaction_contract?.row_click_behavior ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Registry source</dt>
                    <dd>{component.source_file ?? component.section ?? "n/a"}</dd>
                  </div>
                </dl>
              </article>
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
              {Object.keys(endpointRecord).length > 0 ? (
                Object.entries(endpointRecord).map(([key, value]) => (
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
