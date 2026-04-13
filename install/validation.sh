#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

log "Checking kubectl connectivity"
ensure_cluster_access

log "Checking Postgres availability"
run_cluster_command postgres postgres:16-alpine pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"

log "Checking MinIO availability"
run_cluster_http_check minio "http://${MINIO_ENDPOINT}/minio/health/live"

log "Checking Keycloak availability"
run_cluster_http_check keycloak "${KEYCLOAK_URL}/health/ready"

log "Checking backend health"
run_cluster_http_check backend "${BACKEND_URL}/healthz"

log "Checking portal service"
run_cluster_http_check portal "$PORTAL_URL"

log "Checking Superset service"
run_cluster_http_check superset "$SUPERSET_EMBED_URL"

log_success "Validation completed successfully"
print_endpoints
