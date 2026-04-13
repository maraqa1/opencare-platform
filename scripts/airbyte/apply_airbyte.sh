#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_DIR="$ROOT_DIR/manifests/airbyte"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

if [[ ! -d "$MANIFEST_DIR" ]]; then
  log_skip "Airbyte manifests directory not found: manifests/airbyte"
  exit 0
fi

shopt -s nullglob
manifest_files=("$MANIFEST_DIR"/*.yaml "$MANIFEST_DIR"/*.yml)
shopt -u nullglob

if [[ "${#manifest_files[@]}" -eq 0 ]]; then
  log_skip "No Airbyte manifests implemented"
  exit 0
fi

for file in "${manifest_files[@]}"; do
  apply_file "$file"
done

log_skip "No Airbyte readiness/bootstrap action implemented"
log_success "Airbyte manifests applied"
