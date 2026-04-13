#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_TEMPLATE_FILE="${ENV_TEMPLATE_FILE:-$ROOT_DIR/.env.template}"

if [[ -f "$ENV_TEMPLATE_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_TEMPLATE_FILE"
  set +a
fi

NAMESPACE="${NAMESPACE:-opencare}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-opencare}"
POSTGRES_USER="${POSTGRES_USER:-opencare}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-opencare}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_BUCKET="${MINIO_BUCKET:-reports}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-opencare}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-opencare123}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
PORTAL_URL="${PORTAL_URL:-http://portal:3000}"
SUPERSET_EMBED_URL="${SUPERSET_EMBED_URL:-http://superset:8088}"
FORECAST_RUNTIME_URL="${FORECAST_RUNTIME_URL:-http://bed-forecast:8000}"
ANOMALY_RUNTIME_URL="${ANOMALY_RUNTIME_URL:-http://anomaly:8000}"
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
        fail "Pod failed: $pod_name"
        ;;
      "")
        ;;
      *)
        ;;
    esac

    now=$SECONDS
    if (( now >= deadline )); then
      kubectl -n "$NAMESPACE" logs "$pod_name" || true
      fail "Timed out waiting for pod: $pod_name"
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
  wait_for_job_completion "$job_name"
}

run_cluster_http_check() {
  local name="$1"
  local url="$2"
  local pod_name="check-${name}"

  log "HTTP check: $name -> $url"
  delete_pod_if_exists "$pod_name"
  kubectl -n "$NAMESPACE" run "$pod_name" \
    --restart=Never \
    --image=curlimages/curl:8.12.1 \
    --command -- curl -fsS --max-time 10 "$url" >/dev/null
  wait_for_pod_completion "$pod_name"
  delete_pod_if_exists "$pod_name"
}

run_cluster_command() {
  local name="$1"
  local pod_name="check-${name}"
  shift

  log "Command check: $name"
  delete_pod_if_exists "$pod_name"
  kubectl -n "$NAMESPACE" run "$pod_name" \
    --restart=Never \
    --image="$1" -- "${@:2}" >/dev/null
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
- Keycloak: http://keycloak.${NAMESPACE}.svc.cluster.local:8080
- MinIO API: http://minio.${NAMESPACE}.svc.cluster.local:9000
- MinIO Console: http://minio.${NAMESPACE}.svc.cluster.local:9001
EOF
}
