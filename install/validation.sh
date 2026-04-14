#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

log "Checking kubectl connectivity"
ensure_cluster_access

log "Checking Postgres availability"
run_cluster_command postgres postgres:16-alpine pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"

log "Checking MinIO availability"
run_cluster_http_check minio "http://${MINIO_ENDPOINT}/minio/health/live"

log "Checking Keycloak availability"
run_cluster_http_check keycloak "${KEYCLOAK_HEALTH_URL}/health/ready" 15 2

log "Checking backend health"
run_cluster_http_check backend "${BACKEND_URL}/healthz"

log "Checking portal service"
run_cluster_http_check portal "$PORTAL_URL"

log "Checking Superset service"
run_cluster_http_check superset "$SUPERSET_EMBED_URL"

if [[ -f "$SCRIPT_DIR/../manifests/airbyte/values.template.yaml" ]]; then
  log "Checking Airbyte migration tables"
  run_cluster_command airbyte-migrations postgres:16-alpine sh -c "psql postgresql://${AIRBYTE_DB_USER}:${AIRBYTE_DB_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${AIRBYTE_DB_NAME} -Atc \"select coalesce(to_regclass('public.airbyte_configs_migrations')::text, '') = 'airbyte_configs_migrations' and coalesce(to_regclass('public.airbyte_jobs_migrations')::text, '') = 'airbyte_jobs_migrations';\" | grep -qx t"

  log "Checking Airbyte service"
  run_cluster_command airbyte-service curlimages/curl:8.12.1 sh -c "status=\$(curl -sS -o /dev/null -w '%{http_code}' ${AIRBYTE_URL}/api/v1/health || true); [ \"\$status\" != '000' ]"

  log "Checking Airbyte MinIO buckets"
  run_cluster_command airbyte-minio-auth "${AIRBYTE_MC_IMAGE}" sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW} >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"

  log "Checking Airbyte test object round-trip"
  run_cluster_command airbyte-minio-roundtrip "${AIRBYTE_MC_IMAGE}" sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} >/dev/null && printf 'airbyte-validation' > /tmp/validation.txt && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/ >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE}/airbyte/state/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/ >/dev/null && mc cat airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cat airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null"
fi

log_success "Validation completed successfully"
print_endpoints
