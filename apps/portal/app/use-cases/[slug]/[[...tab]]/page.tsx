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

type ComponentSpec = {
  id?: string;
  aliases?: string[];
  contains?: string[];
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
    navigation_targets?: string[];
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
    component_specs?: ComponentSpec[];
  }>;
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
    data_freshness?: {
      sla_status?: string;
      last_loaded_at?: string;
      max_expected_age_hours?: number;
    } | null;
  };
  warnings?: string[];
  errors?: string[];
};

type ChartPoint = {
  label: string;
  value: number;
};

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

function specEndpoint(spec: ComponentSpec) {
  return spec.source_endpoint ?? spec.endpoint ?? "";
}

function normalizeEndpoint(path: string | undefined) {
  if (!path || path === "n/a") {
    return "";
  }
  return path.startsWith("/api/") ? path : "";
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

function dataRows(data: EndpointPayload["data"]): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
  }
  const record = firstDataRecord(data);
  return Object.keys(record).length > 0 ? [record] : [];
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

function formatMetricValue(
  value: unknown,
  format: string | undefined,
  precision: number | undefined,
  unit: string | undefined,
): string {
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

function componentTitle(spec: ComponentSpec) {
  return spec.display_contract?.title ?? spec.id ?? "Unnamed component";
}

function componentSubtitle(spec: ComponentSpec) {
  return spec.display_contract?.subtitle ?? spec.purpose ?? spec.validation_expectation ?? "Materialized from uploaded package specs.";
}

function niceLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function componentPayload(spec: ComponentSpec, payloadByEndpoint: Record<string, EndpointPayload>) {
  return payloadByEndpoint[normalizeEndpoint(specEndpoint(spec))] ?? {
    data: [],
    meta: { empty: true },
    warnings: [],
    errors: [],
  };
}

function componentValue(spec: ComponentSpec, payloadByEndpoint: Record<string, EndpointPayload>) {
  const payload = componentPayload(spec, payloadByEndpoint);
  const source = payload.data;
  const record = firstDataRecord(source);
  const bindingValue = lookupPath(
    source,
    spec.data_binding_resolved?.data_path ?? spec.display_contract?.value_field,
  );
  const directValue = spec.display_contract?.value_field ? record[spec.display_contract.value_field] : undefined;
  const expectedFieldValue = spec.expected_fields?.length ? record[spec.expected_fields[0]] : undefined;
  return bindingValue ?? directValue ?? expectedFieldValue;
}

function chartSeries(spec: ComponentSpec, payloadByEndpoint: Record<string, EndpointPayload>): ChartPoint[] {
  const rows = dataRows(componentPayload(spec, payloadByEndpoint).data);
  if (!rows.length) {
    return [];
  }
  const preferredFields = spec.expected_fields ?? [];
  const lowerId = (spec.id ?? "").toLowerCase();
  const explicitLabelField =
    (lowerId.includes("consultant") && "consultant_id") ||
    (lowerId.includes("procedure") && "procedure_group") ||
    (lowerId.includes("payer") && "payer_id") ||
    (lowerId.includes("risk") && "risk_band") ||
    (lowerId.includes("trend") && "admission_month") ||
    "";
  const labelField =
    explicitLabelField ||
    preferredFields.find((field) => /month|date|consultant|procedure|payer|band/i.test(field)) ??
    Object.keys(rows[0]).find((field) => typeof rows[0][field] === "string") ??
    Object.keys(rows[0])[0];
  const valueField =
    preferredFields.find((field) => field !== labelField && typeof rows[0][field] === "number") ??
    Object.keys(rows[0]).find((field) => field !== labelField && typeof rows[0][field] === "number") ??
    "";
  if (!labelField || !valueField) {
    return [];
  }
  return rows
    .map((row) => ({
      label: String(row[labelField] ?? "n/a"),
      value: typeof row[valueField] === "number" ? Number(row[valueField]) : Number.NaN,
    }))
    .filter((point) => Number.isFinite(point.value));
}

function chartSvgPoints(series: ChartPoint[]) {
  if (!series.length) {
    return "";
  }
  const max = Math.max(...series.map((point) => point.value), 1);
  return series
    .map((point, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 84 - (point.value / max) * 68;
      return `${x},${y}`;
    })
    .join(" ");
}

function tableFields(spec: ComponentSpec, payloadByEndpoint: Record<string, EndpointPayload>) {
  const rows = dataRows(componentPayload(spec, payloadByEndpoint).data);
  if (!rows.length) {
    return spec.expected_fields?.slice(0, 5) ?? [];
  }
  return (spec.expected_fields?.length ? spec.expected_fields : Object.keys(rows[0])).slice(0, 5);
}

function governanceBadgeValue(spec: ComponentSpec, payloadByEndpoint: Record<string, EndpointPayload>) {
  if (spec.component_type === "link_group") {
    const targets = spec.interaction_contract?.navigation_targets ?? [];
    return targets.length > 0 ? `${targets.length} evidence links` : "Evidence links ready";
  }
  const value = componentValue(spec, payloadByEndpoint);
  if (typeof value === "boolean") {
    return value ? "Required" : "Not required";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value ? String(value) : "Pending";
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
  const resolvedComponents = selectedTab?.component_specs ?? [];

  const endpointPaths = Array.from(
    new Set(
      resolvedComponents
        .map((component) => normalizeEndpoint(specEndpoint(component)))
        .filter(Boolean),
    ),
  );

  const endpointResponses = await Promise.all(
    endpointPaths.map(async (path) => {
      const payload = await getApiJson<EndpointPayload>({
        path,
        fallback: { data: [], meta: { empty: true }, warnings: [], errors: [] },
        cacheMode: "no-store",
      });
      return [path, payload] as const;
    }),
  );
  const payloadByEndpoint = Object.fromEntries(endpointResponses);
  const primaryPayload = endpointPaths.length > 0 ? payloadByEndpoint[endpointPaths[0]] : { data: [], meta: { empty: true } };

  const trustStrip = resolvedComponents.find((component) => component.component_type === "trust_strip");
  const groupComponents = resolvedComponents.filter((component) => component.component_type === "kpi_card_group");
  const kpiComponents = resolvedComponents.filter((component) => component.component_type === "kpi_card");
  const chartComponents = resolvedComponents.filter((component) => component.component_type?.includes("chart"));
  const tableComponents = resolvedComponents.filter((component) => component.component_type?.includes("table"));
  const governanceComponents = resolvedComponents.filter(
    (component) => component.component_type === "governance_badge" || component.component_type === "link_group",
  );

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
            Materialized from the uploaded package contract with component-level runtime feeds and PHI-aware rendering rules.
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
              <dd>{primaryPayload.meta?.as_of ?? "n/a"}</dd>
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
                <span className="summary-badge normal">
                  {governanceBadgeValue(trustStrip, payloadByEndpoint)}
                </span>
                <span className="summary-badge warning">{workspace.state?.live_verification_status ?? "unknown"}</span>
              </div>
            </div>
            <div className="native-bi-trust-grid">
              <div>
                <span className="eyebrow">Classification</span>
                <strong>{String(firstDataRecord(componentPayload(trustStrip, payloadByEndpoint).data).highest_classification ?? "restricted")}</strong>
              </div>
              <div>
                <span className="eyebrow">Audit</span>
                <strong>{String(firstDataRecord(componentPayload(trustStrip, payloadByEndpoint).data).patient_level_audit_required ?? true)}</strong>
              </div>
              <div>
                <span className="eyebrow">Lineage</span>
                <strong>{String(firstDataRecord(componentPayload(trustStrip, payloadByEndpoint).data).lineage_expected_path ?? "declared")}</strong>
              </div>
            </div>
          </article>
        ) : null}

        {kpiComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Headline metrics</p>
            <h3 className="section-heading">Dashboard KPI cards</h3>
            <div className="kpi-cards native-bi-kpi-grid">
              {kpiComponents.map((component) => {
                const payload = componentPayload(component, payloadByEndpoint);
                const value = componentValue(component, payloadByEndpoint);
                return (
                  <article className={`kpi-card kpi-card-${metricTone(component.id)}`} key={component.id ?? "kpi"}>
                    <span className="kpi-card-label">{component.display_contract?.format ?? "kpi"}</span>
                    <span className="kpi-card-value">
                      {payload.meta?.empty
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
                      {component.display_contract?.subtitle ? ` / ${component.display_contract.subtitle}` : ""}
                    </span>
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        {groupComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Executive summary</p>
            <h3 className="section-heading">KPI group overview</h3>
            <div className="grid">
              {groupComponents.map((component) => {
                const record = firstDataRecord(componentPayload(component, payloadByEndpoint).data);
                const metricEntries = Object.entries(record).filter(([, value]) => typeof value === "number").slice(0, 6);
                return (
                  <article className="panel span-12 native-bi-governance-card" key={component.id ?? "kpi-group"}>
                    <h4 className="section-heading">{componentTitle(component)}</h4>
                    <p className="section-subtitle">{componentSubtitle(component)}</p>
                    <div className="use-case-outcome-list">
                      {metricEntries.map(([field, value]) => (
                        <span key={`${component.id ?? "group"}-${field}`}>
                          {niceLabel(field)}: {formatMetricValue(value, field.includes("rate") ? "percentage" : field.includes("stay") ? "duration_days" : "integer", field.includes("episode") ? 0 : 1, field.includes("stay") ? "days" : field.includes("rate") ? "%" : "")}
                        </span>
                      ))}
                    </div>
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
              {chartComponents.map((component) => {
                const payload = componentPayload(component, payloadByEndpoint);
                const series = chartSeries(component, payloadByEndpoint);
                const latest = series.at(-1);
                const baseline = series.at(0);
                const delta = latest && baseline ? latest.value - baseline.value : 0;
                return (
                  <article className="panel span-6 native-bi-widget" key={component.id ?? "chart"}>
                    <p className="eyebrow">{component.component_type ?? "chart"}</p>
                    <h4 className="section-heading">{componentTitle(component)}</h4>
                    <p className="section-subtitle">{componentSubtitle(component)}</p>
                    {payload.meta?.empty || series.length === 0 ? (
                      <p className="section-subtitle">
                        {component.display_contract?.empty_message ?? "No chart data available."}
                      </p>
                    ) : (
                      <>
                        <div className="native-bi-chart-shell">
                          <svg viewBox="0 0 100 84" className="native-bi-chart-svg" preserveAspectRatio="none" aria-hidden="true">
                            <polyline points={chartSvgPoints(series)} />
                          </svg>
                        </div>
                        <div className="native-bi-chart-metrics">
                          <span>Latest: {formatMetricValue(latest?.value, component.display_contract?.format, component.display_contract?.precision, component.display_contract?.unit)}</span>
                          <span>{`Delta: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}</span>
                        </div>
                        <div className="use-case-outcome-list">
                          {series.map((point) => (
                            <span key={`${component.id ?? "chart"}-${point.label}`}>
                              {point.label}: {formatMetricValue(point.value, component.display_contract?.format, component.display_contract?.precision, component.display_contract?.unit)}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        {tableComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Operational tables</p>
            <h3 className="section-heading">Queue and drilldown widgets</h3>
            <div className="grid">
              {tableComponents.map((component) => {
                const payload = componentPayload(component, payloadByEndpoint);
                const rows = dataRows(payload.data);
                const fields = tableFields(component, payloadByEndpoint);
                return (
                  <article className="panel span-12 native-bi-widget" key={component.id ?? "table"}>
                    <p className="eyebrow">{component.component_type ?? "table"}</p>
                    <h4 className="section-heading">{componentTitle(component)}</h4>
                    <p className="section-subtitle">{componentSubtitle(component)}</p>
                    {payload.meta?.empty || rows.length === 0 ? (
                      <p className="section-subtitle">
                        {component.display_contract?.empty_message ?? "No rows returned yet."}
                      </p>
                    ) : (
                      <div className="native-bi-table-shell">
                        <table className="table native-bi-table">
                          <thead>
                            <tr>
                              {fields.map((field) => (
                                <th key={field}>{niceLabel(field)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.slice(0, 5).map((row, index) => (
                              <tr key={`${component.id ?? "row"}-${index}`}>
                                {fields.map((field) => (
                                  <td key={`${field}-${index}`}>{previewValue(row[field])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        {governanceComponents.length > 0 ? (
          <article className="panel span-12">
            <p className="eyebrow">Governance posture</p>
            <h3 className="section-heading">Governance widgets</h3>
            <div className="grid">
              {governanceComponents.map((component) => (
                <article className="panel span-4 native-bi-governance-card" key={component.id ?? "governance"}>
                  <p className="eyebrow">{component.component_type ?? "governance"}</p>
                  <h4 className="section-heading">{componentTitle(component)}</h4>
                  <p className="section-subtitle">{componentSubtitle(component)}</p>
                  <strong className="native-bi-badge-value">{governanceBadgeValue(component, payloadByEndpoint)}</strong>
                  {component.governance_contract?.evidence_target ? (
                    <a className="inline-link" href={component.governance_contract.evidence_target}>
                      Review evidence target
                    </a>
                  ) : null}
                </article>
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
                    <dd>{normalizeEndpoint(specEndpoint(component)) || "n/a"}</dd>
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
      </section>
    </PageFrame>
  );
}
