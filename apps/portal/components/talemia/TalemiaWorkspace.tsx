import Link from "next/link";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import { talemiaTabs } from "@/lib/use-cases";

type TalemiaApiPayload = {
  meta?: {
    empty?: boolean;
    message?: string;
    status?: string;
    lineage?: string[];
    limitations?: string[];
  };
  data?: unknown;
};

type TalemiaRow = Record<string, string | number | boolean | null | undefined>;

export type TalemiaTabKey =
  | "overview"
  | "executive"
  | "financial"
  | "business-lines"
  | "account-managers"
  | "commercial"
  | "opportunities"
  | "governance"
  | "data-contract";

type TalemiaTabConfig = {
  key: TalemiaTabKey;
  title: string;
  eyebrow: string;
  description: string;
  endpoint: string;
  contract: string;
  primaryDataset: string;
  visuals: string[];
  records: string[];
  limitations: string[];
};

const tabConfigs: Record<TalemiaTabKey, TalemiaTabConfig> = {
  overview: {
    key: "overview",
    title: "TALEMIA Business Intelligence",
    eyebrow: "Commercial Intelligence",
    description:
      "A contract-first workspace for TALEMIA pipeline, win/loss, account ownership, commercial planning, opportunity drilldown, and KPI governance.",
    endpoint: "/api/v1/talemia/executive-summary",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboard_suite_contract.md",
    primaryDataset: "analytics.fct_talemia_opportunity",
    visuals: [
      "Suite readiness",
      "Dashboard inventory",
      "Raw-to-mart implementation sequence",
      "Known data gaps",
    ],
    records: [
      "analytics.fct_talemia_opportunity",
      "analytics.fct_talemia_pipeline",
      "dictionary.dict_talemia_metrics",
    ],
    limitations: [
      "V4 extract is accepted as the current baseline but has not been loaded yet.",
      "Portal is showing the contract shell only.",
      "KPI values remain unavailable until dbt marts are materialized.",
    ],
  },
  executive: {
    key: "executive",
    title: "BD Executive Dashboard",
    eyebrow: "Executive Control Tower",
    description:
      "Pipeline, wins/losses, client coverage, and KPI performance for executive commercial steering.",
    endpoint: "/api/v1/talemia/executive-summary",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/bd_executive_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_kpi_performance",
    visuals: [
      "Executive KPI cards",
      "Opportunities per stage",
      "Pipeline value per business line",
      "Win/loss ratio",
      "KPI performance side panel",
    ],
    records: [
      "analytics.fct_talemia_kpi_performance",
      "analytics.fct_talemia_pipeline",
      "analytics.fct_talemia_win_loss",
      "analytics.fct_talemia_business_line_performance",
    ],
    limitations: [
      "Active pipeline stages are incomplete in V3.",
      "Dashboard reconciliation has not run yet.",
      "No KPI card should show authoritative values until marts exist.",
    ],
  },
  financial: {
    key: "financial",
    title: "Financials Focused Dashboard",
    eyebrow: "Revenue and Pipeline Value",
    description:
      "Awarded revenue, converted value, qualified pipeline, sales growth, and expected award timing.",
    endpoint: "/api/v1/talemia/win-loss",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/financial_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_win_loss",
    visuals: [
      "Awarded revenue KPI",
      "Converted value 2026 KPI",
      "Pipeline qualification funnel",
      "Sales growth by year",
      "Top opportunities by value",
    ],
    records: [
      "analytics.fct_talemia_pipeline",
      "analytics.fct_talemia_win_loss",
      "analytics.fct_talemia_pipeline_forecast",
      "analytics.fct_talemia_sales_growth",
    ],
    limitations: [
      "Forecasting is phase 2 until dates validate.",
      "Sales growth requires historical persistence.",
      "Awarded revenue is not signed or recognized revenue.",
    ],
  },
  "business-lines": {
    key: "business-lines",
    title: "Business Line Dashboard",
    eyebrow: "Commercial Portfolio",
    description:
      "Pipeline distribution, value, risk, performance, and detail by business line.",
    endpoint: "/api/v1/talemia/pipeline/business-lines",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/business_line_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_business_line_performance",
    visuals: [
      "Opportunities by business line",
      "Pipeline value by business line",
      "Qualified pipeline by business line",
      "Win rate by business line",
      "Risk distribution by business line",
    ],
    records: [
      "analytics.fct_talemia_business_line_performance",
      "analytics.fct_talemia_pipeline",
      "analytics.fct_talemia_win_loss",
      "analytics.fct_talemia_pipeline_risk",
    ],
    limitations: [
      "Business-line cleanup is required.",
      "Active-stage extraction is partial.",
      "Risk distribution depends on accepted likelihood values.",
    ],
  },
  "account-managers": {
    key: "account-managers",
    title: "Account Manager Dashboard",
    eyebrow: "Relationship Ownership",
    description:
      "Account-manager performance, managed pipeline, client coverage, and weekly follow-up.",
    endpoint: "/api/v1/talemia/account-managers",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/account_manager_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_account_manager_performance",
    visuals: [
      "Account manager count",
      "Managed opportunities",
      "Qualified value",
      "Awarded value",
      "Client/opportunity detail table",
      "Weekly update table",
    ],
    records: [
      "analytics.fct_talemia_account_manager_performance",
      "analytics.fct_talemia_client_cohort",
      "analytics.fct_talemia_pipeline",
      "analytics.fct_talemia_opportunity_updates",
    ],
    limitations: [
      "Weekly updates are provisional until parser validation.",
      "New-client logic requires historical persistence.",
      "Blank owner values must map to Unknown.",
    ],
  },
  commercial: {
    key: "commercial",
    title: "Commercial Dashboard",
    eyebrow: "Planning and Lifecycle",
    description:
      "Sales-cycle monitoring, expected award timing, client acquisition, and lifecycle visibility.",
    endpoint: "/api/v1/talemia/pipeline/stages",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/commercial_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_sales_cycle",
    visuals: [
      "Average sales cycle days",
      "Winning percentage",
      "Expected award date by quarter",
      "Opportunity stage distribution",
      "Commercial opportunity table",
    ],
    records: [
      "analytics.fct_talemia_sales_cycle",
      "analytics.fct_talemia_pipeline_forecast",
      "analytics.fct_talemia_client_cohort",
      "analytics.fct_talemia_stage_distribution",
      "analytics.fct_talemia_pipeline",
    ],
    limitations: [
      "Date validation is required before sales-cycle reporting.",
      "Expected award quarter is phase 2 until dates validate.",
      "Client cohort logic is limited without snapshots.",
    ],
  },
  opportunities: {
    key: "opportunities",
    title: "Opportunity Details Dashboard",
    eyebrow: "Operational Drilldown",
    description:
      "Opportunity-grain workflow intelligence with bilingual names, ownership, values, updates, signals, and risk.",
    endpoint: "/api/v1/talemia/opportunities",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/opportunity_details_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_opportunity",
    visuals: [
      "Opportunity detail table",
      "Row-level drilldown",
      "Weekly updates drilldown",
      "Risk and likelihood detail",
    ],
    records: [
      "analytics.fct_talemia_opportunity",
      "analytics.fct_talemia_opportunity_updates",
      "analytics.fct_talemia_pipeline_risk",
    ],
    limitations: [
      "Weekly updates must come from validated long-format rows.",
      "Bilingual fields must be preserved separately.",
      "Risk flag and likelihood are separate concepts.",
    ],
  },
  governance: {
    key: "governance",
    title: "KPI Governance and Dictionary",
    eyebrow: "Trust Layer",
    description:
      "KPI definitions, formulas, dashboard lineage, business glossary, extraction quality, and reconciliation.",
    endpoint: "/api/v1/talemia/governance/reconciliation",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/kpi_governance_dashboard_contract.md",
    primaryDataset: "dictionary.dict_talemia_metrics",
    visuals: [
      "KPI dictionary table",
      "Business glossary table",
      "Dashboard target reconciliation table",
      "Extraction quality report",
      "Source-to-mart lineage summary",
      "dbt test status summary",
    ],
    records: [
      "dictionary.dict_talemia_metrics",
      "dictionary.dict_talemia_terms",
      "analytics.fct_talemia_dashboard_reconciliation",
      "analytics.fct_talemia_extraction_quality",
    ],
    limitations: [
      "dbt manifest may not be bundled yet.",
      "Extraction quality does not replace dbt tests.",
      "Target values may depend on hidden Power BI or DAX logic.",
    ],
  },
  "data-contract": {
    key: "data-contract",
    title: "TALEMIA Data Contract",
    eyebrow: "Record Specification",
    description:
      "Raw tables, analytics marts, dictionary outputs, deployment placeholders, and removal boundaries.",
    endpoint: "/api/v1/talemia/kpis",
    contract: "/docs/use_cases/talemia_business_intelligence/use_case_contract.md",
    primaryDataset: "raw_demo.talemia_opportunities",
    visuals: [
      "Raw table inventory",
      "Required dbt model list",
      "API contract",
      "Superset contract",
      "Removal procedure",
    ],
    records: [
      "raw_demo.talemia_opportunities",
      "raw_demo.talemia_awards",
      "raw_demo.talemia_opportunity_updates_long",
      "raw_demo.extraction_quality_report",
    ],
    limitations: [
      "The raw workbook loader has not been implemented yet.",
      "V4 may change the raw data contract.",
      "Removal plan is documented but not automated.",
    ],
  },
};

const scaffoldKpis = [
  { label: "Raw Load", value: "Ready", note: "V4 SQL loader added" },
  { label: "dbt Marts", value: "Guarded", note: "TALEMIA models added" },
  { label: "API State", value: "Live", note: "Queries analytics/dictionary" },
  { label: "Portal UX", value: "Shell", note: "Tabs and record specs visible" },
];

const sharedFilters = [
  "year",
  "account_manager",
  "business_line",
  "workflow_state",
  "winning_likelihood",
  "sector_type",
  "expected_award_quarter",
];

export function getTalemiaTabConfig(tab: string | undefined): TalemiaTabConfig {
  if (tab && tab in tabConfigs) {
    return tabConfigs[tab as TalemiaTabKey];
  }
  return tabConfigs.overview;
}

function readableKey(value: string) {
  return value.replaceAll("_", " ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRows(value: unknown): TalemiaRow[] {
  return Array.isArray(value) ? (value as TalemiaRow[]) : [];
}

function formatValue(value: unknown) {
  if (typeof value === "number") {
    return Math.abs(value) >= 1000
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
      : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export async function TalemiaWorkspace({ activeKey }: { activeKey: TalemiaTabKey }) {
  const config = getTalemiaTabConfig(activeKey);
  const contractHref = `https://github.com/maraqa1/opencare-platform/blob/talimya${config.contract}`;
  const payload = await getApiJson<TalemiaApiPayload>({
    path: config.endpoint,
    fallback: {
      meta: {
        empty: true,
        message: "TALEMIA backend endpoint is not reachable yet.",
        status: "portal_fallback",
        lineage: [],
        limitations: ["Backend service did not return a response."],
      },
      data: [],
    },
  });
  const meta = payload.meta;
  const lineage = meta?.lineage?.length ? meta.lineage : [config.primaryDataset];
  const limitations = meta?.limitations?.length ? meta.limitations : config.limitations;
  const data = asRecord(payload.data);
  const topLevelRows = asRows(payload.data);
  const kpiRows = asRows(data.kpis);
  const previewRows =
    topLevelRows.length > 0
      ? topLevelRows.slice(0, 8)
      : asRows(data.business_lines).concat(asRows(data.stages), asRows(data.metrics), asRows(data.reconciliation)).slice(0, 8);
  const previewColumns = previewRows[0] ? Object.keys(previewRows[0]).slice(0, 6) : [];
  const runtimeKpis =
    !meta?.empty && kpiRows.length > 0
      ? kpiRows.slice(0, 4).map((row) => ({
          label: formatValue(row.kpi_name),
          value: formatValue(row.kpi_value),
          note: formatValue(row.unit),
        }))
      : scaffoldKpis;

  return (
    <PageFrame
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      chips={[
        { label: "Contract shell", tone: "primary" },
        { label: meta?.empty ? "Empty state" : "Data loaded", tone: "accent" },
        { label: "TALEMIA", tone: "primary" },
      ]}
      actions={
        <Link className="button secondary" href={contractHref}>
          Open Contract
        </Link>
      }
    >
      <TabNav items={talemiaTabs} activeKey={config.key} />

      <section className="metric-grid compact">
        {runtimeKpis.map((kpi) => (
          <article className="forecast-stat" key={kpi.label}>
            <p className="eyebrow">{kpi.label}</p>
            <strong>{kpi.value}</strong>
            <p className="section-subtitle">{kpi.note}</p>
          </article>
        ))}
      </section>

      <section className="panel empty-state-panel">
        <div>
          <p className="eyebrow">Runtime State</p>
          <h3>{meta?.message ?? "TALEMIA data is not loaded yet."}</h3>
          <p className="subtle">
            {meta?.empty
              ? "The workspace remains visible while raw data, dbt marts, and reconciliation are refreshed."
              : "V4-backed analytics are available through the backend contract. Values remain provisional until reconciliation passes."}
          </p>
        </div>
        <div className="summary-badges">
          <span className="summary-badge warning">{readableKey(meta?.status ?? "contract_scaffold")}</span>
          <span className="summary-badge normal">{config.endpoint}</span>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Required Visuals</p>
              <h3>Dashboard surface</h3>
            </div>
          </div>
          <table className="table">
            <tbody>
              {config.visuals.map((visual) => (
                <tr key={visual}>
                  <th scope="row">{visual}</th>
                  <td>Waiting for analytics mart data</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Endpoint Dependency</p>
              <h3>Backend contract</h3>
            </div>
          </div>
          <dl className="record-spec-meta-grid">
            <div className="record-spec-meta-card">
              <span>Endpoint</span>
              <strong>{config.endpoint}</strong>
            </div>
            <div className="record-spec-meta-card">
              <span>Primary dataset</span>
              <strong>{config.primaryDataset}</strong>
            </div>
          </dl>
          <p className="subtle">
            The API must continue returning <code>meta.empty=true</code> until the required marts
            exist and contain records.
          </p>
        </article>

        <article className="panel span-8">
          <p className="eyebrow">Live Preview</p>
          <h3>API data sample</h3>
          {previewRows.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  {previewColumns.map((column) => (
                    <th key={column}>{readableKey(column)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${config.key}-${index}`}>
                    {previewColumns.map((column) => (
                      <td key={column}>{formatValue(row[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No live rows are available for this tab yet.</div>
          )}
        </article>

        <article className="panel span-8">
          <p className="eyebrow">Record Specification Panels</p>
          <h3>Datasets expected by this tab</h3>
          <table className="table">
            <tbody>
              {config.records.map((record) => (
                <tr key={record}>
                  <th scope="row">{record}</th>
                  <td>Grain, keys, lineage, tests, freshness, and limitations required</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel span-4">
          <p className="eyebrow">Shared Filters</p>
          <h3>Suite controls</h3>
          <div className="button-row">
            {sharedFilters.map((filter) => (
              <span className="data-pill" key={filter}>
                {filter}
              </span>
            ))}
          </div>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">Lineage</p>
          <h3>Expected source-to-mart path</h3>
          <ul className="list">
            {lineage.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel span-6">
          <p className="eyebrow">Known Limitations</p>
          <h3>Before values become authoritative</h3>
          <ul className="list">
            {limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </PageFrame>
  );
}
