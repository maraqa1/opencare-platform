#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/minio/deployment.yaml"
wait_for_deployment minio

run_cluster_command minio-bucket minio/mc:RELEASE.2025-07-21T05-28-08Z sh -c "mc alias set local http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_RAW} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET_STATE} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_LOG} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_WORKLOAD_OUTPUT} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_ACTIVITY_PAYLOAD} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_AUDIT_LOGGING} >/dev/null && mc mb --ignore-existing local/${AIRBYTE_BUCKET_PROFILER_OUTPUT} >/dev/null"
log_success "MinIO buckets ensured"
