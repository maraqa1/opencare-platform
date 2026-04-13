#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/namespace.yaml"
apply_if_exists "$ROOT_DIR/manifests/platform-config.yaml" >/dev/null || true
log_skip "No base bootstrap action implemented"
log_success "Base resources applied"
