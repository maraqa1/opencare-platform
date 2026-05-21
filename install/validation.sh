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

log "Checking decision schema"
run_cluster_command decision-schema postgres:16-alpine sh -c "psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} -Atc \"select to_regclass('decision.decision_queue') is not null and to_regclass('decision.decision_log') is not null;\" | grep -qx t"

log "Checking decision API"
run_cluster_http_check decisions "${BACKEND_URL}/api/v1/decisions/count"

log "Checking revenue cycle APIs"
run_cluster_http_check revenue-cycle-cash-command "${BACKEND_URL}/api/v1/revenue-cycle/cash-command"
run_cluster_http_check revenue-cycle-recovery-queue "${BACKEND_URL}/api/v1/revenue-cycle/recovery-queue"
run_cluster_http_check revenue-cycle-payer-control "${BACKEND_URL}/api/v1/revenue-cycle/payer-control"
run_cluster_http_check revenue-cycle-leakage "${BACKEND_URL}/api/v1/revenue-cycle/leakage"
run_cluster_http_check revenue-cycle-team-performance "${BACKEND_URL}/api/v1/revenue-cycle/team-performance"
run_cluster_http_check revenue-cycle-executive-narrative "${BACKEND_URL}/api/v1/revenue-cycle/executive-narrative"

if [[ "${DEMO_PROOF_FLOW_ENABLED:-false}" == "true" ]]; then
  log "Checking revenue cycle demo marts are populated"
  run_cluster_command revenue-cycle-demo-marts postgres:16-alpine sh -c "psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} -Atc \"
select
  (select count(*) from ${ANALYTICS_SCHEMA}.fct_cash_recovery_opportunity) > 0
  and (select count(*) from ${ANALYTICS_SCHEMA}.fct_cash_forecast) > 0
  and (select count(*) from ${ANALYTICS_SCHEMA}.fct_payer_contract_performance) > 0
  and (select count(*) from ${ANALYTICS_SCHEMA}.fct_revenue_leakage) > 0
  and (select count(*) from ${ANALYTICS_SCHEMA}.fct_team_recovery_performance) > 0;
\" | grep -qx t"
fi

if [[ -n "$EXTERNAL_TLS_SECRET_NAME" ]]; then
  log "Checking TLS certificate secret"
  kubectl -n "$NAMESPACE" get secret "$EXTERNAL_TLS_SECRET_NAME" >/dev/null
fi

log "Checking portal service"
run_cluster_http_check portal "$PORTAL_URL"
run_cluster_http_check portal-revenue-cycle-index "${PORTAL_URL}/use-cases/revenue-cycle-management"
run_cluster_http_check portal-revenue-cycle-cash-command "${PORTAL_URL}/use-cases/revenue-cycle-management/cfo-cash-command"

log "Checking Superset service"
run_cluster_http_check superset "http://superset:8088/health"

if [[ -f "$SCRIPT_DIR/../manifests/airbyte/values.template.yaml" ]]; then
  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"

  log "Checking Airbyte migration tables"
  run_cluster_command airbyte-migrations postgres:16-alpine sh -c "psql postgresql://${AIRBYTE_DB_USER}:${AIRBYTE_DB_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${AIRBYTE_DB_NAME} -Atc \"select coalesce(to_regclass('public.airbyte_configs_migrations')::text, '') = 'airbyte_configs_migrations' and coalesce(to_regclass('public.airbyte_jobs_migrations')::text, '') = 'airbyte_jobs_migrations';\" | grep -qx t"

  log "Checking Airbyte service"
  run_cluster_command airbyte-service curlimages/curl:8.12.1 sh -c "status=\$(curl -sS -o /dev/null -w '%{http_code}' ${AIRBYTE_URL}/api/v1/health || true); [ \"\$status\" != '000' ]"

  log "Checking Airbyte MinIO buckets"
  run_cluster_command airbyte-minio-auth "${AIRBYTE_MC_IMAGE}" sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${effective_minio_access_key} ${effective_minio_secret_key} >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW} >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"

  log "Checking Airbyte test object round-trip"
  run_cluster_command airbyte-minio-roundtrip "${AIRBYTE_MC_IMAGE}" sh -c "mc alias set airbyte http://${MINIO_ENDPOINT} ${effective_minio_access_key} ${effective_minio_secret_key} >/dev/null && printf 'airbyte-validation' > /tmp/validation.txt && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null && mc ls airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/ >/dev/null && mc ls airbyte/${MINIO_BUCKET_STATE}/airbyte/state/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/ >/dev/null && mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/ >/dev/null && mc cat airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null && mc cat airbyte/${MINIO_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null && mc cat airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null"
fi

log_success "Validation completed successfully"
print_endpoints
