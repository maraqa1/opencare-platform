#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

sync_dbt_project_configmap() {
  log "Refreshing dbt project config map from repo files"
  kubectl -n "$NAMESPACE" create configmap dbt-project-files \
    --from-file=dbt_project.yml="$ROOT_DIR/dbt/opencare/dbt_project.yml" \
    --from-file=generate_schema_name.sql="$ROOT_DIR/dbt/opencare/macros/generate_schema_name.sql" \
    --from-file=test_expression_is_true.sql="$ROOT_DIR/dbt/opencare/macros/test_expression_is_true.sql" \
    --from-file=sources.yml="$ROOT_DIR/dbt/opencare/models/sources.yml" \
    --from-file=schema.yml="$ROOT_DIR/dbt/opencare/models/schema.yml" \
    --from-file=stg_wards.sql="$ROOT_DIR/dbt/opencare/models/staging/stg_wards.sql" \
    --from-file=stg_patients.sql="$ROOT_DIR/dbt/opencare/models/staging/stg_patients.sql" \
    --from-file=stg_bed_events.sql="$ROOT_DIR/dbt/opencare/models/staging/stg_bed_events.sql" \
    --from-file=stg_departments.sql="$ROOT_DIR/dbt/opencare/models/staging/stg_departments.sql" \
    --from-file=dim_ward.sql="$ROOT_DIR/dbt/opencare/models/marts/dim_ward.sql" \
    --from-file=dim_date.sql="$ROOT_DIR/dbt/opencare/models/marts/dim_date.sql" \
    --from-file=fct_bed_occupancy.sql="$ROOT_DIR/dbt/opencare/models/marts/fct_bed_occupancy.sql" \
    --from-file=fact_bed_occupancy.sql="$ROOT_DIR/dbt/opencare/models/marts/fact_bed_occupancy.sql" \
    --from-file=fact_capacity.sql="$ROOT_DIR/dbt/opencare/models/marts/fact_capacity.sql" \
    --from-file=dim_department.sql="$ROOT_DIR/dbt/opencare/models/marts/dim_department.sql" \
    --from-file=dim_time.sql="$ROOT_DIR/dbt/opencare/models/marts/dim_time.sql" \
    --from-file=dict_metrics.sql="$ROOT_DIR/dbt/opencare/models/dictionary/dict_metrics.sql" \
    --from-file=revenue_cycle_schema.yml="$ROOT_DIR/dbt/opencare/models/revenue_cycle/schema.yml" \
    --from-file=stg_rcm_claims.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/staging/stg_rcm_claims.sql" \
    --from-file=stg_rcm_financial_postings.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/staging/stg_rcm_financial_postings.sql" \
    --from-file=stg_rcm_referrals.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/staging/stg_rcm_referrals.sql" \
    --from-file=fct_revenue_cycle.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_revenue_cycle.sql" \
    --from-file=fct_financial_posting.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_financial_posting.sql" \
    --from-file=fct_claim_aging.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_claim_aging.sql" \
    --from-file=fct_denials.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_denials.sql" \
    --from-file=fct_revenue_leakage.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_revenue_leakage.sql" \
    --from-file=fct_payer_performance.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_payer_performance.sql" \
    --from-file=fct_patient_acquisition.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_patient_acquisition.sql" \
    --from-file=fct_cash_recovery_opportunity.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_cash_recovery_opportunity.sql" \
    --from-file=fct_cash_forecast.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_cash_forecast.sql" \
    --from-file=fct_payer_contract_performance.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_payer_contract_performance.sql" \
    --from-file=fct_team_recovery_performance.sql="$ROOT_DIR/dbt/opencare/models/revenue_cycle/marts/fct_team_recovery_performance.sql" \
    --from-file=revenue_cycle_gl_reconciliation.sql="$ROOT_DIR/dbt/opencare/tests/revenue_cycle_gl_reconciliation.sql" \
    --dry-run=client -o yaml | kubectl apply -f -
}

ensure_dbt_source_schema_contract() {
  local source_schema="${DBT_SOURCE_SCHEMA:-${RAW_SCHEMA}}"

  [[ -n "$source_schema" ]] || return 0

  log "Ensuring dbt source schema contract exists: ${source_schema}"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
create schema if not exists ${source_schema};
grant usage, create on schema ${source_schema} to ${POSTGRES_USER};

create table if not exists ${source_schema}.wards (
  ward_id text primary key,
  ward_code text not null,
  ward_name text not null,
  service_line text,
  licensed_beds integer,
  staffed_beds_baseline integer,
  updated_at timestamp default now()
);

create table if not exists ${source_schema}.patients (
  patient_id text primary key,
  medical_record_number text,
  date_of_birth date,
  sex_at_birth text,
  home_postcode text,
  updated_at timestamp default now()
);

create table if not exists ${source_schema}.bed_events (
  event_id text primary key,
  event_timestamp timestamp not null,
  ward_id text not null,
  patient_id text,
  event_type text not null,
  occupied_beds integer not null,
  licensed_beds integer,
  staffed_beds integer,
  scenario_tag text
);

create table if not exists ${source_schema}.rcm_claims (
  claim_id text primary key,
  encounter_id text not null,
  patient_id text,
  payer_id text not null,
  department_id text not null,
  claim_date date not null,
  submission_date date,
  payment_date date,
  claim_status text not null,
  gross_billed_amount numeric(14,2),
  contracted_amount numeric(14,2),
  paid_amount numeric(14,2),
  overpayment_flag boolean default false,
  source_system text,
  updated_at timestamp default now()
);

create table if not exists ${source_schema}.rcm_financial_postings (
  posting_id text primary key,
  claim_id text not null,
  encounter_id text not null,
  gl_account text,
  posting_date date not null,
  posting_type text not null,
  posting_amount numeric(14,2),
  source_system text
);

create table if not exists ${source_schema}.rcm_referrals (
  referral_id text primary key,
  encounter_id text not null,
  acquisition_channel text not null,
  referral_source text not null,
  referral_date date not null
);
SQL
}

apply_file "$ROOT_DIR/manifests/dbt/cronjob.yaml"
sync_dbt_project_configmap
ensure_dbt_source_schema_contract
log_skip "No dbt service readiness step implemented for cron-based execution"
dbt_job_name="dbt-run-now-$(date +%s)"

if [[ -n "${DBT_SOURCE_SCHEMA:-}" ]]; then
  if ! cronjob_exists dbt-runner; then
    log_skip "CronJob not found: dbt-runner"
    exit 0
  fi

  wait_for_job_cleanup "$dbt_job_name"
  kubectl -n "$NAMESPACE" create job --from="cronjob/dbt-runner" "$dbt_job_name" --dry-run=client -o json \
    | kubectl patch --local -f - --type=json -p="[
        {\"op\":\"remove\",\"path\":\"/metadata/ownerReferences\"},
        {\"op\":\"remove\",\"path\":\"/metadata/annotations/cronjob.kubernetes.io~1instantiate\"},
        {\"op\":\"replace\",\"path\":\"/spec/backoffLimit\",\"value\":0},
        {\"op\":\"add\",\"path\":\"/spec/ttlSecondsAfterFinished\",\"value\":600},
        {\"op\":\"replace\",\"path\":\"/spec/template/spec/restartPolicy\",\"value\":\"Never\"},
        {\"op\":\"add\",\"path\":\"/spec/template/spec/containers/0/env\",\"value\":[{\"name\":\"DBT_SOURCE_SCHEMA\",\"value\":\"${DBT_SOURCE_SCHEMA}\"}]}
      ]" -o yaml \
    | kubectl apply -f -

  if ! wait_for_job_completion "$dbt_job_name"; then
    print_job_diagnostics "$dbt_job_name"
    fail "Job failed: $dbt_job_name"
  fi
else
  create_standalone_job_from_cronjob dbt-runner "$dbt_job_name" || exit 0
fi

bash "$ROOT_DIR/scripts/superset/sync_dashboards_bootstrap.sh"

log_success "dbt bootstrap job completed"
