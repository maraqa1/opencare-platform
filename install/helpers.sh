#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_TEMPLATE_FILE="${ENV_TEMPLATE_FILE:-$ROOT_DIR/.env.template}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$ENV_TEMPLATE_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_TEMPLATE_FILE"
  set +a
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

NAMESPACE="${NAMESPACE:-opencare}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-opencare}"
POSTGRES_USER="${POSTGRES_USER:-opencare}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-opencare}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio.opencare.svc.cluster.local:9000}"
MINIO_REGION="${MINIO_REGION:-us-east-1}"
MINIO_BUCKET="${MINIO_BUCKET:-reports}"
MINIO_BUCKET_RAW="${MINIO_BUCKET_RAW:-opencare-raw}"
MINIO_BUCKET_STATE="${MINIO_BUCKET_STATE:-opencare-state}"
AIRBYTE_BUCKET_LOG="${AIRBYTE_BUCKET_LOG:-opencare-airbyte-log}"
AIRBYTE_BUCKET_STATE="${AIRBYTE_BUCKET_STATE:-$MINIO_BUCKET_STATE}"
AIRBYTE_BUCKET_WORKLOAD_OUTPUT="${AIRBYTE_BUCKET_WORKLOAD_OUTPUT:-opencare-airbyte-workload-output}"
AIRBYTE_BUCKET_ACTIVITY_PAYLOAD="${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD:-opencare-airbyte-activity-payload}"
AIRBYTE_BUCKET_AUDIT_LOGGING="${AIRBYTE_BUCKET_AUDIT_LOGGING:-opencare-airbyte-audit-logging}"
AIRBYTE_BUCKET_PROFILER_OUTPUT="${AIRBYTE_BUCKET_PROFILER_OUTPUT:-opencare-airbyte-profiler-output}"
AIRBYTE_DB_NAME="${AIRBYTE_DB_NAME:-$POSTGRES_DB}"
AIRBYTE_DB_USER="${AIRBYTE_DB_USER:-$POSTGRES_USER}"
AIRBYTE_DB_PASSWORD="${AIRBYTE_DB_PASSWORD:-$POSTGRES_PASSWORD}"
AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL="${AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL:-https://connectors.airbyte.com/files/registries/v0/oss_registry.json}"
AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL="${AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL:-https://connectors.airbyte.com/files/registries/v0/oss_registry.json}"
AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED="${AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED:-false}"
RUN_DATABASE_MIGRATION_ON_STARTUP="${RUN_DATABASE_MIGRATION_ON_STARTUP:-true}"
CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION="${CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION:-0.40.23.002}"
JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION="${JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION:-0.40.26.001}"
AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION="${AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION:-$CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}"
AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION="${AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION:-$JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}"
AIRBYTE_RELEASE_NAME="${AIRBYTE_RELEASE_NAME:-airbyte}"
AIRBYTE_SERVER_SERVICE_NAME="${AIRBYTE_SERVER_SERVICE_NAME:-${AIRBYTE_RELEASE_NAME}-airbyte-server-svc}"
AIRBYTE_WEBAPP_SERVICE_NAME="${AIRBYTE_WEBAPP_SERVICE_NAME:-${AIRBYTE_RELEASE_NAME}-airbyte-webapp-svc}"
AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME="${AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME:-${AIRBYTE_TEMPORAL_SERVICE_NAME:-airbyte-temporal}}"
AIRBYTE_TEMPORAL_SERVICE_NAME="${AIRBYTE_TEMPORAL_SERVICE_NAME:-$AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME}"
AIRBYTE_SECRET_NAME="${AIRBYTE_SECRET_NAME:-airbyte-config-secrets}"
AIRBYTE_CHART_REPO_NAME="${AIRBYTE_CHART_REPO_NAME:-airbyte-v2}"
AIRBYTE_CHART_REPO_URL="${AIRBYTE_CHART_REPO_URL:-https://airbytehq.github.io/charts}"
AIRBYTE_CHART_NAME="${AIRBYTE_CHART_NAME:-airbyte-v2/airbyte}"
AIRBYTE_CHART_VERSION="${AIRBYTE_CHART_VERSION:-2.0.19}"
AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS="${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS:-1200}"
HELM_VERSION="${HELM_VERSION:-v3.16.3}"
HELM_INSTALL_DIR="${HELM_INSTALL_DIR:-/usr/local/bin}"
AIRBYTE_MC_IMAGE="${AIRBYTE_MC_IMAGE:-minio/mc:RELEASE.2025-07-21T05-28-08Z}"
AIRBYTE_API_URL="${AIRBYTE_API_URL:-$AIRBYTE_URL}"
DEMO_MYSQL_HOST="${DEMO_MYSQL_HOST:-mysql-demo}"
DEMO_MYSQL_PORT="${DEMO_MYSQL_PORT:-3306}"
DEMO_MYSQL_DATABASE="${DEMO_MYSQL_DATABASE:-opencare_demo}"
DEMO_MYSQL_USER="${DEMO_MYSQL_USER:-opencare}"
DEMO_MYSQL_PASSWORD="${DEMO_MYSQL_PASSWORD:-opencare123}"
DEMO_MYSQL_ROOT_PASSWORD="${DEMO_MYSQL_ROOT_PASSWORD:-$DEMO_MYSQL_PASSWORD}"
DEMO_MYSQL_SSL_MODE="${DEMO_MYSQL_SSL_MODE:-preferred}"
DEMO_MYSQL_SOURCE_NAME="${DEMO_MYSQL_SOURCE_NAME:-OpenCare Demo MySQL}"
DEMO_AIRBYTE_DESTINATION_NAME="${DEMO_AIRBYTE_DESTINATION_NAME:-OpenCare Raw Postgres}"
DEMO_AIRBYTE_CONNECTION_NAME="${DEMO_AIRBYTE_CONNECTION_NAME:-OpenCare Bed Occupancy Demo}"
DEMO_PROOF_FLOW_ENABLED="${DEMO_PROOF_FLOW_ENABLED:-false}"
DEMO_SEED_OUTPUT_DIR="${DEMO_SEED_OUTPUT_DIR:-seed/mysql}"
DEMO_LOG_DIR="${DEMO_LOG_DIR:-$ROOT_DIR/.state/demo-logs}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-opencare}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-opencare123}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-$MINIO_ROOT_USER}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-$MINIO_ROOT_PASSWORD}"
INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-opencare-internal-token}"
AIRBYTE_S3_PATH_STYLE="${AIRBYTE_S3_PATH_STYLE:-true}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-opencare}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-opencare123}"
KC_DB="${KC_DB:-postgres}"
KC_DB_URL_HOST="${KC_DB_URL_HOST:-$POSTGRES_HOST}"
KC_DB_URL_PORT="${KC_DB_URL_PORT:-$POSTGRES_PORT}"
KC_DB_URL_DATABASE="${KC_DB_URL_DATABASE:-$POSTGRES_DB}"
KC_DB_USERNAME="${KC_DB_USERNAME:-$POSTGRES_USER}"
KC_DB_PASSWORD="${KC_DB_PASSWORD:-$POSTGRES_PASSWORD}"
KEYCLOAK_HEALTH_URL="${KEYCLOAK_HEALTH_URL:-http://keycloak:9000}"
BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
PORTAL_URL="${PORTAL_URL:-http://portal:3000}"
SUPERSET_EMBED_URL="${SUPERSET_EMBED_URL:-http://superset:8088}"
AIRBYTE_URL="${AIRBYTE_URL:-http://${AIRBYTE_SERVER_SERVICE_NAME}:8001}"
FORECAST_RUNTIME_URL="${FORECAST_RUNTIME_URL:-http://bed-forecast:8000}"
ANOMALY_RUNTIME_URL="${ANOMALY_RUNTIME_URL:-http://anomaly:8000}"
FORECAST_OUTPUT_TABLE="${FORECAST_OUTPUT_TABLE:-forecast_bed_occupancy}"
ANOMALY_OUTPUT_TABLE="${ANOMALY_OUTPUT_TABLE:-anomaly_bed_occupancy}"
SUPERSET_SECRET_KEY="${SUPERSET_SECRET_KEY:-change-me-superset}"
SUPERSET_LOAD_EXAMPLES="${SUPERSET_LOAD_EXAMPLES:-no}"
REPORTS_PREFIX="${REPORTS_PREFIX:-reports}"
DICTIONARY_VERSION="${DICTIONARY_VERSION:-2026.04}"
RUNTIME_WRITES_ENABLED="${RUNTIME_WRITES_ENABLED:-true}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-$BACKEND_URL}"
RAW_SCHEMA="${RAW_SCHEMA:-raw}"
STAGING_SCHEMA="${STAGING_SCHEMA:-staging}"
ANALYTICS_SCHEMA="${ANALYTICS_SCHEMA:-analytics}"
DICTIONARY_SCHEMA="${DICTIONARY_SCHEMA:-dictionary}"
OUTPUT_SCHEMA="${OUTPUT_SCHEMA:-output}"
DBT_PROJECT_DIR="${DBT_PROJECT_DIR:-$ROOT_DIR/dbt/opencare}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

ensure_helm() {
  local os
  local arch
  local tmp_dir
  local archive_path
  local download_url
  local extracted_binary

  if command -v helm >/dev/null 2>&1; then
    return 0
  fi

  log "Helm not found; installing ${HELM_VERSION}"

  if ! command -v curl >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update >/dev/null
      apt-get install -y curl >/dev/null
    else
      fail "curl is required to install helm automatically"
    fi
  fi

  require_cmd tar
  require_cmd install

  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$(uname -m)" in
    x86_64|amd64)
      arch="amd64"
      ;;
    aarch64|arm64)
      arch="arm64"
      ;;
    *)
      fail "Unsupported architecture for automatic helm install: $(uname -m)"
      ;;
  esac

  tmp_dir="$(mktemp -d)"
  archive_path="$tmp_dir/helm.tar.gz"
  download_url="https://get.helm.sh/helm-${HELM_VERSION}-${os}-${arch}.tar.gz"

  curl -fsSL "$download_url" -o "$archive_path"
  tar -xzf "$archive_path" -C "$tmp_dir"

  extracted_binary="$tmp_dir/${os}-${arch}/helm"
  [[ -f "$extracted_binary" ]] || fail "Downloaded helm archive did not contain helm binary"

  install -d "$HELM_INSTALL_DIR"
  install -m 0755 "$extracted_binary" "$HELM_INSTALL_DIR/helm"
  rm -rf "$tmp_dir"

  command -v helm >/dev/null 2>&1 || fail "Helm installation completed but helm is still not on PATH"
  log_success "Helm installed to ${HELM_INSTALL_DIR}/helm"
}

log_success() {
  log "SUCCESS: $*"
}

log_skip() {
  log "SKIP: $*"
}

manifest_exists() {
  local file="$1"
  [[ -f "$file" ]]
}

apply_file() {
  local file="$1"
  manifest_exists "$file" || fail "Manifest not found: $file"
  log "Applying ${file#"$ROOT_DIR"/}"
  kubectl apply -f "$file"
}

apply_if_exists() {
  local file="$1"
  if manifest_exists "$file"; then
    apply_file "$file"
    return 0
  fi

  log_skip "Manifest missing: ${file#"$ROOT_DIR"/}"
  return 1
}

wait_for_deployment() {
  local name="$1"
  log "Waiting for deployment/$name"
  kubectl -n "$NAMESPACE" rollout status "deployment/$name" --timeout="${TIMEOUT_SECONDS}s"
}

wait_for_statefulset() {
  local name="$1"
  log "Waiting for statefulset/$name"
  kubectl -n "$NAMESPACE" rollout status "statefulset/$name" --timeout="${TIMEOUT_SECONDS}s"
}

wait_for_job_cleanup() {
  local job_name="$1"
  kubectl -n "$NAMESPACE" delete job "$job_name" --ignore-not-found >/dev/null 2>&1 || true
}

wait_for_job_completion() {
  local job_name="$1"
  log "Waiting for job/$job_name"
  kubectl -n "$NAMESPACE" wait --for=condition=complete "job/$job_name" --timeout="${TIMEOUT_SECONDS}s"
}

print_job_logs() {
  local job_name="$1"
  local pods
  local pod

  pods="$(kubectl -n "$NAMESPACE" get pods -l "job-name=$job_name" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"

  if [[ -z "$pods" ]]; then
    log "No pods found for job/$job_name"
    return 0
  fi

  while IFS= read -r pod; do
    [[ -n "$pod" ]] || continue
    log "Logs for pod/$pod"
    kubectl -n "$NAMESPACE" logs "$pod" || true
  done <<< "$pods"
}

print_job_diagnostics() {
  local job_name="$1"
  local pods
  local pod

  log "Describe job/$job_name"
  kubectl -n "$NAMESPACE" describe job "$job_name" || true

  pods="$(kubectl -n "$NAMESPACE" get pods -l "job-name=$job_name" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"

  if [[ -z "$pods" ]]; then
    log "No pods found for job/$job_name"
    return 0
  fi

  while IFS= read -r pod; do
    [[ -n "$pod" ]] || continue
    log "Describe pod/$pod"
    kubectl -n "$NAMESPACE" describe pod "$pod" || true
    log "Logs for pod/$pod"
    kubectl -n "$NAMESPACE" logs "$pod" || true
  done <<< "$pods"
}

delete_pod_if_exists() {
  local pod_name="$1"
  kubectl -n "$NAMESPACE" delete pod "$pod_name" --ignore-not-found >/dev/null 2>&1 || true
}

wait_for_pod_completion() {
  local pod_name="$1"
  local deadline
  local phase
  local now

  deadline=$((SECONDS + TIMEOUT_SECONDS))

  while true; do
    phase="$(kubectl -n "$NAMESPACE" get pod "$pod_name" -o jsonpath='{.status.phase}' 2>/dev/null || true)"

    case "$phase" in
      Succeeded)
        return 0
        ;;
      Failed)
        kubectl -n "$NAMESPACE" logs "$pod_name" || true
        return 1
        ;;
      "")
        ;;
      *)
        ;;
    esac

    now=$SECONDS
    if (( now >= deadline )); then
      kubectl -n "$NAMESPACE" logs "$pod_name" || true
      return 1
    fi

    sleep 2
  done
}

cronjob_exists() {
  local name="$1"
  kubectl -n "$NAMESPACE" get cronjob "$name" >/dev/null 2>&1
}

create_job_from_cronjob() {
  local cronjob_name="$1"
  local job_name="$2"

  if ! cronjob_exists "$cronjob_name"; then
    log_skip "CronJob not found: $cronjob_name"
    return 1
  fi

  wait_for_job_cleanup "$job_name"
  kubectl -n "$NAMESPACE" create job --from="cronjob/$cronjob_name" "$job_name" --dry-run=client -o yaml | kubectl apply -f -
  if ! wait_for_job_completion "$job_name"; then
    print_job_logs "$job_name"
    fail "Job failed: $job_name"
  fi
}

create_standalone_job_from_cronjob() {
  local cronjob_name="$1"
  local job_name="$2"
  local ttl_seconds="${3:-600}"

  if ! cronjob_exists "$cronjob_name"; then
    log_skip "CronJob not found: $cronjob_name"
    return 1
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
    fail "Job failed: $job_name"
  fi
}

run_cluster_http_check() {
  local name="$1"
  local url="$2"
  local pod_name="check-${name}"
  local max_attempts="${3:-1}"
  local retry_interval="${4:-2}"
  local attempt=1

  while (( attempt <= max_attempts )); do
    log "HTTP check: $name -> $url"
    delete_pod_if_exists "$pod_name"
    kubectl -n "$NAMESPACE" run "$pod_name" \
      --restart=Never \
      --image=curlimages/curl:8.12.1 \
      --command -- curl -fsS --max-time 10 "$url" >/dev/null

    if wait_for_pod_completion "$pod_name"; then
      delete_pod_if_exists "$pod_name"
      return 0
    fi

    delete_pod_if_exists "$pod_name"
    if (( attempt == max_attempts )); then
      fail "Pod failed: $pod_name"
    fi

    sleep "$retry_interval"
    attempt=$((attempt + 1))
  done
}

run_cluster_command() {
  local name="$1"
  local pod_name="check-${name}"
  local image="$2"
  shift
  shift

  log "Command check: $name"
  delete_pod_if_exists "$pod_name"
  kubectl -n "$NAMESPACE" run "$pod_name" \
    --restart=Never \
    --image="$image" \
    --command -- "$@" >/dev/null
  wait_for_pod_completion "$pod_name"
  delete_pod_if_exists "$pod_name"
}

require_namespace() {
  kubectl get namespace "$NAMESPACE" >/dev/null
}

ensure_cluster_access() {
  require_cmd kubectl
  kubectl cluster-info >/dev/null
  require_namespace
}

run_script_module() {
  local label="$1"
  local script_path="$2"

  if [[ ! -f "$script_path" ]]; then
    log_skip "$label module not implemented: ${script_path#"$ROOT_DIR"/}"
    return 0
  fi

  bash "$script_path"
}

print_endpoints() {
  cat <<EOF
OpenCare endpoints:
- Portal: http://portal.${NAMESPACE}.svc.cluster.local:3000
- Backend: http://backend.${NAMESPACE}.svc.cluster.local:8000
- Superset: http://superset.${NAMESPACE}.svc.cluster.local:8088
- Airbyte: ${AIRBYTE_URL}
- Keycloak: http://keycloak.${NAMESPACE}.svc.cluster.local:8080
- MinIO API: http://minio.${NAMESPACE}.svc.cluster.local:9000
- MinIO Console: http://minio.${NAMESPACE}.svc.cluster.local:9001
EOF
}

secret_value_or_default() {
  local secret_name="$1"
  local key="$2"
  local default_value="$3"
  local encoded_value

  encoded_value="$(kubectl -n "$NAMESPACE" get secret "$secret_name" -o "jsonpath={.data.$key}" 2>/dev/null || true)"
  if [[ -n "$encoded_value" ]]; then
    printf '%s' "$encoded_value" | base64 --decode
    return 0
  fi

  printf '%s' "$default_value"
}

resolve_running_minio_credential() {
  local env_name="$1"
  local fallback="$2"
  local value

  value="$(kubectl -n "$NAMESPACE" exec deploy/minio -- printenv "$env_name" 2>/dev/null || true)"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return 0
  fi

  printf '%s' "$fallback"
}
