#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

require_cmd kubectl
require_cmd bash

usage() {
  cat <<'EOF'
Usage: bash install/install.sh [options]

Options:
  --profile <name>    Named install profile: platform-only, full-demo.
  --platform-only     Install only the shared platform through ingestion (default).
  --with-demo         Include the demo/use-case provisioning phase.
  --with-decision     Include the decision phase.
  --from <phase>      Start from the named phase.
  --to <phase>        Stop after the named phase.
  --skip-validation   Skip the final validation step.
  --help              Show this help text.
EOF
}

ALL_PHASES=(
  "base:$ROOT_DIR/scripts/bootstrap/apply_base.sh"
  "data:$ROOT_DIR/scripts/db/apply_postgres.sh"
  "data:$ROOT_DIR/scripts/minio/apply_minio.sh"
  "data:$ROOT_DIR/scripts/bootstrap/apply_redis.sh"
  "identity:$ROOT_DIR/scripts/keycloak/apply_keycloak.sh"
  "tls:$ROOT_DIR/scripts/tls/apply_cert_manager.sh"
  "app:$ROOT_DIR/scripts/bootstrap/apply_app.sh"
  "analytics:$ROOT_DIR/scripts/superset/apply_superset.sh"
  "analytics:$ROOT_DIR/scripts/dbt/apply_dbt.sh"
  "runtime:$ROOT_DIR/scripts/runtime/apply_runtimes.sh"
  "ingestion:$ROOT_DIR/scripts/airbyte/apply_airbyte.sh"
  "demo:$ROOT_DIR/scripts/demo/apply_demo_proof.sh"
  "decision:$ROOT_DIR/scripts/decisions/apply_decisions.sh"
)

include_demo=false
include_decision=false
skip_validation=false
from_phase=""
to_phase=""
profile_name=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      [[ $# -ge 2 ]] || fail "--profile requires a profile name"
      profile_name="$2"
      shift 2
      ;;
    --platform-only)
      include_demo=false
      include_decision=false
      shift
      ;;
    --with-demo)
      include_demo=true
      shift
      ;;
    --with-decision)
      include_decision=true
      shift
      ;;
    --from)
      [[ $# -ge 2 ]] || fail "--from requires a phase name"
      from_phase="$2"
      shift 2
      ;;
    --to)
      [[ $# -ge 2 ]] || fail "--to requires a phase name"
      to_phase="$2"
      shift 2
      ;;
    --skip-validation)
      skip_validation=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

if [[ -n "$profile_name" ]]; then
  case "$profile_name" in
    platform-only)
      include_demo=false
      include_decision=false
      ;;
    full-demo)
      include_demo=true
      include_decision=true
      ;;
    *)
      fail "Unknown profile: $profile_name"
      ;;
  esac
fi

log "Installing OpenCare Insight Platform into namespace $NAMESPACE"

PHASES=()
for entry in "${ALL_PHASES[@]}"; do
  phase="${entry%%:*}"
  if [[ "$phase" == "demo" && "$include_demo" != "true" ]]; then
    continue
  fi
  if [[ "$phase" == "decision" && "$include_decision" != "true" ]]; then
    continue
  fi
  PHASES+=("$entry")
done

if [[ -n "$from_phase" || -n "$to_phase" ]]; then
  filtered_phases=()
  include_entry=false
  found_from=false
  found_to=false

  for entry in "${PHASES[@]}"; do
    phase="${entry%%:*}"
    if [[ -n "$from_phase" && "$phase" == "$from_phase" ]]; then
      include_entry=true
      found_from=true
    fi
    if [[ -z "$from_phase" ]]; then
      include_entry=true
    fi
    if [[ "$include_entry" == "true" ]]; then
      filtered_phases+=("$entry")
    fi
    if [[ -n "$to_phase" && "$phase" == "$to_phase" ]]; then
      found_to=true
      include_entry=false
    fi
  done

  [[ -z "$from_phase" || "$found_from" == "true" ]] || fail "Unknown --from phase: $from_phase"
  [[ -z "$to_phase" || "$found_to" == "true" ]] || fail "Unknown --to phase: $to_phase"
  PHASES=("${filtered_phases[@]}")
fi

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

if [[ "$skip_validation" != "true" ]]; then
  validate_demo_use_cases="$include_demo"
  validate_decision_layer="$include_decision"
  validate_ingestion_layer=true
  for entry in "${PHASES[@]}"; do
    phase="${entry%%:*}"
    if [[ "$phase" == "ingestion" ]]; then
      validate_ingestion_layer=true
      break
    fi
    validate_ingestion_layer=false
  done

  export VALIDATE_DEMO_USE_CASES="$validate_demo_use_cases"
  export VALIDATE_DECISION_LAYER="$validate_decision_layer"
  export VALIDATE_INGESTION_LAYER="$validate_ingestion_layer"

  log "Running validation"
  run_script_module "validation" "$SCRIPT_DIR/validation.sh"
else
  log_skip "Validation skipped by request"
fi
