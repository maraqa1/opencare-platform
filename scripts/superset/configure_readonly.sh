#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

require_cmd kubectl

postgres_password_quoted="$(printf '%q' "$POSTGRES_PASSWORD")"
superset_readonly_user_quoted="$(printf '%q' "$SUPERSET_READONLY_USER")"
superset_readonly_password_quoted="$(printf '%q' "$SUPERSET_READONLY_PASSWORD")"
postgres_user_quoted="$(printf '%q' "$POSTGRES_USER")"
postgres_db_quoted="$(printf '%q' "$POSTGRES_DB")"

log "Applying Superset read-only role grants"
kubectl -n "$NAMESPACE" exec -i statefulset/postgres -- bash -lc \
  "PGPASSWORD=${postgres_password_quoted} psql \
    -v ON_ERROR_STOP=1 \
    -v SUPERSET_READONLY_USER=${superset_readonly_user_quoted} \
    -v SUPERSET_READONLY_PASSWORD=${superset_readonly_password_quoted} \
    -U ${postgres_user_quoted} \
    -d ${postgres_db_quoted} \
    -f -" < "$ROOT_DIR/sql/superset/superset_readonly.sql"

log_success "Superset read-only role configured"
