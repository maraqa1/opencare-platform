#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"
# shellcheck source=scripts/use_cases/manifest.sh
source "$ROOT_DIR/scripts/use_cases/manifest.sh"

usage() {
  cat <<'EOF'
Usage: bash scripts/use_cases/apply_use_case.sh <use_case>

Supported use cases:
  - bed_pressure
  - revenue_cycle_management
  - talemia_business_intelligence
  - all

Notes:
  - Bed Pressure and Revenue Cycle Management currently share the same
    synthetic demo ingestion path.
  - Provisioning either use case will refresh the shared demo dataset.
  - TALEMIA provisioning becomes available automatically once its branch
    files are merged into the current branch.
EOF
}

ensure_use_case_prereqs() {
  require_cmd bash
  require_cmd kubectl
  ensure_cluster_access
}

ensure_airbyte_ingestion() {
  if kubectl -n "$NAMESPACE" get service "$AIRBYTE_SERVER_SERVICE_NAME" >/dev/null 2>&1; then
    log "Airbyte service ${AIRBYTE_SERVER_SERVICE_NAME} already available"
    return 0
  fi

  log "Airbyte service ${AIRBYTE_SERVER_SERVICE_NAME} not found; applying ingestion layer first"
  bash "$ROOT_DIR/scripts/airbyte/apply_airbyte.sh"
}

apply_shared_demo_dataset() {
  log "Provisioning shared synthetic dataset for Bed Pressure and Revenue Cycle Management"
  bash "$ROOT_DIR/scripts/demo/apply_demo_proof.sh"
}

apply_decision_layer() {
  log "Applying shared decision layer"
  bash "$ROOT_DIR/scripts/decisions/apply_decisions.sh"
}

apply_bed_pressure() {
  ensure_airbyte_ingestion
  apply_shared_demo_dataset
  apply_decision_layer
  log_success "Bed Pressure use case provisioning completed"
}

apply_revenue_cycle_management() {
  ensure_airbyte_ingestion
  apply_shared_demo_dataset
  apply_decision_layer
  log_success "Revenue Cycle Management use case provisioning completed"
}

apply_talemia_business_intelligence() {
  local talemia_loader="$ROOT_DIR/scripts/talemia/load_v4_raw.sh"

  [[ -f "$talemia_loader" ]] || fail "TALEMIA loader not present on this branch yet: ${talemia_loader}"
  bash "$talemia_loader"
  bash "$ROOT_DIR/scripts/dbt/apply_dbt.sh"
  log_success "TALEMIA Business Intelligence use case provisioning completed"
}

apply_one_use_case() {
  local use_case="$1"
  local use_case_name

  manifest_assert_enabled_use_case "$use_case"
  use_case_name="$(manifest_use_case_name "$use_case")"
  log "Applying use case: ${use_case_name:-$use_case}"

  case "$use_case" in
    bed_pressure)
      apply_bed_pressure
      ;;
    revenue_cycle_management)
      apply_revenue_cycle_management
      ;;
    talemia_business_intelligence)
      apply_talemia_business_intelligence
      ;;
    *)
      fail "Manifest entry exists but no provisioning workflow is implemented yet for: ${use_case}"
      ;;
  esac
}

main() {
  local use_case="${1:-}"

  [[ -n "$use_case" ]] || {
    usage
    exit 1
  }

  case "$use_case" in
    --help|-h)
      usage
      exit 0
      ;;
  esac

  ensure_use_case_prereqs

  case "$use_case" in
    bed_pressure)
      apply_one_use_case "$use_case"
      ;;
    revenue_cycle_management)
      apply_one_use_case "$use_case"
      ;;
    talemia_business_intelligence)
      apply_one_use_case "$use_case"
      ;;
    all)
      while IFS= read -r enabled_use_case; do
        [[ -n "$enabled_use_case" ]] || continue
        apply_one_use_case "$enabled_use_case"
      done < <(manifest_enabled_use_cases)
      log_success "All currently supported use cases provisioned"
      ;;
    *)
      fail "Unknown use case requested: ${use_case}"
      ;;
  esac
}

main "$@"
