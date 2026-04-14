#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="${ROOT_DIR}/.state/airbyte"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

AIRBYTE_RELEASE_NAME="${AIRBYTE_RELEASE_NAME:-airbyte}"
AIRBYTE_SECRET_NAME="${AIRBYTE_SECRET_NAME:-airbyte-config-secrets}"
AIRBYTE_SERVICE_NAME="${AIRBYTE_SERVICE_NAME:-${AIRBYTE_RELEASE_NAME}-airbyte-server-svc}"
AIRBYTE_SERVICE_PORT="${AIRBYTE_SERVICE_PORT:-8001}"
AIRBYTE_URL_EFFECTIVE="${AIRBYTE_URL:-http://${AIRBYTE_SERVICE_NAME}:${AIRBYTE_SERVICE_PORT}}"

mkdir -p "$STATE_DIR"

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

airbyte_db_connection_string() {
  printf 'postgresql://%s:%s@%s:%s/%s' \
    "$AIRBYTE_DB_USER" \
    "$AIRBYTE_DB_PASSWORD" \
    "$POSTGRES_HOST" \
    "$POSTGRES_PORT" \
    "$AIRBYTE_DB_NAME"
}

require_airbyte_prereqs() {
  require_cmd helm
  require_cmd kubectl
  require_cmd mktemp
  require_cmd sed
  require_cmd grep
  require_cmd awk
}

print_airbyte_diagnostics() {
  log "Airbyte diagnostics"
  kubectl -n "$NAMESPACE" get deploy,svc,pods -l "app.kubernetes.io/instance=${AIRBYTE_RELEASE_NAME}" -o wide || true
  kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 100 || true
  helm -n "$NAMESPACE" status "$AIRBYTE_RELEASE_NAME" || true
}

trap 'print_airbyte_diagnostics' ERR

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

  kubectl -n "$NAMESPACE" exec -i postgres-0 -- \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
    "alter role ${quoted_role} createdb;"
}

apply_airbyte_secret() {
  local secret_file

  log "Applying Airbyte secret"
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
  aws-s3-access-key-id: ${MINIO_ACCESS_KEY}
  aws-s3-secret-access-key: ${MINIO_SECRET_KEY}
  aws-region: ${MINIO_REGION}
EOF

  kubectl apply -f "$secret_file"
  rm -f "$secret_file"
}

ensure_airbyte_buckets() {
  local minio_url

  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"

  log "Ensuring Airbyte MinIO buckets exist"
  run_cluster_command airbyte-buckets "$AIRBYTE_MC_IMAGE" sh -c "
    mc alias set airbyte '${minio_url}' '${MINIO_ACCESS_KEY}' '${MINIO_SECRET_KEY}' >/dev/null &&
    mc mb --ignore-existing airbyte/${MINIO_BUCKET_RAW} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_STATE} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null &&
    mc mb --ignore-existing airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null
  "
}

configure_helm_repo() {
  log "Configuring Airbyte Helm repository"
  if ! helm repo list | awk '{print $1}' | grep -qx "$AIRBYTE_CHART_REPO_NAME"; then
    helm repo add "$AIRBYTE_CHART_REPO_NAME" "$AIRBYTE_CHART_REPO_URL"
  fi

  helm repo update "$AIRBYTE_CHART_REPO_NAME"
}

build_values_file() {
  local values_file
  local minio_url

  values_file="$(mktemp "${STATE_DIR}/airbyte-values.XXXXXX.yaml")"
  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"

  cat >"$values_file" <<EOF
postgresql:
  enabled: false

minio:
  enabled: false

global:
  edition: "community"
  env_vars:
    AWS_REGION: "${MINIO_REGION}"
    AWS_DEFAULT_REGION: "${MINIO_REGION}"
  database:
    type: "external"
    secretName: "${AIRBYTE_SECRET_NAME}"
    host: "${POSTGRES_HOST}"
    port: "${POSTGRES_PORT}"
    name: "${AIRBYTE_DB_NAME}"
    database: "${AIRBYTE_DB_NAME}"
    user: "${AIRBYTE_DB_USER}"
    userSecretKey: "database-user"
    passwordSecretKey: "database-password"
  storage:
    type: "S3"
    storageSecretName: "${AIRBYTE_SECRET_NAME}"
    secretName: "${AIRBYTE_SECRET_NAME}"
    bucket:
      log: "${AIRBYTE_BUCKET_LOG}"
      state: "${AIRBYTE_BUCKET_STATE}"
      workloadOutput: "${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}"
      activityPayload: "${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}"
      auditLogging: "${AIRBYTE_BUCKET_AUDIT_LOGGING}"
    s3:
      region: "${MINIO_REGION}"
      authenticationType: "credentials"
      accessKeyIdSecretKey: "aws-s3-access-key-id"
      secretAccessKeySecretKey: "aws-s3-secret-access-key"
      endpoint: "${minio_url}"
      pathStyleAccess: ${AIRBYTE_S3_PATH_STYLE}

server:
  env_vars:
    AWS_REGION: "${MINIO_REGION}"
    AWS_DEFAULT_REGION: "${MINIO_REGION}"

worker:
  env_vars:
    AWS_REGION: "${MINIO_REGION}"
    AWS_DEFAULT_REGION: "${MINIO_REGION}"

cron:
  env_vars:
    AWS_REGION: "${MINIO_REGION}"
    AWS_DEFAULT_REGION: "${MINIO_REGION}"

temporal:
  extraEnv:
    - name: SQL_TLS_ENABLED
      value: "false"
    - name: POSTGRES_TLS_ENABLED
      value: "false"

workloadLauncher:
  env_vars:
    AWS_REGION: "${MINIO_REGION}"
    AWS_DEFAULT_REGION: "${MINIO_REGION}"
  extraEnv:
    - name: SQL_TLS_ENABLED
      value: "false"
    - name: POSTGRES_TLS_ENABLED
      value: "false"

connectorBuilderServer:
  enabled: true

ingress:
  enabled: false
EOF

  printf '%s\n' "$values_file"
}

remove_legacy_airbyte_manifests() {
  if [[ "${AIRBYTE_REMOVE_LEGACY_RESOURCES:-true}" != "true" ]]; then
    return 0
  fi

  log "Removing legacy static Airbyte resources before Helm install"
  kubectl -n "$NAMESPACE" delete deployment airbyte-server airbyte-temporal --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" delete service airbyte-server airbyte-temporal --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" delete configmap airbyte-temporal-dynamic-config --ignore-not-found >/dev/null 2>&1 || true
}

deploy_airbyte() {
  local values_file="$1"

  log "Deploying Airbyte via Helm"
  helm upgrade --install "$AIRBYTE_RELEASE_NAME" "$AIRBYTE_CHART_NAME" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --version "$AIRBYTE_CHART_VERSION" \
    --wait \
    --atomic \
    --timeout "${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS}s" \
    -f "$values_file"
}

normalize_aws_env_vars() {
  local deployments
  local deployment
  local patch_file
  local changed=0

  if ! command -v python3 >/dev/null 2>&1; then
    log "WARN: python3 not found; skipping AWS environment de-duplication pass"
    return 0
  fi

  deployments="$(kubectl -n "$NAMESPACE" get deployment -l "app.kubernetes.io/instance=${AIRBYTE_RELEASE_NAME}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')"

  while IFS= read -r deployment; do
    [[ -n "$(trim "$deployment")" ]] || continue
    patch_file="$(mktemp "${STATE_DIR}/aws-env-patch.${deployment}.XXXXXX.json")"

    kubectl -n "$NAMESPACE" get deployment "$deployment" -o json \
      | python3 -c "import json, sys
data = json.load(sys.stdin)
ops = []
for cidx, container in enumerate(data['spec']['template']['spec'].get('containers', [])):
    env = container.get('env') or []
    indexes = [i for i, item in enumerate(env) if item.get('name') in ('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY')]
    if len(indexes) <= 2:
        continue
    for i in sorted(indexes, reverse=True):
        ops.append({'op': 'remove', 'path': f'/spec/template/spec/containers/{cidx}/env/{i}'})
    ops.append({'op': 'add', 'path': f'/spec/template/spec/containers/{cidx}/env/-', 'value': {'name': 'AWS_ACCESS_KEY_ID', 'valueFrom': {'secretKeyRef': {'name': '${AIRBYTE_SECRET_NAME}', 'key': 'aws-s3-access-key-id'}}}})
    ops.append({'op': 'add', 'path': f'/spec/template/spec/containers/{cidx}/env/-', 'value': {'name': 'AWS_SECRET_ACCESS_KEY', 'valueFrom': {'secretKeyRef': {'name': '${AIRBYTE_SECRET_NAME}', 'key': 'aws-s3-secret-access-key'}}}})
print(json.dumps(ops))" >"$patch_file"

    if [[ "$(tr -d '[:space:]' < "$patch_file")" != "[]" ]]; then
      log "Normalizing duplicate AWS environment entries on deployment/${deployment}"
      kubectl -n "$NAMESPACE" patch deployment "$deployment" --type=json -p "$(cat "$patch_file")" >/dev/null
      changed=1
    fi

    rm -f "$patch_file"
  done <<< "$deployments"

  if [[ "$changed" == "1" ]]; then
    wait_for_airbyte_deployments
  fi
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

validate_airbyte() {
  local minio_url
  local db_url

  minio_url="$(normalize_http_url "$MINIO_ENDPOINT")"
  db_url="$(airbyte_db_connection_string)"

  log "Validating Airbyte migration tables"
  run_cluster_command airbyte-migrations postgres:16-alpine sh -c \
    "psql '${db_url}' -Atc \"select coalesce(to_regclass('public.airbyte_configs_migrations')::text, '') = 'airbyte_configs_migrations' and coalesce(to_regclass('public.airbyte_jobs_migrations')::text, '') = 'airbyte_jobs_migrations';\" | grep -qx t"

  log "Validating Airbyte service"
  run_cluster_command airbyte-service curlimages/curl:8.12.1 sh -c \
    "status=\$(curl -sS -o /dev/null -w '%{http_code}' '${AIRBYTE_URL_EFFECTIVE}/' || true); [ \"\$status\" != '000' ]"

  log "Validating Airbyte MinIO buckets"
  run_cluster_command airbyte-minio-auth "$AIRBYTE_MC_IMAGE" sh -c \
    "mc alias set airbyte '${minio_url}' '${MINIO_ACCESS_KEY}' '${MINIO_SECRET_KEY}' >/dev/null &&
    mc ls airbyte/${MINIO_BUCKET_RAW} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_STATE} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_LOG} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null &&
    mc ls airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"

  log "Validating Airbyte test object round-trip"
  run_cluster_command airbyte-minio-write "$AIRBYTE_MC_IMAGE" sh -c \
    "mc alias set airbyte '${minio_url}' '${MINIO_ACCESS_KEY}' '${MINIO_SECRET_KEY}' >/dev/null &&
    printf 'airbyte-validation' > /tmp/validation.txt &&
    mc cp /tmp/validation.txt airbyte/${MINIO_BUCKET_RAW}/airbyte/raw/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_STATE}/airbyte/state/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}/airbyte/workload-output/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}/airbyte/activity-payload/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_AUDIT_LOGGING}/airbyte/audit-logging/validation.txt >/dev/null &&
    mc cp /tmp/validation.txt airbyte/${AIRBYTE_BUCKET_PROFILER_OUTPUT}/airbyte/profiler-output/validation.txt >/dev/null &&
    mc cat airbyte/${AIRBYTE_BUCKET_LOG}/airbyte/log/validation.txt >/dev/null"
}

main() {
  local values_file

  require_airbyte_prereqs
  ensure_cluster_access
  ensure_airbyte_database
  apply_airbyte_secret
  ensure_airbyte_buckets
  configure_helm_repo
  remove_legacy_airbyte_manifests
  values_file="$(build_values_file)"
  deploy_airbyte "$values_file"
  normalize_aws_env_vars
  wait_for_airbyte_deployments
  validate_airbyte

  log "Airbyte facts: endpoint=${AIRBYTE_URL_EFFECTIVE}"
  log "Airbyte facts: release=${AIRBYTE_RELEASE_NAME}"
  log "Airbyte facts: database=${AIRBYTE_DB_NAME}"
  log "Airbyte facts: log_bucket=${AIRBYTE_BUCKET_LOG}"
  log "Airbyte facts: state_bucket=${AIRBYTE_BUCKET_STATE}"
  log "Airbyte facts: workload_output_bucket=${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}"
  log "Airbyte facts: activity_payload_bucket=${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}"
  log "Airbyte facts: audit_logging_bucket=${AIRBYTE_BUCKET_AUDIT_LOGGING}"
  log "Airbyte facts: profiler_output_bucket=${AIRBYTE_BUCKET_PROFILER_OUTPUT}"
  log_success "Airbyte ingestion contract validated"
}

main "$@"
