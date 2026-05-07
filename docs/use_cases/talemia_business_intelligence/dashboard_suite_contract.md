# TALEMIA Business Intelligence Dashboard Suite Contract

Status: draft suite contract  
Use-case key: `talemia_business_intelligence`  
Use-case route: `/use-cases/talemia-business-intelligence`  
Main Superset slug: `talemia-business-intelligence`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v4.xlsx`

## 1. Purpose

This parent contract defines the complete TALEMIA Business Intelligence dashboard suite. It links the individual dashboard contracts and establishes shared filters, dimensions, marts, backend endpoints, Superset slugs, portal tabs, access roles, empty states, reconciliation logic, limitations, and implementation sequence.

The request references a six-dashboard suite but lists seven dashboards. This contract treats the listed seven dashboards as authoritative.

## 2. Dashboard Inventory

| Dashboard | Portal route/tab | Contract file | Purpose |
| --- | --- | --- | --- |
| BD Executive Dashboard | `/use-cases/talemia-business-intelligence/executive` | `dashboards/bd_executive_dashboard_contract.md` | Executive commercial control tower for pipeline, wins/losses, client coverage, and KPI performance |
| Financials Focused Dashboard | `/use-cases/talemia-business-intelligence/financial` | `dashboards/financial_dashboard_contract.md` | Revenue realization, awarded value, converted value, pipeline monetization, and sales growth analysis |
| Business Line Dashboard | `/use-cases/talemia-business-intelligence/business-lines` | `dashboards/business_line_dashboard_contract.md` | Commercial pipeline distribution, value, risk, and performance by business line |
| Account Manager Dashboard | `/use-cases/talemia-business-intelligence/account-managers` | `dashboards/account_manager_dashboard_contract.md` | Relationship ownership, owner performance, client coverage, managed pipeline, and weekly follow-up |
| Commercial Dashboard | `/use-cases/talemia-business-intelligence/commercial` | `dashboards/commercial_dashboard_contract.md` | Commercial planning, sales-cycle monitoring, expected award timing, client acquisition, and lifecycle visibility |
| Opportunity Details Dashboard | `/use-cases/talemia-business-intelligence/opportunities` | `dashboards/opportunity_details_dashboard_contract.md` | Opportunity-grain operational workflow intelligence and drilldown |
| KPI Governance Dashboard | `/use-cases/talemia-business-intelligence/governance` | `dashboards/kpi_governance_dashboard_contract.md` | KPI definitions, formulas, lineage, glossary, extraction quality, and reconciliation |

## 3. Portal Tab Structure

The portal workspace at `/use-cases/talemia-business-intelligence` must expose these tabs:

| Tab | Route | Primary dashboard |
| --- | --- | --- |
| Overview | `/use-cases/talemia-business-intelligence` or `/overview` | Suite summary and entry points |
| Executive | `/executive` | BD Executive Dashboard |
| Financial | `/financial` | Financials Focused Dashboard |
| Business Lines | `/business-lines` | Business Line Dashboard |
| Account Managers | `/account-managers` | Account Manager Dashboard |
| Commercial | `/commercial` | Commercial Dashboard |
| Opportunities | `/opportunities` | Opportunity Details Dashboard |
| Governance | `/governance` | KPI Governance Dashboard |
| Data Contract | `/data-contract` | Raw table, mart, metric, and removal contract view |

## 4. Superset Dashboard Slugs

Main Superset slug:

- `talemia-business-intelligence`

Recommended suite child slugs:

| Dashboard | Superset slug |
| --- | --- |
| BD Executive Dashboard | `talemia-business-intelligence-executive` |
| Financials Focused Dashboard | `talemia-business-intelligence-financial` |
| Business Line Dashboard | `talemia-business-intelligence-business-lines` |
| Account Manager Dashboard | `talemia-business-intelligence-account-managers` |
| Commercial Dashboard | `talemia-business-intelligence-commercial` |
| Opportunity Details Dashboard | `talemia-business-intelligence-opportunities` |
| KPI Governance Dashboard | `talemia-business-intelligence-governance` |

If implementation uses one Superset dashboard with tabs, the main slug remains authoritative and child slugs become internal section IDs or chart-group labels.

## 5. Shared Filters

Shared filters across the suite:

- `year`
- `account_manager`
- `business_line`
- `workflow_state`
- `winning_likelihood`
- `sector_type`

Additional dashboard-specific filters:

- `expected_award_quarter` for Financial and Commercial dashboards.
- `opportunity_id`, `client`, and `client_department` for Opportunity Details.
- `dashboard_name`, `kpi_name`, `source_table`, `metric_category`, and `quality_status` for KPI Governance.

Filter rules:

- Filters must be passed through backend endpoints and reflected in response metadata.
- Superset filters must target analytics or dictionary datasets only.
- Portal filters must not hardcode available values; they should derive values from analytics/dictionary or stable configuration.
- Unknown, blank, or unmapped dimension members must be represented as `Unknown`, not silently excluded.

## 6. Shared Dimensions

| Dimension | Canonical meaning | Accepted or required handling |
| --- | --- | --- |
| `opportunity_id` | Stable opportunity identifier | Required for drilldown |
| `client` | Client organization | Normalize while preserving source display |
| `client_department` | Client subdivision | Separate from client |
| `account_manager` | Relationship or opportunity owner | Separate from stage/workflow; Unknown bucket required |
| `business_line` | Commercial business line | Unknown bucket and accepted-value cleanup required |
| `opportunity_stage` | Commercial lifecycle stage | Separate from workflow state |
| `workflow_state` | Operational process state | Separate from opportunity stage |
| `winning_likelihood` | Commercial likelihood/risk class | High, Medium, Low, Unknown |
| `sector_type` | MoE+/Non-MoE sector grouping | Derived from `moe_classification` |
| `expected_award_quarter` | Expected award period | Source value preferred; derived from validated date if needed |
| `metric_category` | KPI grouping | Commercial, financial, pipeline, win/loss, governance, client, risk |
| `quality_status` | Governance quality state | Standard statuses per governance contract |

## 7. Shared Marts

Core marts:

- `analytics.fct_talemia_opportunity`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_account_manager_performance`
- `analytics.fct_talemia_business_line_performance`
- `analytics.fct_talemia_opportunity_updates`
- `analytics.fct_talemia_dashboard_reconciliation`
- `dictionary.dict_talemia_metrics`
- `dictionary.dict_talemia_terms`

Additional dashboard-specific marts introduced by child contracts:

- `analytics.fct_talemia_kpi_performance`
- `analytics.fct_talemia_pipeline_forecast`
- `analytics.fct_talemia_sales_growth`
- `analytics.fct_talemia_pipeline_risk`
- `analytics.fct_talemia_client_cohort`
- `analytics.fct_talemia_sales_cycle`
- `analytics.fct_talemia_stage_distribution`
- `analytics.fct_talemia_extraction_quality`

dbt requirements:

- All TALEMIA models must be under `dbt/opencare/models/talemia/`.
- All TALEMIA models must use tags `talemia` and `commercial-intelligence`.
- Models must be guarded so dbt does not fail if TALEMIA raw tables are absent.

## 8. Shared Backend Endpoints

Required endpoints:

- `GET /api/v1/talemia/executive-summary`
- `GET /api/v1/talemia/pipeline/business-lines`
- `GET /api/v1/talemia/pipeline/stages`
- `GET /api/v1/talemia/win-loss`
- `GET /api/v1/talemia/account-managers`
- `GET /api/v1/talemia/opportunities`
- `GET /api/v1/talemia/opportunities/{opportunity_id}`
- `GET /api/v1/talemia/updates`
- `GET /api/v1/talemia/kpis`
- `GET /api/v1/talemia/governance/reconciliation`

Recommended endpoints introduced by dashboard contracts:

- `GET /api/v1/talemia/financials`
- `GET /api/v1/talemia/commercial`
- `GET /api/v1/talemia/governance`

Existing governance endpoints to reuse:

- `GET /api/v1/lineage/models`
- `GET /api/v1/lineage/models/{model_name}`
- `GET /api/v1/lineage/impact/{source_name}`
- `GET /api/v1/lineage/freshness`
- `GET /api/v1/lineage/quality`
- `GET /api/v1/lineage/quality/{model_name}`
- `GET /api/v1/record-spec/{table_name}`

Endpoint rules:

- TALEMIA APIs must query analytics and dictionary schemas only.
- TALEMIA APIs must not query `raw_demo` directly.
- All endpoints must return `meta.empty=true` when required marts are missing or empty.
- No hardcoded KPI values.
- Responses must include applied filters and lineage metadata where useful.

## 9. Access Roles

| Role | Access | Primary tabs |
| --- | --- | --- |
| Executive / BD Director | Full business dashboard access and governance summary | Overview, Executive, Financial, Business Lines, Governance |
| Account Manager | Own account and opportunity views; governed summary metrics | Account Managers, Opportunities, Commercial |
| Commercial Operations Lead | Full operational and governance access | All tabs |
| Data/Governance Owner | Full governance, lineage, dictionary, record-spec, and reconciliation access | Governance, Data Contract, Opportunities |
| Platform Admin | Configuration, deployment, and removal visibility | Governance, Data Contract, admin surfaces |

Access rules:

- Role-based access should be implemented before production use.
- Demo mode may expose all tabs, but governance and contract must still document intended roles.
- Raw source tables must not be directly exposed through portal or Superset roles.

## 10. Empty States

Suite-level empty states:

- If TALEMIA use case is disabled: show disabled use-case state and hide from active navigation.
- If raw data has not been loaded: show "TALEMIA raw extract has not been loaded."
- If dbt marts are missing: show "TALEMIA marts are not available yet."
- If marts exist but selected filters return no rows: show "No TALEMIA records match the selected filters."
- If reconciliation has not run: show "TALEMIA dashboard reconciliation is pending."

Dataset-specific empty states:

- KPI cards must not show authoritative zero values when data is missing.
- Forecast and sales-growth visuals must show phase 2 or validation-required states when unsupported.
- Weekly updates must show provisional or unavailable states when parser quality fails.
- Sales-cycle visuals must show partial/missing state when date quality is weak.
- Governance views must show missing dictionary, missing lineage, or missing extraction quality honestly.

## 11. Reconciliation Logic

Reconciliation source:

- Dashboard targets from `raw_demo.talemia_dashboard_targets`, materialized through analytics.
- Calculated values from analytics marts.
- Formula definitions from `dictionary.dict_talemia_metrics`.

Required reconciliation mart:

- `analytics.fct_talemia_dashboard_reconciliation`

Core calculations:

- `absolute_variance = calculated_value - target_numeric_value`
- `percent_variance = absolute_variance / nullif(target_numeric_value, 0)`

Accepted reconciliation statuses:

- `matched`
- `variance`
- `missing_target`
- `missing_mart_value`
- `unparsed_target`
- `requires_business_review`
- `phase_2`
- `partial`
- `partial_dates`
- `partial_active_stage`
- `parser_provisional`
- `limited_history`

Suite rules:

- Each dashboard must show reconciliation status for KPI or target-driven visuals.
- KPI values are authoritative only when formula, lineage, dbt tests, freshness, and reconciliation status support that label.
- Visible target values must never override calculated mart values.
- Non-parsable target text must be preserved for review.

## 12. Known Limitations

- V4 is accepted as the current implementation baseline, but it still needs incremental manual and extractor-driven enhancement.
- V4 weekly updates are currently empty and need parser correction or manual enrichment.
- Expected award dates may need validation.
- Active opportunity stage extraction appears partial in V3.
- Hidden Power BI / DAX logic may still exist behind visible dashboard targets.
- Historical persistence is limited, affecting new-client logic and sales growth.
- Forecasting and anomaly detection are phase 2.
- Sales-cycle metrics are partial when date fields are weak.
- Contract signing is not separately represented in the V3 extract.
- Dashboard reconciliation must be completed before authoritative reporting.
- Some required marts were introduced by dashboard-level contracts and must be reconciled back into the dbt scaffolding plan.

## 13. Implementation Sequence

1. Approve contract suite and child dashboard contracts.
2. Align main use-case contract model list with all dashboard-specific marts.
3. Build TALEMIA raw-load scaffold for the V3 workbook.
4. Create dbt source definitions and guarded staging models.
5. Create core analytics and dictionary marts.
6. Create dashboard-specific marts: KPI performance, pipeline forecast, sales growth, pipeline risk, client cohort, sales cycle, stage distribution, extraction quality.
7. Add dbt tests, accepted values, tags, and record-spec metadata.
8. Implement backend endpoints against analytics/dictionary only.
9. Implement portal workspace tabs and truthful empty states.
10. Add Superset dashboard metadata and sync through existing Superset pattern.
11. Wire dbt lineage, freshness, quality, and record-spec panels through existing governance services.
12. Run dashboard reconciliation and mark values as source-derived or authoritative according to results.
13. Validate removal plan and disable/uninstall procedure.

## 14. Contract-Only Boundary

This document does not implement backend, portal, dbt, raw loading, Superset, or decision automation. It defines the suite contract that must be satisfied by later scaffolding and implementation phases.
