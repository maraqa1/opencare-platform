# TALEMIA Business Intelligence Removal Plan

Use-case key: `talemia_business_intelligence`  
Route slug: `talemia-business-intelligence`  
API prefix: `/api/v1/talemia`  
Superset dashboard slug: `talemia-business-intelligence`

## 1. Removability Standard

The use case must be removable without disturbing other OpenCare use cases. Every asset must be discoverable by at least one of these markers:

- Path contains `/talemia/`.
- dbt tag equals `talemia`.
- API prefix equals `/api/v1/talemia`.
- Portal route contains `talemia-business-intelligence`.
- Superset slug contains `talemia`.
- Config key equals `talemia_business_intelligence`.

## 2. Disable Procedure

Use this when the use case should be hidden but retained.

1. Set `config/use_cases.yaml` key `talemia_business_intelligence.enabled` to `false`.
2. Keep raw, staging, analytics, dictionary, backend, portal, and Superset assets in place.
3. Redeploy app configuration using the existing app rollout pattern:

```bash
bash scripts/bootstrap/apply_app.sh
```

4. Confirm the use case no longer appears in active use-case navigation.
5. Confirm direct API calls return either disabled or empty responses according to the future implementation contract.

## 3. Uninstall Procedure

Use this when the branch or use case is being fully removed.

### Documentation

Remove:

- `docs/use_cases/talemia_business_intelligence/use_case_contract.md`
- `docs/use_cases/talemia_business_intelligence/dashboard_measure_matrix.md`
- `docs/use_cases/talemia_business_intelligence/removal_plan.md`
- Any future docs under `docs/use_cases/talemia_business_intelligence/`

### Config

Remove:

- `talemia_business_intelligence` entry from `config/use_cases.yaml`
- Any future TALEMIA-specific platform config keys

### dbt

Remove:

- `dbt/opencare/models/talemia/`
- Any model entries tagged `talemia`
- Any TALEMIA source definitions
- Any TALEMIA additions to `dbt/opencare/models/metadata/dashboard_config.yml`

Drop analytics and dictionary objects after confirming no downstream dependencies:

```sql
drop table if exists analytics.fct_talemia_opportunity cascade;
drop table if exists analytics.fct_talemia_pipeline cascade;
drop table if exists analytics.fct_talemia_win_loss cascade;
drop table if exists analytics.fct_talemia_account_manager_performance cascade;
drop table if exists analytics.fct_talemia_business_line_performance cascade;
drop table if exists analytics.fct_talemia_opportunity_updates cascade;
drop table if exists analytics.fct_talemia_dashboard_reconciliation cascade;
drop table if exists dictionary.dict_talemia_metrics cascade;
drop table if exists dictionary.dict_talemia_terms cascade;
```

Drop raw tables if the source extract should also be removed:

```sql
drop table if exists raw_demo.talemia_opportunities cascade;
drop table if exists raw_demo.talemia_awards cascade;
drop table if exists raw_demo.talemia_loss_reasons cascade;
drop table if exists raw_demo.talemia_opportunity_updates_long cascade;
drop table if exists raw_demo.talemia_clients cascade;
drop table if exists raw_demo.talemia_client_departments cascade;
drop table if exists raw_demo.talemia_account_managers cascade;
drop table if exists raw_demo.talemia_business_lines cascade;
drop table if exists raw_demo.talemia_opportunity_stage cascade;
drop table if exists raw_demo.talemia_workflow_state cascade;
drop table if exists raw_demo.talemia_risk_classification cascade;
drop table if exists raw_demo.talemia_sector_type cascade;
drop table if exists raw_demo.talemia_business_terms cascade;
drop table if exists raw_demo.talemia_dashboard_targets cascade;
drop table if exists raw_demo.extraction_quality_report cascade;
```

### Backend

Remove future implementation assets:

- `apps/backend/app/routes/talemia.py`
- `apps/backend/app/services/talemia_service.py`
- Any TALEMIA import or router registration from `apps/backend/app/main.py`
- Any TALEMIA tests under `apps/backend/tests/`

Ensure no route remains under:

- `/api/v1/talemia`

### Portal

Remove future implementation assets:

- `apps/portal/app/use-cases/talemia-business-intelligence/`
- `apps/portal/components/talemia/`
- Any TALEMIA navigation entries or dashboard links
- Any TALEMIA governance registry entries

Ensure no page remains under:

- `/use-cases/talemia-business-intelligence`

### Superset

Remove:

- Dashboard slug `talemia-business-intelligence`
- TALEMIA chart definitions
- TALEMIA datasets referencing `analytics.fct_talemia_*`
- TALEMIA entries from `dbt/opencare/models/metadata/dashboard_config.yml`

Run existing sync only after metadata is clean:

```bash
bash scripts/superset/sync_dashboards_bootstrap.sh
```

### Raw Load Scaffolding

Remove future raw-load assets:

- `scripts/talemia/`
- Any TALEMIA workbook loader config
- Any scheduled TALEMIA load job

## 4. Validation After Disable

Run:

```bash
bash scripts/lint.sh
```

Then validate manually:

- Use-case card is hidden from active workspace navigation.
- `/use-cases/talemia-business-intelligence` is not advertised.
- `/api/v1/talemia/*` does not expose active data when disabled.
- Existing bed pressure and revenue cycle routes still work.

## 5. Validation After Uninstall

Run:

```bash
bash scripts/lint.sh
dbt ls --project-dir dbt/opencare --select tag:talemia
```

Expected result:

- `dbt ls --select tag:talemia` returns no models.

Search checks:

```bash
rg -n "talemia|talemia_business_intelligence|talemia-business-intelligence|/api/v1/talemia" .
```

Expected remaining matches:

- None, unless intentionally retained in changelog or archived docs.

Database checks:

```sql
select table_schema, table_name
from information_schema.tables
where table_name ilike '%talemia%';
```

Expected result:

- No rows, unless raw archival tables are intentionally retained.

## 6. Rollback

If uninstall removes too much:

1. Restore the branch or commit containing TALEMIA assets.
2. Re-run dbt for `tag:talemia` after raw tables are available.
3. Re-run app rollout.
4. Re-run Superset sync.
5. Validate APIs, portal route, dashboard, and reconciliation.

## 7. Residual Risk

- Superset metadata may retain orphaned chart or dataset records if deletion is not implemented in the sync script.
- Database raw tables may remain if manual drop SQL is skipped.
- Portal or governance registry entries may remain if they are implemented outside `/talemia/` paths.
- Historical artifacts outside the repo, such as screenshots or exported workbooks, are out of scope for automated removal.
