#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/postgres/statefulset.yaml"
wait_for_statefulset postgres

run_cluster_command postgres-init postgres:16-alpine sh -c "psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} -c 'create schema if not exists ${RAW_SCHEMA};' -c 'create schema if not exists ${STAGING_SCHEMA};' -c 'create schema if not exists ${ANALYTICS_SCHEMA};' -c 'create schema if not exists ${DICTIONARY_SCHEMA};' -c 'create schema if not exists ${OUTPUT_SCHEMA};' -c 'grant usage on schema ${RAW_SCHEMA} to ${POSTGRES_USER};' -c 'grant usage on schema ${STAGING_SCHEMA} to ${POSTGRES_USER};' -c 'grant usage on schema ${ANALYTICS_SCHEMA} to ${POSTGRES_USER};' -c 'grant usage on schema ${DICTIONARY_SCHEMA} to ${POSTGRES_USER};' -c 'grant usage on schema ${OUTPUT_SCHEMA} to ${POSTGRES_USER};'"
log_success "Postgres schemas ensured"
