#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

ensure_superset_metadata_schema() {
  local metadata_schema
  metadata_schema="${SUPERSET_METADATA_SCHEMA:-superset_meta}"

  log "Ensuring Superset metadata schema ${metadata_schema}"
  kubectl -n "$NAMESPACE" exec deploy/superset -- sh -c 'python - <<'"'"'PY'"'"'
import os
import psycopg2
from psycopg2 import sql

schema = os.getenv("SUPERSET_METADATA_SCHEMA", "superset_meta")
conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", "postgres"),
    port=os.getenv("POSTGRES_PORT", "5432"),
    dbname=os.getenv("POSTGRES_DB", "opencare"),
    user=os.getenv("POSTGRES_USER", "opencare"),
    password=os.getenv("POSTGRES_PASSWORD", ""),
)
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(schema)))
conn.close()
print(f"[ok] ensured schema {schema}")
PY'
}

ensure_superset_admin() {
  local users

  log "Ensuring Superset metadata DB and admin user"
  ensure_superset_metadata_schema
  kubectl -n "$NAMESPACE" exec deploy/superset -- superset db upgrade

  users="$(kubectl -n "$NAMESPACE" exec deploy/superset -- superset fab list-users 2>/dev/null || true)"

  if ! grep -qE "(^|[[:space:]])${SUPERSET_ADMIN_USER}([[:space:]]|$)" <<<"$users"; then
    log "Creating Superset admin user ${SUPERSET_ADMIN_USER}"
    kubectl -n "$NAMESPACE" exec deploy/superset -- superset fab create-admin \
      --username "$SUPERSET_ADMIN_USER" \
      --firstname OpenCare \
      --lastname Admin \
      --email admin@opencare.local \
      --password "$SUPERSET_ADMIN_PASSWORD" || true
  fi

  log "Resetting Superset admin password for ${SUPERSET_ADMIN_USER}"
  kubectl -n "$NAMESPACE" exec deploy/superset -- superset fab reset-password \
    --username "$SUPERSET_ADMIN_USER" \
    --password "$SUPERSET_ADMIN_PASSWORD"

  kubectl -n "$NAMESPACE" exec deploy/superset -- superset init
}

log "Creating Superset asset config map"
kubectl -n "$NAMESPACE" create configmap superset-assets \
  --from-file="$ROOT_DIR/superset/custom_theme.css" \
  --from-file="$ROOT_DIR/superset/superset_config.py" \
  --dry-run=client -o yaml | kubectl apply -f -

apply_file "$ROOT_DIR/manifests/superset/deployment.yaml"
log "Restarting Superset to pick up current assets and configuration"
kubectl -n "$NAMESPACE" rollout restart deployment/superset >/dev/null
wait_for_deployment superset
ensure_superset_admin

bash "$ROOT_DIR/scripts/superset/configure_readonly.sh"

log_skip "Superset dashboard sync deferred until dbt models are materialized"

log_success "Superset deployment ready"
