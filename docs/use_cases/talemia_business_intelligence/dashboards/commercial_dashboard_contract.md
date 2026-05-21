# TALEMIA Commercial Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA Commercial Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/commercial`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA Commercial Dashboard supports commercial planning, sales-cycle monitoring, expected award timing, client acquisition, and lifecycle visibility. It is the planning-oriented dashboard for understanding how opportunities move through the commercial lifecycle, when awards are expected, which clients are current or new, and whether sales-cycle metrics are trustworthy.

The dashboard must help answer:

- How long does the sales cycle take where dates are reliable?
- Which expected award quarters carry the largest opportunity volume or value?
- How are opportunities distributed by business line and lifecycle stage?
- Which clients contribute the highest commercial value?
- Which records need date validation before commercial KPIs are authoritative?

## 2. Query Rules

- Superset must query analytics schema only.
- Portal and backend APIs must query analytics and dictionary outputs only.
- No dashboard visual may query `raw_demo` directly.
- Date-derived metrics must expose validation status.
- Sales-cycle KPI must be marked partial when date fields are weak.
- Historical persistence limitations must be visible for client cohorts and trend-like interpretation.

## 3. Required Marts

| Mart | Grain | Dashboard role | Phase/status |
| --- | --- | --- | --- |
| `analytics.fct_talemia_sales_cycle` | One row per opportunity with validated sales-cycle date fields | Average sales cycle days, date quality status | Phase 1 scaffold; partial until dates are validated |
| `analytics.fct_talemia_pipeline_forecast` | One row per expected award period and filterable segment | Expected award date by quarter | Phase 2 unless expected award dates are validated |
| `analytics.fct_talemia_client_cohort` | One row per client per cohort/reporting period | Current and new client counts | Phase 1 with limited-history caveat |
| `analytics.fct_talemia_stage_distribution` | One row per stage/workflow/reporting segment | Opportunity stage distribution | Phase 1 scaffold; partial if active stages are missing |
| `analytics.fct_talemia_pipeline` | One row per active pipeline opportunity | Business-line distribution, top client value, commercial opportunity table | Phase 1 |

Implementation note: `analytics.fct_talemia_sales_cycle` and `analytics.fct_talemia_stage_distribution` should be added during dbt scaffolding with tags `talemia` and `commercial-intelligence`.

## 4. Required Filters

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Year | `year` | All visuals | Uses reporting year, submission year, expected award year, or close year depending on visual |
| Expected award quarter | `expected_award_quarter` | Expected award and opportunity table visuals | Source value preferred; derived value allowed when date is validated |
| Business line | `business_line` | Business-line, stage, table, and KPI visuals | Comes from canonical business-line dimension |
| Account manager | `account_manager` | Pipeline, client, and table visuals | Comes from account-manager dimension |
| Workflow state | `workflow_state` | Stage and table visuals | Separate from opportunity stage |
| Winning likelihood | `winning_likelihood` | Pipeline, expected award, and table visuals | Accepted values High, Medium, Low, Unknown |

## 5. Date Validation Contract

The dashboard depends on these source date fields:

- `created_date`
- `submission_date`
- `expected_award_date`
- `close_date`

Validation rules:

- Date fields must be parsed into real date types in staging.
- Invalid or unparsable dates must be retained as null typed dates with a validation flag.
- `created_date` must not be after `submission_date` when both are present.
- `submission_date` must not be after `close_date` when both are present.
- `expected_award_date` must not be before `submission_date` unless the record is explicitly flagged for review.
- `close_date` should align with award or loss status when available.
- Missing date fields must not silently become current date.

Recommended validation fields in analytics marts:

- `created_date_valid`
- `submission_date_valid`
- `expected_award_date_valid`
- `close_date_valid`
- `sales_cycle_date_quality_status`
- `expected_award_date_quality_status`

Accepted date quality statuses:

- `valid`
- `partial`
- `missing`
- `invalid_order`
- `unparsed`
- `requires_business_review`

## 6. Sales Cycle Logic

Average Sales Cycle Days formula:

- Preferred: `avg(close_date - created_date)` for opportunities with valid `created_date` and valid `close_date`.
- Fallback: `avg(close_date - submission_date)` where `created_date` is missing but `submission_date` and `close_date` are valid.
- Open opportunity aging must not be mixed into closed sales-cycle days.

Partial status:

- Mark sales-cycle KPI `partial` when more than an approved threshold of included records rely on fallback dates.
- Mark sales-cycle KPI `missing` when no valid closed opportunity date pairs exist.
- Mark sales-cycle KPI `requires_business_review` when date ordering violations exceed threshold.

Observed V3 concern:

- Inspected opportunity rows show incomplete `created_date`, `award_date`, `loss_date`, and `close_date` values.
- Sales-cycle reporting should therefore be considered partial until date validation passes.

## 7. Expected Award Quarter Logic

Expected award quarter source priority:

1. Use `expected_award_quarter` when present and accepted.
2. Derive from validated `expected_award_date` as `YYYY-QN`.
3. If both are missing, classify as `Unknown`.
4. If source quarter conflicts with derived quarter, classify as `requires_business_review` and preserve both values.

Accepted expected award quarter format:

- `YYYY-Q1`
- `YYYY-Q2`
- `YYYY-Q3`
- `YYYY-Q4`
- `Unknown`
- `requires_business_review`

Expected award date by quarter formula:

- `count(distinct opportunity_id)` and `sum(contract_value)` grouped by canonical expected award quarter.

Limitations:

- Forecasting is phase 2 unless expected award dates and quarters are validated.
- Expected award quarter must not be treated as a forecast confidence score.

## 8. Client Cohort Logic

Current client:

- Client with activity in the selected reporting period or active opportunity ownership in the selected filter context.

New client:

- Client whose first observed opportunity or first observed account-manager/client relationship occurs in the selected year.

Fallback without historical persistence:

- Use earliest available `created_date`, `submission_date`, or source observation in the V3 extract.
- Mark cohort status `limited_history`.

Accepted cohort statuses:

- `current`
- `new`
- `existing`
- `unknown`
- `limited_history`

Historical persistence limitation:

- Current/new client counts are not authoritative without persisted snapshots or a complete multi-year source history.

## 9. Formula Contract

| Measure | Formula | Source mart | Raw lineage | Limitation |
| --- | --- | --- | --- | --- |
| Average Sales Cycle Days | `avg(valid_close_date - valid_start_date)` where start is created date else submission date fallback | `analytics.fct_talemia_sales_cycle` | `raw_demo.talemia_opportunities`, awards/losses where outcome dates are enriched | Date fields are weak; KPI may be partial |
| Winning % | `won_opportunity_count / nullif(closed_opportunity_count, 0)` | `analytics.fct_talemia_stage_distribution` or win/loss mart feeding commercial endpoint | awards, losses, opportunities | Requires complete closed outcomes |
| Current Client count | `count(distinct client_id)` where cohort status current or existing | `analytics.fct_talemia_client_cohort` | `raw_demo.talemia_clients`, `raw_demo.talemia_opportunities` | Limited without persistence |
| New Client count | `count(distinct client_id)` where first-seen year equals selected year | `analytics.fct_talemia_client_cohort` | clients, opportunities | Limited without persistence |
| Expected Award Date by Quarter | `count(distinct opportunity_id)` and `sum(contract_value)` grouped by expected award quarter | `analytics.fct_talemia_pipeline_forecast` | `raw_demo.talemia_opportunities` | Phase 2 until expected award dates validate |
| Opportunities by Business Line | `count(distinct opportunity_id)` grouped by business line | `analytics.fct_talemia_pipeline` | opportunities, business lines | Active stage extraction may be partial |
| Opportunity Stage Distribution | `count(distinct opportunity_id)` grouped by opportunity stage and workflow state | `analytics.fct_talemia_stage_distribution` | opportunities, stage, workflow | Current V3 active stages may be incomplete |
| Top Client Value | `sum(coalesce(contract_value, qualified_sales, awarded_value))` grouped by client | `analytics.fct_talemia_pipeline` | opportunities, clients, awards | Value basis must be visible |
| Commercial opportunity table | Opportunity-level fields with date validation status | `analytics.fct_talemia_pipeline` and sales-cycle mart | opportunities and date fields | Table must expose date quality flags |

## 10. Visual Contract

### Average Sales Cycle Days

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_sales_cycle`.  
Metric: average sales cycle days.  
Backend dependency: future `GET /api/v1/talemia/commercial` or `GET /api/v1/talemia/kpis`.  
Record spec: `analytics.fct_talemia_sales_cycle`.  
Empty state: "Sales-cycle KPI requires valid start and close dates."

### Winning %

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_stage_distribution` or win/loss-derived commercial aggregate.  
Metric: winning percent.  
Backend dependency: future `GET /api/v1/talemia/commercial` or `GET /api/v1/talemia/win-loss`.  
Record spec: `analytics.fct_talemia_stage_distribution`.  
Empty state: "No closed outcomes available for winning percentage."

### Current Client Count

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_client_cohort`.  
Metric: current client count.  
Backend dependency: future `GET /api/v1/talemia/commercial` or `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_client_cohort`.  
Empty state: "Current-client status requires client cohort records."

### New Client Count

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_client_cohort`.  
Metric: new client count.  
Backend dependency: future `GET /api/v1/talemia/commercial` or `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_client_cohort`.  
Empty state: "New-client status requires first-seen logic."

### Expected Award Date by Quarter

Superset chart type: Bar chart.  
Dataset: `analytics.fct_talemia_pipeline_forecast`.  
Metrics: opportunity count and pipeline value.  
Dimensions: expected award quarter.  
Backend dependency: future `GET /api/v1/talemia/commercial`.  
Record spec: `analytics.fct_talemia_pipeline_forecast`.  
Empty state: "Expected award quarter view requires validated expected award dates."

### Opportunities by Business Line

Superset chart type: Bar chart.  
Dataset: `analytics.fct_talemia_pipeline`.  
Metric: opportunity count.  
Dimensions: business line.  
Backend dependency: `GET /api/v1/talemia/pipeline/business-lines`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No business-line opportunity records available."

### Opportunity Stage Distribution

Superset chart type: Stacked bar or bar chart.  
Dataset: `analytics.fct_talemia_stage_distribution`.  
Metrics: opportunity count and optional value.  
Dimensions: opportunity stage and workflow state.  
Backend dependency: `GET /api/v1/talemia/pipeline/stages`.  
Record spec: `analytics.fct_talemia_stage_distribution`.  
Empty state: "No stage distribution records available."

### Top Client Value

Superset chart type: Horizontal bar chart or table.  
Dataset: `analytics.fct_talemia_pipeline`.  
Metric: client value using visible value basis.  
Dimensions: client.  
Backend dependency: future `GET /api/v1/talemia/commercial` or `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No client value records available."

### Commercial Opportunity Table

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_pipeline`, with date quality fields from `analytics.fct_talemia_sales_cycle` if implemented separately.  
Columns: opportunity ID, opportunity name, client, client department, account manager, business line, opportunity stage, workflow state, winning likelihood, expected award quarter, expected award date, contract value, qualified sales, start date basis, close date, sales cycle days, date quality status.  
Backend dependency: `GET /api/v1/talemia/opportunities` or future `GET /api/v1/talemia/commercial`.  
Record spec: `analytics.fct_talemia_pipeline` and `analytics.fct_talemia_sales_cycle`.  
Empty state: "No commercial opportunity records match the selected filters."

## 11. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Dimensions | Metrics |
| --- | --- | --- | --- | --- |
| Average Sales Cycle Days | Big Number | `analytics.fct_talemia_sales_cycle` | reporting year, date quality status | average sales cycle days |
| Winning % | Big Number | `analytics.fct_talemia_stage_distribution` | reporting year | won count, closed count, winning percent |
| Current Client count | Big Number | `analytics.fct_talemia_client_cohort` | cohort status, reporting year | current client count |
| New Client count | Big Number | `analytics.fct_talemia_client_cohort` | cohort status, reporting year | new client count |
| Expected Award Date by Quarter | Bar chart | `analytics.fct_talemia_pipeline_forecast` | expected award quarter | opportunity count, pipeline value |
| Opportunities by Business Line | Bar chart | `analytics.fct_talemia_pipeline` | business line | opportunity count |
| Opportunity Stage Distribution | Bar or stacked bar | `analytics.fct_talemia_stage_distribution` | opportunity stage, workflow state | opportunity count, stage value |
| Top Client Value | Horizontal bar or table | `analytics.fct_talemia_pipeline` | client | client value |
| Commercial opportunity table | Table | `analytics.fct_talemia_pipeline` | opportunity, client, owner, stage, workflow, likelihood | value fields, date quality fields |

## 12. Empty-State Behavior

Dashboard-level empty states:

- If all required marts are absent, show "TALEMIA commercial marts are not available yet."
- If marts exist but filters match no rows, show "No TALEMIA commercial records match the selected filters."
- If date validation is incomplete, keep the dashboard visible and mark date-derived visuals partial.

Visual-level empty states:

- Sales cycle shows no-data when no valid date pairs exist.
- Expected award quarter shows phase 2 or validation-required state when expected award dates are unvalidated.
- Client cohort cards show limited-history status when persistence is unavailable.
- Stage distribution shows partial-stage limitation when active stages are missing.
- Commercial opportunity table remains visible with record-spec link and date quality columns.

## 13. Dashboard Reconciliation Checks

Required checks:

- Sales-cycle date pair count and invalid date count are reported.
- Average sales cycle days is marked `valid`, `partial`, `missing`, or `requires_business_review`.
- Expected award quarter values reconcile to source quarter or derived quarter.
- Current and new client counts reconcile to `analytics.fct_talemia_client_cohort`.
- Opportunity stage distribution reconciles to opportunity detail rows.
- Business-line opportunity counts reconcile to business-line dashboard totals for the same filters.
- Top client value reconciles to included opportunity value basis.
- Date-derived visuals expose validation status before authoritative reporting.

Accepted reconciliation statuses:

- `matched`
- `variance`
- `missing_mart_value`
- `missing_target`
- `unparsed_target`
- `partial_dates`
- `invalid_date_order`
- `limited_history`
- `phase_2`
- `requires_business_review`

## 14. Record Specification Panels

The Commercial tab must expose record specification panels for:

- `analytics.fct_talemia_sales_cycle`
- `analytics.fct_talemia_pipeline_forecast`
- `analytics.fct_talemia_client_cohort`
- `analytics.fct_talemia_stage_distribution`
- `analytics.fct_talemia_pipeline`

Each panel must show:

- Grain.
- Business keys.
- Date validation rules.
- Expected award quarter logic.
- Client cohort logic.
- Measures and formulas.
- Raw lineage.
- dbt tests.
- Current phase/status.
- Known limitations.

## 15. Known Limitations

- Created, submission, expected award, and close dates need validation before sales-cycle and expected-award visuals are authoritative.
- Sales-cycle KPI is partial when date fields are weak or fallback date logic is heavily used.
- Expected award quarter is phase 2 unless expected award dates and quarters validate.
- Current/new client logic is limited without historical persistence.
- Active opportunity stage distribution may be incomplete in V3.
- Hidden Power BI / DAX logic may still affect visible targets.
- Dashboard reconciliation must be completed before authoritative commercial reporting.
