# TALEMIA Opportunity Details Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA Opportunity Details Dashboard  
Portal route/tab: `/use-cases/talemia-business-intelligence/opportunities`  
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA Opportunity Details Dashboard provides opportunity-grain operational workflow intelligence and drilldown. It is the record-level workspace for inspecting individual opportunities, bilingual opportunity names, client context, ownership, value fields, stage/workflow status, sector classification, weekly updates, operational signals, and risk flags.

The dashboard must help answer:

- What is the exact source-derived opportunity record?
- Which client, department, business line, and owner are tied to the opportunity?
- What is the commercial value and qualification status?
- What is the lifecycle stage versus workflow state?
- What is the latest validated weekly update?
- Does the opportunity carry an operational signal or risk flag?

## 2. Opportunity Grain

Primary opportunity grain:

- One row per commercial opportunity in `analytics.fct_talemia_opportunity`.

Primary key:

- `opportunity_id`.

Business key fallback:

- `source_sheet`
- `source_row_number`
- `opportunity_name_en`
- `opportunity_name_ar`
- `client_name`

The opportunity fact must preserve source lineage fields where available:

- `source_sheet`
- `source_record_type`
- `source_row_number`
- `loaded_at`

Opportunity detail rows must be stable enough to support row-level API drilldown and record specification output.

## 3. Query Rules

- Superset must query analytics schema only.
- Portal and backend APIs must query analytics and dictionary outputs only.
- No dashboard visual may query `raw_demo` directly.
- Weekly updates must come from a validated long-format updates mart.
- If update parser quality fails, opportunity detail must still render without relying on update-derived fields.
- Bilingual opportunity fields must be preserved as separate fields, not overwritten by translation or fallback logic.

## 4. Required Marts

| Mart | Grain | Dashboard role | Required tests |
| --- | --- | --- | --- |
| `analytics.fct_talemia_opportunity` | One row per opportunity | Main opportunity table and row-level detail | `opportunity_id` unique and not null; source lineage present when available |
| `analytics.fct_talemia_opportunity_updates` | One row per opportunity update | Weekly update, operational signal, risk flag, update drilldown | `update_id` unique and not null; parser status accepted values |
| `analytics.fct_talemia_pipeline_risk` | One row per opportunity risk classification or risk segment | Winning likelihood, risk distribution, high-value risk support | Accepted likelihood values; relationship to opportunity |

## 5. Required Filters

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Opportunity ID | `opportunity_id` | Detail table, drilldown, updates | Exact match |
| Client | `client` | Detail table, drilldown | Use normalized client display plus source name |
| Client department | `client_department` | Detail table | Separate from client |
| Account manager | `account_manager` | Detail table | Account ownership, not stage |
| Business line | `business_line` | Detail table | Canonical business line |
| Workflow state | `workflow_state` | Detail table | Operational process state |
| Winning likelihood | `winning_likelihood` | Detail table and risk mart | High, Medium, Low, Unknown |
| Sector type | `sector_type` | Detail table | MoE+, Non-MoE, Unknown |

## 6. Required Fields

The opportunity detail table and row-level API must expose:

| Field | Source mart | Raw lineage | Notes |
| --- | --- | --- | --- |
| Opportunity ID | `analytics.fct_talemia_opportunity` | `raw_demo.talemia_opportunities.opportunity_id` | Required stable key |
| Opportunity name EN | `analytics.fct_talemia_opportunity` | `opportunity_name_en` | Preserve English field exactly after standard trimming |
| Opportunity name AR | `analytics.fct_talemia_opportunity` | `opportunity_name_ar` | Preserve Arabic/bilingual field separately |
| Client | `analytics.fct_talemia_opportunity` | `client_name`, clients dimension | Keep source name and normalized display if available |
| Client department | `analytics.fct_talemia_opportunity` | `client_department`, client departments dimension | Separate from client |
| Business line | `analytics.fct_talemia_opportunity` | `business_line_name`, business lines dimension | Unknown bucket when missing |
| Account manager / BD owner | `analytics.fct_talemia_opportunity` | `account_manager_name`, account managers dimension | Unknown bucket when blank |
| Contract value | `analytics.fct_talemia_opportunity` | `contract_value` | Numeric, non-negative |
| Qualified value | `analytics.fct_talemia_opportunity` | `qualified_sales` | Numeric, non-negative |
| Converted value 2026 | `analytics.fct_talemia_opportunity` | `converted_value_2026` | May be null |
| Winning likelihood | `analytics.fct_talemia_pipeline_risk` or opportunity fact | `winning_likelihood`, risk classification | High, Medium, Low, Unknown |
| Workflow state | `analytics.fct_talemia_opportunity` | `workflow_state` | Separate from stage |
| Opportunity stage | `analytics.fct_talemia_opportunity` | `opportunity_stage` | Lifecycle stage |
| MoE / Non-MoE | `analytics.fct_talemia_opportunity` | `moe_classification`, sector type dimension | Canonical `sector_type` |
| Weekly update | `analytics.fct_talemia_opportunity_updates` | long-format updates table | Only from validated updates |
| Operational signal | `analytics.fct_talemia_opportunity_updates` | `operational_signal` | Provisional if parser status is not valid |
| Risk flag | `analytics.fct_talemia_opportunity_updates` and risk mart | `risk_flag`, `winning_likelihood` | Boolean update risk plus likelihood risk are separate |

## 7. Workflow State vs Opportunity Stage

`opportunity_stage`:

- Describes the commercial lifecycle position.
- Accepted values include Identified, Qualified, Proposal Development, Submitted, Negotiation, Awarded, Lost, Contract Signed, Unknown.
- Used for lifecycle distribution and stage-based reporting.

`workflow_state`:

- Describes the operational process state.
- Accepted values include New, In Review, In Progress, Submitted, Pending Award, Awarded, Lost, On Hold, Cancelled, Unknown.
- Used for workflow filtering and operational process follow-up.

Rules:

- Do not infer workflow state from opportunity stage unless explicitly marked as inferred.
- Do not infer opportunity stage from workflow state unless explicitly marked as inferred.
- When values are identical in source, preserve both fields and expose their separate meaning.

## 8. Weekly Update Validation

Required updates mart:

- `analytics.fct_talemia_opportunity_updates`.

Required raw source:

- `raw_demo.talemia_opportunity_updates_long`, mapped from workbook sheet `talemia_opportunity_updates_lon`.

Parser quality statuses:

- `valid`
- `partial`
- `unmatched_opportunity`
- `missing_update_text`
- `invalid_week`
- `parser_failed`
- `requires_business_review`

Rules:

- Weekly update visuals must use the long-format updates mart only.
- If parser quality is `parser_failed`, opportunity detail must not show update-derived operational signal as authoritative.
- If update rows are unmatched, show them in a review state rather than dropping them silently.
- If no valid update exists for an opportunity, show "No validated weekly update."

## 9. Formula and Derivation Contract

| Measure or derivation | Formula/rule | Source mart | Limitation |
| --- | --- | --- | --- |
| Opportunity detail row | One row per `opportunity_id` | `analytics.fct_talemia_opportunity` | Source extraction may have incomplete dates |
| Latest weekly update | Latest valid update by week number or loaded timestamp per opportunity | `analytics.fct_talemia_opportunity_updates` | Parser validation required |
| Update count | `count(distinct update_id)` by opportunity | `analytics.fct_talemia_opportunity_updates` | Unmatched updates remain provisional |
| Operational signal | Canonical signal from valid update row | `analytics.fct_talemia_opportunity_updates` | Not authoritative if parser status is partial/failed |
| Risk flag | Boolean update risk flag plus likelihood classification where applicable | updates and risk mart | Update risk and likelihood are separate concepts |
| Sector type | Map source `moe_classification` to MoE+, Non-MoE, Unknown | opportunity fact | Mapping must be transparent |

## 10. Visual Contract

### Opportunity Detail Table

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_opportunity`.  
Backend dependency: `GET /api/v1/talemia/opportunities`.  
Record spec: `analytics.fct_talemia_opportunity`.  
Empty state: "No opportunities match the selected filters."

Required columns:

- Opportunity ID
- Opportunity name EN
- Opportunity name AR
- Client
- Client department
- Business line
- Account manager / BD owner
- Contract value
- Qualified value
- Converted value 2026
- Winning likelihood
- Workflow state
- Opportunity stage
- MoE / Non-MoE
- Latest weekly update
- Operational signal
- Risk flag

### Row-Level Opportunity Drilldown

Portal visual type: detail drawer or detail page.  
Dataset: `analytics.fct_talemia_opportunity` plus updates and risk marts.  
Backend dependency: `GET /api/v1/talemia/opportunities/{opportunity_id}`.  
Record specs: all required marts.  
Empty state: "Opportunity record not found."

### Weekly Updates Drilldown

Superset chart type: Table.  
Dataset: `analytics.fct_talemia_opportunity_updates`.  
Backend dependency: `GET /api/v1/talemia/updates` and opportunity detail endpoint.  
Record spec: `analytics.fct_talemia_opportunity_updates`.  
Empty state: "No validated weekly updates are available for the selected opportunity."

### Risk and Likelihood Detail

Superset chart type: Table or compact risk panel.  
Dataset: `analytics.fct_talemia_pipeline_risk`.  
Backend dependency: `GET /api/v1/talemia/opportunities/{opportunity_id}`.  
Record spec: `analytics.fct_talemia_pipeline_risk`.  
Empty state: "No risk classification is available for the selected opportunity."

## 11. Row-Level Drilldown API Contract

Endpoint:

- `GET /api/v1/talemia/opportunities/{opportunity_id}`

Rules:

- Query analytics and dictionary only.
- Do not query `raw_demo`.
- Return `meta.empty=true` when opportunity mart is missing, empty, or the requested ID is not found.
- Preserve bilingual names as separate response fields.
- Return update-derived fields only with parser status.
- Return record specification links or identifiers for the consumed marts.

Required response shape:

```json
{
  "meta": {
    "empty": false,
    "opportunity_id": "OPP-example",
    "lineage": [
      "analytics.fct_talemia_opportunity",
      "analytics.fct_talemia_opportunity_updates",
      "analytics.fct_talemia_pipeline_risk"
    ],
    "record_specs": [
      "analytics.fct_talemia_opportunity",
      "analytics.fct_talemia_opportunity_updates",
      "analytics.fct_talemia_pipeline_risk"
    ]
  },
  "data": {
    "opportunity_id": "OPP-example",
    "opportunity_name_en": "Example opportunity",
    "opportunity_name_ar": "Example Arabic opportunity name",
    "client": "Example client",
    "client_department": "Example department",
    "business_line": "Education",
    "account_manager": "Example owner",
    "contract_value": 0,
    "qualified_value": 0,
    "converted_value_2026": null,
    "winning_likelihood": "Unknown",
    "workflow_state": "Unknown",
    "opportunity_stage": "Unknown",
    "sector_type": "Unknown",
    "latest_weekly_update": null,
    "operational_signal": null,
    "risk_flag": false,
    "update_parser_status": "missing_update_text"
  }
}
```

## 12. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset | Dimensions | Metrics |
| --- | --- | --- | --- | --- |
| Opportunity detail table | Table | `analytics.fct_talemia_opportunity` | opportunity, client, department, owner, business line, workflow, stage, likelihood, sector | contract value, qualified value, converted value |
| Weekly updates drilldown | Table | `analytics.fct_talemia_opportunity_updates` | opportunity, week, parser status, signal | update count, risk flag |
| Risk and likelihood detail | Table or risk panel | `analytics.fct_talemia_pipeline_risk` | opportunity, likelihood, risk level | risk value, risk count |

## 13. Empty-State Behavior

Dashboard-level empty states:

- If opportunity mart is absent, show "TALEMIA opportunity mart is not available yet."
- If filters match no opportunities, show "No TALEMIA opportunities match the selected filters."
- If update parser validation fails, keep the opportunity table available and show weekly updates as unavailable/provisional.

Row-level empty states:

- Missing opportunity ID returns `meta.empty=true`.
- Missing updates show "No validated weekly update."
- Missing risk classification shows "No risk classification available."
- Unknown owner, business line, sector, stage, or workflow must display as `Unknown`, not blank.

## 14. Dashboard Reconciliation Checks

Required checks:

- Opportunity table row count reconciles to `analytics.fct_talemia_opportunity` for the same filters.
- Opportunity IDs are unique and not null.
- Bilingual opportunity fields are preserved separately.
- Workflow state and opportunity stage remain separate fields.
- Sector type maps from MoE classification with Unknown fallback.
- Latest weekly update comes only from valid long-format update rows.
- Unmatched or parser-failed updates are counted and surfaced.
- Risk flag and winning likelihood are not conflated.

Accepted reconciliation statuses:

- `matched`
- `variance`
- `missing_mart_value`
- `missing_update`
- `parser_failed`
- `unmatched_opportunity`
- `requires_business_review`

## 15. Record Specification Panels

The Opportunities tab must expose record specification panels for:

- `analytics.fct_talemia_opportunity`
- `analytics.fct_talemia_opportunity_updates`
- `analytics.fct_talemia_pipeline_risk`

Each panel must show:

- Grain.
- Primary and business keys.
- Bilingual field handling.
- Ownership, lifecycle, workflow, likelihood, and sector dimensions.
- Value fields and formulas.
- Raw lineage.
- dbt tests.
- Parser validation status for updates.
- Known limitations.

## 16. Known Limitations

- Weekly updates must not be relied on if parser quality fails.
- Current V3 update sheet name is shortened and requires mapping to the long-format raw table contract.
- Some update rows may not match opportunity names or clients.
- Active stage/workflow extraction appears partial in V3.
- Converted value 2026 may be null.
- Bilingual opportunity names must be preserved even if one field appears low quality or unexpected.
- Dashboard reconciliation must be completed before authoritative operational drilldown reporting.
