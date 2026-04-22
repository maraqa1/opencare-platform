#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

resolved_postgres_password="$POSTGRES_PASSWORD"
resolved_kc_db_password="$KC_DB_PASSWORD"
resolved_minio_root_user="$MINIO_ROOT_USER"
resolved_minio_root_password="$MINIO_ROOT_PASSWORD"
resolved_minio_access_key="$MINIO_ACCESS_KEY"
resolved_minio_secret_key="$MINIO_SECRET_KEY"
resolved_internal_api_token="$INTERNAL_API_TOKEN"
resolved_keycloak_admin_password="$KEYCLOAK_ADMIN_PASSWORD"
resolved_demo_mysql_password="$DEMO_MYSQL_PASSWORD"
resolved_demo_mysql_root_password="$DEMO_MYSQL_ROOT_PASSWORD"
resolved_superset_readonly_password="$SUPERSET_READONLY_PASSWORD"
resolved_superset_admin_password="$SUPERSET_ADMIN_PASSWORD"
resolved_smtp_pass="$SMTP_PASS"

if kubectl -n "$NAMESPACE" get secret opencare-secrets >/dev/null 2>&1; then
  resolved_postgres_password="$(secret_value_or_default opencare-secrets POSTGRES_PASSWORD "$resolved_postgres_password")"
  resolved_kc_db_password="$(secret_value_or_default opencare-secrets KC_DB_PASSWORD "$resolved_kc_db_password")"
  resolved_minio_root_user="$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$resolved_minio_root_user")"
  resolved_minio_root_password="$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$resolved_minio_root_password")"
  resolved_minio_access_key="$(secret_value_or_default opencare-secrets MINIO_ACCESS_KEY "$resolved_minio_access_key")"
  resolved_minio_secret_key="$(secret_value_or_default opencare-secrets MINIO_SECRET_KEY "$resolved_minio_secret_key")"
  resolved_internal_api_token="$(secret_value_or_default opencare-secrets INTERNAL_API_TOKEN "$resolved_internal_api_token")"
  resolved_keycloak_admin_password="$(secret_value_or_default opencare-secrets KEYCLOAK_ADMIN_PASSWORD "$resolved_keycloak_admin_password")"
  resolved_demo_mysql_password="$(secret_value_or_default opencare-secrets DEMO_MYSQL_PASSWORD "$resolved_demo_mysql_password")"
  resolved_demo_mysql_root_password="$(secret_value_or_default opencare-secrets DEMO_MYSQL_ROOT_PASSWORD "$resolved_demo_mysql_root_password")"
  resolved_superset_readonly_password="$(secret_value_or_default opencare-secrets SUPERSET_READONLY_PASSWORD "$resolved_superset_readonly_password")"
  resolved_superset_admin_password="$(secret_value_or_default opencare-secrets SUPERSET_ADMIN_PASSWORD "$resolved_superset_admin_password")"
  resolved_smtp_pass="$(secret_value_or_default opencare-secrets SMTP_PASS "$resolved_smtp_pass")"
fi

render_platform_config() {
  local output_file="$1"

  cat >"$output_file" <<EOF
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencare-config
  namespace: ${NAMESPACE}
data:
  APP_ENV: production
  APP_NAME: opencare-backend
  APP_HOST: 0.0.0.0
  APP_PORT: "8000"
  ANALYTICS_SCHEMA: ${ANALYTICS_SCHEMA}
  RAW_SCHEMA: ${RAW_SCHEMA}
  DBT_SOURCE_SCHEMA: ${DBT_SOURCE_SCHEMA}
  STAGING_SCHEMA: ${STAGING_SCHEMA}
  DICTIONARY_SCHEMA: ${DICTIONARY_SCHEMA}
  OUTPUT_SCHEMA: ${OUTPUT_SCHEMA}
  POSTGRES_HOST: ${POSTGRES_HOST}
  POSTGRES_PORT: "${POSTGRES_PORT}"
  POSTGRES_DB: ${POSTGRES_DB}
  POSTGRES_USER: ${POSTGRES_USER}
  REDIS_HOST: ${REDIS_HOST}
  REDIS_PORT: "${REDIS_PORT}"
  MINIO_ENDPOINT: ${MINIO_ENDPOINT}
  MINIO_REGION: ${MINIO_REGION}
  MINIO_BUCKET: ${MINIO_BUCKET}
  MINIO_BUCKET_RAW: ${MINIO_BUCKET_RAW}
  MINIO_BUCKET_STATE: ${MINIO_BUCKET_STATE}
  AIRBYTE_BUCKET_LOG: ${AIRBYTE_BUCKET_LOG}
  AIRBYTE_BUCKET_STATE: ${AIRBYTE_BUCKET_STATE}
  AIRBYTE_BUCKET_WORKLOAD_OUTPUT: ${AIRBYTE_BUCKET_WORKLOAD_OUTPUT}
  AIRBYTE_BUCKET_ACTIVITY_PAYLOAD: ${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD}
  AIRBYTE_BUCKET_AUDIT_LOGGING: ${AIRBYTE_BUCKET_AUDIT_LOGGING}
  AIRBYTE_BUCKET_PROFILER_OUTPUT: ${AIRBYTE_BUCKET_PROFILER_OUTPUT}
  AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL: ${AIRBYTE_ENTERPRISE_SOURCE_STUBS_URL}
  AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL: ${AIRBYTE_ENTERPRISE_DESTINATION_STUBS_URL}
  AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED: "${AIRBYTE_CONNECTOR_REGISTRY_ENTERPRISE_ENABLED}"
  AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS: "${AIRBYTE_DEPLOYMENT_TIMEOUT_SECONDS}"
  RUN_DATABASE_MIGRATION_ON_STARTUP: "${RUN_DATABASE_MIGRATION_ON_STARTUP}"
  CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION: ${CONFIGS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}
  JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION: ${JOBS_DATABASE_MINIMUM_FLYWAY_MIGRATION_VERSION}
  AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION: ${AIRBYTE_FLYWAY_CONFIGS_MINIMUM_MIGRATION_VERSION}
  AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION: ${AIRBYTE_FLYWAY_JOBS_MINIMUM_MIGRATION_VERSION}
  AIRBYTE_S3_PATH_STYLE: "${AIRBYTE_S3_PATH_STYLE}"
  KEYCLOAK_URL: ${KEYCLOAK_URL}
  KEYCLOAK_REALM: ${KEYCLOAK_REALM}
  FORECAST_RUNTIME_URL: ${FORECAST_RUNTIME_URL}
  ANOMALY_RUNTIME_URL: ${ANOMALY_RUNTIME_URL}
  SUPERSET_EMBED_URL: ${SUPERSET_EMBED_URL}
  AIRBYTE_URL: ${AIRBYTE_URL}
  REPORTS_PREFIX: ${REPORTS_PREFIX}
  DICTIONARY_VERSION: "${DICTIONARY_VERSION}"
  RUNTIME_WRITES_ENABLED: "${RUNTIME_WRITES_ENABLED}"
  DECISION_SCHEMA: ${DECISION_SCHEMA}
  DECISION_DEFAULT_EMAIL: ${DECISION_DEFAULT_EMAIL}
  ESCALATION_EMAIL: ${ESCALATION_EMAIL}
  ESCALATION_THRESHOLD_MINUTES: "${ESCALATION_THRESHOLD_MINUTES}"
  MAX_ESCALATIONS: "${MAX_ESCALATIONS}"
  SMTP_HOST: ${SMTP_HOST}
  SMTP_PORT: "${SMTP_PORT}"
  SMTP_USER: ${SMTP_USER}
  SMTP_FROM: ${SMTP_FROM}
  SMTP_USE_TLS: "${SMTP_USE_TLS}"
  NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL}
  BACKEND_URL: ${BACKEND_URL}
  PORTAL_URL: ${PORTAL_URL}
  BASE_DOMAIN: ${BASE_DOMAIN}
  PORTAL_HOST: ${PORTAL_HOST}
  API_HOST: ${API_HOST}
  AUTH_HOST: ${AUTH_HOST}
  ANALYTICS_HOST: ${ANALYTICS_HOST}
  TLS_EMAIL: ${TLS_EMAIL}
  ENABLE_EXTERNAL_INGRESS: "${ENABLE_EXTERNAL_INGRESS}"
  EXTERNAL_HOST: ${EXTERNAL_HOST}
  INGRESS_CLASS_NAME: ${INGRESS_CLASS_NAME}
  TRAEFIK_ENTRYPOINTS: ${TRAEFIK_ENTRYPOINTS}
  EXTERNAL_TLS_SECRET_NAME: ${EXTERNAL_TLS_SECRET_NAME}
  CERT_MANAGER_CLUSTER_ISSUER: ${CERT_MANAGER_CLUSTER_ISSUER}
  FORECAST_OUTPUT_TABLE: ${FORECAST_OUTPUT_TABLE}
  ANOMALY_OUTPUT_TABLE: ${ANOMALY_OUTPUT_TABLE}
  FORECAST_MODEL_NAME: ${FORECAST_MODEL_NAME}
  FORECAST_LOOKBACK_DAYS: "${FORECAST_LOOKBACK_DAYS}"
  FORECAST_HORIZON_DAYS: "${FORECAST_HORIZON_DAYS}"
  ANOMALY_LOOKBACK_DAYS: "${ANOMALY_LOOKBACK_DAYS}"
  ANOMALY_RECENT_WINDOW_DAYS: "${ANOMALY_RECENT_WINDOW_DAYS}"
  ANOMALY_INFO_Z_SCORE: "${ANOMALY_INFO_Z_SCORE}"
  ANOMALY_WARNING_Z_SCORE: "${ANOMALY_WARNING_Z_SCORE}"
  ANOMALY_CRITICAL_Z_SCORE: "${ANOMALY_CRITICAL_Z_SCORE}"
  ANOMALY_INFO_OCCUPANCY_RATE: "${ANOMALY_INFO_OCCUPANCY_RATE}"
  ANOMALY_WARNING_OCCUPANCY_RATE: "${ANOMALY_WARNING_OCCUPANCY_RATE}"
  ANOMALY_CRITICAL_OCCUPANCY_RATE: "${ANOMALY_CRITICAL_OCCUPANCY_RATE}"
  ANOMALY_MAX_ALERTS: "${ANOMALY_MAX_ALERTS}"
  PHASE2_EXPECTED_ALERT_MIN: "${PHASE2_EXPECTED_ALERT_MIN}"
  PHASE2_EXPECTED_ALERT_MAX: "${PHASE2_EXPECTED_ALERT_MAX}"
  KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
  KC_DB: ${KC_DB}
  KC_DB_URL_HOST: ${KC_DB_URL_HOST}
  KC_DB_URL_PORT: "${KC_DB_URL_PORT}"
  KC_DB_URL_DATABASE: ${KC_DB_URL_DATABASE}
  KC_DB_USERNAME: ${KC_DB_USERNAME}
  DEMO_MYSQL_HOST: ${DEMO_MYSQL_HOST}
  DEMO_MYSQL_PORT: "${DEMO_MYSQL_PORT}"
  DEMO_MYSQL_DATABASE: ${DEMO_MYSQL_DATABASE}
  DEMO_MYSQL_USER: ${DEMO_MYSQL_USER}
  SUPERSET_READONLY_USER: ${SUPERSET_READONLY_USER}
  SUPERSET_ADMIN_USER: ${SUPERSET_ADMIN_USER}
  SUPERSET_SECRET_KEY: ${SUPERSET_SECRET_KEY}
  SUPERSET_LOAD_EXAMPLES: "${SUPERSET_LOAD_EXAMPLES}"
---
apiVersion: v1
kind: Secret
metadata:
  name: opencare-secrets
  namespace: ${NAMESPACE}
type: Opaque
stringData:
  POSTGRES_PASSWORD: ${resolved_postgres_password}
  KC_DB_PASSWORD: ${resolved_kc_db_password}
  MINIO_ROOT_USER: ${resolved_minio_root_user}
  MINIO_ROOT_PASSWORD: ${resolved_minio_root_password}
  MINIO_ACCESS_KEY: ${resolved_minio_access_key}
  MINIO_SECRET_KEY: ${resolved_minio_secret_key}
  INTERNAL_API_TOKEN: ${resolved_internal_api_token}
  KEYCLOAK_ADMIN_PASSWORD: ${resolved_keycloak_admin_password}
  DEMO_MYSQL_PASSWORD: ${resolved_demo_mysql_password}
  DEMO_MYSQL_ROOT_PASSWORD: ${resolved_demo_mysql_root_password}
  SUPERSET_READONLY_PASSWORD: ${resolved_superset_readonly_password}
  SUPERSET_ADMIN_PASSWORD: ${resolved_superset_admin_password}
  SMTP_PASS: "${resolved_smtp_pass}"
EOF
}

apply_file "$ROOT_DIR/manifests/namespace.yaml"
rendered_config="$(mktemp)"
render_platform_config "$rendered_config"
kubectl apply -f "$rendered_config"
rm -f "$rendered_config"
log_skip "No base bootstrap action implemented"
log_success "Base resources applied"
