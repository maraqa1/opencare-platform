#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_DIR="$ROOT_DIR/manifests/airbyte"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

if [[ ! -d "$MANIFEST_DIR" ]]; then
  log_skip "Airbyte manifests directory not found: manifests/airbyte"
  exit 0
fi

shopt -s nullglob
manifest_files=("$MANIFEST_DIR"/*.yaml "$MANIFEST_DIR"/*.yml)
shopt -u nullglob

if [[ "${#manifest_files[@]}" -eq 0 ]]; then
  log_skip "No Airbyte manifests implemented"
  exit 0
fi

print_airbyte_diagnostics() {
  kubectl -n "$NAMESPACE" describe deployment airbyte-temporal || true
  kubectl -n "$NAMESPACE" describe service airbyte-temporal || true
  kubectl -n "$NAMESPACE" describe deployment airbyte-server || true
  kubectl -n "$NAMESPACE" describe service airbyte-server || true
  pods="$(kubectl -n "$NAMESPACE" get pods -l 'app in (airbyte-temporal,airbyte-server)' -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"
  while IFS= read -r pod; do
    [[ -n "$pod" ]] || continue
    kubectl -n "$NAMESPACE" describe pod "$pod" || true
    kubectl -n "$NAMESPACE" logs "$pod" --all-containers=true || true
  done <<< "$pods"
}

trap 'print_airbyte_diagnostics' ERR

for file in "${manifest_files[@]}"; do
  apply_file "$file"
done

wait_for_deployment airbyte-temporal
previous_timeout="$TIMEOUT_SECONDS"
TIMEOUT_SECONDS="${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS:-420}"
wait_for_deployment airbyte-server
TIMEOUT_SECONDS="$previous_timeout"

run_cluster_command airbyte-migrations postgres:16-alpine sh -c "psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} -Atc \"select coalesce(to_regclass('public.airbyte_configs_migrations')::text, '') = 'airbyte_configs_migrations' and coalesce(to_regclass('public.airbyte_jobs_migrations')::text, '') = 'airbyte_jobs_migrations';\" | grep -qx t"

run_cluster_command airbyte-service curlimages/curl:8.12.1 sh -c "status=\$(curl -sS -o /dev/null -w '%{http_code}' ${AIRBYTE_URL}/ || true); [ \"\$status\" != '000' ]"
run_cluster_command airbyte-minio-auth minio/mc:RELEASE.2025-07-21T05-28-08Z sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW} >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"
run_cluster_command airbyte-minio-write minio/mc:RELEASE.2025-07-21T05-28-08Z sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} >/dev/null && printf 'airbyte-validation' > /tmp/validation.txt && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/ >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE}/airbyte/state/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/ >/dev/null && mc cat airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cat airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null"

log "Airbyte facts: endpoint=${AIRBYTE_URL}"
log "Airbyte facts: minio_endpoint=http://${MINIO_ENDPOINT}"
log "Airbyte facts: region=${MINIO_REGION}"
log "Airbyte facts: log_bucket=${AIRBYTE_BUCKET_LOG}"
log "Airbyte facts: raw_bucket=${MINIO_BUCKET_RAW}"
log "Airbyte facts: state_bucket=${MINIO_BUCKET_STATE}"
log "Airbyte facts: workload_output_bucket=${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}"
log "Airbyte facts: activity_payload_bucket=${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}"
log "Airbyte facts: audit_logging_bucket=${AIRBYTE_BUCKET_AUDIT_LOGGING}"
log "Airbyte facts: profiler_output_bucket=${AIRBYTE_BUCKET_PROFILER_OUTPUT}"
log "Airbyte facts: migrations=configs+jobs bootstrap complete"
log "Airbyte facts: path_style=${AIRBYTE_S3_PATH_STYLE}"
log "Airbyte facts: validation=passed"
log_success "Airbyte ingestion contract validated"
