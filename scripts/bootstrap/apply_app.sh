#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/backend/deployment.yaml"
apply_file "$ROOT_DIR/manifests/portal/deployment.yaml"

wait_for_deployment backend
wait_for_deployment portal
log_skip "No additional app bootstrap action implemented"
log_success "Application services ready"
