#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/runtimes/bed-forecast.yaml"
apply_file "$ROOT_DIR/manifests/runtimes/anomaly.yaml"

previous_timeout="$TIMEOUT_SECONDS"
TIMEOUT_SECONDS="${RUNTIME_DEPLOYMENT_TIMEOUT_SECONDS:-600}"
kubectl -n "$NAMESPACE" delete pod -l app=bed-forecast --ignore-not-found >/dev/null 2>&1 || true
wait_for_deployment bed-forecast
kubectl -n "$NAMESPACE" delete pod -l app=anomaly --ignore-not-found >/dev/null 2>&1 || true
wait_for_deployment anomaly
TIMEOUT_SECONDS="$previous_timeout"

create_standalone_job_from_cronjob bed-forecast-refresh bed-forecast-run-now || true
create_standalone_job_from_cronjob anomaly-refresh anomaly-run-now || true
log_success "Runtime bootstrap jobs completed"
