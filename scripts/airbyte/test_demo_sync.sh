#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

DEMO_MYSQL_CLIENT_IMAGE="${DEMO_MYSQL_CLIENT_IMAGE:-mysql:8.0}"
SYNC_ONLY="${SYNC_ONLY:-false}"

run_with_sync_log() {
  local label="$1"
  shift
  local log_file

  mkdir -p "$DEMO_LOG_DIR"
  log_file="$DEMO_LOG_DIR/$(date '+%Y%m%d-%H%M%S')-${label}.log"
  log "Capturing ${label} logs to ${log_file#"$ROOT_DIR"/}"

  if "$@" >"$log_file" 2>&1; then
    return 0
  fi

  fail "${label} failed. Full log preserved at ${log_file}"
}

require_demo_sync_prereqs() {
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

  fail "mysql client is required when DEMO_MYSQL_HOST is external"
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

seed_demo_mysql() {
  local output_dir
  local sql_file
  local validation_sql

  output_dir="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR"
  sql_file="$output_dir/opencare_demo_mysql.sql"
  validation_sql="$output_dir/opencare_demo_validation.sql"

  ensure_demo_mysql_source
  ensure_demo_seed_files "$output_dir"
  apply_mysql_script "$sql_file"
  apply_mysql_script "$validation_sql"
}

usage() {
  cat <<'EOF'
Usage: bash scripts/airbyte/test_demo_sync.sh [--sync-only]

Options:
  --sync-only   Skip demo MySQL seeding and only run the Airbyte sync setup.
EOF
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sync-only)
        SYNC_ONLY=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown argument: $1"
        ;;
    esac
  done

  require_demo_sync_prereqs
  ensure_cluster_access
  ensure_mysql_client

  if [[ "$SYNC_ONLY" != "true" ]]; then
    [[ -n "$DEMO_MYSQL_PASSWORD" ]] || fail "DEMO_MYSQL_PASSWORD must be set"
    seed_demo_mysql
  else
    log "Skipping demo MySQL seed step"
  fi

  log "Running focused Airbyte demo sync test"
  run_with_sync_log airbyte-demo-sync-test bash "$ROOT_DIR/scripts/airbyte/setup_mysql_demo.sh"
  log_success "Airbyte demo sync test completed"
}

main "$@"
