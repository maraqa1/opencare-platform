#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/minio/deployment.yaml"
wait_for_deployment minio

effective_minio_user="$(secret_value_or_default opencare-secrets MINIO_ROOT_USER "$MINIO_ROOT_USER")"
effective_minio_password="$(secret_value_or_default opencare-secrets MINIO_ROOT_PASSWORD "$MINIO_ROOT_PASSWORD")"

delete_pod_if_exists check-minio-bucket
kubectl -n "$NAMESPACE" run check-minio-bucket \
  --restart=Never \
  --image="${AIRBYTE_MC_IMAGE}" \
  --env="MINIO_ROOT_USER=${effective_minio_user}" \
  --env="MINIO_ROOT_PASSWORD=${effective_minio_password}" \
  --command -- sh -c "mc alias set local http://${MINIO_ENDPOINT} \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_RAW} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_STATE} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_LOG} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null" >/dev/null
trap 'delete_pod_if_exists check-minio-bucket' EXIT
wait_for_pod_completion check-minio-bucket
delete_pod_if_exists check-minio-bucket
trap - EXIT
log_success "MinIO buckets ensured"
