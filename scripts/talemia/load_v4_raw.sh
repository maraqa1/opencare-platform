#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

SQL_FILE="${1:-$ROOT_DIR/scripts/talemia/talemia_raw_demo_v4.sql}"

if [[ ! -f "$SQL_FILE" ]]; then
  fail "TALEMIA raw load SQL not found: $SQL_FILE"
fi

log "Loading TALEMIA V4 raw tables from ${SQL_FILE#"$ROOT_DIR"/}"
kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 < "$SQL_FILE"

log_success "TALEMIA V4 raw tables loaded into raw_demo"
