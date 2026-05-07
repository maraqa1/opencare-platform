# TALEMIA KPI Governance and Dictionary Dashboard Contract

Status: draft dashboard contract  
Use-case key: `talemia_business_intelligence`  
Dashboard name: TALEMIA KPI Governance and Dictionary Dashboard  
Platform location: `/admin/governance` -> TALEMIA Business Intelligence use case
Source workbook: `C:\R_Home\Talymia\talemia_raw_demo_extracted_v3.xlsx`

## 1. Purpose

The TALEMIA KPI Governance and Dictionary Dashboard exposes KPI definitions, formulas, dashboard lineage, business glossary, extraction quality, and reconciliation through the shared Platform -> Administration -> Governance -> Use Case template. It is the trust layer for the TALEMIA commercial intelligence workspace and the required evidence surface before dashboard values are treated as authoritative.

The dashboard must help answer:

- What does each TALEMIA KPI mean?
- What formula calculates each KPI?
- Which analytics mart and raw source tables feed the KPI?
- Which dashboard target values reconcile to calculated values?
- Which source extraction quality issues remain open?
- Which dbt models and tests support each governed metric?
- Which limitations should business users see before relying on a metric?

## 2. Repo Lineage Pattern

OpenCare already has a dbt-aware lineage pattern:

- Backend service: `apps/backend/app/services/lineage_service.py`.
- Backend routes: `apps/backend/app/routes/lineage.py`.
- Record-spec route: `apps/backend/app/routes/record_spec.py`.
- Governance docs state that lineage prefers `manifest.json` when present and falls back to checked-in dbt models plus schema metadata when the manifest is not bundled.
- Existing lineage endpoints include `/api/v1/lineage/models`, `/api/v1/lineage/models/{model_name}`, `/api/v1/lineage/freshness`, `/api/v1/lineage/quality`, and `/api/v1/lineage/compliance`.

Contract rule:

- Do not build custom TALEMIA lineage before checking and reusing the existing dbt manifest/lineage service pattern.
- TALEMIA lineage must be sourced from dbt artifacts and model metadata wherever available.
- Any curated business lineage summary must be labeled as curated and secondary to dbt technical lineage.

## 3. Query Rules

- Portal and APIs must query dictionary, analytics, and existing lineage/record-spec services only.
- Superset must query dictionary and analytics schemas only.
- No dashboard visual may query `raw_demo` directly.
- Raw lineage may be displayed as metadata from dictionary/dbt lineage, not by querying raw tables in dashboard runtime.
- Reconciliation must compare calculated analytics values against dashboard targets.
- Source freshness and extraction quality must be shown when available.

## 4. Required Marts and Artifacts

| Mart or artifact | Grain | Dashboard role | Required status |
| --- | --- | --- | --- |
| `dictionary.dict_talemia_metrics` | One row per KPI/metric | KPI dictionary, formulas, owners, source mart, raw lineage, limitations | Required |
| `dictionary.dict_talemia_terms` | One row per business glossary term | Business glossary table | Required |
| `analytics.fct_talemia_dashboard_reconciliation` | One row per dashboard/KPI/filter reconciliation context | Target versus calculated value comparison | Required |
| `analytics.fct_talemia_extraction_quality` | One row per extraction quality check | Extraction quality report | Required |
| dbt manifest / lineage artifacts | One node per source/model/test in dbt graph | Source-to-mart lineage, dbt test status, impact | Required if available; fallback to checked-in dbt metadata |

Implementation note: `analytics.fct_talemia_extraction_quality` should be added during dbt scaffolding with tags `talemia` and `commercial-intelligence`. It should model `raw_demo.extraction_quality_report` through staging/analytics, not expose raw data directly.

## 5. Required Filters

| Filter | Expected parameter | Applies to | Notes |
| --- | --- | --- | --- |
| Dashboard name | `dashboard_name` | KPI dictionary, reconciliation | Examples include BD Executive, Financials, Business Lines |
| KPI name | `kpi_name` | KPI dictionary, reconciliation, calculation detail | Human-readable KPI name and normalized metric ID should both be searchable |
| Source table | `source_table` | Lineage, extraction quality, KPI dictionary | Refers to raw, staging, analytics, or dictionary metadata labels |
| Metric category | `metric_category` | KPI dictionary and detail panel | Commercial, financial, pipeline, win/loss, governance, client, risk |
| Quality status | `quality_status` | Extraction quality, dbt tests, reconciliation | Accepted statuses must be standardized |

## 6. Required Visuals

### KPI Dictionary Table

Purpose: list every TALEMIA KPI with its definition and calculation contract.

Dataset: `dictionary.dict_talemia_metrics`.  
Superset chart type: Table.  
Backend dependency: `GET /api/v1/talemia/kpis`.  
Record spec: `dictionary.dict_talemia_metrics`.

Required columns:

- `metric_id`
- `kpi_name`
- `metric_category`
- `formula`
- `source_mart`
- `raw_lineage`
- `dashboard_name`
- `filter_dimensions`
- `owner`
- `limitation`
- `authoritative_status`

Rules:

- Every KPI must show formula, source mart, raw lineage, owner if available, and limitation.
- Missing owner must display `Unassigned`, not blank.
- Missing formula must set quality status to `requires_business_review`.

### Business Glossary Table

Purpose: expose source-derived and OpenCare-defined business terms.

Dataset: `dictionary.dict_talemia_terms`.  
Superset chart type: Table.  
Backend dependency: `GET /api/v1/talemia/kpis` or future governance endpoint.  
Record spec: `dictionary.dict_talemia_terms`.

Required columns:

- `term_id`
- `term_name`
- `term_definition`
- `source_sheet`
- `source_row_number`
- `owner`
- `status`

### Dashboard Target Reconciliation Table

Purpose: compare calculated analytics values against visible dashboard targets from the extractor output.

Dataset: `analytics.fct_talemia_dashboard_reconciliation`.  
Superset chart type: Table.  
Backend dependency: `GET /api/v1/talemia/governance/reconciliation`.  
Record spec: `analytics.fct_talemia_dashboard_reconciliation`.

Required columns:

- `dashboard_name`
- `kpi_name`
- `filter_context`
- `target_visible_value`
- `target_numeric_value`
- `calculated_value`
- `absolute_variance`
- `percent_variance`
- `reconciliation_status`
- `limitation_note`

Rules:

- Reconciliation must compare calculated values against dashboard targets.
- Text values such as `14.5bn` must be parsed with status tracking.
- Non-parsable values must be retained and marked `unparsed_target`.

### Extraction Quality Report

Purpose: expose extractor checks, severity, and readiness.

Dataset: `analytics.fct_talemia_extraction_quality`.  
Superset chart type: Table plus optional status summary.  
Backend dependency: `GET /api/v1/talemia/governance/reconciliation` or future governance endpoint.  
Record spec: `analytics.fct_talemia_extraction_quality`.

Required columns:

- `check_name`
- `check_value`
- `severity`
- `quality_status`
- `extracted_at`
- `affected_source_table`
- `limitation_note`

Freshness:

- Use `extracted_at` or `loaded_at` as the freshness field when present.
- If source freshness is available from `/api/v1/lineage/freshness`, display it alongside extraction quality.

### Source-to-Mart Lineage Summary

Purpose: show dbt-backed technical lineage from TALEMIA raw sources through staging to analytics and dictionary marts.

Dataset/source: dbt manifest / existing lineage service.  
Portal dependency: `/api/v1/lineage/models/{model_name}`, `/api/v1/lineage/impact/{source_name}`.  
Superset chart type: Table if represented as a metadata mart; otherwise portal lineage panel.  
Record spec: lineage model records where available.

Required lineage targets:

- `analytics.fct_talemia_opportunity`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_dashboard_reconciliation`
- `dictionary.dict_talemia_metrics`
- `dictionary.dict_talemia_terms`

Rules:

- Use dbt as lineage source.
- Do not create a custom lineage graph unless the existing lineage service cannot represent TALEMIA after dbt metadata is added.
- If manifest is unavailable, use the existing fallback pattern from checked-in dbt model/schema metadata.

### dbt Test Status Summary

Purpose: summarize model and column tests for TALEMIA models.

Dataset/source: dbt manifest / existing lineage quality endpoint.  
Portal dependency: `/api/v1/lineage/quality` and `/api/v1/lineage/quality/{model_name}`.  
Superset chart type: Table or status cards if materialized.  
Record spec: model-level record spec.

Required fields:

- `model_name`
- `test_name`
- `test_type`
- `test_status`
- `severity`
- `last_run_at`
- `failure_count`
- `limitation_note`

### Metric Calculation Detail Panel

Purpose: show the detailed contract for a selected KPI.

Dataset: `dictionary.dict_talemia_metrics` joined at API/service level to reconciliation and lineage metadata.  
Portal dependency: `GET /api/v1/talemia/kpis`, `GET /api/v1/talemia/governance/reconciliation`, and lineage endpoints.  
Superset chart type: Table/detail if built in Superset; preferred portal detail panel.  
Record spec: `dictionary.dict_talemia_metrics`.

Required fields:

- KPI name.
- Formula.
- Numerator and denominator where applicable.
- Source mart.
- Raw lineage.
- dbt lineage path.
- Dashboard placements.
- Filters.
- Owner if available.
- Limitation.
- Reconciliation status.
- Test coverage status.

## 7. Formula and Reconciliation Contract

Every KPI in `dictionary.dict_talemia_metrics` must include:

- `metric_id`
- `kpi_name`
- `metric_category`
- `business_definition`
- `formula`
- `source_mart`
- `raw_lineage`
- `dashboard_name`
- `filter_dimensions`
- `owner`
- `limitation`
- `authoritative_status`

Reconciliation formula:

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

Authoritative status:

- `authoritative`: formula, lineage, tests, and reconciliation pass.
- `source_derived`: calculated from marts but reconciliation is incomplete.
- `provisional`: known limitation affects confidence.
- `phase_2`: metric depends on future forecasting, snapshots, or parser correction.
- `blocked`: required mart or source quality is missing.

## 8. Backend Endpoint Dependencies

Primary endpoints:

- `GET /api/v1/talemia/kpis`
- `GET /api/v1/talemia/governance/reconciliation`

Existing governance endpoints to reuse:

- `GET /api/v1/lineage/models`
- `GET /api/v1/lineage/models/{model_name}`
- `GET /api/v1/lineage/impact/{source_name}`
- `GET /api/v1/lineage/freshness`
- `GET /api/v1/lineage/quality`
- `GET /api/v1/lineage/quality/{model_name}`
- `GET /api/v1/record-spec/{table_name}`

Future endpoint recommended during implementation:

- `GET /api/v1/talemia/governance`

The future governance endpoint should compose KPI dictionary, glossary, reconciliation, extraction quality, lineage links, dbt test status, and freshness metadata without querying `raw_demo` directly.

## 9. Empty-State Behavior

Dashboard-level empty states:

- If dictionary marts are absent, show "TALEMIA KPI dictionary is not available yet."
- If reconciliation mart is absent, show "TALEMIA dashboard reconciliation has not been built yet."
- If extraction quality mart is absent, show "TALEMIA extraction quality has not been materialized yet."
- If dbt manifest is absent, show "dbt manifest is unavailable; using checked-in model metadata fallback if available."

Visual-level empty states:

- KPI dictionary table keeps columns visible and shows missing-mart state.
- Business glossary table keeps columns visible and shows missing-glossary state.
- Reconciliation table shows no-data state rather than matched status.
- Extraction quality report shows no-data state rather than all-green status.
- Lineage panel uses existing lineage fallback and labels gaps honestly.
- Metric detail panel shows `requires_business_review` when formula, owner, or lineage is missing.

## 10. Dashboard Reconciliation Checks

Required checks:

- Every required TALEMIA dashboard KPI has a dictionary row.
- Every dictionary KPI has a formula.
- Every dictionary KPI has a source mart.
- Every dictionary KPI has raw lineage metadata.
- Every source mart has dbt lineage metadata or a documented fallback.
- Every required KPI target from `talemia_dashboard_targets` is represented in reconciliation or marked `missing_target`.
- Every calculated KPI value is compared to parsed target where possible.
- Every parse failure preserves the original target text.
- Extraction quality warnings are surfaced and linked to affected source tables.
- dbt test status summary includes all models tagged `talemia`.

## 11. Source Freshness and Extraction Quality

Source freshness:

- Prefer existing `/api/v1/lineage/freshness` output.
- Use source-level freshness configuration from dbt metadata when added.
- Use `loaded_at` or `extracted_at` columns as source freshness evidence when present.
- Display `unknown` when freshness cannot be calculated.

Extraction quality:

- Materialize `raw_demo.extraction_quality_report` into `analytics.fct_talemia_extraction_quality`.
- Preserve `check_name`, `check_value`, `severity`, and `extracted_at`.
- Add canonical `quality_status` values.

Accepted quality statuses:

- `pass`
- `warning`
- `fail`
- `info`
- `unknown`
- `requires_business_review`

## 12. Superset Dataset and Chart Mapping

| Visual | Superset chart type | Dataset/artifact | Dimensions | Measures/fields |
| --- | --- | --- | --- | --- |
| KPI dictionary table | Table | `dictionary.dict_talemia_metrics` | KPI, category, dashboard | formula, source mart, lineage, owner, limitation |
| Business glossary table | Table | `dictionary.dict_talemia_terms` | term, source sheet | definition, owner, status |
| Dashboard target reconciliation table | Table | `analytics.fct_talemia_dashboard_reconciliation` | dashboard, KPI, filter context, status | target value, calculated value, variance |
| Extraction quality report | Table/status summary | `analytics.fct_talemia_extraction_quality` | check, severity, source table | check value, quality status |
| Source-to-mart lineage summary | Portal lineage panel or table | dbt manifest / lineage service | source, model, stage | upstream, downstream, tests |
| dbt test status summary | Table/status cards | dbt manifest / lineage quality endpoint | model, test, severity | status, failures |
| Metric calculation detail panel | Detail panel | dictionary plus reconciliation plus lineage | KPI, source mart | formula, owner, limitation, reconciliation |

## 13. Record Specification Panels

The Platform -> Administration -> Governance -> TALEMIA use-case view must expose record specification panels for:

- `dictionary.dict_talemia_metrics`
- `dictionary.dict_talemia_terms`
- `analytics.fct_talemia_dashboard_reconciliation`
- `analytics.fct_talemia_extraction_quality`

It must also provide lineage links for:

- `analytics.fct_talemia_opportunity`
- `analytics.fct_talemia_pipeline`
- `analytics.fct_talemia_win_loss`
- `analytics.fct_talemia_account_manager_performance`
- `analytics.fct_talemia_business_line_performance`

Each panel must show:

- Grain.
- Primary and business keys.
- Formula or glossary definition.
- Source mart.
- Raw lineage.
- dbt tests.
- Freshness evidence.
- Reconciliation status.
- Limitations.

## 14. Known Limitations

- dbt manifest may not be bundled into the backend image; existing fallback to checked-in dbt metadata must be used if needed.
- Extraction quality checks reflect extractor output and do not replace dbt tests.
- Dashboard target values may be rounded, textual, or based on hidden Power BI / DAX logic.
- KPI owners may be unavailable in V3 and should display as `Unassigned`.
- Source freshness depends on `loaded_at`, `extracted_at`, or dbt freshness metadata being available.
- Forecasting, anomaly detection, and historical client trend governance are phase 2.
- Dashboard reconciliation must be completed before authoritative reporting.
