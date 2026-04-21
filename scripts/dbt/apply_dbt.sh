#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

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
SQL
}

apply_file "$ROOT_DIR/manifests/dbt/cronjob.yaml"
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

log_success "dbt bootstrap job completed"
