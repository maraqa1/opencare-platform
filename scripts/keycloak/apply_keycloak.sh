#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/keycloak/deployment.yaml"
wait_for_deployment keycloak

run_cluster_http_check keycloak-ready "${KEYCLOAK_HEALTH_URL}/health/ready" 15 2
log_skip "No Keycloak bootstrap action implemented"
log_success "Keycloak deployment ready"
