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
    helm -n "$NAMESPACE" get manifest "$AIRBYTE_RELEASE_NAME" | grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233' || true
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
      grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233|aws-region' "$LAST_RENDERED_AIRBYTE_VALUES_FILE" || true
    fi
    echo
    echo "=== Rendered Airbyte Manifest Wiring ==="
    if [[ -n "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" && -f "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" ]]; then
      grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233' "$LAST_RENDERED_AIRBYTE_MANIFEST_FILE" || true
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
  local missing=0

  log "Validating rendered Airbyte wiring"
  for pattern in 'TEMPORAL_HOST' 'INTERNAL_API_HOST' 'TEMPORAL_BROADCAST_ADDRESS' 'PUBLIC_FRONTEND_ADDRESS' '7233'; do
    if ! grep -q "$pattern" "$values_file"; then
      log "Missing rendered Airbyte pattern: $pattern"
      missing=1
    fi
  done

  grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233|aws-region' "$values_file" || true
  [[ "$missing" -eq 0 ]] || fail "Rendered Airbyte values are missing required Temporal/internal API wiring"
}

validate_rendered_airbyte_manifest() {
  local manifest_file="$1"
  local missing=0

  log "Validating rendered Airbyte manifest wiring"
  for pattern in 'TEMPORAL_HOST' 'INTERNAL_API_HOST' 'TEMPORAL_BROADCAST_ADDRESS' 'PUBLIC_FRONTEND_ADDRESS' '7233'; do
    if ! grep -q "$pattern" "$manifest_file"; then
      log "Missing rendered Airbyte manifest pattern: $pattern"
      missing=1
    fi
  done

  grep -nE 'TEMPORAL_HOST|INTERNAL_API_HOST|TEMPORAL_BROADCAST_ADDRESS|PUBLIC_FRONTEND_ADDRESS|7233' "$manifest_file" || true
  [[ "$missing" -eq 0 ]] || fail "Rendered Airbyte manifest is missing required Temporal/internal API wiring"
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
  configure_helm_repo
  remove_legacy_airbyte_resources
  values_file="$(render_values_file)"
  validate_rendered_airbyte_values "$values_file"
  manifest_file="$(render_manifest_file "$values_file")"
  validate_rendered_airbyte_manifest "$manifest_file"

  log "Deploying Airbyte via Helm"
  helm upgrade --install "$AIRBYTE_RELEASE_NAME" "$AIRBYTE_CHART_NAME" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --version "$AIRBYTE_CHART_VERSION" \
    --wait \
    --timeout "${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS}s" \
    -f "$values_file"

  wait_for_airbyte_deployments
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
