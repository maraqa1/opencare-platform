#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"
# shellcheck source=scripts/use_cases/manifest.sh
source "$ROOT_DIR/scripts/use_cases/manifest.sh"

BACKEND_TOGGLE_PORT="${BACKEND_TOGGLE_PORT:-18080}"
BACKEND_TOGGLE_HOST="${BACKEND_TOGGLE_HOST:-127.0.0.1}"
PORT_FORWARD_PID=""

usage() {
  cat <<'EOF'
Usage: bash scripts/use_cases/remove_use_case.sh <use_case>

Supported use cases:
  - bed_pressure
  - revenue_cycle_management
  - talemia_business_intelligence
  - all

Notes:
  - This workflow disables a use case by calling the backend config API.
  - It is the CLI equivalent of the Administration -> Include / Exclude button.
  - It does not delete data or code; it updates the enabled state only.
EOF
}

ensure_use_case_prereqs() {
  require_cmd bash
  require_cmd kubectl
  require_cmd curl
  require_cmd python3
  ensure_cluster_access
}

cleanup_port_forward() {
  if [[ -n "$PORT_FORWARD_PID" ]]; then
    kill "$PORT_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$PORT_FORWARD_PID" >/dev/null 2>&1 || true
    PORT_FORWARD_PID=""
  fi
}

start_backend_port_forward() {
  local attempts=20
  local attempt=1

  cleanup_port_forward
  kubectl -n "$NAMESPACE" port-forward svc/backend "${BACKEND_TOGGLE_PORT}:8000" >/dev/null 2>&1 &
  PORT_FORWARD_PID=$!

  while (( attempt <= attempts )); do
    if curl -fsS "http://${BACKEND_TOGGLE_HOST}:${BACKEND_TOGGLE_PORT}/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  cleanup_port_forward
  fail "Unable to establish local connectivity to the backend config API"
}

toggle_use_case_enabled() {
  local use_case="$1"
  local enabled="$2"
  local response_file
  local status_code

  response_file="$(mktemp)"
  status_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
    -X PUT \
    "http://${BACKEND_TOGGLE_HOST}:${BACKEND_TOGGLE_PORT}/api/v1/config/use-cases/${use_case}" \
    -H "content-type: application/json" \
    -d "{\"enabled\":${enabled}}")"

  if [[ "$status_code" != "200" ]]; then
    cat "$response_file" >&2 || true
    rm -f "$response_file"
    fail "Backend config API returned HTTP ${status_code} while updating ${use_case}"
  fi

  python3 - "$response_file" "$use_case" "$enabled" <<'PY'
import json
import sys

response_path, use_case_id, expected_enabled_raw = sys.argv[1:4]
expected_enabled = expected_enabled_raw.lower() == "true"

with open(response_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

if payload.get("status") != "ok":
    raise SystemExit(f"Unexpected backend status payload: {payload}")

all_use_cases = payload.get("all_use_cases") or {}
use_case = all_use_cases.get(use_case_id) or {}
if bool(use_case.get("enabled")) != expected_enabled:
    raise SystemExit(
        f"Use case [{use_case_id}] did not reach enabled={expected_enabled}. "
        f"Payload: {payload}"
    )
PY

  rm -f "$response_file"
}

remove_one_use_case() {
  local use_case="$1"
  local use_case_name

  manifest_use_case_exists "$use_case" || fail "Unknown use case in manifest: ${use_case}"
  use_case_name="$(manifest_use_case_name "$use_case")"
  log "Disabling use case: ${use_case_name:-$use_case}"
  toggle_use_case_enabled "$use_case" false
  log_success "Use case disabled: ${use_case_name:-$use_case}"
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
  trap cleanup_port_forward EXIT
  start_backend_port_forward

  case "$use_case" in
    bed_pressure|revenue_cycle_management|talemia_business_intelligence)
      remove_one_use_case "$use_case"
      ;;
    all)
      while IFS= read -r manifest_use_case; do
        [[ -n "$manifest_use_case" ]] || continue
        remove_one_use_case "$manifest_use_case"
      done < <(manifest_enabled_use_cases)
      log_success "All enabled use cases disabled"
      ;;
    *)
      fail "Unknown use case requested: ${use_case}"
      ;;
  esac
}

main "$@"
