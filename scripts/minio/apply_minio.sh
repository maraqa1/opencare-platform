#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/minio/deployment.yaml"
wait_for_deployment minio

kubectl -n "$NAMESPACE" run check-minio-bucket \
  --restart=Never \
  --image="${AIRBYTE_MC_IMAGE}" \
  --env="MINIO_ROOT_USER=${MINIO_ROOT_USER}" \
  --env="MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}" \
  --command -- sh -c "mc alias set local http://${MINIO_ENDPOINT} \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_RAW} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_STATE} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_LOG} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null" >/dev/null
wait_for_pod_completion check-minio-bucket
delete_pod_if_exists check-minio-bucket
log_success "MinIO buckets ensured"
