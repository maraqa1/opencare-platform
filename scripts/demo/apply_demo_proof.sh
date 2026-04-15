#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

DEMO_MYSQL_CLIENT_IMAGE="${DEMO_MYSQL_CLIENT_IMAGE:-mysql:8.0}"

require_demo_proof_prereqs() {
  require_cmd python3
  require_cmd kubectl
}

is_in_cluster_demo_mysql() {
  [[ "$DEMO_MYSQL_HOST" == "mysql-demo" || "$DEMO_MYSQL_HOST" == *.svc || "$DEMO_MYSQL_HOST" == *.svc.cluster.local ]]
}

ensure_mysql_client() {
  if is_in_cluster_demo_mysql; then
    return 0
  fi

  if command -v mysql >/dev/null 2>&1; then
    return 0
  fi

  log "mysql client not found; installing default-mysql-client"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update >/dev/null
    apt-get install -y default-mysql-client >/dev/null
  else
    fail "mysql client is required for the demo proof flow"
  fi

  require_cmd mysql
}

ensure_demo_mysql_source() {
  if ! is_in_cluster_demo_mysql; then
    log_skip "Using external MySQL demo source host: ${DEMO_MYSQL_HOST}"
    return 0
  fi

  apply_file "$ROOT_DIR/manifests/demo/mysql.yaml"
  wait_for_deployment mysql-demo

  log "Waiting for mysql-demo service readiness"
  run_cluster_command demo-mysql-ready "$DEMO_MYSQL_CLIENT_IMAGE" sh -c \
    "mysqladmin ping -h '${DEMO_MYSQL_HOST}' -P '${DEMO_MYSQL_PORT}' -uroot -p'${DEMO_MYSQL_ROOT_PASSWORD}' --silent"
}

ensure_demo_seed_files() {
  local output_dir="$1"

  mkdir -p "$output_dir"
  log "Generating synthetic MySQL demo data into ${output_dir#"$ROOT_DIR"/}"
  python3 "$ROOT_DIR/scripts/demo/generate_demo_data.py" --output-dir "$output_dir" >/dev/null
}

run_mysql_file_locally() {
  local sql_file="$1"

  log "Applying MySQL script: ${sql_file#"$ROOT_DIR"/}"
  MYSQL_PWD="$DEMO_MYSQL_PASSWORD" mysql \
    -h "$DEMO_MYSQL_HOST" \
    -P "$DEMO_MYSQL_PORT" \
    -u "$DEMO_MYSQL_USER" \
    "$DEMO_MYSQL_DATABASE" < "$sql_file"
}

run_mysql_file_in_cluster() {
  local sql_file="$1"

  log "Applying MySQL script: ${sql_file#"$ROOT_DIR"/}"
  kubectl -n "$NAMESPACE" exec -i deployment/mysql-demo -- sh -c \
    "exec mysql -uroot -p'${DEMO_MYSQL_ROOT_PASSWORD}' '${DEMO_MYSQL_DATABASE}'" < "$sql_file"
}

apply_mysql_script() {
  local sql_file="$1"

  if is_in_cluster_demo_mysql; then
    run_mysql_file_in_cluster "$sql_file"
  else
    run_mysql_file_locally "$sql_file"
  fi
}

check_postgres_equals() {
  local sql="$1"
  local expected="$2"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || fail "Unexpected SQL result for [$sql]. Expected [$expected], got [$actual]"
}

check_postgres_greater_than_zero() {
  local sql="$1"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" =~ ^[0-9]+$ ]] || fail "Non-numeric SQL result for [$sql]: [$actual]"
  (( actual > 0 )) || fail "Expected result greater than zero for [$sql], got [$actual]"
}

validate_phase1_counts() {
  log "Validating Phase 1 raw counts"
  check_postgres_equals "select count(*) from ${RAW_SCHEMA}.wards;" "12"
  check_postgres_equals "select count(*) from ${RAW_SCHEMA}.patients;" "2400"
  check_postgres_equals "select count(*) from ${RAW_SCHEMA}.bed_events;" "12363"

  log "Validating Phase 1 analytics and dictionary counts"
  check_postgres_equals "select count(*) from ${ANALYTICS_SCHEMA}.dim_ward;" "12"
  check_postgres_equals "select count(*) from ${ANALYTICS_SCHEMA}.dim_date;" "547"
  check_postgres_equals "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;" "6564"
  check_postgres_equals "select count(*) from ${DICTIONARY_SCHEMA}.dict_metrics;" "4"
  check_postgres_equals "select min(date_day)::text || '|' || max(date_day)::text from ${ANALYTICS_SCHEMA}.dim_date;" "2024-10-01|2026-03-31"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy where pressure_flag is true;"
}

main() {
  local output_dir
  local sql_file
  local validation_sql

  if [[ "$DEMO_PROOF_FLOW_ENABLED" != "true" ]]; then
    log_skip "Phase 1 synthetic-data proof flow disabled (set DEMO_PROOF_FLOW_ENABLED=true to enable)"
    exit 0
  fi

  require_demo_proof_prereqs
  ensure_cluster_access
  ensure_mysql_client

  [[ -n "$DEMO_MYSQL_PASSWORD" ]] || fail "DEMO_MYSQL_PASSWORD must be set when DEMO_PROOF_FLOW_ENABLED=true"

  output_dir="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR"
  sql_file="$output_dir/opencare_demo_mysql.sql"
  validation_sql="$output_dir/opencare_demo_validation.sql"

  ensure_demo_mysql_source
  ensure_demo_seed_files "$output_dir"
  apply_mysql_script "$sql_file"
  apply_mysql_script "$validation_sql"

  log "Running Airbyte synthetic demo sync"
  bash "$ROOT_DIR/scripts/airbyte/setup_mysql_demo.sh"

  log "Re-running dbt for the synthetic demo dataset"
  bash "$ROOT_DIR/scripts/dbt/apply_dbt.sh"

  validate_phase1_counts
  log_success "Phase 1 synthetic-data proof flow completed"
}

main "$@"
