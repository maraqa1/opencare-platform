#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bash "$ROOT_DIR/scripts/demo/exercise_phase2_cycle.sh" --cycles "${PHASE2_CYCLES:-2}" --sleep-seconds "${PHASE2_SLEEP_SECONDS:-0}"
