#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/decisions/cronjobs.yaml"

if cronjob_exists decision-generator; then
  create_standalone_job_from_cronjob decision-generator "decision-generator-run-now" 600
fi

log_success "Decision layer jobs applied and generation checked"
