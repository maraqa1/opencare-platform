#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/redis/deployment.yaml"
wait_for_deployment redis
log_skip "No Redis bootstrap action implemented"
log_success "Redis deployment ready"
