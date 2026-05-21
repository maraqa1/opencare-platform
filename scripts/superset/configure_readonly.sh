#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

require_cmd psql

log "Applying Superset read-only role grants"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -v ON_ERROR_STOP=1 \
  -v SUPERSET_READONLY_USER="$SUPERSET_READONLY_USER" \
  -v SUPERSET_READONLY_PASSWORD="$SUPERSET_READONLY_PASSWORD" \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$ROOT_DIR/sql/superset/superset_readonly.sql"

log_success "Superset read-only role configured"
