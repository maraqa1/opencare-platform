#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/superset/deployment.yaml"
wait_for_deployment superset
log_skip "No Superset bootstrap action implemented"
log_success "Superset deployment ready"
