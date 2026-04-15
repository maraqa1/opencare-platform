#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

require_cmd kubectl
require_cmd bash

log "Installing OpenCare Insight Platform into namespace $NAMESPACE"

PHASES=(
  "base:$ROOT_DIR/scripts/bootstrap/apply_base.sh"
  "data:$ROOT_DIR/scripts/db/apply_postgres.sh"
  "data:$ROOT_DIR/scripts/minio/apply_minio.sh"
  "data:$ROOT_DIR/scripts/bootstrap/apply_redis.sh"
  "identity:$ROOT_DIR/scripts/keycloak/apply_keycloak.sh"
  "app:$ROOT_DIR/scripts/bootstrap/apply_app.sh"
  "analytics:$ROOT_DIR/scripts/superset/apply_superset.sh"
  "analytics:$ROOT_DIR/scripts/dbt/apply_dbt.sh"
  "runtime:$ROOT_DIR/scripts/runtime/apply_runtimes.sh"
  "ingestion:$ROOT_DIR/scripts/airbyte/apply_airbyte.sh"
)

current_phase=""
for entry in "${PHASES[@]}"; do
  phase="${entry%%:*}"
  script_path="${entry#*:}"
  if [[ "$phase" != "$current_phase" ]]; then
    current_phase="$phase"
    log "Starting phase: $current_phase"
  fi
  run_script_module "$phase" "$script_path"
done

log "Running validation"
run_script_module "validation" "$SCRIPT_DIR/validation.sh"
