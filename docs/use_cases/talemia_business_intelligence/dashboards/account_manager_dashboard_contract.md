# TALEMIA Account Manager Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA Account Manager Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/account-managers`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA Account Manager Dashboard governs relationship ownership, account-manager performance, managed pipeline, client coverage, and operational follow-up. It gives commercial leaders and account managers a clear view of owned clients, owned opportunities, qualified value, awarded value, win percentage, and weekly follow-up discipline.

The dashboard must help answer:

- Which account managers own the most clients and opportunities?
- Which account managers carry the largest managed pipeline and qualified value?
- Which owners are converting opportunities into awards?
- Which owners have current versus new client coverage?
- Which opportunities need weekly update attention?
- Which client/opportunity records explain account-manager performance?

## 2. Account Manager Grain

Primary account-manager performance grain:

- One row per account manager per reporting year and filterable segment in `analytics.fct_talemia_account_manager_performance`.

Required account-manager key:

- `account_manager_id` when available.
- `account_manager_name` as the human-readable business key.
- Blank or missing account managers must be grouped into an explicit `Unknown` owner bucket.

The account manager dimension represents relationship or opportunity ownership. It must remain separate from:

- `opportunity_stage`, which describes commercial lifecycle position.
- `workflow_state`, which describes operational process state.
- `winning_likelihood`, which describes commercial risk or likelihood.
- `client_department`, which describes the client organization subdivision.

## 3. Query Rules

- Superset must query analytics schema only.
- Portal and backend APIs must query analytics and dictionary outputs only.
- No dashboard visual may query `raw_demo` directly.
- Account ownership must be represented as a dimension, not inferred from stage or workflow.
- Weekly updates are provisional until parser correction is validated.
- Record specification panels are required for every consumed dataset.

## 4. Required Marts

| Mart | Grain | Dashboard role | Required tests |
| --- | --- | --- | --- |
| `analytics.fct_talemia_account_manager_performance` | One row per account manager per reporting year/filter segment | Account manager count, managed opportunities, qualified value, awarded value, winning percent, pipeline by owner | Account manager key not null except Unknown bucket; non-negative value tests |
| `analytics.fct_talemia_client_cohort` | One row per client per account manager per cohort/reporting period | Current clients, new clients, total clients managed | Client key not null; cohort status accepted values |
| `analytics.fct_talemia_pipeline` | One row per active pipeline opportunity | Managed pipeline and client/opportunity detail table | Unique opportunity; accepted stage/workflow/likelihood values |
| `analytics.fct_talemia_opportunity_updates` | One row per opportunity update | Weekly update table and follow-up status | Unique update; update parser status; relationship to opportunity where possible |

Implementation note: `analytics.fct_talemia_client_cohort` is required for current/new client logic and should be added during dbt scaffolding with tags `talemia` and `commercial-intelligence`.

## 5. Required Filters

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Account manager | `account_manager` | All visuals | Includes Unknown bucket |
| Year | `year` | All visuals | Uses reporting year, submission year, or cohort year depending on visual |
| Business line | `business_line` | Pipeline, opportunity, and performance visuals | Should not remove client cohort records unless cohort mart supports segment attribution |
| Workflow state | `workflow_state` | Managed opportunity and pipeline visuals | Separate from ownership |
| Winning likelihood | `winning_likelihood` | Pipeline and opportunity visuals | Accepted values High, Medium, Low, Unknown |
| Sector type | `sector_type` | Client, pipeline, and performance visuals | Canonical value mapped from source MoE classification |

## 6. Current vs New Client Logic

Current client:

- A client with at least one active or closed opportunity assigned to the account manager in the selected reporting period.
- If historical persistence exists, current clients should be based on activity within the selected year.
- If historical persistence does not exist, current client status is derived from the V3 extract and marked `snapshot_derived`.

New client:

- A client whose first observed opportunity or first observed account-manager relationship occurs in the selected year.
- Preferred formula: `first_seen_year = selected year`.
- Fallback formula without historical persistence: derive first seen from the earliest available `submission_date`, `created_date`, or source row for that client in the V3 extract and mark the cohort as `limited_history`.

Total clients managed:

- `count(distinct client_id)` or `count(distinct normalized_client_name)` assigned to the account manager in the selected filter context.

Client cohort statuses:

- `current`
- `new`
- `existing`
- `unknown`
- `limited_history`

Limitations:

- Historical persistence is required for authoritative new-client logic.
- Client normalization is required before Arabic/translated/client-department variants are treated as the same client.

## 7. Weekly Update Provisional Rule

Weekly updates must be treated as provisional until parser validation is complete.

Observed V3 issue:

- Workbook sheet is named `talemia_opportunity_updates_lon`, while the required raw table is `raw_demo.talemia_opportunity_updates_long`.
- Some inspected update rows lack opportunity name and client name.

Dashboard behavior:

- Weekly update table must show parser status or limitation note.
- Follow-up KPIs must not be marked authoritative until update-opportunity matching is validated.
- Records with unmatched opportunities should remain visible in an `Unmatched` or `Needs review` state.

## 8. Formula Contract

| Measure | Formula | Source mart | Raw lineage | Limitation |
| --- | --- | --- | --- | --- |
| Account Managers count | `count(distinct account_manager_id)` excluding inactive owners unless filter includes all | `analytics.fct_talemia_account_manager_performance` | `raw_demo.talemia_account_managers`, `raw_demo.talemia_opportunities` | Blank owner must map to Unknown |
| Total clients managed | `count(distinct client_id)` grouped by account manager | `analytics.fct_talemia_client_cohort` | `raw_demo.talemia_clients`, `raw_demo.talemia_opportunities` | Client normalization required |
| Managed opportunities | `count(distinct opportunity_id)` assigned to account manager | `analytics.fct_talemia_account_manager_performance`, `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities` | Closed versus active inclusion must match visual label |
| Qualified value | `sum(qualified_sales)` for managed active/qualified opportunities | `analytics.fct_talemia_account_manager_performance`, `analytics.fct_talemia_pipeline` | `raw_demo.talemia_opportunities` | Qualification rule needs approval |
| Awarded value | `sum(awarded_value)` for won opportunities assigned to account manager | `analytics.fct_talemia_account_manager_performance` | `raw_demo.talemia_awards`, `raw_demo.talemia_opportunities` | Award date may be missing |
| Current clients | `count(distinct client_id)` where cohort status is current or existing in selected period | `analytics.fct_talemia_client_cohort` | clients, opportunities | Snapshot-derived until persistence exists |
| New clients | `count(distinct client_id)` where `first_seen_year = selected year` | `analytics.fct_talemia_client_cohort` | clients, opportunities | Limited without historical persistence |
| Winning % | `won_opportunity_count / nullif(closed_opportunity_count, 0)` by account manager | `analytics.fct_talemia_account_manager_performance` | awards, losses, opportunities | Requires complete closed outcomes |
| Pipeline by account manager | `sum(contract_value)` and count of active opportunities by account manager | `analytics.fct_talemia_pipeline` | opportunities, account managers | Active stage extraction may be partial |
| Weekly updates count | `count(distinct update_id)` by account manager/opportunity where matched | `analytics.fct_talemia_opportunity_updates` | `raw_demo.talemia_opportunity_updates_long` | Parser fix pending |

## 9. Visual Contract

### Account Managers Count

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_account_manager_performance`.  
Metric: account manager count.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_account_manager_performance`.  
Empty state: "No account-manager records available."

### Total Clients Managed

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_client_cohort`.  
Metric: total clients managed.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_client_cohort`.  
Empty state: "No managed client records available."

### Managed Opportunities

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_account_manager_performance`.  
Metric: managed opportunity count.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_account_manager_performance`.  
Empty state: "No managed opportunities available."

### Qualified Value

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_account_manager_performance`.  
Metric: qualified value.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_account_manager_performance`.  
Empty state: "No qualified value available for selected owners."

### Awarded Value

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_account_manager_performance`.  
Metric: awarded value.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_account_manager_performance`.  
Empty state: "No awarded value available for selected owners."

### Current Clients

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_client_cohort`.  
Metric: current client count.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_client_cohort`.  
Empty state: "Current-client status requires client cohort records."

### New Clients

Superset chart type: Big Number.  
Dataset: `analytics.fct_talemia_client_cohort`.  
Metric: new client count.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_client_cohort`.  
Empty state: "New-client status requires first-seen logic."

### Winning %

Superset chart type: Big Number or bar chart by owner.  
Dataset: `analytics.fct_talemia_account_manager_performance`.  
Metric: winning percent.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_account_manager_performance`.  
Empty state: "No closed outcomes available for winning percentage."

### Pipeline by Account Manager

Superset chart type: Horizontal bar chart.  
Dataset: `analytics.fct_talemia_pipeline`.  
Metrics: pipeline value and active opportunity count.  
Dimensions: account manager.  
Backend dependency: `GET /api/v1/talemia/account-managers`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No active managed pipeline available."

### Client/Opportunity Detail Table

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_pipeline`.  
Columns: account manager, client, client department, opportunity ID, opportunity name, business line, workflow state, opportunity stage, winning likelihood, sector type, contract value, qualified sales, expected award quarter, aging days.  
Backend dependency: `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_pipeline`.  
Empty state: "No client/opportunity records match the selected filters."

### Weekly Update Table

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_opportunity_updates`.  
Columns: account manager, opportunity ID, opportunity name, client, week number, week label, update text, operational signal, risk flag, parser status, source row.  
Backend dependency: `GET /api/v1/talemia/updates`.  
Record spec: `analytics.fct_talemia_opportunity_updates`.  
Empty state: "Weekly updates are unavailable or awaiting parser validation."

## 10. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Dimensions | Metrics |
| --- | --- | --- | --- | --- |
| Account Managers count | Big Number | `analytics.fct_talemia_account_manager_performance` | reporting year | account manager count |
| Total clients managed | Big Number | `analytics.fct_talemia_client_cohort` | reporting year, account manager | client count |
| Managed opportunities | Big Number | `analytics.fct_talemia_account_manager_performance` | reporting year, account manager | managed opportunity count |
| Qualified value | Big Number | `analytics.fct_talemia_account_manager_performance` | reporting year, account manager | qualified value |
| Awarded value | Big Number | `analytics.fct_talemia_account_manager_performance` | reporting year, account manager | awarded value |
| Current clients | Big Number | `analytics.fct_talemia_client_cohort` | cohort status, account manager | current client count |
| New clients | Big Number | `analytics.fct_talemia_client_cohort` | cohort status, account manager | new client count |
| Winning % | Big Number or owner bar | `analytics.fct_talemia_account_manager_performance` | account manager | won count, closed count, winning percent |
| Pipeline by account manager | Horizontal bar | `analytics.fct_talemia_pipeline` | account manager | pipeline value, opportunity count |
| Client/opportunity detail table | Table | `analytics.fct_talemia_pipeline` | owner, client, opportunity, stage, workflow, likelihood, sector | contract value, qualified sales, aging days |
| Weekly update table | Table | `analytics.fct_talemia_opportunity_updates` | owner, opportunity, week, parser status | update count, risk flag |

## 11. Empty-State Behavior

Dashboard-level empty states:

- If all required marts are absent, show "TALEMIA account-manager marts are not available yet."
- If marts exist but filters match no rows, show "No TALEMIA account-manager records match the selected filters."
- If weekly update parser validation is incomplete, keep update visuals visible but mark them provisional.

Visual-level empty states:

- KPI cards show no-data state instead of authoritative zero values when source rows are missing.
- Winning percentage shows no-data when closed denominator is zero.
- Client cohort visuals show `limited_history` when historical persistence is unavailable.
- Weekly update table shows unmatched update rows separately when opportunity matching is incomplete.

## 12. Dashboard Reconciliation Checks

Required checks:

- Account-manager totals reconcile to executive total opportunities and pipeline values under the same filters.
- Managed opportunity count reconciles to opportunity detail table rows.
- Qualified value reconciles to sum of `qualified_sales` for included opportunities.
- Awarded value reconciles to won/awarded records assigned to the account manager.
- Current and new client counts reconcile to `analytics.fct_talemia_client_cohort`.
- Winning percent numerator and denominator reconcile to account-manager won and closed counts.
- Weekly update count reconciles to update detail rows and reports parser status.
- Unknown owner bucket count is reported when account manager is blank.

Accepted reconciliation statuses:

- `matched`
- `variance`
- `missing_mart_value`
- `missing_target`
- `unparsed_target`
- `requires_business_review`
- `parser_provisional`
- `limited_history`

## 13. Record Specification Panels

The Account Managers tab must expose record specification panels for:

- `analytics.fct_talemia_account_manager_performance`
- `analytics.fct_talemia_client_cohort`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_opportunity_updates`

Each panel must show:

- Grain.
- Primary and business keys.
- Ownership dimensions.
- Client cohort logic.
- Measures and formulas.
- Raw lineage.
- dbt tests.
- Parser validation status for updates.
- Known limitations.

## 14. Known Limitations

- Weekly updates are provisional until parser correction and opportunity matching are validated.
- New-client logic is limited without historical persistence.
- At least one account manager value may be blank and must be handled through an Unknown bucket.
- Account ownership must not be inferred from opportunity stage or workflow state.
- Active pipeline values may be incomplete if active stage extraction remains partial.
- Awarded value may lack award dates and may require submission-year fallback for year filtering.
- Dashboard reconciliation must be completed before authoritative account-manager reporting.
