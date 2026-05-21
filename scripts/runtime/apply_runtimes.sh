#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

runtime_input_row_count() {
  local relation="$1"
  kubectl -n "$NAMESPACE" exec statefulset/postgres -- bash -lc \
    "PGPASSWORD=$(printf '%q' "$POSTGRES_PASSWORD") psql -U $(printf '%q' "$POSTGRES_USER") -d $(printf '%q' "$POSTGRES_DB") -Atc 'select count(*) from ${relation};'" \
    | tr -d '[:space:]'
}

trigger_runtime_job() {
  local cronjob_name="$1"
  local job_name="$2"
  local ttl_seconds="${3:-600}"

  if ! cronjob_exists "$cronjob_name"; then
    log_skip "CronJob not found: $cronjob_name"
    return 0
  fi

  wait_for_job_cleanup "$job_name"
  kubectl -n "$NAMESPACE" create job --from="cronjob/$cronjob_name" "$job_name" --dry-run=client -o json \
    | kubectl patch --local -f - --type=json -p="[
        {\"op\":\"remove\",\"path\":\"/metadata/ownerReferences\"},
        {\"op\":\"remove\",\"path\":\"/metadata/annotations/cronjob.kubernetes.io~1instantiate\"},
        {\"op\":\"replace\",\"path\":\"/spec/backoffLimit\",\"value\":0},
        {\"op\":\"add\",\"path\":\"/spec/ttlSecondsAfterFinished\",\"value\":${ttl_seconds}},
        {\"op\":\"replace\",\"path\":\"/spec/template/spec/restartPolicy\",\"value\":\"Never\"}
      ]" -o yaml \
    | kubectl apply -f -

  if ! wait_for_job_completion "$job_name"; then
    print_job_diagnostics "$job_name"
    log_skip "Runtime bootstrap job failed on a fresh install; continuing so ingestion/demo can populate inputs first: $job_name"
  fi
}

apply_file "$ROOT_DIR/manifests/runtimes/bed-forecast.yaml"
apply_file "$ROOT_DIR/manifests/runtimes/anomaly.yaml"

previous_timeout="$TIMEOUT_SECONDS"
TIMEOUT_SECONDS="${RUNTIME_DEPLOYMENT_TIMEOUT_SECONDS:-600}"
kubectl -n "$NAMESPACE" delete pod -l app=bed-forecast --ignore-not-found >/dev/null 2>&1 || true
wait_for_deployment bed-forecast
kubectl -n "$NAMESPACE" delete pod -l app=anomaly --ignore-not-found >/dev/null 2>&1 || true
wait_for_deployment anomaly
TIMEOUT_SECONDS="$previous_timeout"

bed_forecast_input_rows="$(runtime_input_row_count "${ANALYTICS_SCHEMA}.fct_bed_occupancy")"
if [[ "$bed_forecast_input_rows" =~ ^[0-9]+$ ]] && (( bed_forecast_input_rows > 0 )); then
  trigger_runtime_job bed-forecast-refresh bed-forecast-run-now
  trigger_runtime_job anomaly-refresh anomaly-run-now
else
  log_skip "Skipping runtime bootstrap triggers because ${ANALYTICS_SCHEMA}.fct_bed_occupancy has no rows yet"
fi

log_success "Runtime bootstrap jobs completed"
