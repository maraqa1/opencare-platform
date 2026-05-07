import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
  | "opportunities";

type TalemiaTabConfig = {
  key: TalemiaTabKey;
  title: string;
  eyebrow: string;
  description: string;
  endpoint: string;
  contract: string;
  primaryDataset: string;
};

type MetricCard = {
  label: string;
  value: string;
  tone?: "blue" | "teal" | "green";
};

type TalemiaFilters = {
  business_line?: string;
  year?: string;
  winning_likelihood?: string;
  sector_type?: string;
};

type FilterControl = {
  name: keyof TalemiaFilters;
  label: string;
  value?: string;
  options: string[];
};

const tabConfigs: Record<TalemiaTabKey, TalemiaTabConfig> = {
  overview: {
    key: "overview",
    title: "TALEMIA Business Intelligence",
    eyebrow: "Commercial Intelligence",
    description: "Commercial pipeline, win/loss, financial, account-manager, and opportunity workspace for TALEMIA.",
    endpoint: "/api/v1/talemia/executive-summary",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboard_suite_contract.md",
    primaryDataset: "analytics.fct_talemia_opportunity",
  },
  executive: {
    key: "executive",
    title: "BD Executive Dashboard",
    eyebrow: "Executive Control Tower",
    description: "Pipeline, wins/losses, client coverage, and KPI performance for executive commercial steering.",
    endpoint: "/api/v1/talemia/executive-summary",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/bd_executive_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_kpi_performance",
  },
  financial: {
    key: "financial",
    title: "Financials Focused Dashboard",
    eyebrow: "Revenue and Pipeline Value",
    description: "Awarded revenue, converted value, qualified pipeline, sales growth, and expected award timing.",
    endpoint: "/api/v1/talemia/win-loss",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/financial_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_win_loss",
  },
  "business-lines": {
    key: "business-lines",
    title: "Business Line Focused Dashboard",
    eyebrow: "Commercial Portfolio",
    description: "Pipeline distribution, value, risk, performance, and detail by business line.",
    endpoint: "/api/v1/talemia/pipeline/business-lines",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/business_line_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_business_line_performance",
  },
  "account-managers": {
    key: "account-managers",
    title: "Account Manager",
    eyebrow: "Relationship Ownership",
    description: "Account-manager performance, managed pipeline, client coverage, and weekly follow-up.",
    endpoint: "/api/v1/talemia/account-managers",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/account_manager_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_account_manager_performance",
  },
  commercial: {
    key: "commercial",
    title: "Commercial Dashboard",
    eyebrow: "Planning and Lifecycle",
    description: "Sales-cycle monitoring, expected award timing, client acquisition, and lifecycle visibility.",
    endpoint: "/api/v1/talemia/pipeline/stages",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/commercial_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_sales_cycle",
  },
  opportunities: {
    key: "opportunities",
    title: "Opportunity Details",
    eyebrow: "Operational Drilldown",
    description: "Opportunity-grain workflow intelligence with bilingual names, ownership, values, updates, and risk.",
    endpoint: "/api/v1/talemia/opportunities",
    contract: "/docs/use_cases/talemia_business_intelligence/dashboards/opportunity_details_dashboard_contract.md",
    primaryDataset: "analytics.fct_talemia_opportunity",
  },
};

const emptyPayload: TalemiaApiPayload = {
  meta: {
    empty: true,
    message: "TALEMIA backend endpoint is not reachable yet.",
    status: "portal_fallback",
    lineage: [],
    limitations: ["Backend service did not return a response."],
  },
  data: [],
};

const stageOrder = ["Opportunity Development", "Qualification & Planning", "Proposal Development", "Negotiation", "Awarded", "Contract Signed"];

export function getTalemiaTabConfig(tab: string | undefined): TalemiaTabConfig {
  if (tab && tab in tabConfigs) {
    return tabConfigs[tab as TalemiaTabKey];
  }
  return tabConfigs.overview;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRows(value: unknown): TalemiaRow[] {
  return Array.isArray(value) ? (value as TalemiaRow[]) : [];
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanFilter(value: string | string[] | undefined) {
  const current = firstParam(value);
  return current && current !== "All" ? current : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function textValue(value: unknown, fallback = "-") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function uniqueOptions(rows: TalemiaRow[], key: string) {
  return Array.from(new Set(rows.map((row) => textValue(row[key], "")).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function matchesFilter(row: TalemiaRow, key: string, value: string | undefined) {
  return !value || textValue(row[key], "") === value;
}

function isMoeSector(value: unknown) {
  const normalized = textValue(value, "").trim().toLowerCase();
  return normalized === "moe+" || normalized === "moe" || normalized === "moe related";
}

function isNonMoeSector(value: unknown) {
  const normalized = textValue(value, "").trim().toLowerCase();
  return normalized === "non-moe" || normalized === "non moe" || normalized === "other";
}

function weeklyUpdateValue(value: unknown) {
  const text = textValue(value, "");
  if (!text || text.includes("_not_found") || text.includes("parser")) {
    return "No validated weekly update";
  }
  return text;
}

function compactNumber(value: unknown) {
  const numeric = numberValue(value);
  const abs = Math.abs(numeric);
  if (!numeric) return "--";
  if (abs >= 1_000_000_000) return `${(numeric / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 1 : 2)}bn`;
  if (abs >= 1_000_000) return `${(numeric / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numeric);
}

function integer(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numberValue(value));
}

function pct(value: unknown) {
  const numeric = numberValue(value);
  if (!numeric) return "--";
  return `${Math.round(numeric * 100)}%`;
}

function sum(rows: TalemiaRow[], key: string) {
  return rows.reduce((total, row) => total + numberValue(row[key]), 0);
}

function uniqueCount(rows: TalemiaRow[], key: string) {
  return new Set(rows.map((row) => textValue(row[key], "")).filter(Boolean)).size;
}

function rowValue(rows: TalemiaRow[], label: string) {
  return rows.find((row) => textValue(row.kpi_name).toLowerCase() === label.toLowerCase())?.kpi_value;
}

function groupRows(rows: TalemiaRow[], groupKey: string, valueKey = "contract_value") {
  const groups = new Map<string, { label: string; count: number; value: number }>();
  rows.forEach((row) => {
    const label = textValue(row[groupKey], "Unknown");
    const current = groups.get(label) ?? { label, count: 0, value: 0 };
    current.count += 1;
    current.value += numberValue(row[valueKey]);
    groups.set(label, current);
  });
  return Array.from(groups.values()).sort((a, b) => b.value - a.value || b.count - a.count);
}

function maxValue(items: Array<{ value: number; count?: number }>, key: "value" | "count" = "value") {
  return Math.max(...items.map((item) => numberValue(item[key])), 1);
}

function DashboardCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <article className={`talemia-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function KpiStrip({ cards }: { cards: MetricCard[] }) {
  return (
    <section className="talemia-kpi-strip">
      {cards.map((card) => (
        <article className={`talemia-kpi-card ${card.tone ?? "blue"}`} key={`${card.label}-${card.value}`}>
          <strong>{card.value}</strong>
          <span>{card.label}</span>
        </article>
      ))}
    </section>
  );
}

function FilterBar({ label, value = "All", secondary, controls }: { label: string; value?: string; secondary?: string; controls?: FilterControl[] }) {
  if (controls?.length) {
    return (
      <form className="talemia-filter-bar talemia-filter-form" method="get">
        {controls.map((control) => (
          <label key={control.name}>
            <span>{control.label}:</span>
            <select className="talemia-select" name={control.name} defaultValue={control.value ?? "All"}>
              <option value="All">All</option>
              {control.options.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
        <button type="submit">Apply</button>
      </form>
    );
  }

  return (
    <div className="talemia-filter-bar">
      <span>{label}:</span>
      <div className="talemia-select">{value}</div>
      {secondary ? <div className="talemia-select small">{secondary}</div> : null}
    </div>
  );
}

function BarChart({ items, mode = "value" }: { items: Array<{ label: string; value: number; count?: number }>; mode?: "value" | "count" }) {
  const max = maxValue(items, mode);
  return (
    <div className="talemia-bar-chart">
      {items.slice(0, 8).map((item) => {
        const numeric = mode === "count" ? numberValue(item.count) : item.value;
        return (
          <div className="talemia-bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="talemia-bar-track">
              <div className="talemia-bar-fill" style={{ width: `${Math.max((numeric / max) * 100, numeric > 0 ? 5 : 0)}%` }} />
            </div>
            <strong>{mode === "count" ? integer(numeric) : compactNumber(numeric)}</strong>
          </div>
        );
      })}
      {items.length === 0 ? <div className="talemia-empty">No rows available.</div> : null}
    </div>
  );
}

function ColumnChart({ items, mode = "value" }: { items: Array<{ label: string; value: number; count?: number }>; mode?: "value" | "count" }) {
  const max = maxValue(items, mode);
  return (
    <div className="talemia-column-chart">
      {items.slice(0, 6).map((item) => {
        const numeric = mode === "count" ? numberValue(item.count) : item.value;
        return (
          <div className="talemia-column" key={item.label}>
            <strong>{mode === "count" ? integer(numeric) : compactNumber(numeric)}</strong>
            <div style={{ height: `${Math.max((numeric / max) * 140, numeric > 0 ? 24 : 0)}px` }} />
            <span>{item.label}</span>
          </div>
        );
      })}
      {items.length === 0 ? <div className="talemia-empty">No rows available.</div> : null}
    </div>
  );
}

function DonutPair({ wonCount, lostCount, wonValue, lostValue }: { wonCount: number; lostCount: number; wonValue: number; lostValue: number }) {
  const totalCount = wonCount + lostCount;
  const totalValue = wonValue + lostValue;
  const countPct = totalCount ? Math.round((wonCount / totalCount) * 100) : 0;
  const valuePct = totalValue ? Math.round((wonValue / totalValue) * 100) : 0;
  return (
    <div className="talemia-donut-pair">
      <div className="talemia-donut" style={{ "--fill": `${countPct}%` } as CSSProperties}>
        <strong>{countPct || "--"}%</strong>
        <span>By # Opp.</span>
      </div>
      <div className="talemia-donut" style={{ "--fill": `${valuePct}%` } as CSSProperties}>
        <strong>{compactNumber(wonValue)}</strong>
        <span>By Value</span>
      </div>
    </div>
  );
}

function SimpleTable({ rows, columns }: { rows: TalemiaRow[]; columns: Array<{ key: string; label: string; type?: "money" | "update" }> }) {
  return (
    <div className="talemia-table-shell">
      <table className="talemia-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row, index) => (
            <tr key={`${textValue(row.opportunity_id, String(index))}-${index}`}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.type === "update"
                    ? weeklyUpdateValue(row[column.key])
                    : column.type === "money" || column.key.includes("value") || column.key.includes("sales")
                      ? compactNumber(row[column.key])
                      : textValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No rows available.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const overviewItems = [
  {
    label: "Executive Insights",
    icon: "EX",
    href: "/use-cases/talemia-business-intelligence/executive",
    description: "Summary of the opportunity stages and their associated key performance indicators.",
  },
  {
    label: "Financial",
    icon: "FI",
    href: "/use-cases/talemia-business-intelligence/financial",
    description: "Actual vs. pipeline revenue.",
  },
  {
    label: "Business Line",
    icon: "BL",
    href: "/use-cases/talemia-business-intelligence/business-lines",
    description: "Progress of opportunities across each business line and their status.",
  },
  {
    label: "Account Manager",
    icon: "AM",
    href: "/use-cases/talemia-business-intelligence/account-managers",
    description: "Ongoing opportunities by account manager and prioritisation of top five clients.",
  },
  {
    label: "Commercial",
    icon: "CO",
    href: "/use-cases/talemia-business-intelligence/commercial",
    description: "Evaluating sectors based on value, opportunity progression, and escalation status.",
  },
];

function OverviewDashboard() {
  return (
    <section className="talemia-overview">
      <div className="talemia-overview-heading">
        <h2>Business Development Dashboard</h2>
        <span>v3.1</span>
      </div>
      <div className="talemia-overview-body">
        <svg className="talemia-brand-mark" viewBox="0 0 168 144" role="img" aria-labelledby="talemia-logo-title">
          <title id="talemia-logo-title">TALEMIA</title>
          <g transform="translate(45 4)">
            <rect x="0" y="30" width="10" height="47" rx="5" fill="#2F5A87" />
            <rect x="20" y="16" width="10" height="68" rx="5" fill="#2D8E95" />
            <rect x="40" y="4" width="10" height="83" rx="5" fill="#4FA4A1" />
            <rect x="60" y="16" width="10" height="68" rx="5" fill="#78BF8F" />
            <rect x="80" y="30" width="10" height="47" rx="5" fill="#B7D9B1" />
          </g>
          <text x="84" y="104" textAnchor="middle" fill="#555" fontFamily="Tahoma, Arial, sans-serif" fontSize="0" fontWeight="700" direction="rtl">
            التعليمية
          </text>
          <text x="84" y="104" textAnchor="middle" fill="#555" fontFamily="Tahoma, Arial, sans-serif" fontSize="32" fontWeight="700" direction="rtl">
            {"\u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629"}
          </text>
          <text x="84" y="135" textAnchor="middle" fill="#4C4C4C" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="700" letterSpacing="7">
            TALEMIA
          </text>
        </svg>
        <div className="talemia-overview-menu" aria-label="Dashboard suite overview">
          {overviewItems.map((item) => (
            <Link className="talemia-overview-row" href={item.href} key={item.label}>
              <span className="talemia-overview-button">
                <span className="talemia-overview-icon">{item.icon}</span>
                {item.label}
              </span>
              <span className="talemia-overview-copy">{item.description}</span>
            </Link>
          ))}
        </div>
        <div className="talemia-overview-rings" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}

function ExecutiveDashboard({ executive, opportunities, businessLines, stages, winLoss }: DashboardProps) {
  const data = asRecord(executive.data);
  const kpis = asRows(data.kpis);
  const opps = rowsFor(opportunities);
  const blRows = rowsFor(businessLines);
  const stageRows = asRows(data.stages).length ? asRows(data.stages) : rowsFor(stages);
  const wlRows = rowsFor(winLoss);
  const won = wlRows.filter((row) => row.is_won === true || textValue(row.workflow_state).toLowerCase() === "awarded");
  const lost = wlRows.filter((row) => row.is_lost === true || textValue(row.workflow_state).toLowerCase() === "lost");
  const moeRows = opps.filter((row) => isMoeSector(row.sector_type));
  const nonMoeRows = opps.filter((row) => isNonMoeSector(row.sector_type));

  return (
    <>
      <FilterBar label="Year" value="All" />
      <KpiStrip cards={[
        { label: "YTD Opportunities", value: integer(rowValue(kpis, "YTD Opportunities") || opps.length), tone: "blue" },
        { label: "Pipeline Opportunities", value: integer(rowValue(kpis, "Pipeline Opportunities")), tone: "blue" },
        { label: "Pipeline Value", value: compactNumber(rowValue(kpis, "Pipeline Value") || sum(opps, "contract_value")), tone: "teal" },
        { label: "Qualified Pipeline", value: compactNumber(rowValue(kpis, "Qualified Pipeline") || sum(opps, "qualified_sales")), tone: "teal" },
        { label: "Wins Value", value: compactNumber(rowValue(kpis, "Wins Value") || sum(won, "awarded_value")), tone: "green" },
        { label: "# YTD Wins", value: integer(rowValue(kpis, "YTD Wins") || won.length), tone: "green" },
        { label: "# Clients", value: integer(rowValue(kpis, "Client Count") || uniqueCount(opps, "client_name")), tone: "green" },
        { label: "New Clients", value: integer(rowValue(kpis, "New Clients") || uniqueCount(opps, "client_name")), tone: "green" },
      ]} />
      <section className="talemia-grid talemia-executive-grid">
        <DashboardCard title="Opportunities Per Stage" className="span-8">
          <ColumnChart items={stageOrder.map((label) => {
            const found = stageRows.find((row) => textValue(row.opportunity_stage) === label);
            return { label, count: numberValue(found?.opportunity_count), value: numberValue(found?.pipeline_value) };
          })} mode="count" />
        </DashboardCard>
        <DashboardCard title="Key Performance Indicators" className="span-4 executive-kpi-panel">
          <div className="talemia-side-kpis">
            <div><span>Hit Rate</span><strong>{pct(rowValue(kpis, "Hit Rate"))}</strong></div>
            <div><span>Win Rate</span><strong>{pct(rowValue(kpis, "Win Rate"))}</strong></div>
            <div><span>Value of Lost Bids</span><strong>{compactNumber(sum(lost, "contract_value"))}</strong></div>
            <div className="split"><span>MoE+<strong>{moeRows.length} / {compactNumber(sum(moeRows, "contract_value"))}</strong></span><span>Non-MoE<strong>{nonMoeRows.length} / {compactNumber(sum(nonMoeRows, "contract_value"))}</strong></span></div>
            <div><span>Customer Engagement</span><strong>{integer(opps.length + uniqueCount(opps, "client_department"))}</strong></div>
          </div>
        </DashboardCard>
        <DashboardCard title="Opportunity Pipeline Per Business Line" className="span-4 executive-lower-panel">
          <ColumnChart items={blRows.map((row) => ({ label: textValue(row.business_line_name), count: numberValue(row.opportunity_count), value: numberValue(row.pipeline_value) }))} mode="count" />
        </DashboardCard>
        <DashboardCard title="Win/Loss Ratio" className="span-4 executive-lower-panel">
          <DonutPair wonCount={won.length} lostCount={lost.length} wonValue={sum(won, "awarded_value")} lostValue={sum(lost, "contract_value")} />
        </DashboardCard>
      </section>
    </>
  );
}

type DashboardProps = {
  executive: TalemiaApiPayload;
  opportunities: TalemiaApiPayload;
  businessLines: TalemiaApiPayload;
  accountManagers: TalemiaApiPayload;
  winLoss: TalemiaApiPayload;
  stages: TalemiaApiPayload;
  kpis: TalemiaApiPayload;
  filters: TalemiaFilters;
};

function rowsFor(payload: TalemiaApiPayload) {
  return asRows(payload.data);
}

function FinancialDashboard({ opportunities, businessLines, winLoss }: DashboardProps) {
  const opps = rowsFor(opportunities);
  const wlRows = rowsFor(winLoss);
  const won = wlRows.filter((row) => row.is_won === true || textValue(row.workflow_state).toLowerCase() === "awarded");
  const topRows = [...opps].sort((a, b) => numberValue(b.contract_value) - numberValue(a.contract_value));
  return (
    <>
      <FilterBar label="Account Manager" value="All" />
      <KpiStrip cards={[
        { label: "Pipeline Value", value: compactNumber(sum(opps, "contract_value")), tone: "blue" },
        { label: "Qualified Pipeline Forecasted", value: compactNumber(sum(opps, "qualified_sales")), tone: "blue" },
        { label: "Wins Value", value: compactNumber(sum(won, "awarded_value")), tone: "teal" },
        { label: "Sales Growth / Year 2025", value: "--", tone: "green" },
        { label: "Sales Growth / Year 2026", value: compactNumber(sum(opps, "converted_value_2026")), tone: "green" },
        { label: "Current Clients Won Sales", value: compactNumber(sum(won, "awarded_value")), tone: "green" },
        { label: "New Clients Won Sales", value: "--", tone: "green" },
      ]} />
      <section className="talemia-grid">
        <DashboardCard title="Pipeline value of each business line" className="span-12">
          <BarChart items={rowsFor(businessLines).map((row) => ({ label: textValue(row.business_line_name), value: numberValue(row.pipeline_value), count: numberValue(row.opportunity_count) }))} />
        </DashboardCard>
        <DashboardCard title="Top opportunities by value" className="span-12">
          <SimpleTable rows={topRows} columns={[
            { key: "client_name", label: "Client Name (en)" },
            { key: "opportunity_name_en", label: "Opportunity Name (en)" },
            { key: "contract_value", label: "Sum of Contract Value", type: "money" },
            { key: "winning_likelihood", label: "Winning Likelihood" },
          ]} />
        </DashboardCard>
      </section>
    </>
  );
}

function BusinessLineDashboard({ opportunities, filters }: DashboardProps) {
  const allOpps = rowsFor(opportunities);
  const selectedBusinessLine = cleanFilter(filters.business_line);
  const selectedYear = cleanFilter(filters.year);
  const selectedWinningLikelihood = cleanFilter(filters.winning_likelihood);
  const selectedSectorType = cleanFilter(filters.sector_type);
  const opps = allOpps.filter((row) =>
    matchesFilter(row, "business_line_name", selectedBusinessLine) &&
    matchesFilter(row, "submission_year", selectedYear) &&
    matchesFilter(row, "winning_likelihood", selectedWinningLikelihood) &&
    matchesFilter(row, "sector_type", selectedSectorType),
  );
  const moeRows = opps.filter((row) => isMoeSector(row.sector_type));
  const otherRows = opps.filter((row) => isNonMoeSector(row.sector_type));
  const byBusinessLine = groupRows(opps, "business_line_name").map((item) => {
    const lineRows = opps.filter((row) => textValue(row.business_line_name) === item.label);
    const awardedRows = lineRows.filter((row) => textValue(row.workflow_state).toLowerCase() === "awarded");
    return { ...item, count: item.count ? Math.round((awardedRows.length / item.count) * 100) : 0 };
  });
  const byClientDepartment = groupRows(opps, "client_department");
  const byYear = groupRows(opps, "submission_year");
  return (
    <>
      <FilterBar
        label="Business Line"
        controls={[
          { name: "business_line", label: "Business Line", value: selectedBusinessLine, options: uniqueOptions(allOpps, "business_line_name") },
          { name: "year", label: "Year", value: selectedYear, options: uniqueOptions(allOpps, "submission_year") },
          { name: "winning_likelihood", label: "Likelihood", value: selectedWinningLikelihood, options: uniqueOptions(allOpps, "winning_likelihood") },
          { name: "sector_type", label: "Sector", value: selectedSectorType, options: uniqueOptions(allOpps, "sector_type") },
        ]}
      />
      <KpiStrip cards={[
        { label: "# Opportunities", value: integer(opps.length), tone: "blue" },
        { label: "MoE Opportunities", value: integer(moeRows.length), tone: "teal" },
        { label: "Other Clients Opportunities", value: integer(otherRows.length), tone: "teal" },
      ]} />
      <section className="talemia-grid talemia-business-line-grid">
        <DashboardCard title="Opportunities Status" className="span-6 business-line-status-panel">
          <BarChart items={[{ label: "Pipeline", value: sum(opps, "contract_value"), count: opps.length }, { label: "Active", value: 0, count: 0 }]} mode="count" />
          <p className="talemia-note">Active pipeline is provisional in V4 because the extract contains closed awarded/lost records.</p>
        </DashboardCard>
        <DashboardCard title="Win/Loss Ratio By Business Line" className="span-6 business-line-ratio-panel">
          <ColumnChart items={byBusinessLine} mode="count" />
        </DashboardCard>
        <DashboardCard title="Number of Opportunity per Client" className="span-6 business-line-client-panel">
          <ColumnChart items={byClientDepartment} mode="count" />
        </DashboardCard>
        <DashboardCard title="No. Of Opportunities Per Year" className="span-3 business-line-year-panel">
          <ColumnChart items={byYear} mode="count" />
          <p className="talemia-note">Unknown indicates missing or invalid submission year.</p>
        </DashboardCard>
        <DashboardCard title="Business-line opportunity detail" className="span-12 business-line-detail-panel">
          <SimpleTable rows={opps} columns={[
            { key: "opportunity_name_en", label: "Opportunity Name (en)" },
            { key: "contract_value", label: "Sum of Contract Value", type: "money" },
            { key: "converted_value_2026", label: "Converted Value 2026", type: "money" },
            { key: "deal_type", label: "Deal Types" },
            { key: "client_department", label: "Client Department" },
          ]} />
        </DashboardCard>
        <DashboardCard title="Sales by Years" className="span-3 business-line-sales-panel">
          <ColumnChart items={byYear} />
        </DashboardCard>
      </section>
    </>
  );
}

function AccountManagerDashboard({ opportunities, accountManagers, winLoss }: DashboardProps) {
  const opps = rowsFor(opportunities);
  const managers = rowsFor(accountManagers);
  const won = rowsFor(winLoss).filter((row) => row.is_won === true || textValue(row.workflow_state).toLowerCase() === "awarded");
  return (
    <>
      <FilterBar label="Account Manager" value="All" />
      <KpiStrip cards={[
        { label: "# Account Managers", value: integer(managers.length || uniqueCount(opps, "account_manager_name")), tone: "blue" },
        { label: "Total Clients Managed", value: integer(uniqueCount(opps, "client_name")), tone: "teal" },
        { label: "Total Opportunities", value: integer(opps.length), tone: "teal" },
        { label: "Qualified Value", value: compactNumber(sum(opps, "qualified_sales")), tone: "teal" },
        { label: "Awarded", value: compactNumber(sum(won, "awarded_value")), tone: "teal" },
        { label: "Total Proposals", value: integer(opps.length), tone: "teal" },
        { label: "Awarded", value: integer(won.length), tone: "teal" },
      ]} />
      <section className="talemia-grid">
        <DashboardCard title="Live Opportunities" className="span-3">
          <DonutPair wonCount={won.length} lostCount={Math.max(opps.length - won.length, 0)} wonValue={sum(won, "awarded_value")} lostValue={sum(opps, "contract_value") - sum(won, "awarded_value")} />
        </DashboardCard>
        <DashboardCard title="Win/Loss Ratio Per Account Manager" className="span-4">
          <ColumnChart items={managers.map((row) => ({ label: textValue(row.account_manager_name), value: numberValue(row.winning_pct), count: Math.round(numberValue(row.winning_pct) * 100) }))} mode="count" />
        </DashboardCard>
        <DashboardCard title="Top 5 Clients By Value" className="span-5">
          <ColumnChart items={groupRows(opps, "client_name").slice(0, 5)} />
        </DashboardCard>
        <DashboardCard title="Client/opportunity detail" className="span-9">
          <SimpleTable rows={opps} columns={[
            { key: "opportunity_name_en", label: "Opportunity Name (en)" },
            { key: "contract_value", label: "Sum of Contract Value", type: "money" },
            { key: "parser_warning", label: "Weekly Update (en)", type: "update" },
            { key: "client_department", label: "Client Department" },
          ]} />
        </DashboardCard>
        <DashboardCard title="Winning Likelihood" className="span-3">
          <BarChart items={groupRows(opps, "winning_likelihood", "contract_value")} mode="count" />
        </DashboardCard>
      </section>
    </>
  );
}

function CommercialDashboard({ opportunities, stages }: DashboardProps) {
  const opps = rowsFor(opportunities);
  const stageRows = rowsFor(stages);
  return (
    <>
      <FilterBar label="Account Manager" value="All" />
      <KpiStrip cards={[
        { label: "# Opportunities", value: integer(opps.length), tone: "blue" },
        { label: "Client", value: integer(uniqueCount(opps, "client_name")), tone: "teal" },
        { label: "Winning %", value: "--", tone: "green" },
        { label: "# Current Client", value: integer(uniqueCount(opps, "client_name")), tone: "green" },
        { label: "# New Client", value: integer(uniqueCount(opps, "client_name")), tone: "green" },
      ]} />
      <section className="talemia-grid">
        <DashboardCard title="Top 5 Client by Value" className="span-5">
          <ColumnChart items={groupRows(opps, "client_department").slice(0, 5)} />
        </DashboardCard>
        <DashboardCard title="Opportunity Stage" className="span-5">
          <BarChart items={stageRows.map((row) => ({ label: textValue(row.opportunity_stage), value: numberValue(row.pipeline_value), count: numberValue(row.opportunity_count) }))} mode="count" />
        </DashboardCard>
        <DashboardCard title="Avg. Sales Cycle Days" className="span-2">
          <div className="talemia-big-number">--</div>
          <p className="talemia-note">Date fields are not strong enough in V4.</p>
        </DashboardCard>
        <DashboardCard title="Opportunities by Business Line" className="span-10">
          <div className="talemia-tile-row">
            {groupRows(opps, "business_line_name").slice(0, 6).map((item) => <div key={item.label}><span>{item.label}</span><strong>{integer(item.count)}</strong></div>)}
          </div>
        </DashboardCard>
        <DashboardCard title="Expected Award Date" className="span-2">
          <ColumnChart items={groupRows(opps, "expected_award_quarter")} mode="count" />
          <p className="talemia-note">Expected award quarter is mostly unavailable in V4.</p>
        </DashboardCard>
      </section>
    </>
  );
}

function OpportunityDashboard({ opportunities }: DashboardProps) {
  const opps = rowsFor(opportunities);
  return (
    <>
      <FilterBar label="BD Owner" value="All" secondary="All" />
      <div className="talemia-segments">
        <span>Active</span><span className="dark">Pipeline</span><span className="dark">High</span><span>Low</span><span>Medium</span>
      </div>
      <section className="talemia-grid">
        <DashboardCard title="Opportunity Details" className="span-12">
          <SimpleTable rows={opps} columns={[
            { key: "sector_type", label: "MoE vs Non-MoE" },
            { key: "opportunity_name_en", label: "Opportunity Name (en)" },
            { key: "contract_value", label: "Contract Value", type: "money" },
            { key: "client_name", label: "Client Name (en)" },
            { key: "business_line_name", label: "Business Line (en)" },
            { key: "account_manager_name", label: "BD Owner (en)" },
            { key: "client_department", label: "Client Department" },
          ]} />
        </DashboardCard>
      </section>
    </>
  );
}

export async function TalemiaWorkspace({
  activeKey,
  searchParams = {},
}: {
  activeKey: TalemiaTabKey;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const config = getTalemiaTabConfig(activeKey);
  const [executive, opportunities, businessLines, accountManagers, winLoss, stages, kpis] = await Promise.all([
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/executive-summary", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/opportunities", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/pipeline/business-lines", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/account-managers", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/win-loss", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/pipeline/stages", fallback: emptyPayload }),
    getApiJson<TalemiaApiPayload>({ path: "/api/v1/talemia/kpis", fallback: emptyPayload }),
  ]);
  const filters: TalemiaFilters = {
    business_line: firstParam(searchParams.business_line),
    year: firstParam(searchParams.year),
    winning_likelihood: firstParam(searchParams.winning_likelihood),
    sector_type: firstParam(searchParams.sector_type),
  };
  const props = { executive, opportunities, businessLines, accountManagers, winLoss, stages, kpis, filters };
  const activePayload =
    config.key === "financial"
      ? winLoss
      : config.key === "business-lines"
        ? businessLines
        : config.key === "account-managers"
          ? accountManagers
          : config.key === "commercial"
            ? stages
            : config.key === "opportunities"
              ? opportunities
              : executive;
  const meta = activePayload.meta;
  const contractHref = `https://github.com/maraqa1/opencare-platform/blob/talimya${config.contract}`;

  return (
    <PageFrame
      pageClassName="talemia-page"
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      chips={[
        { label: meta?.empty ? "Provisional / empty" : "V4 data bound", tone: meta?.empty ? "primary" : "accent" },
        { label: "TALEMIA", tone: "primary" },
      ]}
      actions={<Link className="button secondary" href={contractHref}>Open Contract</Link>}
    >
      <TabNav items={talemiaTabs} activeKey={config.key} />
      <section className="talemia-dashboard-shell">
        {activeKey === "overview" ? <OverviewDashboard /> : null}
        {activeKey === "executive" ? <ExecutiveDashboard {...props} /> : null}
        {activeKey === "financial" ? <FinancialDashboard {...props} /> : null}
        {activeKey === "business-lines" ? <BusinessLineDashboard {...props} /> : null}
        {activeKey === "account-managers" ? <AccountManagerDashboard {...props} /> : null}
        {activeKey === "commercial" ? <CommercialDashboard {...props} /> : null}
        {activeKey === "opportunities" ? <OpportunityDashboard {...props} /> : null}
      </section>
    </PageFrame>
  );
}
