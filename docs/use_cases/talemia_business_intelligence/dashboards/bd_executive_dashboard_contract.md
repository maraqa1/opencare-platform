# TALEMIA BD Executive Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA BD Executive Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/executive`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA BD Executive Dashboard is the executive commercial control tower for pipeline, wins/losses, client coverage, and KPI performance. It gives the Executive / BD Director a single governed view of commercial momentum, risk, and performance against dashboard-visible targets.

The dashboard must help answer:

- How many opportunities and wins are in scope for the selected period?
- How much pipeline and qualified pipeline value is active?
- Which business lines carry the largest or weakest pipeline?
- How are wins and losses distributed?
- Which KPI values reconcile to source-derived analytics, and which need review?

## 2. Source and Query Rules

Source workbook: `talemia_raw_demo_extracted_v3.xlsx`.

Runtime query rules:

- Portal and APIs must query analytics and dictionary outputs only.
- Superset must query analytics schema only.
- No visual, API, or portal component may query `raw_demo` directly.
- Dashboard KPI values must not be hardcoded from screenshots or workbook target rows.
- `raw_demo.talemia_dashboard_targets` may only be used through an analytics reconciliation mart.

## 3. Required Marts

| Mart | Grain | Dashboard role | Record-spec panel |
| --- | --- | --- | --- |
| `analytics.fct_talemia_pipeline` | One row per active pipeline opportunity | Pipeline opportunity count, pipeline value, qualified pipeline, stage chart | Required |
| `analytics.fct_talemia_win_loss` | One row per closed opportunity outcome | Wins value, YTD wins, hit rate, win rate, win/loss donut | Required |
| `analytics.fct_talemia_business_line_performance` | One row per business line per reporting period/filter segment | Pipeline value per business line | Required |
| `analytics.fct_talemia_kpi_performance` | One row per KPI per reporting period/filter context | KPI cards and KPI performance side panel | Required |

Implementation note: `analytics.fct_talemia_kpi_performance` is a dashboard-specific required mart and should be added to the TALEMIA dbt model list during scaffolding. It should use dbt tags `talemia` and `commercial-intelligence`.

## 4. Required Filters

Filters must apply consistently across KPI cards, charts, side panel, and API responses.

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Year | `year` | All visuals | Default to latest available reporting year when unspecified |
| Business line | `business_line` | All visuals | Comes from business-line dimension/performance mart |
| Account manager | `account_manager` | All visuals where owner exists | Business-line aggregate must still accept this filter |
| Workflow state | `workflow_state` | KPI cards, stage chart, pipeline visuals | Separate from opportunity stage |
| Winning likelihood | `winning_likelihood` | KPI cards, pipeline visuals | Accepted values include High, Medium, Low, Unknown |
| Sector type | `sector_type` | All visuals | Canonical sector derived from `moe_classification` mapping |

## 5. Backend Endpoint Dependencies

Primary endpoint:

- `GET /api/v1/talemia/executive-summary`

Supporting endpoints:

- `GET /api/v1/talemia/pipeline/stages`
- `GET /api/v1/talemia/pipeline/business-lines`
- `GET /api/v1/talemia/win-loss`
- `GET /api/v1/talemia/kpis`
- `GET /api/v1/talemia/governance/reconciliation`

All endpoints must accept:

- `year`
- `business_line`
- `account_manager`
- `workflow_state`
- `winning_likelihood`
- `sector_type`

Endpoint responses must include `meta.empty=true` when marts are missing or empty.

## 6. Empty-State Behavior

If required marts are missing:

- Show a dashboard-level empty state: "TALEMIA executive marts are not available yet."
- Return `meta.empty=true`.
- Do not show zero-valued KPI cards as if they are real.
- Keep the record-spec panels visible with expected dataset contracts.
- Show governance/reconciliation as pending.

If marts exist but filters return no rows:

- Show filtered empty state: "No TALEMIA executive records match the selected filters."
- Keep filters visible.
- Keep record-spec panels visible.
- KPI cards may show null/no-data state, not hardcoded zero unless the mart explicitly returns zero.

If reconciliation is incomplete:

- Show KPI values as source-derived but not authoritative.
- KPI performance side panel must flag reconciliation status.

## 7. KPI Formula Contract

| KPI | Formula | Source mart | Raw lineage | Notes |
| --- | --- | --- | --- | --- |
| YTD Opportunities | `count(distinct opportunity_id)` where selected year equals `submission_year` or year of `submission_date` | `analytics.fct_talemia_kpi_performance`, derived from pipeline/opportunity marts | `raw_demo.talemia_opportunities` | Submission year is fallback when created date is unavailable |
| Pipeline Opportunities | `count(distinct opportunity_id)` for active, not closed won/lost opportunities | `analytics.fct_talemia_pipeline` and KPI performance mart | `raw_demo.talemia_opportunities`, `raw_demo.talemia_opportunity_stage`, `raw_demo.talemia_workflow_state` | Active-stage coverage is limited in V3 |
| Pipeline Value | `sum(contract_value)` for active pipeline opportunities | `analytics.fct_talemia_pipeline` and KPI performance mart | `raw_demo.talemia_opportunities` | Contract value is the default value basis pending business confirmation |
| Qualified Pipeline | `sum(qualified_sales)` for active qualified opportunities | `analytics.fct_talemia_pipeline` and KPI performance mart | `raw_demo.talemia_opportunities` | Qualification may be inferred from non-null or positive `qualified_sales` |
| Wins Value | `sum(awarded_value)` for won opportunities | `analytics.fct_talemia_win_loss` and KPI performance mart | `raw_demo.talemia_awards`, `raw_demo.talemia_opportunities` | Award dates may be null |
| YTD Wins | `count(distinct opportunity_id)` for won opportunities in selected year | `analytics.fct_talemia_win_loss` and KPI performance mart | `raw_demo.talemia_awards`, `raw_demo.talemia_opportunities` | Use award year when available, else submission year fallback |
| Client Count | `count(distinct normalized_client_name)` in selected opportunity set | `analytics.fct_talemia_pipeline` and KPI performance mart | `raw_demo.talemia_opportunities`, `raw_demo.talemia_clients` | Client normalization required |
| New Clients | `count(distinct client_id)` where first-seen year equals selected year | `analytics.fct_talemia_kpi_performance` | `raw_demo.talemia_clients`, `raw_demo.talemia_opportunities` | Requires first-seen logic or persisted history |
| Hit Rate | `won_value / nullif(submitted_or_closed_bid_value, 0)` | `analytics.fct_talemia_win_loss` and KPI performance mart | `raw_demo.talemia_awards`, `raw_demo.talemia_loss_reasons`, `raw_demo.talemia_opportunities` | Denominator must be confirmed by business owner |
| Win Rate | `won_opportunity_count / nullif(closed_opportunity_count, 0)` | `analytics.fct_talemia_win_loss` and KPI performance mart | `raw_demo.talemia_awards`, `raw_demo.talemia_loss_reasons`, `raw_demo.talemia_opportunities` | Requires complete closed opportunity population |

## 8. Visual Contract

### KPI Cards

Visuals:

- YTD Opportunities
- Pipeline Opportunities
- Pipeline Value
- Qualified Pipeline
- Wins Value
- YTD Wins
- Client Count
- New Clients
- Hit Rate
- Win Rate

Superset chart type: Big Number or KPI card equivalent supported by deployed Superset image.  
Superset dataset: `analytics.fct_talemia_kpi_performance`.  
Portal endpoint: `GET /api/v1/talemia/executive-summary`.  
Record spec: `analytics.fct_talemia_kpi_performance`.  
Empty state: render "No reconciled KPI value" per card when the KPI row is missing.

### Opportunities Per Stage Bar Chart

Metric: opportunity count by `opportunity_stage`, optionally split by `workflow_state`.  
Superset chart type: Bar chart.  
Superset dataset: `analytics.fct_talemia_pipeline`.  
Portal endpoint: `GET /api/v1/talemia/pipeline/stages`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: show "No pipeline stage records available."

### Pipeline Value Per Business Line Horizontal Bar Chart

Metric: active pipeline value by `business_line_name`.  
Superset chart type: Horizontal bar chart.  
Superset dataset: `analytics.fct_talemia_business_line_performance`.  
Portal endpoint: `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_business_line_performance`.  
Empty state: show "No business-line pipeline records available."

### Win/Loss Ratio Donut

Metric: won count and lost count, with optional value toggle in portal implementation.  
Superset chart type: Donut chart or pie chart with donut styling if supported.  
Superset dataset: `analytics.fct_talemia_win_loss`.  
Portal endpoint: `GET /api/v1/talemia/win-loss`.  
Record spec: `analytics.fct_talemia_win_loss`.  
Empty state: show "No closed win/loss records available."

### KPI Performance Side Panel

Metrics:

- KPI name.
- Current mart value.
- Dashboard target or visible benchmark where available.
- Reconciliation status.
- Variance.
- Limitation note.

Superset chart type: Table.  
Superset dataset: `analytics.fct_talemia_kpi_performance`.  
Portal endpoints: `GET /api/v1/talemia/kpis` and `GET /api/v1/talemia/governance/reconciliation`.  
Record specs: `analytics.fct_talemia_kpi_performance` and `analytics.fct_talemia_dashboard_reconciliation`.  
Empty state: show "KPI performance is pending reconciliation."

## 9. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Required dimensions | Required metrics |
| --- | --- | --- | --- | --- |
| KPI cards | Big Number | `analytics.fct_talemia_kpi_performance` | `metric_id`, `metric_name`, `reporting_year` | `metric_value`, `target_value`, `variance_value` |
| Opportunities per stage | Bar chart | `analytics.fct_talemia_pipeline` | `opportunity_stage`, `workflow_state` | `opportunity_count`, `pipeline_value` |
| Pipeline value per business line | Horizontal bar chart | `analytics.fct_talemia_business_line_performance` | `business_line_name` | `pipeline_value`, `qualified_pipeline_value`, `pipeline_opportunity_count` |
| Win/loss ratio | Donut chart | `analytics.fct_talemia_win_loss` | `outcome` | `opportunity_count`, `closed_value` |
| KPI performance side panel | Table | `analytics.fct_talemia_kpi_performance` | `metric_name`, `reconciliation_status`, `limitation_note` | `metric_value`, `target_value`, `variance_value`, `variance_pct` |

## 10. Record Specification Panels

The Executive tab must expose record specification panels for:

- `analytics.fct_talemia_kpi_performance`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_business_line_performance`

Each panel must show:

- Grain.
- Primary key or business key.
- Source lineage.
- Key dimensions.
- Key measures.
- dbt tests.
- Last refresh status.
- Known limitations.

## 11. Reconciliation Checks

Required checks:

- KPI row exists in `analytics.fct_talemia_kpi_performance` for every required KPI card.
- KPI formulas in `dictionary.dict_talemia_metrics` match the dashboard contract.
- KPI target or visible screenshot values from `talemia_dashboard_targets` are parsed where possible.
- Dashboard target value and mart value are compared in `analytics.fct_talemia_dashboard_reconciliation`.
- Reconciliation status is one of `matched`, `variance`, `missing_target`, `missing_mart_value`, `unparsed_target`, or `requires_business_review`.
- Executive tab must visibly flag any KPI with non-matched reconciliation status.

## 12. Known Limitations

- V3 weekly updates may need parser correction, though this dashboard only uses updates indirectly through governance signals.
- Expected award dates may need validation before delayed-award context is added to executive signals.
- Hidden Power BI / DAX logic may still exist behind the visible target values.
- Historical persistence is limited, especially for new-client logic and KPI trend comparisons.
- Forecasting and anomaly detection are phase 2.
- Dashboard reconciliation must be performed before authoritative reporting.
- V3 extract currently shows limited active pipeline stage coverage; pipeline opportunity and value metrics may be incomplete until active stages are recovered.
- `analytics.fct_talemia_kpi_performance` must be added during dbt scaffolding because it is required by this dashboard contract.
