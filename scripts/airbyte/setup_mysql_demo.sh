#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

AIRBYTE_PORT_FORWARD_PID=""
AIRBYTE_API_BASE_URL=""
AIRBYTE_PUBLIC_API_PREFIX="${AIRBYTE_PUBLIC_API_PREFIX:-/api/public/v1}"
DEMO_AIRBYTE_DESTINATION_SCHEMA="${DEMO_AIRBYTE_DESTINATION_SCHEMA:-raw_demo}"

log_error() {
  >&2 printf '[%s] ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_demo_prereqs() {
  if ! command -v curl >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      log "curl not found; installing curl"
      apt-get update >/dev/null
      apt-get install -y curl >/dev/null
    else
      fail "curl is required for Airbyte demo setup"
    fi
  fi

  if ! command -v jq >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      log "jq not found; installing jq"
      apt-get update >/dev/null
      apt-get install -y jq >/dev/null
    else
      fail "jq is required for Airbyte demo setup"
    fi
  fi

  require_cmd curl
  require_cmd jq
  require_cmd kubectl
}

cleanup_airbyte_port_forward() {
  if [[ -n "$AIRBYTE_PORT_FORWARD_PID" ]] && kill -0 "$AIRBYTE_PORT_FORWARD_PID" >/dev/null 2>&1; then
    kill "$AIRBYTE_PORT_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$AIRBYTE_PORT_FORWARD_PID" >/dev/null 2>&1 || true
  fi
}

start_airbyte_port_forward() {
  local port_forward_port="${AIRBYTE_API_PORT_FORWARD_PORT:-18001}"
  local log_file

  log "Opening local port-forward to Airbyte API on 127.0.0.1:${port_forward_port}"
  log_file="$(mktemp)"
  kubectl -n "$NAMESPACE" port-forward "svc/${AIRBYTE_SERVER_SERVICE_NAME}" "${port_forward_port}:8001" >"$log_file" 2>&1 &
  AIRBYTE_PORT_FORWARD_PID=$!
  AIRBYTE_API_BASE_URL="http://127.0.0.1:${port_forward_port}"

  for _ in $(seq 1 30); do
    if [[ "$(curl -sS -o /dev/null -w '%{http_code}' "${AIRBYTE_API_BASE_URL}/api/v1/health" || true)" != "000" ]]; then
      rm -f "$log_file"
      return 0
    fi
    sleep 2
  done

  cat "$log_file" >&2 || true
  rm -f "$log_file"
  fail "Unable to establish local connectivity to the Airbyte API"
}

detect_public_api_prefix() {
  local response

  response="$(curl -fsS "${AIRBYTE_API_BASE_URL}${AIRBYTE_PUBLIC_API_PREFIX}/workspaces" 2>/dev/null || true)"
  [[ -n "$response" ]] || return 1
  printf '%s' "$response" | jq -e '.data[0].workspaceId' >/dev/null 2>&1
}

api_request() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"
  local response_file
  local http_code
  local curl_args=(
    -sS
    -o
  )

  response_file="$(mktemp)"
  http_code="$(
    if [[ -n "$payload" ]]; then
      curl "${curl_args[@]}" "$response_file" -w '%{http_code}' \
        -H "Content-Type: application/json" \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}" \
        -d "$payload"
    else
      curl "${curl_args[@]}" "$response_file" -w '%{http_code}' \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}"
    fi
  )"

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    log_error "Airbyte API ${method} ${path} returned HTTP ${http_code}"
    if [[ -n "$payload" ]]; then
      log_error "Airbyte request payload:"
      >&2 printf '%s\n' "$payload"
    fi
    log_error "Airbyte response body:"
    cat "$response_file" >&2 || true
    rm -f "$response_file"
    fail "Airbyte API request failed"
  fi

  cat "$response_file"
  rm -f "$response_file"
}

api_post() {
  local path="$1"
  local payload="$2"
  api_request POST "$path" "$payload"
}

api_get() {
  local path="$1"
  api_request GET "$path"
}

api_patch() {
  local path="$1"
  local payload="$2"
  api_request PATCH "$path" "$payload"
}

api_post_jobs_maybe_running() {
  local payload="$1"
  local response_file
  local http_code

  response_file="$(mktemp)"
  http_code="$(
    curl -sS -o "$response_file" -w '%{http_code}' \
      -H "Content-Type: application/json" \
      -X POST \
      "${AIRBYTE_API_BASE_URL}${AIRBYTE_PUBLIC_API_PREFIX}/jobs" \
      -d "$payload"
  )"

  case "$http_code" in
    2*)
      cat "$response_file"
      rm -f "$response_file"
      return 0
      ;;
    409)
      if grep -qi "already running" "$response_file"; then
        log "Airbyte sync already running for this connection; waiting for the in-flight job to finish"
        rm -f "$response_file"
        return 10
      fi
      ;;
  esac

  log_error "Airbyte API POST ${AIRBYTE_PUBLIC_API_PREFIX}/jobs returned HTTP ${http_code}"
  log_error "Airbyte request payload:"
  >&2 printf '%s\n' "$payload"
  log_error "Airbyte response body:"
  cat "$response_file" >&2 || true
  rm -f "$response_file"
  fail "Airbyte API request failed"
}

workspace_id() {
  api_get "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces" | jq -r '.data[0].workspaceId'
}

definition_id() {
  local endpoint="$1"
  local repository_pattern="$2"
  api_get "$endpoint" | jq -r --arg repository_pattern "$repository_pattern" '.data[]? | select((.dockerRepository // "") | test($repository_pattern; "i")) | .id' | head -n 1
}

upsert_source() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/sources?workspaceIds=${workspace_id}" | jq -r --arg name "$DEMO_MYSQL_SOURCE_NAME" '.data[]? | select(.name == $name) | .sourceId' | head -n 1)"

  payload="$(jq -n \
    --arg workspaceId "$workspace_id" \
    --arg definitionId "$definition_id" \
    --arg name "$DEMO_MYSQL_SOURCE_NAME" \
    --arg host "$DEMO_MYSQL_HOST" \
    --argjson port "$DEMO_MYSQL_PORT" \
    --arg database "$DEMO_MYSQL_DATABASE" \
    --arg username "$DEMO_MYSQL_USER" \
    --arg password "$DEMO_MYSQL_PASSWORD" \
    '{
      workspaceId: $workspaceId,
      definitionId: $definitionId,
      name: $name,
      configuration: {
        host: $host,
        port: $port,
        database: $database,
        username: $username,
        password: $password,
        replication_method: { method: "STANDARD" },
        ssl: false
      }
    }'
  )"

  if [[ -n "$existing_id" ]]; then
    api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/sources/${existing_id}" "$payload" | jq -r '.sourceId'
  else
    api_post "${AIRBYTE_PUBLIC_API_PREFIX}/sources" "$payload" | jq -r '.sourceId'
  fi
}

upsert_destination() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/destinations?workspaceIds=${workspace_id}" | jq -r --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" '.data[]? | select(.name == $name) | .destinationId' | head -n 1)"

  payload="$(jq -n \
    --arg workspaceId "$workspace_id" \
    --arg definitionId "$definition_id" \
    --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" \
    --arg host "$POSTGRES_HOST" \
    --argjson port "$POSTGRES_PORT" \
    --arg database "$POSTGRES_DB" \
    --arg schema "$DEMO_AIRBYTE_DESTINATION_SCHEMA" \
    --arg username "$POSTGRES_USER" \
    --arg password "$POSTGRES_PASSWORD" \
    '{
      workspaceId: $workspaceId,
      definitionId: $definitionId,
      name: $name,
      configuration: {
        host: $host,
        port: $port,
        database: $database,
        schema: $schema,
        username: $username,
        password: $password,
        ssl: false,
        tunnel_method: { tunnel_method: "NO_TUNNEL" }
      }
    }'
  )"

  if [[ -n "$existing_id" ]]; then
    api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/destinations/${existing_id}" "$payload" | jq -r '.destinationId'
  else
    api_post "${AIRBYTE_PUBLIC_API_PREFIX}/destinations" "$payload" | jq -r '.destinationId'
  fi
}

build_catalog() {
  local source_id="$1"
  local discovery_payload

  discovery_payload="$(jq -n --arg sourceId "$source_id" '{sourceId: $sourceId}')"

  api_post "/api/v1/sources/discover_schema" "$discovery_payload" \
    | jq -c '
        (
          .catalog.streams // .catalog // .streams // []
        )
        | map({
            name: (.stream.name // .name),
            syncMode: "full_refresh_overwrite"
          })
      '
}

reset_demo_destination_schema() {
  log "Resetting Airbyte demo destination schema ${DEMO_AIRBYTE_DESTINATION_SCHEMA}"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
drop schema if exists ${DEMO_AIRBYTE_DESTINATION_SCHEMA} cascade;
create schema ${DEMO_AIRBYTE_DESTINATION_SCHEMA};
grant usage, create on schema ${DEMO_AIRBYTE_DESTINATION_SCHEMA} to ${POSTGRES_USER};
SQL
}

upsert_connection() {
  local source_id="$1"
  local destination_id="$2"
  local catalog_json="$3"
  local existing_id
  local payload

  existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/connections?workspaceIds=$(workspace_id)" | jq -r --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" '.data[]? | select(.name == $name) | .connectionId' | head -n 1)"

  payload="$(jq -n \
    --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" \
    --arg sourceId "$source_id" \
    --arg destinationId "$destination_id" \
    --argjson streams "$catalog_json" \
    '{
      name: $name,
      sourceId: $sourceId,
      destinationId: $destinationId,
      configurations: {
        streams: $streams
      },
      namespaceDefinition: "custom_format",
      namespaceFormat: "raw_demo",
      prefix: "",
      status: "active"
    }'
  )"

  if [[ -n "$existing_id" ]]; then
    api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/connections/${existing_id}" "$payload" | jq -r '.connectionId'
  else
    api_post "${AIRBYTE_PUBLIC_API_PREFIX}/connections" "$payload" | jq -r '.connectionId'
  fi
}

wait_for_sync() {
  local job_id="$1"
  local status

  while true; do
    status="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/jobs/${job_id}" | jq -r '.status // .job.status')"
    case "$status" in
      succeeded)
        return 0
        ;;
      failed|cancelled|incomplete)
        fail "Airbyte sync job ${job_id} finished with status ${status}"
        ;;
      pending|running)
        sleep 10
        ;;
      *)
        sleep 10
        ;;
    esac
  done
}

wait_for_raw_tables_population() {
  local attempts=36

  while (( attempts > 0 )); do
    if verify_raw_tables >/dev/null 2>&1; then
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 10
  done

  fail "Airbyte sync was already running, but raw_demo tables did not repopulate within the expected window"
}

verify_raw_tables() {
  log "Verifying Airbyte raw tables in Postgres"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.wards');
select to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.patients');
select to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.bed_events');
select 'wards' as table_name, count(*) as row_count from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.wards
union all
select 'patients' as table_name, count(*) as row_count from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.patients
union all
select 'bed_events' as table_name, count(*) as row_count from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.bed_events;
SQL"

  kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -Atc \"
select
  coalesce(to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.wards')::text, '') = '${DEMO_AIRBYTE_DESTINATION_SCHEMA}.wards'
  and coalesce(to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.patients')::text, '') = '${DEMO_AIRBYTE_DESTINATION_SCHEMA}.patients'
  and coalesce(to_regclass('${DEMO_AIRBYTE_DESTINATION_SCHEMA}.bed_events')::text, '') = '${DEMO_AIRBYTE_DESTINATION_SCHEMA}.bed_events'
  and (select count(*) from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.wards) > 0
  and (select count(*) from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.patients) > 0
  and (select count(*) from ${DEMO_AIRBYTE_DESTINATION_SCHEMA}.bed_events) > 0;
\" | grep -qx t"
}

main() {
  local workspace
  local mysql_definition_id
  local postgres_definition_id
  local source_id
  local destination_id
  local catalog_json
  local connection_id
  local sync_job_id
  local sync_job_response
  local status

  require_demo_prereqs
  ensure_cluster_access
  trap cleanup_airbyte_port_forward EXIT
  start_airbyte_port_forward
  detect_public_api_prefix || fail "Unable to reach the Airbyte public API at ${AIRBYTE_PUBLIC_API_PREFIX}"

  workspace="$(workspace_id)"
  [[ -n "$workspace" && "$workspace" != "null" ]] || fail "Unable to resolve Airbyte workspaceId"

  mysql_definition_id="$(definition_id "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces/${workspace}/definitions/sources" "mysql")"
  [[ -n "$mysql_definition_id" ]] || fail "Unable to resolve Airbyte MySQL source definition"

  postgres_definition_id="$(definition_id "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces/${workspace}/definitions/destinations" "postgres")"
  [[ -n "$postgres_definition_id" ]] || fail "Unable to resolve Airbyte Postgres destination definition"

  log "Configuring Airbyte MySQL source"
  source_id="$(upsert_source "$workspace" "$mysql_definition_id")"

  log "Configuring Airbyte Postgres raw destination"
  destination_id="$(upsert_destination "$workspace" "$postgres_definition_id")"

  log "Discovering Airbyte source schema"
  catalog_json="$(build_catalog "$source_id")"
  [[ "$(printf '%s' "$catalog_json" | jq 'length')" -gt 0 ]] || fail "Airbyte source discovery returned zero streams for the demo source"

  log "Configuring Airbyte connection"
  connection_id="$(upsert_connection "$source_id" "$destination_id" "$catalog_json")"

  reset_demo_destination_schema

  log "Triggering first Airbyte sync"
  sync_job_id=""
  sync_job_response=""
  if sync_job_response="$(api_post_jobs_maybe_running "{\"connectionId\":\"${connection_id}\",\"jobType\":\"sync\"}")"; then
    sync_job_id="$(printf '%s' "$sync_job_response" | jq -r '.jobId')"
    [[ -n "$sync_job_id" && "$sync_job_id" != "null" ]] || fail "Unable to start Airbyte sync"
    wait_for_sync "$sync_job_id"
  else
    status=$?
    if [[ "$status" -eq 10 ]]; then
      wait_for_raw_tables_population
    else
      exit "$status"
    fi
  fi

  verify_raw_tables
  log_success "Airbyte MySQL demo source synced into Postgres raw tables"
}

main "$@"
