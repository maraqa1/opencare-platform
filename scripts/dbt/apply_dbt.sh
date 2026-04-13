#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/dbt/cronjob.yaml"
log_skip "No dbt service readiness step implemented for cron-based execution"
dbt_job_name="dbt-run-now-$(date +%s)"
create_job_from_cronjob dbt-runner "$dbt_job_name" || exit 0
log_success "dbt bootstrap job completed"
