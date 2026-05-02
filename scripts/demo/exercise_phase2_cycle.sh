#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

CYCLES=3
SLEEP_SECONDS=0

usage() {
  cat <<'EOF'
Usage: bash scripts/demo/exercise_phase2_cycle.sh [--cycles N] [--sleep-seconds N]

Runs an accelerated repeat-cycle proof of:
1. Airbyte demo-sync CronJob
2. dbt rebuild
3. forecast/anomaly runtimes
4. Phase 2 validation checks
EOF
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --cycles)
        CYCLES="$2"
        shift 2
        ;;
      --sleep-seconds)
        SLEEP_SECONDS="$2"
        shift 2
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

  ensure_cluster_access
  log "Refreshing seeded demo source before accelerated Phase 2 cycles"
  bash "$ROOT_DIR/scripts/airbyte/test_demo_sync.sh"

  for cycle in $(seq 1 "$CYCLES"); do
    log "Starting accelerated Phase 2 cycle ${cycle}/${CYCLES}"
    create_standalone_job_from_cronjob airbyte-demo-sync "airbyte-demo-sync-run-now-${cycle}-$(date +%s)"
    bash "$ROOT_DIR/scripts/dbt/apply_dbt.sh"
    bash "$ROOT_DIR/scripts/runtime/apply_runtimes.sh"
    bash "$ROOT_DIR/scripts/demo/validate_phase2_loop.sh"
    log_success "Accelerated Phase 2 cycle ${cycle}/${CYCLES} completed"
    if (( cycle < CYCLES && SLEEP_SECONDS > 0 )); then
      sleep "$SLEEP_SECONDS"
    fi
  done
}

main "$@"
