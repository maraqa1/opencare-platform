#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/minio/deployment.yaml"
wait_for_deployment minio

run_cluster_command minio-bucket minio/mc:RELEASE.2026-02-21T16-00-46Z sh -c "mc alias set local http://${MINIO_ENDPOINT} ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} >/dev/null && mc mb --ignore-existing local/${MINIO_BUCKET} >/dev/null"
log_success "MinIO bucket ensured"
