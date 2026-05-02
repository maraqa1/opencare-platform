#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

require_cmd kubectl

log "Removing OpenCare namespace $NAMESPACE"
kubectl delete namespace "$NAMESPACE" --ignore-not-found
log_success "Uninstall request submitted"
