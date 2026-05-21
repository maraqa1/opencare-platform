#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

require_cmd kubectl

postgres_password_quoted="$(printf '%q' "$POSTGRES_PASSWORD")"
postgres_user_quoted="$(printf '%q' "$POSTGRES_USER")"
postgres_db_quoted="$(printf '%q' "$POSTGRES_DB")"

sql_literal() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
}

sql_identifier() {
  printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g')"
}

rendered_sql="$(mktemp)"
sed \
  -e "s/__SUPERSET_READONLY_USER_LITERAL__/$(sql_literal "$SUPERSET_READONLY_USER")/g" \
  -e "s/__SUPERSET_READONLY_PASSWORD_LITERAL__/$(sql_literal "$SUPERSET_READONLY_PASSWORD")/g" \
  -e "s/__SUPERSET_READONLY_USER_IDENTIFIER__/$(sql_identifier "$SUPERSET_READONLY_USER")/g" \
  "$ROOT_DIR/sql/superset/superset_readonly.sql" > "$rendered_sql"

log "Applying Superset read-only role grants"
kubectl -n "$NAMESPACE" exec -i statefulset/postgres -- bash -lc \
  "PGPASSWORD=${postgres_password_quoted} psql \
    -v ON_ERROR_STOP=1 \
    -U ${postgres_user_quoted} \
    -d ${postgres_db_quoted} \
    -f -" < "$rendered_sql"

rm -f "$rendered_sql"

log_success "Superset read-only role configured"
