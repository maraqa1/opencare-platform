# TALEMIA Business Intelligence Use-Case Contract

Status: draft contract  
Use-case key: `talemia_business_intelligence`  
Route slug: `talemia-business-intelligence`  
API prefix: `/api/v1/talemia`  
Superset dashboard slug: `talemia-business-intelligence`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v4.xlsx`

## 1. Repo Discovery Findings

- OpenCare uses `config/use_cases.yaml` as the use-case registry.
- Existing use-case contracts and lessons live under `docs/use_cases/`.
- dbt project root is `dbt/opencare`; current project schemas include `staging`, `analytics`, and `dictionary`.
- A future isolated TALEMIA dbt path should be `dbt/opencare/models/talemia/`.
- Backend FastAPI routes live in `apps/backend/app/routes/`, with use-case service logic in `apps/backend/app/services/`.
- Portal routes live in `apps/portal/app/use-cases/`, with shared components under `apps/portal/components/`.
- Superset dashboard metadata is currently centralized in `dbt/opencare/models/metadata/dashboard_config.yml` and synchronized by `scripts/superset/sync_dashboards_bootstrap.sh`.
- Existing deployment scripts include `scripts/dbt/apply_dbt.sh`, `scripts/bootstrap/apply_app.sh`, and `scripts/superset/sync_dashboards_bootstrap.sh`.
- No TALEMIA-specific raw load command exists yet. The contract therefore defines a placeholder raw-load step to be implemented before analytics are authoritative.

## 2. Workbook Discovery Findings

The V4 workbook is accepted as the current implementation baseline. It contains these source-derived sheets:

- `talemia_opportunities`
- `talemia_opportunity_identity_br`
- `talemia_awards`
- `talemia_loss_reasons`
- `talemia_opportunity_updates_lon`
- `talemia_clients`
- `talemia_client_departments`
- `talemia_account_managers`
- `talemia_business_lines`
- `talemia_opportunity_stage`
- `talemia_workflow_state`
- `talemia_risk_classification`
- `talemia_sector_type`
- `talemia_deal_type`
- `talemia_business_terms`
- `talemia_dashboard_targets`
- `talemia_field_mapping_report`
- `extraction_quality_report`
- `load_summary`

The required raw table `raw_demo.talemia_opportunity_updates_long` maps to workbook sheet `talemia_opportunity_updates_lon`. The shortened sheet name appears to be caused by Excel's worksheet name length limit.

Observed V4 workbook row counts include 15 opportunities, 10 awards, 5 losses, 0 opportunity update rows, 5 clients, 10 client departments, 6 account managers, 6 business lines, 34 business terms, 8 dashboard target rows, 21 field-mapping rows, and 18 extraction quality checks. V4 improves parser diagnostics and business-line cleanup, but active pipeline rows, expected award dates, weekly updates, loss reasons, competitors, and outcome dates remain limited.

## 3. Proposed File Locations

- Main contract: `docs/use_cases/talemia_business_intelligence/use_case_contract.md`
- Dashboard measure matrix: `docs/use_cases/talemia_business_intelligence/dashboard_measure_matrix.md`
- Removal plan: `docs/use_cases/talemia_business_intelligence/removal_plan.md`
- Future dbt models: `dbt/opencare/models/talemia/`
- Future backend route: `apps/backend/app/routes/talemia.py`
- Future backend service: `apps/backend/app/services/talemia_service.py`
- Future portal route root: `apps/portal/app/use-cases/talemia-business-intelligence/`
- Future portal components: `apps/portal/components/talemia/`
- Future Superset metadata addition: `dbt/opencare/models/metadata/dashboard_config.yml`

## 4. Contract Outline

This contract defines:

- Business objective and personas.
- Source workbook and raw table contract.
- Commercial lifecycle semantics.
- KPI formulas, lineage, placements, filters, and limitations.
- dbt staging, analytics, and dictionary model contracts.
- Backend API contract.
- Portal workspace contract.
- Superset dashboard contract.
- Initial decision-signal contract.
- Governance, lineage, refresh, deployment, and removability requirements.
- Known limitations.

## 5. Implementation Phases

1. Contract and acceptance alignment.
2. Raw workbook load design for `raw_demo` tables.
3. dbt scaffolding under `dbt/opencare/models/talemia/`, guarded for absent raw tables.
4. Analytics and dictionary model implementation.
5. Backend API implementation against analytics and dictionary schemas only.
6. Portal workspace implementation with empty states and record specification panels.
7. Superset metadata update and dashboard sync.
8. Governance, lineage, reconciliation, and validation.
9. Removal drill to prove discoverability and clean uninstall.

## 6. Risks

- Weekly updates may need parser correction because the workbook sheet is shortened and some update rows lack opportunity names and client names.
- Expected award dates are incomplete and need validation before aging or delayed-award signals become authoritative.
- Visible dashboard target values may come from hidden Power BI or DAX logic not present in the V3 workbook.
- Historical persistence is limited unless snapshotting is added.
- Existing deployment scripts may need extension to include TALEMIA-specific dbt paths and dashboard metadata.
- Dashboard reconciliation must be completed before any executive reporting is treated as authoritative.

## 7. Next Step

Review this contract for business semantics, especially lifecycle stage definitions, KPI formula choices, and whether dashboard target reconciliation should be strict or advisory in phase 1. After approval, create the raw-load and dbt scaffolding without building dashboard UI first.

## 8. Business Objective

TALEMIA Business Intelligence turns commercial opportunity tracking into operational commercial intelligence for business development, account management, and executive steering.

The business problem is fragmented visibility across opportunities, awards, losses, weekly updates, account managers, business lines, client departments, likelihood, and dashboard target values. The workbook contains operational commercial records, but without a governed contract it cannot reliably answer which opportunities are active, which revenue is likely, where commercial effort is overloaded, or where dashboard values diverge from source-derived facts.

This is an operational commercial intelligence use case because it links source-derived commercial records to decisions about pursuit focus, account ownership, business-line investment, bid quality, follow-up discipline, and win/loss governance. It is not only a reporting layer; it establishes a governed decision surface for weekly commercial management.

The use case enables decisions such as:

- Which opportunities need executive attention.
- Which account managers are overloaded or under-supported.
- Which business lines have weak pipeline coverage.
- Which high-value opportunities have low likelihood and need mitigation.
- Which opportunities have stale updates or delayed expected award dates.
- Which losses require review by reason, competitor, client, or business line.
- Whether visible dashboard KPI values reconcile to source-derived marts.

## 9. Personas

### Executive / BD Director

Owns growth performance and executive steering. Needs high-level pipeline value, wins, win rate, hit rate, lost bid value, business-line coverage, and risk signals.

Primary decisions:

- Prioritize strategic pursuits.
- Reallocate executive sponsorship.
- Challenge weak pipeline coverage.
- Review lost-value concentration.

### Account Manager

Owns assigned opportunities and client follow-up. Needs a clear opportunity list, weekly update status, expected award dates, likelihood, client department context, and next-action signals.

Primary decisions:

- Update stale opportunities.
- Escalate delayed awards.
- Focus effort on high-value opportunities.
- Improve client follow-up discipline.

### Commercial Operations Lead

Owns pipeline process, KPI reconciliation, governance, and operating cadence. Needs stage distribution, workflow state, update quality, lifecycle definitions, dashboard target reconciliation, and operational exceptions.

Primary decisions:

- Enforce pipeline hygiene.
- Validate dashboard metrics.
- Run weekly commercial reviews.
- Identify process bottlenecks.

### Data/Governance Owner

Owns source-to-mart lineage, metric definitions, data quality, accepted values, and removability. Needs raw table contracts, dbt tests, metric dictionary, business glossary, and extraction quality reporting.

Primary decisions:

- Approve metric definitions.
- Certify source-to-dashboard lineage.
- Flag data quality limitations.
- Manage use-case enablement or removal.

## 10. Source System and Raw Data Contract

Source system: TALEMIA V3 extractor workbook.

Raw schema: `raw_demo`.

All raw tables must preserve source lineage fields where available, including `source_sheet`, `source_row_number`, and `loaded_at`. Analytics models may standardize names, types, and values, but raw tables must remain source-derived and auditable.

### raw_demo.talemia_opportunities

Grain: one row per extracted commercial opportunity.  
Key fields: `opportunity_id`; business key candidate is source sheet plus source row plus opportunity name.  
Important columns: `opportunity_name_en`, `opportunity_name_ar`, `client_name`, `client_department`, `account_manager_name`, `business_line_name`, `moe_classification`, `opportunity_stage`, `workflow_state`, `winning_likelihood`, `deal_type`, `contract_value`, `qualified_sales`, `converted_value_2026`, `awarded_value`, `win_probability`, `created_date`, `submission_date`, `expected_award_date`, `expected_award_quarter`, `award_date`, `loss_date`, `close_date`, `submission_year`, `priority`, `source_name`, `loss_reason`, `competitor`, `notes`.  
Dashboard usage: base table for executive KPIs, pipeline, win/loss, opportunity lists, lifecycle status, aging, and filters.  
Limitations: date completeness is uneven; some dimension values may be inferred from workbook sheets; award and loss dates are incomplete; hidden dashboard logic may not be represented.

### raw_demo.talemia_awards

Grain: one row per extracted award event.  
Key fields: `award_id`, `opportunity_id`.  
Important columns: `opportunity_name_en`, `client_name`, `account_manager_name`, `business_line_name`, `award_date`, `awarded_value`.  
Dashboard usage: wins value, YTD wins, win/loss analysis, account-manager performance, business-line wins.  
Limitations: award dates may be null; awarded value may duplicate opportunity awarded value; contract signing is not separately captured.

### raw_demo.talemia_loss_reasons

Grain: one row per extracted lost opportunity.  
Key fields: `loss_id`, `opportunity_id`.  
Important columns: `opportunity_name_en`, `client_name`, `account_manager_name`, `business_line_name`, `loss_date`, `contract_value`, `loss_reason`, `competitor`.  
Dashboard usage: lost bid value, loss reason breakdown, competitor review, win/loss governance.  
Limitations: loss reason and competitor may be blank; loss date may be null; root cause may require manual enrichment.

### raw_demo.talemia_opportunity_updates_long

Grain: one row per opportunity update per week/update text.  
Key fields: `update_id`, `opportunity_id`, `week_number`; business key candidate is opportunity plus source row plus week label.  
Important columns: `opportunity_name_en`, `opportunity_name_ar`, `client_name`, `week_number`, `week_label`, `update_text`, `update_language`, `operational_signal`, `risk_flag`.  
Dashboard usage: weekly updates table, no-update signal, stale opportunity signal, operational follow-up evidence.  
Limitations: workbook sheet appears as `talemia_opportunity_updates_lon`; some rows lack opportunity name and client name; parser correction may be required before update lineage is authoritative.

### raw_demo.talemia_clients

Grain: one row per client.  
Key fields: `client_id`, `client_name`.  
Important columns: `client_type`, `sector`, `country`, `is_moe_related`, `active_flag`.  
Dashboard usage: client count, new clients, client filter, sector and MoE context.  
Limitations: client type, sector, and country may be blank; new-client determination requires historical persistence or first-seen logic.

### raw_demo.talemia_client_departments

Grain: one row per client department.  
Key fields: `client_department_id`, `client_name`, `client_department`.  
Important columns: `client_name`, `client_department`.  
Dashboard usage: client department filtering, opportunity ownership context, department-level concentration.  
Limitations: department spelling varies in source; hierarchy to client may need standardization.

### raw_demo.talemia_account_managers

Grain: one row per account manager.  
Key fields: `account_manager_id`, `account_manager_name`.  
Important columns: `department`, `active_flag`.  
Dashboard usage: account-manager pipeline value, account-manager performance, overload signal.  
Limitations: at least one observed account manager name is blank; active flag requires governance review.

### raw_demo.talemia_business_lines

Grain: one row per business line.  
Key fields: `business_line_id`, `business_line_name`.  
Important columns: `description`.  
Dashboard usage: business-line pipeline value, business-line performance, weak pipeline signal.  
Limitations: observed values may include classification-like values and need accepted-value cleanup.

### raw_demo.talemia_opportunity_stage

Grain: one row per opportunity stage.  
Key fields: `stage_id`, `stage_name`.  
Important columns: `stage_order`, `is_closed`, `is_won`, `is_lost`.  
Dashboard usage: opportunities by stage, lifecycle grouping, pipeline exclusion/inclusion.  
Limitations: observed V3 values include only `Awarded` and `Lost`; active pipeline stages must be added or recovered before full lifecycle reporting.

### raw_demo.talemia_workflow_state

Grain: one row per workflow state.  
Key fields: `workflow_state_id`, `workflow_state`.  
Important columns: `workflow_state`.  
Dashboard usage: workflow filters, operational status, active/closed segmentation.  
Limitations: observed V3 values include only `Awarded` and `Lost`; proposal and negotiation states may be missing.

### raw_demo.talemia_risk_classification

Grain: one row per winning likelihood.  
Key fields: `risk_classification_id`, `winning_likelihood`.  
Important columns: `risk_order`.  
Dashboard usage: high/medium/low likelihood counts, risk filters, high-value low-likelihood signal.  
Limitations: observed V3 values include `High` and `Low`; `Medium` must be accepted in the contract even if absent in the extract.

### raw_demo.talemia_sector_type

Grain: one row per sector type.  
Key fields: `sector_type_id`, `sector_type`.  
Important columns: `sector_type`.  
Dashboard usage: MoE versus non-MoE filters and sector concentration.  
Limitations: source opportunity column is named `moe_classification`; canonical mapping to `sector_type` must be explicit.

### raw_demo.talemia_business_terms

Grain: one row per glossary term.  
Key fields: `term_id`, `term_name`.  
Important columns: `term_definition`, `source_sheet`, `source_row_number`.  
Dashboard usage: data contract tab, metric dictionary support, record specification panel.  
Limitations: glossary terms are source-derived and may not include all OpenCare analytics terms.

### raw_demo.talemia_dashboard_targets

Grain: one row per dashboard target KPI and filter context.  
Key fields: `dashboard_name`, `kpi_name`, `filter_context`.  
Important columns: `visible_value`, `source_screenshot`.  
Dashboard usage: governance reconciliation against dashboard-visible values.  
Limitations: target values may be text formatted, rounded, or based on hidden Power BI/DAX logic.

### raw_demo.extraction_quality_report

Grain: one row per extraction quality check.  
Key fields: `check_name`, `extracted_at`.  
Important columns: `check_value`, `severity`.  
Dashboard usage: governance tab, quality warnings, readiness gate.  
Limitations: checks reflect extractor quality only; they do not replace dbt tests or dashboard reconciliation.

## 11. Commercial Lifecycle Stages

The lifecycle must distinguish five separate concepts.

### Opportunity Identification

Initial opportunity appears from source channels such as Etimad, direct contact, BD team, holding, group companies, or other source names.

### Qualification

Commercial team validates client, value, business line, likelihood, and fit. Qualified pipeline uses `qualified_sales` and excludes closed lost records unless explicitly included in a loss view.

### Proposal Development

Opportunity is being shaped, priced, or prepared for submission. This should be represented by `opportunity_stage` and/or `workflow_state` when source values become available.

### Negotiation

Opportunity has been submitted and is awaiting award, negotiation, or final decision. Expected award date and weekly updates are critical here.

### Award / Loss

Closed outcome represented by `opportunity_stage`, `workflow_state`, award records, and loss records. Award and loss must be separate outcomes.

### Contract Signing

Commercial award has converted into signed contract. Current V3 workbook does not provide a reliable separate signed-contract event; this remains a future enrichment unless `close_date` or a source field is certified.

### Weekly Operational Follow-up

Follow-up cadence represented by `talemia_opportunity_updates_long`. This is not a lifecycle stage; it is operational evidence attached to the opportunity lifecycle.

### Required Semantic Separation

- `opportunity_stage`: commercial lifecycle position, ordered and closed/won/lost aware.
- `workflow_state`: operational process state, which may differ from lifecycle stage.
- `winning_likelihood`: commercial risk or probability category, separate from stage.
- `sector_type`: market or client-sector grouping such as MoE+ or Non-MoE, mapped from `moe_classification`.
- `client_department`: client organization subdivision, separate from client and sector.

## 12. KPI Contract

All KPIs must be calculated in analytics/dictionary marts, never hardcoded in APIs or portal components. Full placement detail is in `dashboard_measure_matrix.md`.

| KPI | Formula | Source mart | Raw lineage | Placement | Filters | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| YTD opportunities | Count opportunities where `submission_year = year` or submission date falls in selected year | `analytics.fct_talemia_opportunity` | `talemia_opportunities` | Executive KPI cards | year, account manager, business line, workflow state, likelihood, sector type | Created date is incomplete; submission year may be fallback |
| Pipeline opportunities | Count opportunities not closed won/lost for selected year | `analytics.fct_talemia_pipeline` | `talemia_opportunities`, stage, workflow | Executive KPI cards, Pipeline stages | all standard filters | V3 observed stage values are mostly closed |
| Pipeline value | Sum `contract_value` for active pipeline opportunities | `analytics.fct_talemia_pipeline` | `talemia_opportunities` | Executive, Financial | all standard filters | Depends on active stage recovery |
| Qualified pipeline | Sum `qualified_sales` for qualified active opportunities | `analytics.fct_talemia_pipeline` | `talemia_opportunities` | Executive, Financial | all standard filters | Qualification rule must be confirmed |
| Wins value | Sum `awarded_value` for won opportunities | `analytics.fct_talemia_win_loss` | `talemia_awards`, opportunities | Executive, Win/loss | all standard filters | Award date may be null |
| YTD wins | Count won opportunities in selected year | `analytics.fct_talemia_win_loss` | `talemia_awards`, opportunities | Executive KPI cards | all standard filters | Year fallback may use submission year if award date missing |
| Win rate | Won count / closed opportunity count | `analytics.fct_talemia_win_loss` | awards, losses, opportunities | Executive, Win/loss | all standard filters | Requires reliable closed population |
| Hit rate | Won value / submitted or closed bid value | `analytics.fct_talemia_win_loss` | awards, losses, opportunities | Executive, Win/loss | all standard filters | Business definition must confirm value basis |
| Client count | Count distinct clients in selected opportunity set | `analytics.fct_talemia_opportunity` | opportunities, clients | Executive, Opportunities | all standard filters | Client normalization required |
| New clients | Count clients first seen in selected year | `analytics.fct_talemia_opportunity` | opportunities, clients | Executive | all standard filters | Requires persistence or first-seen date |
| Business-line pipeline value | Sum active pipeline value by business line | `analytics.fct_talemia_business_line_performance` | opportunities, business lines | Business Lines | year, business line, workflow state, likelihood, sector type | Business-line cleanup needed |
| Account-manager pipeline value | Sum active pipeline value by account manager | `analytics.fct_talemia_account_manager_performance` | opportunities, account managers | Account Managers | year, account manager, business line, workflow state, likelihood, sector type | Blank account manager exists |
| Lost bid value | Sum `contract_value` for lost opportunities | `analytics.fct_talemia_win_loss` | loss reasons, opportunities | Financial, Win/loss | all standard filters | Loss records may lack reason/date |
| Converted value 2026 | Sum `converted_value_2026` | `analytics.fct_talemia_opportunity` | opportunities | Financial | all standard filters | Null in observed sample; definition requires validation |
| Average sales cycle days | Average days between created/submission date and close/award/loss date | `analytics.fct_talemia_opportunity` | opportunities, awards, losses | Financial, Governance | all standard filters | Created, award, loss, and close dates may be missing |
| Opportunity aging | Days since created/submission date for open opportunities | `analytics.fct_talemia_pipeline` | opportunities | Opportunities | all standard filters | Created date fallback must be transparent |
| High / medium / low likelihood counts | Count opportunities by `winning_likelihood` | `analytics.fct_talemia_pipeline` | opportunities, risk classification | Executive, Opportunities | all standard filters | Medium may be absent in V3 extract |

## 13. Required dbt Models

Path: `dbt/opencare/models/talemia/`

All models must include:

- dbt tags: `talemia` and `commercial-intelligence`.
- Declared grain in model description.
- Primary key and business key definitions.
- Accepted values where applicable.
- Tests for primary keys, not-null critical fields, accepted values, relationships, and expression checks.
- Guards so dbt does not fail if `raw_demo` TALEMIA tables are absent.

Guarding approach:

- Add reusable macros to detect raw relations when needed.
- Staging models should return typed empty relations with expected columns if the corresponding raw table is absent.
- Analytics and dictionary models should depend on staging models and therefore remain runnable when raw data is absent.

### Staging Models

| Model | Grain | Keys | Accepted values and tests |
| --- | --- | --- | --- |
| `stg_talemia_opportunities` | One row per opportunity | `opportunity_id`; business key source sheet plus source row | `opportunity_id` not null and unique when present; accepted values for stage, workflow, likelihood, sector; numeric value non-negative tests |
| `stg_talemia_awards` | One row per award | `award_id`, `opportunity_id` | award ID not null and unique; relationship to opportunities when present; awarded value non-negative |
| `stg_talemia_losses` | One row per loss | `loss_id`, `opportunity_id` | loss ID not null and unique; relationship to opportunities when present; contract value non-negative |
| `stg_talemia_updates` | One row per opportunity update | `update_id`, `opportunity_id` | update ID not null and unique; week number positive; accepted update language where present |
| `stg_talemia_dimensions` | One row per dimension member per dimension type | generated dimension key | accepted dimension type values: client, department, account_manager, business_line, opportunity_stage, workflow_state, risk_classification, sector_type |
| `stg_talemia_dashboard_targets` | One row per dashboard target KPI/filter context | dashboard, KPI, filter context | KPI name not null; visible value not null; severity warning when not parseable |

### Analytics and Dictionary Models

| Model | Schema | Grain | Keys | Tests |
| --- | --- | --- | --- | --- |
| `analytics.fct_talemia_opportunity` | analytics | One row per opportunity | `opportunity_id` | unique and not null; accepted values; non-negative money fields |
| `analytics.fct_talemia_pipeline` | analytics | One row per active pipeline opportunity | `opportunity_id` | unique and not null; excludes closed won/lost; relationship to opportunity |
| `analytics.fct_talemia_win_loss` | analytics | One row per closed opportunity outcome | `opportunity_id` | accepted outcome values won/lost; closed value non-negative |
| `analytics.fct_talemia_account_manager_performance` | analytics | One row per account manager per year/filterable segment | `account_manager_id`, `reporting_year` | not-null account manager key except unknown bucket; KPI arithmetic tests |
| `analytics.fct_talemia_business_line_performance` | analytics | One row per business line per year/filterable segment | `business_line_id`, `reporting_year` | not-null business line key except unknown bucket; KPI arithmetic tests |
| `analytics.fct_talemia_opportunity_updates` | analytics | One row per opportunity update | `update_id` | unique and not null; relationship to opportunity where possible |
| `analytics.fct_talemia_dashboard_reconciliation` | analytics | One row per KPI target reconciliation | `dashboard_name`, `kpi_name`, `filter_context` | parse status accepted values; variance calculation tests |
| `dictionary.dict_talemia_metrics` | dictionary | One row per TALEMIA metric | `metric_id` | unique and not null; metric formula not null |
| `dictionary.dict_talemia_terms` | dictionary | One row per business term | `term_id` or normalized term name | unique and not null; definition not null |

## 14. Backend API Contract

Prefix: `/api/v1/talemia`

Rules:

- APIs query analytics and dictionary schemas only.
- APIs must not query `raw_demo` directly.
- APIs return `meta.empty=true` when required marts are missing or empty.
- APIs return `meta.empty=false` only when response data is populated from marts.
- No hardcoded KPI values.
- All endpoints accept filters: `year`, `account_manager`, `business_line`, `workflow_state`, `winning_likelihood`, `sector_type`.
- Endpoints must tolerate missing marts by returning a stable empty response.

### Endpoints

| Endpoint | Purpose | Required source marts |
| --- | --- | --- |
| `GET /api/v1/talemia/executive-summary` | Executive KPI cards and headline trend/risk summary | `fct_talemia_opportunity`, `fct_talemia_pipeline`, `fct_talemia_win_loss`, reconciliation |
| `GET /api/v1/talemia/pipeline/business-lines` | Pipeline value and count by business line | `fct_talemia_business_line_performance` |
| `GET /api/v1/talemia/pipeline/stages` | Opportunity counts/value by stage and workflow state | `fct_talemia_opportunity`, `fct_talemia_pipeline` |
| `GET /api/v1/talemia/win-loss` | Wins, losses, win rate, hit rate, loss reasons | `fct_talemia_win_loss` |
| `GET /api/v1/talemia/account-managers` | Account manager performance and overload support | `fct_talemia_account_manager_performance` |
| `GET /api/v1/talemia/opportunities` | Filtered opportunity table | `fct_talemia_opportunity` |
| `GET /api/v1/talemia/opportunities/{opportunity_id}` | Opportunity detail, updates, lineage, and record spec references | `fct_talemia_opportunity`, `fct_talemia_opportunity_updates` |
| `GET /api/v1/talemia/updates` | Weekly updates table and update quality signals | `fct_talemia_opportunity_updates` |
| `GET /api/v1/talemia/kpis` | Metric dictionary and current KPI values | `dict_talemia_metrics`, analytics facts |
| `GET /api/v1/talemia/governance/reconciliation` | Dashboard target reconciliation and quality report summary | `fct_talemia_dashboard_reconciliation`, `dict_talemia_metrics` |

### Standard Response Meta

```json
{
  "meta": {
    "empty": true,
    "message": "TALEMIA marts are not available yet.",
    "filters": {
      "year": null,
      "account_manager": null,
      "business_line": null,
      "workflow_state": null,
      "winning_likelihood": null,
      "sector_type": null
    },
    "lineage": [
      "analytics.fct_talemia_opportunity"
    ]
  },
  "data": []
}
```

## 15. Portal Workspace Contract

Route: `/use-cases/talemia-business-intelligence`

Workspace tabs:

| Tab | Purpose | API dependency | Dashboard dependency | Empty state | Record specification panel |
| --- | --- | --- | --- | --- | --- |
| Overview | Cross-functional summary, purpose, risks, and entry points | executive summary, KPIs | Executive KPI cards | Explain that marts must be loaded and reconciled | `analytics.fct_talemia_opportunity` |
| Executive | BD Director view of pipeline, wins, win rate, likelihood, and signals | executive summary, win-loss | Executive KPI cards, win/loss ratio | Show no authoritative metrics until marts exist | `dictionary.dict_talemia_metrics` |
| Financial | Pipeline value, wins value, lost bid value, converted value 2026, sales cycle | executive summary, win-loss | Pipeline value, financial KPI cards | Show source values pending reconciliation | `analytics.fct_talemia_win_loss` |
| Business Lines | Pipeline and performance by business line | pipeline/business-lines | Pipeline value by business line | Show business-line dimension requirements | `analytics.fct_talemia_business_line_performance` |
| Account Managers | Account manager pipeline, wins, losses, overload signals | account-managers | Account manager performance | Show unknown/blank owner caveat | `analytics.fct_talemia_account_manager_performance` |
| Opportunities | Searchable opportunity list and detail navigation | opportunities, opportunity detail | Opportunity details table | Show no records until opportunity mart exists | `analytics.fct_talemia_opportunity` |
| Data Contract | Raw table definitions, glossary, metric dictionary, accepted values | KPIs, governance/reconciliation | Optional dictionary charts | Show contract even when marts are empty | `dictionary.dict_talemia_terms` |

Portal rules:

- The workspace must present truthful empty states.
- It must not hardcode KPI values from screenshots or workbook targets.
- It must use record specification panels for each tab's primary mart.
- It must keep dashboard-visible values separate from reconciled mart values until reconciliation passes.
- Governance, lineage, dictionary, extraction quality, and reconciliation belong in Platform -> Administration -> Governance -> Use Case, not as a TALEMIA operational workspace tab.

## 16. Superset Dashboard Contract

Dashboard slug: `talemia-business-intelligence`

Rules:

- Superset queries analytics schema only.
- No `raw_demo` exposure in datasets, SQL Lab examples, or chart config.
- Filters: `year`, `account_manager`, `business_line`, `workflow_state`, `winning_likelihood`, `sector_type`.
- Dashboard metadata should be added through the existing dashboard config pattern if implementation reaches Superset phase.

Required charts:

- Executive KPI cards.
- Opportunities by stage.
- Pipeline value by business line.
- Win/loss ratio.
- Account manager performance.
- Opportunity details table.
- Weekly updates table.
- KPI governance / reconciliation table.

Required datasets:

- `analytics.fct_talemia_opportunity`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_account_manager_performance`
- `analytics.fct_talemia_business_line_performance`
- `analytics.fct_talemia_opportunity_updates`
- `analytics.fct_talemia_dashboard_reconciliation`

## 17. Decision Layer Contract

Decision automation is not implemented in this phase. These initial signals define future decision candidates only.

| Signal | Trigger rule | Source mart | Recommended action | Owner | Expected outcome | Current limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Stale opportunity | Active opportunity with no update in more than 7 days | `fct_talemia_pipeline`, `fct_talemia_opportunity_updates` | Request owner update and next action | Account Manager | Better follow-up discipline | Weekly parser needs validation |
| No weekly update | Active opportunity missing current week update | `fct_talemia_opportunity_updates` | Add update or mark no-change reason | Account Manager | Complete weekly operating cadence | Current week calendar not defined |
| High-value low-likelihood opportunity | Contract value above threshold and likelihood low | `fct_talemia_pipeline` | Executive review and mitigation plan | BD Director | Improve pursuit quality or deprioritize | Threshold requires business approval |
| Delayed expected award | Expected award date older than today and not closed | `fct_talemia_pipeline` | Escalate client follow-up | Account Manager | Reduce silent delays | Expected dates may be incomplete |
| Weak business-line pipeline | Business-line active pipeline below target | `fct_talemia_business_line_performance` | Review sourcing and allocation | Commercial Operations Lead | Better business-line coverage | Targets need approval |
| Account-manager overload | Owner has active count/value above threshold | `fct_talemia_account_manager_performance` | Rebalance ownership or support | Commercial Operations Lead | Better workload balance | Blank account manager exists |
| High lost bid value | Lost bid value above threshold in period | `fct_talemia_win_loss` | Run loss review by reason and competitor | BD Director | Reduce repeat loss patterns | Loss reasons may be blank |

## 18. Governance and Lineage

dbt is the lineage source for TALEMIA. Governance surfaces must derive from dbt metadata, analytics tables, and dictionary tables.

Required governance outputs:

- Metric dictionary in `dictionary.dict_talemia_metrics`.
- Business glossary in `dictionary.dict_talemia_terms`.
- Dashboard reconciliation in `analytics.fct_talemia_dashboard_reconciliation`.
- Extraction quality report represented in governed analytics or dictionary output.
- Source-to-mart lineage from raw tables to staging to analytics/dictionary.
- Model tests for keys, relationships, accepted values, and arithmetic.
- Record specification output for every analytics and dictionary mart consumed by API or portal.

## 19. Deployment and Refresh Contract

Commands are based on current repo inspection. TALEMIA-specific raw loading does not exist yet and must be added before implementation is complete.

### Raw Load

Placeholder required:

```bash
# TBD: create a TALEMIA raw workbook loader.
# Expected behavior: load talemia_raw_demo_extracted_v3.xlsx into raw_demo.talemia_* tables.
bash scripts/talemia/load_raw_demo.sh C:/R_Home/Talymia/talemia_raw_demo_extracted_v3.xlsx
```

Existing generic demo sync commands are Airbyte/MySQL demo specific and should not be reused for TALEMIA unless extended intentionally.

Current V4 raw load command:

```bash
bash scripts/talemia/load_v4_raw.sh
```

The command loads `scripts/talemia/talemia_raw_demo_v4.sql`, which was generated from `talemia_raw_demo_extracted_v4.xlsx`, into `raw_demo` source-derived tables.

### dbt Run and Test

Existing deployment pattern:

```bash
bash scripts/dbt/apply_dbt.sh
```

Future focused local/container command after model creation:

```bash
dbt run --project-dir dbt/opencare --select tag:talemia
dbt test --project-dir dbt/opencare --select tag:talemia
```

### Backend and Portal Restart or Redeploy

Existing app rollout pattern:

```bash
bash scripts/bootstrap/apply_app.sh
```

### Portal Rebuild or Redeploy

The same inspected app rollout script applies backend and portal manifests and restarts both deployments:

```bash
bash scripts/bootstrap/apply_app.sh
```

If implementation changes require new images, image publication must be handled before this command; the current script restarts deployments to pull configured images.

### Superset Sync

Existing pattern:

```bash
bash scripts/superset/sync_dashboards_bootstrap.sh
```

### Validation Commands

```bash
bash scripts/lint.sh
dbt test --project-dir dbt/opencare --select tag:talemia
```

API validation placeholders after backend implementation:

```bash
curl -fsS http://localhost:8000/api/v1/talemia/executive-summary
curl -fsS http://localhost:8000/api/v1/talemia/governance/reconciliation
```

Portal validation placeholder after portal implementation:

```bash
curl -fsS http://localhost:3000/use-cases/talemia-business-intelligence
```

## 20. Removability Contract

All assets must be discoverable by:

- Path contains `/talemia/`.
- dbt tag is `talemia`.
- API prefix is `/api/v1/talemia`.
- Portal route contains `talemia-business-intelligence`.
- Superset slug contains `talemia`.
- Config key is `talemia_business_intelligence`.

Removal procedures are detailed in `removal_plan.md`.

## 21. Known Limitations

- V3 weekly updates may need parser correction.
- Expected award dates may need validation.
- Hidden Power BI / DAX logic may still exist.
- Historical persistence is limited.
- Forecasting and anomaly detection are phase 2.
- Dashboard reconciliation must be performed before authoritative reporting.
- Current workbook active pipeline stages appear incomplete.
- Contract signing is not separately represented in the V3 extract.
