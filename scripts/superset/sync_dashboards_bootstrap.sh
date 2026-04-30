#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

if ! command -v python3 >/dev/null 2>&1; then
  log_skip "python3 not available; skipping Superset dashboard sync"
  exit 0
fi

log "Syncing Superset dashboards from metadata"
kubectl -n "$NAMESPACE" exec -i deploy/superset -- sh -c 'cat >/tmp/dashboard_config.yml' \
  < "$ROOT_DIR/dbt/opencare/models/metadata/dashboard_config.yml"
kubectl -n "$NAMESPACE" exec -i deploy/superset -- sh -c 'cat >/tmp/sync_dashboards.py' \
  < "$ROOT_DIR/scripts/sync_dashboards.py"

if kubectl -n "$NAMESPACE" exec deploy/superset -- sh -c "SUPERSET_URL=\${SUPERSET_URL:-http://127.0.0.1:8088} python /tmp/sync_dashboards.py /tmp/dashboard_config.yml"; then
  log "Linking Superset dashboard chart relationships"
  kubectl -n "$NAMESPACE" exec -i deploy/superset -- sh -c 'cat >/tmp/link_dashboard_slices.py' \
    < "$ROOT_DIR/scripts/superset/link_dashboard_slices.py"
  kubectl -n "$NAMESPACE" exec deploy/superset -- python /tmp/link_dashboard_slices.py /tmp/dashboard_config.yml \
    || log_skip "Superset dashboard chart relationship link failed during bootstrap"
else
  fail "Superset dashboard sync failed after dbt completed"
fi

log_success "Superset dashboard sync completed"
