#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VALUES_TEMPLATE="$ROOT_DIR/manifests/airbyte/values.template.yaml"
STATE_DIR="$ROOT_DIR/.state/airbyte"
LAST_RENDERED_AIRBYTE_VALUES_FILE=""
LAST_RENDERED_AIRBYTE_MANIFEST_FILE=""

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

mkdir -p "$STATE_DIR"

require_airbyte_prereqs() {
  ensure_helm
  require_cmd kubectl
  require_cmd mktemp
  require_cmd sed
  require_cmd awk
  require_cmd grep
  require_cmd python3
}

trim() {
  local value="$*"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

normalize_http_url() {
  local endpoint
  endpoint="$(trim "$1")"
  if [[ "$endpoint" == http://* || "$endpoint" == https://* ]]; then
    printf '%s' "$endpoint"
    return 0
  fi

  printf 'http://%s' "$endpoint"
}

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

sql_quote_ident() {
  local value
  value="$(printf '%s' "$1" | sed 's/"/""/g')"
  printf '"%s"' "$value"
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

ensure_airbyte_database() {
  local role_exists
  local db_exists
  local escaped_role
  local escaped_db
  local quoted_role
  local quoted_db

  log "Ensuring Airbyte database role and database exist"

  escaped_role="$(sql_escape_literal "$AIRBYTE_DB_USER")"
  escaped_db="$(sql_escape_literal "$AIRBYTE_DB_NAME")"
  quoted_role="$(sql_quote_ident "$AIRBYTE_DB_USER")"
  quoted_db="$(sql_quote_ident "$AIRBYTE_DB_NAME")"

  role_exists="$(
    kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "select 1 from pg_roles where rolname='${escaped_role}';" | tr -d '[:space:]'
  )"

  if [[ "$role_exists" != "1" ]]; then
    kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
      "create role ${quoted_role} login password '$(sql_escape_literal "$AIRBYTE_DB_PASSWORD")';"
  else
    kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
      "alter role ${quoted_role} with login password '$(sql_escape_literal "$AIRBYTE_DB_PASSWORD")';"
  fi

  db_exists="$(
    kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "select 1 from pg_database where datname='${escaped_db}';" | tr -d '[:space:]'
  )"

  if [[ "$db_exists" != "1" ]]; then
    kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
      "create database ${quoted_db} owner ${quoted_role};"
  fi
}

apply_airbyte_secret() {
  local secret_file
  local effective_minio_access_key
  local effective_minio_secret_key

  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"

  log "Applying Airbyte chart secret contract"
  secret_file="$(mktemp "${STATE_DIR}/airbyte-secret.XXXXXX.yaml")"

  cat >"$secret_file" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${AIRBYTE_SECRET_NAME}
  namespace: ${NAMESPACE}
type: Opaque
stringData:
  database-user: ${AIRBYTE_DB_USER}
  database-password: ${AIRBYTE_DB_PASSWORD}
  aws-s3-access-key-id: ${effective_minio_access_key}
  aws-s3-secret-access-key: ${effective_minio_secret_key}
  aws-region: ${MINIO_REGION}
  internal-api-token: ${INTERNAL_API_TOKEN}
EOF

  kubectl apply -f "$secret_file" >/dev/null
  rm -f "$secret_file"
}

ensure_airbyte_buckets() {
  local minio_url
  local effective_minio_access_key
  local effective_minio_secret_key

  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"
  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"

  log "Ensuring Airbyte MinIO buckets exist"
  run_cluster_command airbyte-buckets "$AIRBYTE_MC_IMAGE" sh -c "
    mc alias set airbyte '${minio_url}' '${effective_minio_access_key}' '${effective_minio_secret_key}' >/dev/null &&
    mc mb --ignore-existing airbyte/${MINIO_BUCKET_RAW} >/dev/null &&
    mc mb --ignore-existing airbyte/${MINIO_BUCKET_STATE} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null
  "
}

validate_airbyte_minio_secret_parity() {
  local effective_minio_access_key
  local effective_minio_secret_key
  local secret_access_key
  local secret_secret_key
  local secret_region

  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"
  secret_access_key="$(secret_value_or_default "$AIRBYTE_SECRET_NAME" aws-s3-access-key-id "")"
  secret_secret_key="$(secret_value_or_default "$AIRBYTE_SECRET_NAME" aws-s3-secret-access-key "")"
  secret_region="$(secret_value_or_default "$AIRBYTE_SECRET_NAME" aws-region "")"

  log "Validating Airbyte MinIO credential parity"
  [[ "$secret_access_key" == "$effective_minio_access_key" ]] || fail "Airbyte MinIO access key does not match the live MinIO deployment"
  [[ "$secret_secret_key" == "$effective_minio_secret_key" ]] || fail "Airbyte MinIO secret key does not match the live MinIO deployment"
  [[ "$secret_region" == "$MINIO_REGION" ]] || fail "Airbyte MinIO region does not match the configured MinIO region"
}

configure_helm_repo() {
  log "Configuring Airbyte Helm repository"
  if ! helm repo list | awk '{print $1}' | grep -qx "$AIRBYTE_CHART_REPO_NAME"; then
    helm repo add "$AIRBYTE_CHART_REPO_NAME" "$AIRBYTE_CHART_REPO_URL" >/dev/null
  fi

  helm repo update "$AIRBYTE_CHART_REPO_NAME" >/dev/null
}

render_values_file() {
  local values_file
  local minio_url
  local effective_minio_access_key
  local effective_minio_secret_key

  [[ -f "$VALUES_TEMPLATE" ]] || fail "Airbyte values template not found: manifests/airbyte/values.template.yaml"

  values_file="$(mktemp "${STATE_DIR}/airbyte-values.XXXXXX.yaml")"
  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"
  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"

  sed \
    -e "s|__NAMESPACE__|${NAMESPACE}|g" \
    -e "s|__AIRBYTE_SECRET_NAME__|${AIRBYTE_SECRET_NAME}|g" \
    -e "s|__POSTGRES_HOST__|${POSTGRES_HOST}|g" \
    -e "s|__POSTGRES_PORT__|${POSTGRES_PORT}|g" \
    -e "s|__AIRBYTE_DB_NAME__|${AIRBYTE_DB_NAME}|g" \
    -e "s|__AIRBYTE_DB_USER__|${AIRBYTE_DB_USER}|g" \
    -e "s|__MINIO_ENDPOINT__|${minio_url}|g" \
    -e "s|__MINIO_REGION__|${MINIO_REGION}|g" \
    -e "s|__AIRBYTE_S3_PATH_STYLE__|${AIRBYTE_S3_PATH_STYLE}|g" \
    -e "s|__AIRBYTE_BUCKET_LOG__|${AIRBYTE_BUCKET_LOG}|g" \
    -e "s|__AIRBYTE_BUCKET_STATE__|${AIRBYTE_BUCKET_STATE}|g" \
    -e "s|__AIRBYTE_BUCKET_WORKLOAD_OUTPUT__|${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}|g" \
    -e "s|__AIRBYTE_BUCKET_ACTIVITY_PAYLOAD__|${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}|g" \
    -e "s|__AIRBYTE_BUCKET_AUDIT_LOGGING__|${AIRBYTE_BUCKET_AUDIT_LOGGING}|g" \
    -e "s|__AIRBYTE_BUCKET_PROFILER_OUTPUT__|${AIRBYTE_BUCKET_PROFILER_OUTPUT}|g" \
    -e "s|__AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL__|${AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL}|g" \
    -e "s|__AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL__|${AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL}|g" \
    -e "s|__AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED__|${AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED}|g" \
    -e "s|__AIRBYTE_SQL_TLS_ENABLED__|${AIRBYTE_SQL_TLS_ENABLED}|g" \
    -e "s|__AIRBYTE_POSTGRES_TLS_ENABLED__|${AIRBYTE_POSTGRES_TLS_ENABLED}|g" \
    -e "s|__RUN_DATABASE_MIGRATION_ON_STARTUP__|${RUN_DATABASE_MIGRATION_ON_STARTUP}|g" \
    -e "s|__CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION__|${CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}|g" \
    -e "s|__JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION__|${JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}|g" \
    -e "s|__AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION__|${AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION}|g" \
    -e "s|__AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION__|${AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION}|g" \
    -e "s|__INTERNAL_API_TOKEN__|${INTERNAL_API_TOKEN}|g" \
    -e "s|__MINIO_ACCESS_KEY__|${effective_minio_access_key}|g" \
    -e "s|__MINIO_SECRET_KEY__|${effective_minio_secret_key}|g" \
    -e "s|__AIRBYTE_SERVER_SERVICE_NAME__|${AIRBYTE_SERVER_SERVICE_NAME}|g" \
    -e "s|__AIRBYTE_WEBAPP_SERVICE_NAME__|${AIRBYTE_WEBAPP_SERVICE_NAME}|g" \
    -e "s|__AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME__|${AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME}|g" \
    "$VALUES_TEMPLATE" >"$values_file"

  LAST_RENDERED_AIRBYTE_VALUES_FILE="$values_file"
  printf '%s\n' "$values_file"
}

render_manifest_file() {
  local values_file="$1"
  local manifest_file

  manifest_file="$(mktemp "${STATE_DIR}/airbyte-manifest.XXXXXX.yaml")"
  helm template "$AIRBYTE_RELEASE_NAME" "$AIRBYTE_CHART_NAME" \
    --namespace "$NAMESPACE" \
    --version "$AIRBYTE_CHART_VERSION" \
    -f "$values_file" >"$manifest_file"

  LAST_RENDERED_AIRBYTE_MANIFEST_FILE="$manifest_file"
  printf '%s\n' "$manifest_file"
}

remove_legacy_airbyte_resources() {
  log "Removing legacy static Airbyte resources before Helm install"
  kubectl -n "$NAMESPACE" delete deployment airbyte-server airbyte-temporal --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" delete service airbyte-server airbyte-temporal --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" delete configmap airbyte-temporal-dynamic-config --ignore-not-found >/dev/null 2>&1 || true
}

ensure_airbyte_runtime_config() {
  local internal_api_host
  local temporal_host
  local deployment
  local missing_envs
  local json_patch

  internal_api_host="http://${AIRBYTE_SERVER_SERVICE_NAME}.${NAMESPACE}:8001"
  temporal_host="${AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME}:7233"

  log "Patching Airbyte shared runtime config"
  kubectl -n "$NAMESPACE" patch configmap airbyte-airbyte-env --type=merge -p "$(cat <<EOF
{
  "data": {
    "INTERNAL_API_HOST": "${internal_api_host}",
    "TEMPORAL_HOST": "${temporal_host}",
    "POSTGRES_TLS_ENABLED": "false",
    "SQL_TLS_ENABLED": "false"
  }
}
EOF
)" >/dev/null

  for deployment in airbyte-worker airbyte-workload-api-server airbyte-workload-launcher; do
    missing_envs="$(
      kubectl -n "$NAMESPACE" get deployment "$deployment" -o json \
        | python3 -c "import json,sys; data=json.load(sys.stdin); env=data['spec']['template']['spec']['containers'][0].get('env', []); names={item.get('name') for item in env}; missing=[name for name in ('INTERNAL_API_HOST','TEMPORAL_HOST') if name not in names]; print(' '.join(missing))"
    )"

    json_patch="[]"
    if [[ " $missing_envs " == *" INTERNAL_API_HOST "* ]]; then
      json_patch="$(python3 -c "import json; print(json.dumps([{'op':'add','path':'/spec/template/spec/containers/0/env/-','value':{'name':'INTERNAL_API_HOST','value':'${internal_api_host}'}}]))")"
      kubectl -n "$NAMESPACE" patch deployment "$deployment" --type=json -p="$json_patch" >/dev/null
    fi
    if [[ " $missing_envs " == *" TEMPORAL_HOST "* ]]; then
      json_patch="$(python3 -c "import json; print(json.dumps([{'op':'add','path':'/spec/template/spec/containers/0/env/-','value':{'name':'TEMPORAL_HOST','value':'${temporal_host}'}}]))")"
      kubectl -n "$NAMESPACE" patch deployment "$deployment" --type=json -p="$json_patch" >/dev/null
    fi
  done

  log "Restarting patched Airbyte deployments"
  kubectl -n "$NAMESPACE" rollout restart deployment/airbyte-temporal deployment/airbyte-server deployment/airbyte-worker deployment/airbyte-workload-api-server deployment/airbyte-workload-launcher >/dev/null
}

print_airbyte_diagnostics() {
  local diagnostics_dir
  local diagnostics_file
  local pods

  diagnostics_dir="${AIRBYTE_DIAGNOSTICS_DIR:-$STATE_DIR/airbyte-logs}"
  mkdir -p "$diagnostics_dir"
  diagnostics_file="$diagnostics_dir/$(date '+%Y%m%d-%H%M%S')-airbyte-diagnostics.log"

  log "Airbyte diagnostics"
  log "Capturing full Airbyte diagnostics to ${diagnostics_file#"$ROOT_DIR"/}"

  {
    echo "=== Helm Status ==="
    helm -n "$NAMESPACE" status "$AIRBYTE_RELEASE_NAME" || true
    echo
    echo "=== Helm Values ==="
    helm -n "$NAMESPACE" get values "$AIRBYTE_RELEASE_NAME" -a || true
    echo
    echo "=== Helm Manifest Wiring Snippets ==="
    helm -n "$NAMESPACE" get manifest "$AIRBYTE_RELEASE_NAME" | grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233|S3_ENDPOINT|MINIO_ENDPOINT|AWS_ENDPOINT_URL_S3|S3_PATH_STYLE_ACCESS|S3_REGION|STORAGE_BUCKET_|aws-s3-access-key-id|aws-s3-secret-access-key' || true
    echo
    echo "=== Airbyte Resources ==="
    kubectl -n "$NAMESPACE" get deploy,svc,pods -l "app.kubernetes.io/instance=${AIRBYTE_RELEASE_NAME}" -o wide || true
    echo
    echo "=== Temporal Service And Endpoints ==="
    kubectl -n "$NAMESPACE" get svc "$AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME" -o wide || true
    kubectl -n "$NAMESPACE" get endpoints "$AIRBYTE_TEMPORAL_FRONTEND_SERVICE_NAME" -o yaml || true
    echo
    echo "=== Rendered Airbyte Values Wiring ==="
    if [[ -n "$LAST_RENDERED_AIRBYTE_VALUES_FILE" && -f "$LAST_RENDERED_AIRBYTE_VALUES_FILE" ]]; then
      grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233|aws-region|S3_ENDPOINT|MINIO_ENDPOINT|AWS_ENDPOINT_URL_S3|S3_PATH_STYLE_ACCESS|S3_REGION|authenticationType|pathStyleAccess|bucket:' "$LAST_RENDERED_AIRBYTE_VALUES_FILE" || true
    fi
    echo
    echo "=== Rendered Airbyte Manifest Wiring ==="
    if [[ -n "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" && -f "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" ]]; then
      grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233|S3_ENDPOINT|MINIO_ENDPOINT|AWS_ENDPOINT_URL_S3|S3_PATH_STYLE_ACCESS|S3_REGION|STORAGE_BUCKET_|aws-s3-access-key-id|aws-s3-secret-access-key' "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" || true
    fi
    echo
    echo "=== Recent Events ==="
    kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 100 || true
    echo
    echo "=== Pod Details And Logs ==="
    pods="$(kubectl -n "$NAMESPACE" get pods -l "app.kubernetes.io/instance=${AIRBYTE_RELEASE_NAME}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"
    while IFS= read -r pod; do
      [[ -n "$pod" ]] || continue
      echo "--- describe ${pod} ---"
      kubectl -n "$NAMESPACE" describe pod "$pod" || true
      echo
      echo "--- logs ${pod} ---"
      kubectl -n "$NAMESPACE" logs "$pod" --all-containers=true || true
      echo
    done <<< "$pods"
  } >"$diagnostics_file" 2>&1
}

wait_for_airbyte_deployments() {
  local deployments
  local deployment

  deployments="$(kubectl -n "$NAMESPACE" get deployment -l "app.kubernetes.io/instance=${AIRBYTE_RELEASE_NAME}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')"
  if [[ -z "$(trim "$deployments")" ]]; then
    fail "No Airbyte deployments were created for release ${AIRBYTE_RELEASE_NAME}"
  fi

  while IFS= read -r deployment; do
    [[ -n "$(trim "$deployment")" ]] || continue
    kubectl -n "$NAMESPACE" rollout status "deployment/${deployment}" --timeout="${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS}s"
  done <<< "$deployments"
}

validate_rendered_airbyte_values() {
  local values_file="$1"

  log "Validating rendered Airbyte wiring"
  for pattern in \
    'type: S3' \
    'endpoint:' \
    'pathStyleAccess:' \
    'authenticationType: credentials' \
    'accessKeyIdSecretKey: aws-s3-access-key-id' \
    'secretAccessKeySecretKey: aws-s3-secret-access-key' \
    'region:' \
    'aws-region' \
    'aws-s3-access-key-id' \
    'aws-s3-secret-access-key' \
    'MINIO_ENDPOINT:' \
    'S3_ENDPOINT:' \
    'AWS_ENDPOINT_URL_S3:' \
    'S3_PATH_STYLE_ACCESS:' \
    'S3_REGION:' \
    'log:' \
    'state:' \
    'workloadOutput:' \
    'activityPayload:' \
    'auditLogging:' \
    'profilerOutput:'; do
    if ! grep -q "$pattern" "$values_file"; then
      log "Missing rendered Airbyte pattern: $pattern"
      fail "Rendered Airbyte values are missing required startup storage wiring"
    fi
  done

  grep -nE 'type: S3|endpoint:|pathStyleAccess:|authenticationType: credentials|aws-region|aws-s3-access-key-id|aws-s3-secret-access-key|MINIO_ENDPOINT|S3_ENDPOINT|AWS_ENDPOINT_URL_S3|S3_PATH_STYLE_ACCESS|S3_REGION|log:|state:|workloadOutput:|activityPayload:|auditLogging:|profilerOutput:' "$values_file" || true
}

validate_rendered_airbyte_storage_manifest() {
  local manifest_file="$1"

  log "Validating rendered Airbyte storage manifest wiring"
  for pattern in \
    'S3_ENDPOINT' \
    'MINIO_ENDPOINT' \
    'AWS_ENDPOINT_URL_S3' \
    'S3_PATH_STYLE_ACCESS' \
    'S3_REGION' \
    'STORAGE_BUCKET_LOG' \
    'STORAGE_BUCKET_STATE' \
    'STORAGE_BUCKET_WORKLOAD_OUTPUT' \
    'STORAGE_BUCKET_ACTIVITY_PAYLOAD' \
    'STORAGE_BUCKET_AUDIT_LOGGING' \
    'aws-s3-access-key-id' \
    'aws-s3-secret-access-key'; do
    if ! grep -q "$pattern" "$manifest_file"; then
      fail "Rendered Airbyte manifest is missing required storage wiring: $pattern"
    fi
  done

  grep -nE 'S3_ENDPOINT|MINIO_ENDPOINT|AWS_ENDPOINT_URL_S3|S3_PATH_STYLE_ACCESS|S3_REGION|STORAGE_BUCKET_|aws-s3-access-key-id|aws-s3-secret-access-key' "$manifest_file" || true
}

print_airbyte_storage_runtime() {
  local deployment
  local env_filter='AWS_|S3_|MINIO_|STORAGE_|ENDPOINT|REGION|PATH_STYLE'

  log "Airbyte storage runtime config"
  kubectl -n "$NAMESPACE" get configmap airbyte-airbyte-env -o yaml | grep -nE "$env_filter|BUCKET_" || true

  for deployment in airbyte-server airbyte-worker airbyte-workload-api-server airbyte-workload-launcher; do
    log "Airbyte storage env for ${deployment}"
    kubectl -n "$NAMESPACE" exec "deployment/${deployment}" -- printenv | grep -E "$env_filter|BUCKET_" || true
  done
}

validate_airbyte_storage_runtime() {
  local configmap_dump
  local deployment
  local runtime_dump

  log "Validating Airbyte storage runtime wiring"
  configmap_dump="$(kubectl -n "$NAMESPACE" get configmap airbyte-airbyte-env -o yaml)"

  for pattern in \
    'STORAGE_BUCKET_LOG:' \
    'STORAGE_BUCKET_STATE:' \
    'STORAGE_BUCKET_WORKLOAD_OUTPUT:' \
    'STORAGE_BUCKET_ACTIVITY_PAYLOAD:' \
    'STORAGE_BUCKET_AUDIT_LOGGING:'; do
    if ! printf '%s\n' "$configmap_dump" | grep -q "$pattern"; then
      fail "Airbyte runtime config is missing required storage setting: $pattern"
    fi
  done

  for deployment in airbyte-server airbyte-worker airbyte-workload-api-server airbyte-workload-launcher; do
    runtime_dump="$(kubectl -n "$NAMESPACE" exec "deployment/${deployment}" -- printenv)"
    for pattern in \
      'AWS_ENDPOINT_URL_S3=' \
      'S3_ENDPOINT=' \
      'MINIO_ENDPOINT=' \
      'S3_PATH_STYLE_ACCESS=' \
      'S3_REGION=' \
      'AWS_ACCESS_KEY_ID=' \
      'AWS_SECRET_ACCESS_KEY=' \
      'STORAGE_BUCKET_LOG=' \
      'STORAGE_BUCKET_STATE=' \
      'STORAGE_BUCKET_WORKLOAD_OUTPUT=' \
      'STORAGE_BUCKET_ACTIVITY_PAYLOAD=' \
      'STORAGE_BUCKET_AUDIT_LOGGING='; do
      if ! printf '%s\n' "$runtime_dump" | grep -q "$pattern"; then
        fail "Deployment ${deployment} is missing required Airbyte storage runtime env: ${pattern%=}"
      fi
    done
  done

  print_airbyte_storage_runtime
}

validate_rendered_airbyte_manifest() {
  local manifest_file="$1"

  log "Validating rendered Airbyte manifest env ownership"
  python3 - "$manifest_file" <<'PY'
import re
import sys
from collections import defaultdict

manifest_path = sys.argv[1]
critical = {
    "TEMPORAL_HOST",
    "INTERNAL_API_HOST",
    "RUN_DATABASE_MIGRATION_ON_STARTUP",
    "CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION",
    "JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION",
    "BIND_ON_IP",
    "TEMPORAL_BROADCAST_ADDRESS",
    "SQL_TLS_ENABLED",
    "POSTGRES_TLS_ENABLED",
}
docs = []
current = []

with open(manifest_path, "r", encoding="utf-8") as handle:
    for raw_line in handle:
        if raw_line.strip() == "---":
            if current:
                docs.append(current)
                current = []
            continue
        current.append(raw_line.rstrip("\n"))
if current:
    docs.append(current)

config_maps = {}
doc_text_by_resource = {}
errors = []
occurrences = []
broadcast_values = []
critical_presence = defaultdict(set)

for doc in docs:
    kind = ""
    resource_name = ""
    in_metadata = False
    metadata_indent = None
    in_data = False
    data_indent = None
    data_keys = set()

    for line in doc:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))

        if stripped.startswith("kind: "):
            kind = stripped.split(":", 1)[1].strip()
            continue

        if stripped == "metadata:":
            in_metadata = True
            metadata_indent = indent
            continue

        if in_metadata and indent <= metadata_indent and stripped != "metadata:":
            in_metadata = False

        if in_metadata and stripped.startswith("name: ") and not resource_name:
            resource_name = stripped.split(":", 1)[1].strip().strip('"')
            continue

        if stripped == "data:":
            in_data = True
            data_indent = indent
            continue

        if in_data and indent <= data_indent and stripped != "data:":
            in_data = False

        if in_data and indent == data_indent + 2 and ":" in stripped:
            data_keys.add(stripped.split(":", 1)[0].strip().strip('"'))

    if kind == "ConfigMap" and resource_name:
        config_maps[resource_name] = data_keys
    if kind and resource_name:
        doc_text_by_resource[(kind, resource_name)] = "\n".join(doc)

for doc in docs:
    kind = ""
    resource_name = ""
    in_metadata = False
    metadata_indent = None
    in_containers = False
    containers_indent = None
    current_container = ""
    current_container_indent = None
    in_env = False
    env_indent = None
    in_env_from = False
    env_from_indent = None
    current_env = None
    env_counts = defaultdict(int)
    env_presence = set()
    pending_env_from_config_map = None

    def finish_env(current_env):
        if not current_env:
            return None
        env_name = current_env["name"]
        if current_env["has_value"] and current_env["has_valueFrom"]:
            errors.append(
                f"{kind}/{resource_name} container={current_container or '<unknown>'} env={env_name} has both value and valueFrom"
            )
        if env_name in critical:
            env_counts[(current_container, env_name)] += 1
            env_presence.add(env_name)
            if kind == "Deployment" and resource_name.startswith("airbyte-"):
                critical_presence[resource_name].add(env_name)
            source = "valueFrom" if current_env["has_valueFrom"] else "value"
            occurrences.append(
                f"{kind}/{resource_name} container={current_container or '<unknown>'} env={env_name} source={source}"
            )
            if env_name == "TEMPORAL_BROADCAST_ADDRESS":
                broadcast_values.append((kind, resource_name, current_container, current_env["value_literal"]))
        return None

    def register_env_name(env_name, source):
        if env_name in critical:
            env_counts[(current_container, env_name)] += 1
            env_presence.add(env_name)
            if kind == "Deployment" and resource_name.startswith("airbyte-"):
                critical_presence[resource_name].add(env_name)
            occurrences.append(
                f"{kind}/{resource_name} container={current_container or '<unknown>'} env={env_name} source={source}"
            )

    def register_config_map(config_map_name, source):
        for key in sorted(config_maps.get(config_map_name, set())):
            register_env_name(key, f"{source}:{config_map_name}")

    for line in doc:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))

        if stripped.startswith("kind: "):
            kind = stripped.split(":", 1)[1].strip()
            continue

        if stripped == "metadata:":
            in_metadata = True
            metadata_indent = indent
            continue

        if in_metadata and indent <= metadata_indent and stripped != "metadata:":
            in_metadata = False

        if in_metadata and stripped.startswith("name: ") and not resource_name:
            resource_name = stripped.split(":", 1)[1].strip().strip('"')
            continue

        if stripped == "containers:":
            current_env = finish_env(current_env)
            in_containers = True
            containers_indent = indent
            current_container = ""
            current_container_indent = None
            continue

        if in_containers and indent <= containers_indent and stripped != "containers:":
            current_env = finish_env(current_env)
            in_containers = False
            current_container = ""
            current_container_indent = None

        if in_containers and indent == containers_indent + 2 and stripped.startswith("- "):
            current_env = finish_env(current_env)
            current_container_indent = indent
            if stripped.startswith("- name: "):
                current_container = stripped.split(":", 1)[1].strip().strip('"')
            else:
                current_container = ""
            continue

        if in_containers and current_container_indent is not None and indent == current_container_indent + 2 and stripped.startswith("name: ") and not current_container:
            current_container = stripped.split(":", 1)[1].strip().strip('"')
            continue

        if current_container and stripped == "env:" and indent > (current_container_indent or 0):
            current_env = finish_env(current_env)
            in_env = True
            env_indent = indent
            continue

        if in_env and indent <= env_indent and stripped != "env:":
            current_env = finish_env(current_env)
            in_env = False

        if current_container and stripped == "envFrom:" and indent > (current_container_indent or 0):
            current_env = finish_env(current_env)
            in_env_from = True
            env_from_indent = indent
            pending_env_from_config_map = None
            continue

        if in_env_from and indent <= env_from_indent and stripped != "envFrom:":
            if pending_env_from_config_map:
                register_config_map(pending_env_from_config_map, "envFrom")
                pending_env_from_config_map = None
            in_env_from = False

        if in_env and indent == env_indent + 2 and stripped.startswith("- name: "):
            current_env = finish_env(current_env)
            current_env = {
                "name": stripped.split(":", 1)[1].strip().strip('"'),
                "has_value": False,
                "has_valueFrom": False,
                "value_literal": "",
            }
            continue

        if current_env:
            if stripped.startswith("value:"):
                current_env["has_value"] = True
                current_env["value_literal"] = stripped.split(":", 1)[1].strip().strip('"')
            elif stripped.startswith("valueFrom:"):
                current_env["has_valueFrom"] = True
            elif "configMapKeyRef:" in stripped:
                current_env["has_valueFrom"] = True
            elif stripped.startswith("key:"):
                key_name = stripped.split(":", 1)[1].strip().strip('"')
                if key_name == current_env["name"]:
                    current_env["has_valueFrom"] = True

        if in_env_from:
            if indent == env_from_indent + 2 and stripped.startswith("- "):
                if pending_env_from_config_map:
                    register_config_map(pending_env_from_config_map, "envFrom")
                pending_env_from_config_map = None
            elif "configMapRef:" in stripped:
                pending_env_from_config_map = None
            elif stripped.startswith("name: "):
                pending_env_from_config_map = stripped.split(":", 1)[1].strip().strip('"')

    current_env = finish_env(current_env)
    if pending_env_from_config_map:
        register_config_map(pending_env_from_config_map, "envFrom")

    for (container_name, env_name), count in sorted(env_counts.items()):
        if count > 1:
            errors.append(
                f"{kind}/{resource_name} container={container_name or '<unknown>'} env={env_name} appears {count} times"
            )

print("Rendered critical env counts:")
for line in occurrences:
    print(line)

if critical_presence:
    print("Rendered critical env presence by deployment:")
    for deployment_name in sorted(critical_presence):
        names = ", ".join(sorted(critical_presence[deployment_name]))
        print(f"Deployment/{deployment_name}: {names}")

required_by_deployment = {
    "airbyte-server": {"INTERNAL_API_HOST", "TEMPORAL_HOST"},
    "airbyte-worker": {"INTERNAL_API_HOST", "TEMPORAL_HOST"},
    "airbyte-cron": {"INTERNAL_API_HOST", "TEMPORAL_HOST"},
    "airbyte-workload-api-server": {"INTERNAL_API_HOST", "TEMPORAL_HOST"},
    "airbyte-workload-launcher": {"INTERNAL_API_HOST", "TEMPORAL_HOST"},
}

for deployment_name, required in sorted(required_by_deployment.items()):
    doc_text = doc_text_by_resource.get(("Deployment", deployment_name), "")
    if not doc_text:
        errors.append(f"Deployment/{deployment_name} was not found in rendered manifest")
        continue
    for env_name in sorted(required):
        env_matches = list(re.finditer(rf'^\s*-\s+name:\s+{re.escape(env_name)}\s*$', doc_text, re.MULTILINE))
        if len(env_matches) == 0:
            errors.append(f"Deployment/{deployment_name} is missing required env {env_name}")
            continue
        critical_presence[deployment_name].add(env_name)
        match_sources = []
        for match in env_matches:
            snippet = doc_text[match.end():match.end() + 240]
            if "configMapKeyRef:" in snippet:
                match_sources.append("valueFrom.configMapKeyRef")
            elif "secretKeyRef:" in snippet:
                match_sources.append("valueFrom.secretKeyRef")
            elif re.search(r'^\s*value:\s+', snippet, re.MULTILINE):
                match_sources.append("value")
            else:
                match_sources.append("unknown")
        unique_sources = ", ".join(match_sources)
        occurrences.append(
            f"Deployment/{deployment_name} env={env_name} source={unique_sources}"
        )

if broadcast_values:
    print("Rendered TEMPORAL_BROADCAST_ADDRESS values:")
    for kind, resource_name, container_name, value_literal in broadcast_values:
        print(
            f"{kind}/{resource_name} container={container_name or '<unknown>'} TEMPORAL_BROADCAST_ADDRESS={value_literal or '<valueFrom>'}"
        )

if errors:
    print("Rendered manifest env ownership errors:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)
PY

  grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233' "$manifest_file" || true
}

validate_airbyte() {
  local minio_url
  local effective_minio_access_key
  local effective_minio_secret_key

  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"
  effective_minio_access_key="$(resolve_running_minio_credential MINIO_ROOT_USER "$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ACCESS_KEY")")"
  effective_minio_secret_key="$(resolve_running_minio_credential MINIO_ROOT_PASSWORD "$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_SECRET_KEY")")"

  log "Validating Airbyte migration tables"
  run_cluster_command airbyte-migrations postgres:16-alpine sh -c \
    "psql postgresql://${AIRBYTE_DB_USER}:${AIRBYTE_DB_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${AIRBYTE_DB_NAME} -Atc \"select coalesce(to_regclass('public.airbyte_configs_migrations')::text, '') = 'airbyte_configs_migrations' and coalesce(to_regclass('public.airbyte_jobs_migrations')::text, '') = 'airbyte_jobs_migrations';\" | grep -qx t"

  log "Validating Airbyte service"
  run_cluster_command airbyte-service curlimages/curl:8.12.1 sh -c \
    "status=\$(curl -sS -o /dev/null -w '%{http_code}' ${AIRBYTE_URL}/api/v1/health || true); [ \"\$status\" != '000' ]"

  log "Validating Airbyte MinIO buckets"
  run_cluster_command airbyte-minio-auth "${AIRBYTE_MC_IMAGE}" sh -c \
    "mc alias set airbyte '${minio_url}' '${effective_minio_access_key}' '${effective_minio_secret_key}' >/dev/null &&
    mc ls airbyte/${MINIO_BUCKET_RAW} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_STATE} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"

  log "Validating Airbyte MinIO S3-compatible endpoint access"
  run_cluster_command airbyte-minio-s3-probe "${AIRBYTE_MC_IMAGE}" sh -c \
    "mc alias set airbyte '${minio_url}' '${effective_minio_access_key}' '${effective_minio_secret_key}' >/dev/null &&
    mc ls airbyte >/dev/null"
}

main() {
  local values_file
  local manifest_file

  require_airbyte_prereqs
  ensure_cluster_access
  [[ -f "$VALUES_TEMPLATE" ]] || fail "Airbyte values template not found"

  trap 'print_airbyte_diagnostics' ERR

  ensure_airbyte_database
  apply_airbyte_secret
  ensure_airbyte_buckets
  validate_airbyte_minio_secret_parity
  configure_helm_repo
  remove_legacy_airbyte_resources
  values_file="$(render_values_file)"
  validate_rendered_airbyte_values "$values_file"
  manifest_file="$(render_manifest_file "$values_file")"
  validate_rendered_airbyte_storage_manifest "$manifest_file"
  validate_rendered_airbyte_manifest "$manifest_file"

  log "Deploying Airbyte via Helm"
  helm upgrade --install "$AIRBYTE_RELEASE_NAME" "$AIRBYTE_CHART_NAME" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --version "$AIRBYTE_CHART_VERSION" \
    --timeout "${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS}s" \
    -f "$values_file"

  ensure_airbyte_runtime_config
  wait_for_airbyte_deployments
  validate_airbyte_storage_runtime
  validate_airbyte

  log "Airbyte facts: endpoint=${AIRBYTE_URL}"
  log "Airbyte facts: release=${AIRBYTE_RELEASE_NAME}"
  log "Airbyte facts: database=${AIRBYTE_DB_NAME}"
  log "Airbyte facts: minio_endpoint=http://${MINIO_ENDPOINT}"
  log "Airbyte facts: region=${MINIO_REGION}"
  log "Airbyte facts: log_bucket=${AIRBYTE_BUCKET_LOG}"
  log "Airbyte facts: state_bucket=${AIRBYTE_BUCKET_STATE}"
  log "Airbyte facts: workload_output_bucket=${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}"
  log "Airbyte facts: activity_payload_bucket=${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}"
  log "Airbyte facts: audit_logging_bucket=${AIRBYTE_BUCKET_AUDIT_LOGGING}"
  log "Airbyte facts: profiler_output_bucket=${AIRBYTE_BUCKET_PROFILER_OUTPUT}"
  log_success "Airbyte ingestion contract validated"
}

main "$@"
