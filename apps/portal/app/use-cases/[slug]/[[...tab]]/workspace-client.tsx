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

type WidgetKind = "metric" | "metric-group" | "chart" | "table" | "governance";

const endpointStateCache = new Map<string, EndpointState>();

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

function endpointHint(spec: ComponentSpec) {
  return normalizeEndpoint(specEndpoint(spec)).toLowerCase();
}

function inferWidgetKind(
  spec: ComponentSpec,
  value: unknown,
  rows: Record<string, unknown>[],
  series: ChartPoint[],
  metricEntries: [string, unknown][],
): WidgetKind {
  const type = (spec.component_type ?? "").toLowerCase();
  const hint = endpointHint(spec);
  if (
    type.includes("governance") ||
    type.includes("trust") ||
    type === "link_group" ||
    hint.includes("/governance")
  ) {
    return "governance";
  }
  if (type.includes("table") || hint.includes("/queues/") || hint.endsWith("/drilldown")) {
    return "table";
  }
  if (type.includes("chart") || hint.endsWith("/trends") || hint.endsWith("/variation")) {
    return "chart";
  }
  if (spec.display_contract?.value_field && value !== undefined && value !== null && value !== "") {
    return "metric";
  }
  if (series.length > 1) {
    return "chart";
  }
  if (rows.length > 1) {
    return "table";
  }
  if (metricEntries.length > 1) {
    return "metric-group";
  }
  return "metric";
}

function widgetCardSpan(kind: WidgetKind) {
  if (kind === "table") {
    return "span-12";
  }
  if (kind === "chart" || kind === "metric-group" || kind === "governance") {
    return "span-6";
  }
  return "span-4";
}

function metricFieldLabel(spec: ComponentSpec) {
  const field = spec.display_contract?.value_field ?? spec.expected_fields?.[0] ?? "value";
  return niceLabel(field);
}

function metricHighlights(spec: ComponentSpec, record: Record<string, unknown>) {
  const preferred = [
    spec.display_contract?.value_field,
    ...(spec.expected_fields ?? []),
    ...Object.keys(record),
  ].filter((field): field is string => Boolean(field));
  const seen = new Set<string>();
  return preferred
    .filter((field) => {
      if (seen.has(field)) {
        return false;
      }
      seen.add(field);
      return typeof record[field] === "number";
    })
    .slice(0, 4)
    .map((field) => [field, record[field]] as const);
}

function displayTimestamp(payload: EndpointPayload) {
  return payload.meta?.data_freshness?.last_loaded_at ?? payload.meta?.as_of ?? "Awaiting live data";
}

function cacheKey(slug: string, path: string) {
  return `${slug}:${path}`;
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
  const [endpointState, setEndpointState] = useState<Record<string, EndpointState>>(() =>
    Object.fromEntries(
      endpointPaths
        .map((path) => [path, endpointStateCache.get(cacheKey(slug, path))] as const)
        .filter((entry): entry is readonly [string, EndpointState] => Boolean(entry[1])),
    ),
  );

  const packageBlocked = workspace.state?.materialization_status !== "materialized" || workspace.state?.activation_status !== "active";
  const trusted = workspace.state?.live_verification_status === "live_verified";

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
      Object.entries(blockedEntries).forEach(([path, state]) => {
        endpointStateCache.set(cacheKey(slug, path), state);
      });
      setEndpointState(blockedEntries);
      return;
    }

    setEndpointState((current) =>
      Object.fromEntries(
        endpointPaths.map((path) => [
          path,
          current[path] ??
            endpointStateCache.get(cacheKey(slug, path)) ?? {
              status: "loading" as const,
              payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
            },
        ]),
      ),
    );

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
            setEndpointState((current) => {
              const nextState = {
                status: defectClass === "package-defect" ? "blocked" : "degraded",
                payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
                defectClass,
                operatorMessage: operatorMessage(workspace, "Widget data could not be loaded.", response.status),
                correlationId,
              } satisfies EndpointState;
              endpointStateCache.set(cacheKey(slug, path), nextState);
              return {
                ...current,
                [path]: nextState,
              };
            });
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
          setEndpointState((current) => {
            const nextState = {
              status,
              payload,
              defectClass: status === "degraded" ? "runtime-defect" : undefined,
              operatorMessage: status === "degraded" ? "Runtime returned a degraded widget response." : undefined,
              correlationId: status === "degraded" ? correlationId : undefined,
            } satisfies EndpointState;
            endpointStateCache.set(cacheKey(slug, path), nextState);
            return {
              ...current,
              [path]: nextState,
            };
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setEndpointState((current) => {
            const nextState = {
              status: "degraded",
              payload: { data: [], meta: { empty: false }, warnings: [], errors: [] },
              defectClass: "runtime-defect",
              operatorMessage: "Runtime request did not complete. The package contract is present, but the live feed is unavailable.",
              correlationId,
            } satisfies EndpointState;
            endpointStateCache.set(cacheKey(slug, path), nextState);
            return {
              ...current,
              [path]: nextState,
            };
          });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [endpointPaths, packageBlocked, slug, workspace]);

  const trustStrip = selectedComponents.find((component) => component.component_type === "trust_strip");
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
              const highlights = metricHighlights(component, record);
              const kind = inferWidgetKind(component, value, rows, series, metricEntries);
              const latest = series.at(-1);
              const baseline = series.at(0);
              const delta = latest && baseline ? latest.value - baseline.value : 0;
              return (
                <article className={`panel ${widgetCardSpan(kind)} native-bi-widget native-bi-product-card`} key={`canvas-${component.id ?? componentTitle(component)}`}>
                  <div className="native-bi-card-topline">
                    <div>
                      <p className="eyebrow">{componentZoneLabel(component)}</p>
                      <h4 className="section-heading">{componentTitle(component)}</h4>
                      <p className="section-subtitle">{componentSubtitle(component)}</p>
                    </div>
                    <TrustOverlay trusted={trusted} />
                  </div>
                  {widgetState.status === "loading" ? (
                    <Placeholder kind={kind === "table" ? "table" : "chart"} />
                  ) : widgetState.status === "rendered" ? (
                    kind === "table" ? (
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
                    ) : kind === "chart" ? (
                      <>
                        <div className="native-bi-chart-shell">
                          <svg viewBox="0 0 100 84" className="native-bi-chart-svg" preserveAspectRatio="none" aria-hidden="true">
                            <polyline points={chartSvgPoints(series)} />
                          </svg>
                        </div>
                        {latest ? (
                          <div className="native-bi-chart-metrics">
                            <span>Latest: {formatMetricValue(latest.value, component.display_contract?.format, component.display_contract?.precision, component.display_contract?.unit)}</span>
                            <span>{metricFieldLabel(component)}</span>
                            <span>{`Points: ${series.length}`}</span>
                            <span>{`Delta: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}</span>
                          </div>
                        ) : null}
                      </>
                    ) : kind === "metric-group" ? (
                      <div className="native-bi-mini-metrics">
                        {highlights.map(([field, metricValue]) => (
                          <div className="native-bi-mini-metric" key={`${component.id ?? "canvas-metric"}-${field}`}>
                            <span>{niceLabel(field)}</span>
                            <strong>
                              {formatMetricValue(
                                metricValue,
                                field.includes("rate") ? "percentage" : component.display_contract?.format,
                                component.display_contract?.precision,
                                field.includes("rate") ? "%" : component.display_contract?.unit,
                              )}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : kind === "governance" ? (
                      <div className="native-bi-governance-card">
                        <strong className="native-bi-badge-value">{governanceBadgeValue(component, endpointState)}</strong>
                        <div className="native-bi-mini-metrics">
                          <div className="native-bi-mini-metric">
                            <span>Trust</span>
                            <strong>{trusted ? "Trusted" : "Needs review"}</strong>
                          </div>
                          <div className="native-bi-mini-metric">
                            <span>Freshness</span>
                            <strong>{displayTimestamp(widgetState.payload)}</strong>
                          </div>
                        </div>
                        {component.governance_contract?.evidence_target ? (
                          <a className="inline-link" href={component.governance_contract.evidence_target}>
                            Review evidence
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div className="native-bi-metric-stack">
                        <span className="kpi-card-value">
                          {formatMetricValue(
                            value,
                            component.display_contract?.format,
                            component.display_contract?.precision,
                            component.display_contract?.unit,
                          )}
                        </span>
                        <div className="native-bi-chart-metrics">
                          <span>{metricFieldLabel(component)}</span>
                          <span>{displayTimestamp(widgetState.payload)}</span>
                        </div>
                      </div>
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
