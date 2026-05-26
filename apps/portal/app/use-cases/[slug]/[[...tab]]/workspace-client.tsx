"use client";

import { useEffect, useMemo, useState } from "react";

import type { ComponentSpec, WorkspaceDefinition } from "./page";

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

type EndpointState = {
  status: "loading" | "empty" | "degraded" | "blocked" | "rendered";
  payload: EndpointPayload;
  defectClass?: "package-defect" | "runtime-defect";
  operatorMessage?: string;
  correlationId?: string;
};

type ChartPoint = {
  label: string;
  value: number;
};

function normalizeEndpoint(path: string | undefined) {
  if (!path || path === "n/a") {
    return "";
  }
  return path.startsWith("/api/") ? path : "";
}

function specEndpoint(spec: ComponentSpec) {
  return spec.source_endpoint ?? spec.endpoint ?? "";
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
    return "Unknown";
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

function niceLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function componentTitle(spec: ComponentSpec) {
  return spec.display_contract?.title ?? spec.id ?? "Unnamed component";
}

function componentSubtitle(spec: ComponentSpec) {
  return spec.display_contract?.subtitle ?? spec.purpose ?? "Materialized from uploaded package specs.";
}

function componentEndpointState(spec: ComponentSpec, endpointState: Record<string, EndpointState>) {
  const endpoint = normalizeEndpoint(specEndpoint(spec));
  if (!endpoint) {
    return {
      status: "rendered" as const,
      payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
    };
  }
  return endpointState[endpoint] ?? {
    status: "loading" as const,
    payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
  };
}

function componentValue(spec: ComponentSpec, endpointState: Record<string, EndpointState>) {
  const payload = componentEndpointState(spec, endpointState).payload;
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

function chartSeries(spec: ComponentSpec, endpointState: Record<string, EndpointState>): ChartPoint[] {
  const rows = dataRows(componentEndpointState(spec, endpointState).payload.data);
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
    (
      preferredFields.find((field) => /month|date|consultant|procedure|payer|band/i.test(field)) ??
      Object.keys(rows[0]).find((field) => typeof rows[0][field] === "string") ??
      Object.keys(rows[0])[0]
    );
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

function tableFields(spec: ComponentSpec, endpointState: Record<string, EndpointState>) {
  const rows = dataRows(componentEndpointState(spec, endpointState).payload.data);
  if (!rows.length) {
    return spec.expected_fields?.slice(0, 5) ?? [];
  }
  return (spec.expected_fields?.length ? spec.expected_fields : Object.keys(rows[0])).slice(0, 5);
}

function metricEntriesFromRecord(record: Record<string, unknown>) {
  return Object.entries(record).filter(([, value]) => typeof value === "number");
}

function componentSortValue(component: ComponentSpec) {
  return component.layout_contract?.order ?? 999;
}

function componentZoneLabel(component: ComponentSpec) {
  const zone = component.layout_contract?.zone ?? component.layout_contract?.section ?? component.component_type ?? "widget";
  return niceLabel(zone);
}

function componentCardSpan(component: ComponentSpec, rows: Record<string, unknown>[], series: ChartPoint[]) {
  if (component.component_type?.includes("table") || rows.length > 1) {
    return "span-12";
  }
  if (component.component_type?.includes("chart") || series.length > 1) {
    return "span-6";
  }
  return "span-4";
}

function governanceBadgeValue(spec: ComponentSpec, endpointState: Record<string, EndpointState>) {
  if (spec.component_type === "link_group") {
    const targets = spec.interaction_contract?.navigation_targets ?? [];
    return targets.length > 0 ? `${targets.length} evidence links` : "Evidence links ready";
  }
  const value = componentValue(spec, endpointState);
  if (typeof value === "boolean") {
    return value ? "Required" : "Not required";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value ? String(value) : "Pending";
}

function classifyDefect(workspace: WorkspaceDefinition) {
  if (workspace.state?.materialization_status !== "materialized" || workspace.state?.activation_status !== "active") {
    return "package-defect" as const;
  }
  return "runtime-defect" as const;
}

function operatorMessage(workspace: WorkspaceDefinition, emptyMessage: string, statusCode?: number) {
  if (workspace.state?.materialization_status !== "materialized") {
    return "Package cannot activate because materialization evidence is incomplete.";
  }
  if (workspace.state?.activation_status !== "active") {
    return "Package is compiled but not active in the runtime registry yet.";
  }
  if (statusCode === 404) {
    return "Runtime route is unavailable even though the package contract exists.";
  }
  return emptyMessage;
}

function WidgetStatus({
  state,
  diagnosticsHref,
}: {
  state: EndpointState;
  diagnosticsHref?: string;
}) {
  if (state.status === "rendered" || state.status === "loading") {
    return null;
  }
  return (
    <div className={`native-bi-widget-state native-bi-widget-state-${state.status}`}>
      <strong>{niceLabel(state.status)}</strong>
      {state.operatorMessage ? <p>{state.operatorMessage}</p> : null}
      <div className="native-bi-widget-state-meta">
        {state.defectClass ? <span>{state.defectClass === "package-defect" ? "Package defect" : "Runtime defect"}</span> : null}
        {state.correlationId ? <span>{`Correlation: ${state.correlationId}`}</span> : null}
        {diagnosticsHref ? (
          <a className="inline-link" href={diagnosticsHref}>
            Operator diagnostics
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TrustOverlay({
  trusted,
}: {
  trusted: boolean;
}) {
  return (
    <span className={`native-bi-trust-pill ${trusted ? "trusted" : "governance-review"}`}>
      {trusted ? "Trusted" : "Governance review"}
    </span>
  );
}

function Placeholder({ kind }: { kind: "chart" | "table" }) {
  if (kind === "chart") {
    return (
      <div className="native-bi-chart-placeholder" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }
  return (
    <div className="native-bi-table-placeholder" aria-hidden="true">
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

export function MaterializedWorkspaceClient({
  slug,
  workspace,
  selectedTabLabel,
  selectedComponents,
  diagnosticsHref,
}: {
  slug: string;
  workspace: WorkspaceDefinition;
  selectedTabLabel: string;
  selectedComponents: ComponentSpec[];
  diagnosticsHref?: string;
}) {
  const [endpointState, setEndpointState] = useState<Record<string, EndpointState>>({});

  const packageBlocked = workspace.state?.materialization_status !== "materialized" || workspace.state?.activation_status !== "active";
  const trusted = workspace.state?.live_verification_status === "live_verified";

  const endpointPaths = useMemo(
    () =>
      Array.from(
        new Set(
          selectedComponents
            .map((component) => normalizeEndpoint(specEndpoint(component)))
            .filter(Boolean),
        ),
      ),
    [selectedComponents],
  );

  useEffect(() => {
    if (packageBlocked) {
      const blockedEntries = Object.fromEntries(
        endpointPaths.map((path) => [
          path,
          {
            status: "blocked" as const,
            payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
            defectClass: "package-defect" as const,
            operatorMessage: operatorMessage(workspace, "Package activation is blocked.", undefined),
            correlationId: crypto.randomUUID().slice(0, 8),
          },
        ]),
      );
      setEndpointState(blockedEntries);
      return;
    }

    const loadingEntries = Object.fromEntries(
      endpointPaths.map((path) => [
        path,
        {
          status: "loading" as const,
          payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
        },
      ]),
    );
    setEndpointState(loadingEntries);

    let cancelled = false;
    endpointPaths.forEach((path) => {
      const correlationId = crypto.randomUUID().slice(0, 8);
      fetch(`/api/portal${path}`, { cache: "no-store" })
        .then(async (response) => {
          if (cancelled) {
            return;
          }
          if (!response.ok) {
            const defectClass = classifyDefect(workspace);
            setEndpointState((current) => ({
              ...current,
              [path]: {
                status: defectClass === "package-defect" ? "blocked" : "degraded",
                payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
                defectClass,
                operatorMessage: operatorMessage(workspace, "Widget data could not be loaded.", response.status),
                correlationId,
              },
            }));
            return;
          }
          const payload = (await response.json()) as EndpointPayload;
          const rows = dataRows(payload.data);
          const status =
            payload.meta?.empty || rows.length === 0
              ? "empty"
              : payload.errors?.length
                ? "degraded"
                : "rendered";
          setEndpointState((current) => ({
            ...current,
            [path]: {
              status,
              payload,
              defectClass: status === "degraded" ? "runtime-defect" : undefined,
              operatorMessage: status === "degraded" ? "Runtime returned a degraded widget response." : undefined,
              correlationId: status === "degraded" ? correlationId : undefined,
            },
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setEndpointState((current) => ({
            ...current,
            [path]: {
              status: "degraded",
              payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
              defectClass: "runtime-defect",
              operatorMessage: "Runtime request did not complete. The package contract is present, but the live feed is unavailable.",
              correlationId,
            },
          }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [endpointPaths, packageBlocked, workspace]);

  const trustStrip = selectedComponents.find((component) => component.component_type === "trust_strip");
  const groupComponents = selectedComponents.filter((component) => component.component_type === "kpi_card_group");
  const kpiComponents = selectedComponents.filter((component) => component.component_type === "kpi_card");
  const chartComponents = selectedComponents.filter((component) => component.component_type?.includes("chart"));
  const tableComponents = selectedComponents.filter((component) => component.component_type?.includes("table"));
  const governanceComponents = selectedComponents.filter(
    (component) => component.component_type === "governance_badge" || component.component_type === "link_group",
  );

  const handledIds = new Set(
    [
      trustStrip?.id,
      ...groupComponents.map((component) => component.id),
      ...kpiComponents.map((component) => component.id),
      ...chartComponents.map((component) => component.id),
      ...tableComponents.map((component) => component.id),
      ...governanceComponents.map((component) => component.id),
    ].filter((value): value is string => Boolean(value)),
  );
  const fallbackComponents = selectedComponents.filter((component) => !component.id || !handledIds.has(component.id));
  const canvasComponents = selectedComponents
    .filter((component) => component.component_type !== "trust_strip")
    .slice()
    .sort((left, right) => componentSortValue(left) - componentSortValue(right));

  const primaryPayload =
    endpointPaths
      .map((path) => endpointState[path]?.payload)
      .find((payload) => payload?.meta?.as_of) ??
    (endpointPaths[0] ? endpointState[endpointPaths[0]]?.payload : undefined);

  return (
    <section className="grid">
      <article className="panel span-8">
        <p className="eyebrow">{selectedTabLabel}</p>
        <h3 className="section-heading">Dashboard workspace</h3>
        <p className="section-subtitle">
          Rendered from the package display contract. Live widget data loads after the shell paints so the workspace stays responsive.
        </p>
        <div className="use-case-outcome-list">
          {selectedComponents.map((component) => (
            <span key={component.id ?? componentTitle(component)}>{componentTitle(component)}</span>
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
            <dt>Trust</dt>
            <dd>{trusted ? "trusted" : "governance_review"}</dd>
          </div>
          <div>
            <dt>As of</dt>
            <dd>{primaryPayload?.meta?.as_of ?? "Awaiting live data"}</dd>
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
              <TrustOverlay trusted={trusted} />
            </div>
          </div>
          <div className="native-bi-trust-grid">
            <div>
              <span className="eyebrow">Classification</span>
              <strong>{String(firstDataRecord(componentEndpointState(trustStrip, endpointState).payload.data).highest_classification ?? "restricted")}</strong>
            </div>
            <div>
              <span className="eyebrow">Audit</span>
              <strong>{String(firstDataRecord(componentEndpointState(trustStrip, endpointState).payload.data).patient_level_audit_required ?? true)}</strong>
            </div>
            <div>
              <span className="eyebrow">Lineage</span>
              <strong>{trusted ? "Verified" : "Needs review"}</strong>
            </div>
          </div>
        </article>
      ) : null}

      {canvasComponents.length > 0 ? (
        <article className="panel span-12">
          <p className="eyebrow">Live dashboard</p>
          <h3 className="section-heading">Display contract canvas</h3>
          <div className="grid">
            {canvasComponents.map((component) => {
              const widgetState = componentEndpointState(component, endpointState);
              const rows = dataRows(widgetState.payload.data);
              const record = firstDataRecord(widgetState.payload.data);
              const metricEntries = metricEntriesFromRecord(record);
              const value = componentValue(component, endpointState);
              const series = chartSeries(component, endpointState);
              const fields = tableFields(component, endpointState);
              const renderAsTable = component.component_type?.includes("table") || (rows.length > 1 && fields.length > 1);
              const renderAsChart = component.component_type?.includes("chart") || series.length > 1;
              const renderAsMetricGroup = !renderAsChart && !renderAsTable && metricEntries.length > 1;
              return (
                <article className={`panel ${componentCardSpan(component, rows, series)} native-bi-widget native-bi-product-card`} key={`canvas-${component.id ?? componentTitle(component)}`}>
                  <div className="native-bi-card-topline">
                    <div>
                      <p className="eyebrow">{componentZoneLabel(component)}</p>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind={renderAsTable ? "table" : "chart"} />
                  ) : widgetState.status === "rendered" ? (
                    renderAsTable ? (
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
                              <tr key={`${component.id ?? "canvas-row"}-${index}`}>
                                {fields.map((field) => (
                                  <td key={`${field}-${index}`}>{String(row[field] ?? "Unknown")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : renderAsChart ? (
                      <>
                        <div className="native-bi-chart-shell">
                          <svg viewBox="0 0 100 84" className="native-bi-chart-svg" preserveAspectRatio="none" aria-hidden="true">
                            <polyline points={chartSvgPoints(series)} />
                          </svg>
                        </div>
                        {series.at(-1) ? (
                          <div className="native-bi-chart-metrics">
                            <span>Latest: {formatMetricValue(series.at(-1)?.value, component.display_contract?.format, component.display_contract?.precision, component.display_contract?.unit)}</span>
                            <span>{`Points: ${series.length}`}</span>
                          </div>
                        ) : null}
                      </>
                    ) : renderAsMetricGroup ? (
                      <div className="use-case-outcome-list">
                        {metricEntries.slice(0, 6).map(([field, metricValue]) => (
                          <span key={`${component.id ?? "canvas-metric"}-${field}`}>
                            {niceLabel(field)}: {formatMetricValue(metricValue, field.includes("rate") ? "percentage" : component.display_contract?.format, component.display_contract?.precision, field.includes("rate") ? "%" : component.display_contract?.unit)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="kpi-card-value">
                        {formatMetricValue(
                          value,
                          component.display_contract?.format,
                          component.display_contract?.precision,
                          component.display_contract?.unit,
                        )}
                      </span>
                    )
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No data available."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
                  )}
                </article>
              );
            })}
          </div>
        </article>
      ) : null}

      {kpiComponents.length > 0 ? (
        <article className="panel span-12">
          <p className="eyebrow">Headline metrics</p>
          <h3 className="section-heading">Dashboard KPI cards</h3>
          <div className="kpi-cards native-bi-kpi-grid">
            {kpiComponents.map((component) => {
              const widgetState = componentEndpointState(component, endpointState);
              const value = componentValue(component, endpointState);
              return (
                <article className="kpi-card kpi-card-neutral native-bi-product-card" key={component.id ?? "kpi"}>
                  <div className="native-bi-card-topline">
                    <span className="kpi-card-label">{component.display_contract?.status_badge ?? "Metric"}</span>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <span className="kpi-card-value">Loading...</span>
                  ) : widgetState.status === "rendered" ? (
                    <span className="kpi-card-value">
                      {formatMetricValue(
                        value,
                        component.display_contract?.format,
                        component.display_contract?.precision,
                        component.display_contract?.unit,
                      )}
                    </span>
                  ) : widgetState.status === "empty" ? (
                    <span className="kpi-card-value">{component.display_contract?.empty_message ?? "No data available."}</span>
                  ) : (
                    <span className="kpi-card-value">Unknown</span>
                  )}
                  <span className="kpi-card-subtitle">{componentTitle(component)}</span>
                  <p className="section-subtitle">{componentSubtitle(component)}</p>
                  <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
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
              const widgetState = componentEndpointState(component, endpointState);
              const record = firstDataRecord(widgetState.payload.data);
              const metricEntries = Object.entries(record).filter(([, value]) => typeof value === "number").slice(0, 6);
              return (
                <article className="panel span-12 native-bi-governance-card" key={component.id ?? "kpi-group"}>
                  <div className="native-bi-card-topline">
                    <div>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind="table" />
                  ) : widgetState.status === "rendered" ? (
                    <div className="use-case-outcome-list">
                      {metricEntries.map(([field, value]) => (
                        <span key={`${component.id ?? "group"}-${field}`}>
                          {niceLabel(field)}: {formatMetricValue(value, field.includes("rate") ? "percentage" : field.includes("stay") ? "duration_days" : "integer", field.includes("episode") ? 0 : 1, field.includes("stay") ? "days" : field.includes("rate") ? "%" : "")}
                        </span>
                      ))}
                    </div>
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No summary data available."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
                  )}
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
              const widgetState = componentEndpointState(component, endpointState);
              const series = chartSeries(component, endpointState);
              const latest = series.at(-1);
              const baseline = series.at(0);
              const delta = latest && baseline ? latest.value - baseline.value : 0;
              return (
                <article className="panel span-6 native-bi-widget native-bi-product-card" key={component.id ?? "chart"}>
                  <div className="native-bi-card-topline">
                    <div>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind="chart" />
                  ) : widgetState.status === "rendered" ? (
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
                    </>
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No chart data available."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
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
              const widgetState = componentEndpointState(component, endpointState);
              const rows = dataRows(widgetState.payload.data);
              const fields = tableFields(component, endpointState);
              return (
                <article className="panel span-12 native-bi-widget native-bi-product-card" key={component.id ?? "table"}>
                  <div className="native-bi-card-topline">
                    <div>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind="table" />
                  ) : widgetState.status === "rendered" ? (
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
                                <td key={`${field}-${index}`}>{String(row[field] ?? "Unknown")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No rows returned yet."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
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
            {governanceComponents.map((component) => {
              const widgetState = componentEndpointState(component, endpointState);
              return (
                <article className="panel span-4 native-bi-governance-card native-bi-product-card" key={component.id ?? "governance"}>
                  <div className="native-bi-card-topline">
                    <div>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <p className="section-subtitle">Loading governance evidence...</p>
                  ) : widgetState.status === "rendered" ? (
                    <>
                      <strong className="native-bi-badge-value">{governanceBadgeValue(component, endpointState)}</strong>
                      {component.governance_contract?.evidence_target ? (
                        <a className="inline-link" href={component.governance_contract.evidence_target}>
                          Review evidence
                        </a>
                      ) : null}
                    </>
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No governance evidence available yet."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
                  )}
                </article>
              );
            })}
          </div>
        </article>
      ) : null}

      {fallbackComponents.length > 0 ? (
        <article className="panel span-12">
          <p className="eyebrow">Dashboard widgets</p>
          <h3 className="section-heading">Display contract widgets</h3>
          <div className="grid">
            {fallbackComponents.map((component) => {
              const widgetState = componentEndpointState(component, endpointState);
              const rows = dataRows(widgetState.payload.data);
              const record = firstDataRecord(widgetState.payload.data);
              const metricEntries = metricEntriesFromRecord(record);
              const value = componentValue(component, endpointState);
              const series = chartSeries(component, endpointState);
              const fields = tableFields(component, endpointState);
              const renderAsTable = rows.length > 1 && fields.length > 1;
              const renderAsChart = series.length > 1;
              const renderAsMetricGroup = !renderAsChart && !renderAsTable && metricEntries.length > 1;
              const renderAsMetric = !renderAsChart && !renderAsTable && !renderAsMetricGroup;

              return (
                <article className={`panel ${renderAsTable ? "span-12" : "span-6"} native-bi-widget native-bi-product-card`} key={component.id ?? componentTitle(component)}>
                  <div className="native-bi-card-topline">
                    <div>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind={renderAsTable ? "table" : "chart"} />
                  ) : widgetState.status === "rendered" ? (
                    renderAsTable ? (
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
                                  <td key={`${field}-${index}`}>{String(row[field] ?? "Unknown")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : renderAsChart ? (
                      <div className="native-bi-chart-shell">
                        <svg viewBox="0 0 100 84" className="native-bi-chart-svg" preserveAspectRatio="none" aria-hidden="true">
                          <polyline points={chartSvgPoints(series)} />
                        </svg>
                      </div>
                    ) : renderAsMetricGroup ? (
                      <div className="use-case-outcome-list">
                        {metricEntries.slice(0, 6).map(([field, metricValue]) => (
                          <span key={`${component.id ?? "metric"}-${field}`}>
                            {niceLabel(field)}: {formatMetricValue(metricValue, field.includes("rate") ? "percentage" : component.display_contract?.format, component.display_contract?.precision, field.includes("rate") ? "%" : component.display_contract?.unit)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="kpi-card-value">
                        {formatMetricValue(
                          value,
                          component.display_contract?.format,
                          component.display_contract?.precision,
                          component.display_contract?.unit,
                        )}
                      </span>
                    )
                  ) : widgetState.status === "empty" ? (
                    <p className="section-subtitle">{component.display_contract?.empty_message ?? "No data available."}</p>
                  ) : (
                    <WidgetStatus state={widgetState} diagnosticsHref={diagnosticsHref} />
                  )}
                </article>
              );
            })}
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
    </section>
  );
}
