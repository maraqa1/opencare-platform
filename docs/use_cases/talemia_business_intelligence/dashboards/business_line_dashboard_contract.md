# TALEMIA Business Line Focused Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA Business Line Focused Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/business-lines`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA Business Line Focused Dashboard shows commercial pipeline distribution, value, risk, and performance by business line. It helps executives and commercial operations compare opportunity volume, pipeline value, qualified value, win/loss performance, aging, and risk concentration across business lines.

The dashboard must help answer:

- Which business lines hold the most opportunity volume?
- Which business lines hold the highest active pipeline and qualified pipeline value?
- Which business lines are converting opportunities into wins?
- Where is lost bid value concentrated?
- Which business lines have aging opportunities or low-likelihood exposure?
- Which opportunities explain each business-line result?

## 2. Business-Line Grain

Primary business-line grain:

- One row per business line per reporting year and filterable segment in `analytics.fct_talemia_business_line_performance`.

Required business key:

- `business_line_id` when available.
- `business_line_name` as the human-readable business key.
- Unknown or blank business lines must be grouped into an explicit `Unknown` bucket.

Filterable segment fields:

- `business_line`
- `opportunity_stage`
- `workflow_state`
- `winning_likelihood`
- `sector_type`
- Reporting year where available.

Business-line performance must preserve enough drill-through linkage to opportunity-level marts for detail tables and record specification.

## 3. Query Rules

- Superset must query analytics schema only.
- Portal and backend APIs must query analytics and dictionary only.
- No dashboard visual may query `raw_demo` directly.
- Business-line values must be derived from opportunity, pipeline, win/loss, and risk marts.
- Dashboard reconciliation checks must be available before business-line metrics are marked authoritative.

## 4. Required Marts

| Mart | Grain | Dashboard role | Required tests |
| --- | --- | --- | --- |
| `analytics.fct_talemia_business_line_performance` | One row per business line per reporting year/filter segment | Business-line KPI aggregation | Unique business line/reporting segment; non-negative values |
| `analytics.fct_talemia_pipeline` | One row per active pipeline opportunity | Active opportunity count, pipeline value, qualified pipeline, aging, detail table | Unique opportunity; accepted stage/workflow/likelihood values |
| `analytics.fct_talemia_win_loss` | One row per closed opportunity outcome | Win rate and lost value by business line | Accepted outcome values; non-negative closed value |
| `analytics.fct_talemia_pipeline_risk` | One row per opportunity risk classification or business-line risk segment | Risk distribution by business line | Accepted risk level values; relationship to pipeline opportunity |

Implementation note: `analytics.fct_talemia_pipeline_risk` is a required risk mart for this dashboard and should be added during dbt scaffolding with tags `talemia` and `commercial-intelligence`.

## 5. Required Dimensions

| Dimension | Source semantics | Accepted values or handling |
| --- | --- | --- |
| `business_line` | Commercial business line from opportunity and dimension sheet | Use dimension value when available; otherwise `Unknown` |
| `opportunity_stage` | Commercial lifecycle stage | Identified, Qualified, Proposal Development, Submitted, Negotiation, Awarded, Lost, Contract Signed, Unknown |
| `workflow_state` | Operational process state | New, In Review, In Progress, Submitted, Pending Award, Awarded, Lost, On Hold, Cancelled, Unknown |
| `winning_likelihood` | Commercial likelihood/risk classification | High, Medium, Low, Unknown |
| `sector_type` | Sector grouping mapped from `moe_classification` | MoE+, Non-MoE, Unknown |

## 6. Active Stage Extraction Completeness

Current V3 extraction appears partial for active-stage analysis.

Observed active-stage issue:

- `raw_demo.talemia_opportunity_stage` contains only `Awarded` and `Lost` in the inspected extract.
- `raw_demo.talemia_workflow_state` contains only `Awarded` and `Lost` in the inspected extract.
- This means active pipeline stage distribution may be incomplete until parser corrections or additional workbook fields recover active stages.

Dashboard behavior:

- Business-line visuals may still show awarded/lost performance where data exists.
- Active pipeline visuals must display a limitation note if active stage values are missing or inferred.
- `analytics.fct_talemia_pipeline` must include an `active_stage_completeness_status` or equivalent governance field with values such as `complete`, `partial`, `inferred`, or `missing`.

## 7. Likelihood Calculation

High, medium, and low likelihood must be calculated from canonical `winning_likelihood`.

Calculation rules:

- High likelihood count: `count(distinct opportunity_id)` where `winning_likelihood = 'High'`.
- Medium likelihood count: `count(distinct opportunity_id)` where `winning_likelihood = 'Medium'`.
- Low likelihood count: `count(distinct opportunity_id)` where `winning_likelihood = 'Low'`.
- Unknown likelihood count: `count(distinct opportunity_id)` where `winning_likelihood is null` or not in accepted values.

Risk distribution by business line:

- Group likelihood counts by `business_line`.
- Optionally include value-weighted risk: `sum(contract_value)` grouped by `winning_likelihood` and `business_line`.
- `analytics.fct_talemia_pipeline_risk` should expose both count and value measures where possible.

Observed V3 limitation:

- `High` and `Low` are observed in the V3 sample.
- `Medium` is contractually accepted but may not appear in current data.

## 8. Formula Contract

| Measure | Formula | Source mart | Raw lineage | Limitation |
| --- | --- | --- | --- | --- |
| Opportunities by business line | `count(distinct opportunity_id)` grouped by business line | `analytics.fct_talemia_business_line_performance` or `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities`, `raw_demo.talemia_business_lines` | Depends on business-line normalization |
| Pipeline value by business line | `sum(contract_value)` for active pipeline grouped by business line | `analytics.fct_talemia_business_line_performance` | `raw_demo.talemia_opportunities`, business-line dimension | Active stage extraction may be partial |
| Qualified pipeline by business line | `sum(qualified_sales)` for qualified active pipeline grouped by business line | `analytics.fct_talemia_business_line_performance` | `raw_demo.talemia_opportunities` | Qualification rule needs business approval |
| Win rate by business line | `won_opportunity_count / nullif(closed_opportunity_count, 0)` grouped by business line | `analytics.fct_talemia_win_loss`, business-line performance | `raw_demo.talemia_awards`, `raw_demo.talemia_loss_reasons`, `raw_demo.talemia_opportunities` | Requires complete closed outcome population |
| Lost value by business line | `sum(contract_value)` for lost opportunities grouped by business line | `analytics.fct_talemia_win_loss` | `raw_demo.talemia_loss_reasons`, `raw_demo.talemia_opportunities` | Loss dates/reasons may be blank |
| Opportunity aging by business line | `avg(current_date - start_date)` for active opportunities grouped by business line | `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities` | Created date may need submission date fallback |
| Risk distribution by business line | Count and value grouped by `winning_likelihood` and business line | `analytics.fct_talemia_pipeline_risk` | `raw_demo.talemia_opportunities`, `raw_demo.talemia_risk_classification` | Medium may be absent; unknown bucket required |
| Detail table value | Opportunity-level `contract_value`, `qualified_sales`, `awarded_value`, or lost value based on status | `analytics.fct_talemia_pipeline`, `analytics.fct_talemia_win_loss` | opportunities, awards, losses | Value basis must be shown explicitly |

## 9. Visual Contract

### Opportunities by Business Line

Superset chart type: Bar chart.  
Dataset: `analytics.fct_talemia_business_line_performance`.  
Metric: opportunity count.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_business_line_performance`.  
Empty state: "No business-line opportunity records available."

### Pipeline Value by Business Line

Superset chart type: Horizontal bar chart.  
Dataset: `analytics.fct_talemia_business_line_performance`.  
Metric: pipeline value.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_business_line_performance`.  
Empty state: "No active pipeline value available by business line."

### Qualified Pipeline by Business Line

Superset chart type: Horizontal bar chart or stacked bar chart.  
Dataset: `analytics.fct_talemia_business_line_performance`.  
Metric: qualified pipeline value.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_business_line_performance`.  
Empty state: "No qualified pipeline value available by business line."

### Win Rate by Business Line

Superset chart type: Bar chart.  
Dataset: `analytics.fct_talemia_win_loss` or `analytics.fct_talemia_business_line_performance` if pre-aggregated.  
Metric: win rate.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/win-loss` or `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_win_loss`.  
Empty state: "No closed outcomes available for business-line win rate."

### Lost Value by Business Line

Superset chart type: Horizontal bar chart.  
Dataset: `analytics.fct_talemia_win_loss`.  
Metric: lost bid value.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/win-loss`.  
Record spec: `analytics.fct_talemia_win_loss`.  
Empty state: "No lost value available by business line."

### Opportunity Aging by Business Line

Superset chart type: Bar chart or box plot if supported; otherwise table plus bar chart.  
Dataset: `analytics.fct_talemia_pipeline`.  
Metric: average opportunity aging days.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines` and `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No active opportunities available for aging analysis."

### Risk Distribution by Business Line

Superset chart type: Stacked bar chart.  
Dataset: `analytics.fct_talemia_pipeline_risk`.  
Metrics: opportunity count and optional value by likelihood.  
Dimensions: business line, winning likelihood.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines` or future risk endpoint.  
Record spec: `analytics.fct_talemia_pipeline_risk`.  
Empty state: "No business-line risk records available."

### Business-Line Opportunity Detail Table

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_pipeline`, with closed outcome fields from win/loss mart if implementation creates a unified detail view.  
Columns: opportunity ID, opportunity name, client, client department, business line, opportunity stage, workflow state, winning likelihood, sector type, account manager, contract value, qualified sales, expected award quarter, aging days, value basis.  
Backend dependency: `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No business-line opportunity detail records match the selected filters."

## 10. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Dimensions | Metrics |
| --- | --- | --- | --- | --- |
| Opportunities by business line | Bar chart | `analytics.fct_talemia_business_line_performance` | business line | opportunity count |
| Pipeline value by business line | Horizontal bar | `analytics.fct_talemia_business_line_performance` | business line | pipeline value |
| Qualified pipeline by business line | Horizontal or stacked bar | `analytics.fct_talemia_business_line_performance` | business line | qualified pipeline value |
| Win rate by business line | Bar chart | `analytics.fct_talemia_win_loss` | business line | won count, closed count, win rate |
| Lost value by business line | Horizontal bar | `analytics.fct_talemia_win_loss` | business line | lost value |
| Opportunity aging by business line | Bar chart or table | `analytics.fct_talemia_pipeline` | business line | average aging days |
| Risk distribution by business line | Stacked bar | `analytics.fct_talemia_pipeline_risk` | business line, winning likelihood | opportunity count, risk value |
| Business-line opportunity detail table | Table | `analytics.fct_talemia_pipeline` | opportunity, business line, stage, workflow, likelihood, sector | value fields, aging days |

## 11. Empty-State Behavior

Dashboard-level empty states:

- If all required marts are absent, show "TALEMIA business-line marts are not available yet."
- If marts exist but no rows match filters, show "No TALEMIA business-line records match the selected filters."
- If active stage extraction is partial, show a persistent limitation note on pipeline, aging, and risk visuals.

Visual-level empty states:

- Volume and value charts show no-data panels, not zero bars.
- Win rate shows no-data if closed opportunity denominator is zero.
- Risk distribution shows unknown bucket when likelihood is missing or unrecognized.
- Detail table remains available with column headers and record-spec link even when empty.

## 12. Dashboard Reconciliation Checks

Required checks:

- Business-line totals reconcile to executive pipeline totals for the same filters.
- Business-line pipeline value equals sum of included opportunity values in the detail table.
- Qualified pipeline by business line equals sum of included `qualified_sales` values.
- Win rate numerator and denominator reconcile to `analytics.fct_talemia_win_loss`.
- Lost value by business line reconciles to lost opportunity detail rows.
- Risk distribution counts reconcile to active pipeline opportunity count.
- Active stage completeness status is exposed and not `missing` before active pipeline totals are marked authoritative.
- Any target values from `raw_demo.talemia_dashboard_targets` that apply to business-line visuals are reconciled through `analytics.fct_talemia_dashboard_reconciliation`.

Accepted reconciliation statuses:

- `matched`
- `variance`
- `missing_target`
- `missing_mart_value`
- `unparsed_target`
- `requires_business_review`
- `partial_active_stage`

## 13. Record Specification Panels

The Business Lines tab must expose record specification panels for:

- `analytics.fct_talemia_business_line_performance`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_pipeline_risk`

Each panel must show:

- Grain.
- Business keys.
- Dimensions and accepted values.
- Measures and formulas.
- Raw lineage.
- dbt tests.
- Active-stage completeness status where applicable.
- Known limitations.

## 14. Known Limitations

- Active stage extraction appears partial in V3 because only Awarded and Lost were observed in stage/workflow dimension sheets.
- Medium likelihood is contractually accepted but may be absent from the current extract.
- Business-line values may need cleanup because source business line values can contain unexpected labels.
- Opportunity aging depends on created date or submission date fallback.
- Win rate by business line depends on complete won and lost outcome records.
- Dashboard reconciliation must be completed before authoritative business-line reporting.
