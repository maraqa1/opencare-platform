# TALEMIA Financials Focused Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA Financials Focused Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/financial`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA Financials Focused Dashboard governs revenue realization, awarded value, converted value, pipeline monetization, and sales growth analysis. It separates revenue that has been won from pipeline that is qualified, submitted, expected, or forecasted.

The dashboard must help answer:

- How much commercial value has been awarded?
- How much value is converted into the 2026 view?
- How much pipeline is qualified versus merely identified or submitted?
- Which opportunities carry the largest value concentration?
- Which expected award periods hold the largest pipeline value?
- Is sales value growing year over year, and can that trend be trusted with current history?

## 2. Query Rules

- Superset must query analytics schema only.
- Portal and APIs must query analytics and dictionary only.
- No dashboard visual may query `raw_demo` directly.
- Realized awarded revenue must be separated from qualified, active, expected, and forecasted pipeline.
- Forecasting and growth visuals must expose limitations when historical snapshots are missing.
- Dashboard reconciliation targets are required before financial values are marked authoritative.

## 3. Required Marts

| Mart | Grain | Dashboard role | Phase |
| --- | --- | --- | --- |
| `analytics.fct_talemia_pipeline` | One row per active pipeline opportunity | Qualified pipeline, submitted opportunities, top opportunities, expected award period | Phase 1 |
| `analytics.fct_talemia_win_loss` | One row per closed opportunity outcome | Awarded revenue, won opportunities, realized value | Phase 1 |
| `analytics.fct_talemia_pipeline_forecast` | One row per expected award period and filterable segment | Pipeline value by expected award period, forecasted pipeline | Phase 2 unless current expected award dates are validated |
| `analytics.fct_talemia_sales_growth` | One row per year and filterable segment | Sales growth by year | Phase 2 unless historical snapshots or reliable year history exist |

Implementation note: `analytics.fct_talemia_pipeline_forecast` and `analytics.fct_talemia_sales_growth` should be added to dbt scaffolding with tags `talemia` and `commercial-intelligence`, but their populated behavior depends on date validation and historical persistence.

## 4. Required Filters

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Year | `year` | All visuals | Uses award year, submission year, or reporting year depending on visual |
| Expected award quarter | `expected_award_quarter` | Forecast and expected-award visuals | Must come from validated source field or derived expected award date |
| Business line | `business_line` | All visuals | Comes from business-line dimension |
| Account manager | `account_manager` | All visuals | Comes from account-manager dimension |
| Sector type | `sector_type` | All visuals | Canonical sector mapped from source MoE classification |
| Winning likelihood | `winning_likelihood` | Pipeline and forecast visuals | Should not filter realized awarded revenue unless the mart preserves closing likelihood |

## 5. Backend Endpoint Dependencies

Primary endpoint:

- `GET /api/v1/talemia/executive-summary`

Supporting endpoints:

- `GET /api/v1/talemia/win-loss`
- `GET /api/v1/talemia/opportunities`
- `GET /api/v1/talemia/pipeline/business-lines`
- `GET /api/v1/talemia/kpis`
- `GET /api/v1/talemia/governance/reconciliation`

Future endpoint recommended during implementation:

- `GET /api/v1/talemia/financials`

The future `financials` endpoint should return awarded revenue, converted value 2026, pipeline funnel, submitted count/value, won count/value, sales growth, top opportunities, expected award period distribution, and reconciliation metadata from analytics/dictionary outputs only.

## 6. Empty-State Behavior

If required phase 1 marts are missing:

- Return `meta.empty=true`.
- Show "TALEMIA financial marts are not available yet."
- Do not display zero revenue or zero pipeline as authoritative values.
- Keep record-spec panels visible.

If phase 2 forecast/growth marts are missing or empty:

- Show the corresponding visual as "Forecasting requires validated expected award dates and historical persistence."
- Do not block phase 1 awarded revenue or qualified pipeline visuals.
- Mark forecast and sales growth reconciliation as `requires_business_review` or `phase_2`.

If filters return no rows:

- Show "No TALEMIA financial records match the selected filters."
- Keep filters and record specs available.

## 7. KPI and Measure Formula Contract

| Measure | Formula | Source mart | Raw lineage | Revenue category | Limitation |
| --- | --- | --- | --- | --- | --- |
| Awarded Revenue KPI | `sum(awarded_value)` for won/awarded opportunities in selected period | `analytics.fct_talemia_win_loss` | `raw_demo.talemia_awards`, `raw_demo.talemia_opportunities` | Realized or awarded revenue | Award date may be null; contract signing is not separately captured |
| Converted Value 2026 KPI | `sum(converted_value_2026)` for selected filters | `analytics.fct_talemia_pipeline` or opportunity fact feeding financial endpoint | `raw_demo.talemia_opportunities` | Converted value view | Observed values may be null; business definition needs validation |
| Qualified Pipeline | `sum(qualified_sales)` for active qualified opportunities | `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities` | Qualified pipeline | Qualification rule may be inferred from positive qualified sales |
| Submitted Opportunities | `count(distinct opportunity_id)` where submission date/year exists or workflow/stage indicates submitted | `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities`, `raw_demo.talemia_workflow_state`, `raw_demo.talemia_opportunity_stage` | Submitted pipeline | V3 stage values may not fully represent submitted state |
| Won Opportunities | `count(distinct opportunity_id)` where outcome is won or awarded | `analytics.fct_talemia_win_loss` | `raw_demo.talemia_awards`, `raw_demo.talemia_opportunities` | Realized outcome | Award records may duplicate opportunity values if not de-duplicated |
| Sales Growth by Year | `(current_year_sales_value - prior_year_sales_value) / nullif(prior_year_sales_value, 0)` | `analytics.fct_talemia_sales_growth` | opportunities, awards, historical snapshots if added | Growth analysis | Historical snapshots are limited; use as phase 2 unless reliable history exists |
| Top Opportunities by Value | Rank opportunities by `coalesce(contract_value, qualified_sales, awarded_value)` depending on status | `analytics.fct_talemia_pipeline`, `analytics.fct_talemia_win_loss` | opportunities, awards | Pipeline and awarded value concentration | Value basis must be visible in the table |
| Pipeline Value by Expected Award Period | `sum(contract_value)` or `sum(qualified_sales)` grouped by `expected_award_quarter` or derived period | `analytics.fct_talemia_pipeline_forecast` | `raw_demo.talemia_opportunities` | Expected/forecasted pipeline | Expected award dates and quarters need validation |

## 8. Visual Contract

### Awarded Revenue KPI

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_win_loss`.  
Measure: awarded revenue.  
Backend dependency: `GET /api/v1/talemia/win-loss` or future `GET /api/v1/talemia/financials`.  
Record spec: `analytics.fct_talemia_win_loss`.  
Empty state: "No awarded revenue records available."

### Converted Value 2026 KPI

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_pipeline` or a future financial aggregate derived from opportunity facts.  
Measure: converted value 2026.  
Backend dependency: future `GET /api/v1/talemia/financials`; fallback `GET /api/v1/talemia/executive-summary`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "Converted value 2026 is not available in the current extract."

### Pipeline Qualification Funnel

Superset chart type: Funnel chart if supported; otherwise horizontal bar chart with ordered stages.  
Dataset: `analytics.fct_talemia_pipeline`.  
Measures: identified value, submitted value, qualified pipeline, active pipeline value.  
Backend dependency: future `GET /api/v1/talemia/financials`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No qualified pipeline records available."

### Submitted Opportunities

Superset chart type: Big Number with optional table drill.  
Dataset: `analytics.fct_talemia_pipeline`.  
Measure: submitted opportunity count and submitted value.  
Backend dependency: future `GET /api/v1/talemia/financials` or `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No submitted opportunities available."

### Won Opportunities

Superset chart type: Big Number with optional trend.  
Dataset: `analytics.fct_talemia_win_loss`.  
Measure: won opportunity count and wins value.  
Backend dependency: `GET /api/v1/talemia/win-loss`.  
Record spec: `analytics.fct_talemia_win_loss`.  
Empty state: "No won opportunities available."

### Sales Growth by Year

Superset chart type: Time-series line chart or bar chart by year.  
Dataset: `analytics.fct_talemia_sales_growth`.  
Measures: sales value, prior-year sales value, growth rate.  
Backend dependency: future `GET /api/v1/talemia/financials`.  
Record spec: `analytics.fct_talemia_sales_growth`.  
Empty state: "Sales growth requires validated historical data."

### Top Opportunities by Value

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_pipeline` joined or unioned with closed values through a financial mart if needed.  
Columns: opportunity ID, opportunity name, client, business line, account manager, workflow state, winning likelihood, value basis, value, expected award quarter.  
Backend dependency: `GET /api/v1/talemia/opportunities` or future `GET /api/v1/talemia/financials`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No opportunity value records available."

### Pipeline Value by Expected Award Period

Superset chart type: Bar chart or stacked bar chart.  
Dataset: `analytics.fct_talemia_pipeline_forecast`.  
Measures: pipeline value and qualified pipeline value by expected award quarter.  
Backend dependency: future `GET /api/v1/talemia/financials`.  
Record spec: `analytics.fct_talemia_pipeline_forecast`.  
Empty state: "Expected award period view requires validated expected award dates."

## 9. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Dimensions | Metrics |
| --- | --- | --- | --- | --- |
| Awarded Revenue KPI | Big Number | `analytics.fct_talemia_win_loss` | reporting year, outcome | awarded revenue |
| Converted Value 2026 KPI | Big Number | `analytics.fct_talemia_pipeline` | reporting year | converted value 2026 |
| Pipeline Qualification funnel | Funnel or horizontal bar | `analytics.fct_talemia_pipeline` | qualification step | opportunity count, pipeline value, qualified sales |
| Submitted Opportunities | Big Number | `analytics.fct_talemia_pipeline` | reporting year, workflow state | submitted count, submitted value |
| Won Opportunities | Big Number | `analytics.fct_talemia_win_loss` | reporting year, outcome | won count, wins value |
| Sales Growth by Year | Time-series or yearly bar | `analytics.fct_talemia_sales_growth` | reporting year | sales value, growth rate |
| Top opportunities by value | Table | `analytics.fct_talemia_pipeline` | opportunity, client, business line, owner, value basis | opportunity value |
| Pipeline value by expected award period | Bar chart | `analytics.fct_talemia_pipeline_forecast` | expected award quarter | pipeline value, qualified pipeline value |

## 10. Dashboard Reconciliation Targets

Required reconciliation inputs:

- `raw_demo.talemia_dashboard_targets` for visible financial KPI targets when available.
- `dictionary.dict_talemia_metrics` for formula definitions.
- `analytics.fct_talemia_dashboard_reconciliation` for target-to-mart comparisons.

Required reconciliation checks:

- Awarded revenue KPI target exists or is marked `missing_target`.
- Converted value 2026 KPI target exists or is marked `missing_target`.
- Mart value and visible target are compared with parse status.
- Non-numeric target values are marked `unparsed_target`.
- Forecast and growth charts are marked `phase_2` or `requires_business_review` when historical/forecast data is unavailable.
- Financial tab must show reconciliation status before values are labeled authoritative.

## 11. Record Specification Panels

The Financial tab must expose record specification panels for:

- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_pipeline_forecast`
- `analytics.fct_talemia_sales_growth`

Each panel must show:

- Grain.
- Business keys.
- Key financial measures.
- Revenue category: realized, qualified, submitted, forecasted, or growth.
- Raw lineage.
- dbt tests.
- Refresh status.
- Current phase and limitations.

## 12. Known Limitations

- Forecasting is phase 2 unless validated expected award dates and enough history are available.
- Sales growth is phase 2 unless reliable historical snapshots or year-over-year source history exist.
- Awarded revenue is not the same as signed or recognized revenue; contract signing is not separately captured in V3.
- Converted value 2026 needs business-definition validation.
- Expected award quarter may be source-provided or derived, but both require validation.
- Hidden Power BI / DAX logic may still affect visible financial dashboard targets.
- Dashboard reconciliation must be completed before authoritative financial reporting.
