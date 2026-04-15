#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

AIRBYTE_PORT_FORWARD_PID=""
AIRBYTE_API_BASE_URL=""
AIRBYTE_API_USERNAME="${AIRBYTE_API_USERNAME:-airbyte}"
AIRBYTE_API_PASSWORD="${AIRBYTE_API_PASSWORD:-password}"
AIRBYTE_API_MODE=""
AIRBYTE_API_BEARER_TOKEN=""
AIRBYTE_AUTH_SECRET_NAME="${AIRBYTE_AUTH_SECRET_NAME:-airbyte-auth-secrets}"
AIRBYTE_PUBLIC_API_PREFIX="${AIRBYTE_PUBLIC_API_PREFIX:-/api/public/v1}"
AIRBYTE_LEGACY_API_PREFIX="${AIRBYTE_LEGACY_API_PREFIX:-/api/v1}"

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

detect_airbyte_api_mode() {
  local status

  if request_airbyte_public_token; then
    AIRBYTE_API_MODE="public"
    return 0
  fi

  if detect_legacy_api_prefix; then
    AIRBYTE_API_MODE="legacy"
    return 0
  fi

  fail "Unable to determine the Airbyte API mode exposed by the deployed chart"
}

resolve_airbyte_auth_secret_value() {
  local key="$1"
  kubectl -n "$NAMESPACE" get secret "$AIRBYTE_AUTH_SECRET_NAME" -o "jsonpath={.data.$key}" 2>/dev/null | base64 --decode 2>/dev/null || true
}

request_airbyte_public_token() {
  local client_id
  local client_secret
  local prefix
  local token_response

  client_id="$(resolve_airbyte_auth_secret_value client-id)"
  [[ -n "$client_id" ]] || client_id="$(resolve_airbyte_auth_secret_value instance-admin-client-id)"
  client_secret="$(resolve_airbyte_auth_secret_value client-secret)"
  [[ -n "$client_secret" ]] || client_secret="$(resolve_airbyte_auth_secret_value instance-admin-client-secret)"

  [[ -n "$client_id" && -n "$client_secret" ]] || return 1

  for prefix in "/api/public/v1" "/v1"; do
    token_response="$(curl -fsS -H "Content-Type: application/json" -X POST "${AIRBYTE_API_BASE_URL}${prefix}/applications/token" -d "{\"client_id\":\"${client_id}\",\"client_secret\":\"${client_secret}\",\"grant-type\":\"client_credentials\"}" 2>/dev/null || true)"
    [[ -n "$token_response" ]] || continue

    AIRBYTE_API_BEARER_TOKEN="$(printf '%s' "$token_response" | jq -r '.access_token // .token // empty' 2>/dev/null || true)"
    if [[ -n "$AIRBYTE_API_BEARER_TOKEN" ]]; then
      AIRBYTE_PUBLIC_API_PREFIX="$prefix"
      if probe_public_api_prefix "$prefix"; then
        return 0
      fi
      AIRBYTE_API_BEARER_TOKEN=""
    fi
  done

  return 1
}

probe_public_api_prefix() {
  local prefix="$1"
  local response

  response="$(curl -fsS -H "Authorization: Bearer ${AIRBYTE_API_BEARER_TOKEN}" "${AIRBYTE_API_BASE_URL}${prefix}/workspaces" 2>/dev/null || true)"
  [[ -n "$response" ]] || return 1

  printf '%s' "$response" | jq -e '.data // .workspaces // .workspaceId' >/dev/null 2>&1
}

detect_legacy_api_prefix() {
  local prefix
  local response

  for prefix in "/api/v1" "/v1"; do
    response="$(curl -fsS -u "${AIRBYTE_API_USERNAME}:${AIRBYTE_API_PASSWORD}" -H "Content-Type: application/json" -X POST "${AIRBYTE_API_BASE_URL}${prefix}/workspaces/list" -d "{}" 2>/dev/null || true)"
    [[ -n "$response" ]] || continue
    if printf '%s' "$response" | jq -e '.workspaces[0].workspaceId' >/dev/null 2>&1; then
      AIRBYTE_LEGACY_API_PREFIX="$prefix"
      return 0
    fi
  done

  return 1
}

api_request() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"

  if [[ -n "$payload" ]]; then
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      curl -fsS \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${AIRBYTE_API_BEARER_TOKEN}" \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}" \
        -d "$payload"
    else
      curl -fsS \
        -H "Content-Type: application/json" \
        -u "${AIRBYTE_API_USERNAME}:${AIRBYTE_API_PASSWORD}" \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}" \
        -d "$payload"
    fi
  else
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      curl -fsS \
        -H "Authorization: Bearer ${AIRBYTE_API_BEARER_TOKEN}" \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}"
    else
      curl -fsS \
        -u "${AIRBYTE_API_USERNAME}:${AIRBYTE_API_PASSWORD}" \
        -X "$method" \
        "${AIRBYTE_API_BASE_URL}${path}"
    fi
  fi
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

workspace_id() {
  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    api_get "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces" | jq -r '.data[0].workspaceId // .workspaces[0].workspaceId // .workspaceId'
  else
    api_post "${AIRBYTE_LEGACY_API_PREFIX}/workspaces/list" "{}" | jq -r '.workspaces[0].workspaceId'
  fi
}

definition_id() {
  local endpoint="$1"
  local field="$2"
  local name="$3"

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    api_get "$endpoint" | jq -r --arg name "$name" '.data[]? | select(.name == $name) | .definitionId // .sourceDefinitionId // .destinationDefinitionId' | head -n 1
  else
    api_post "$endpoint" "{}" | jq -r --arg name "$name" ".${field}[] | select(.name == \$name) | .${field%?}Id" | head -n 1
  fi
}

upsert_source() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/sources?workspaceIds=${workspace_id}" | jq -r --arg name "$DEMO_MYSQL_SOURCE_NAME" '.data[]? | select(.name == $name) | .sourceId' | head -n 1)"
  else
    existing_id="$(api_post "${AIRBYTE_LEGACY_API_PREFIX}/sources/list" "{\"workspaceId\":\"${workspace_id}\"}" | jq -r --arg name "$DEMO_MYSQL_SOURCE_NAME" '.sources[]? | select(.name == $name) | .sourceId' | head -n 1)"
  fi

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
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
          ssl_mode: { mode: "preferred" },
          replication_method: { method: "Standard" }
        }
      }'
    )"
  else
    payload="$(jq -n \
      --arg workspaceId "$workspace_id" \
      --arg sourceDefinitionId "$definition_id" \
      --arg name "$DEMO_MYSQL_SOURCE_NAME" \
      --arg host "$DEMO_MYSQL_HOST" \
      --argjson port "$DEMO_MYSQL_PORT" \
      --arg database "$DEMO_MYSQL_DATABASE" \
      --arg username "$DEMO_MYSQL_USER" \
      --arg password "$DEMO_MYSQL_PASSWORD" \
      '{
        workspaceId: $workspaceId,
        sourceDefinitionId: $sourceDefinitionId,
        name: $name,
        connectionConfiguration: {
          host: $host,
          port: $port,
          database: $database,
          username: $username,
          password: $password,
          ssl_mode: { mode: "preferred" },
          replication_method: { method: "Standard" }
        }
      }'
    )"
  fi

  if [[ -n "$existing_id" ]]; then
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/sources/${existing_id}" "$payload" | jq -r '.sourceId // .sourceId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/sources/update" "$(jq -n --arg sourceId "$existing_id" --argjson payload "$payload" '$payload + {sourceId: $sourceId}')" | jq -r '.sourceId'
    fi
  else
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_post "${AIRBYTE_PUBLIC_API_PREFIX}/sources" "$payload" | jq -r '.sourceId // .sourceId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/sources/create" "$payload" | jq -r '.sourceId'
    fi
  fi
}

upsert_destination() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/destinations?workspaceIds=${workspace_id}" | jq -r --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" '.data[]? | select(.name == $name) | .destinationId' | head -n 1)"
  else
    existing_id="$(api_post "${AIRBYTE_LEGACY_API_PREFIX}/destinations/list" "{\"workspaceId\":\"${workspace_id}\"}" | jq -r --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" '.destinations[]? | select(.name == $name) | .destinationId' | head -n 1)"
  fi

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    payload="$(jq -n \
      --arg workspaceId "$workspace_id" \
      --arg definitionId "$definition_id" \
      --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" \
      --arg host "$POSTGRES_HOST" \
      --argjson port "$POSTGRES_PORT" \
      --arg database "$POSTGRES_DB" \
      --arg schema "$RAW_SCHEMA" \
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
          ssl_mode: { mode: "disable" },
          tunnel_method: { tunnel_method: "NO_TUNNEL" }
        }
      }'
    )"
  else
    payload="$(jq -n \
      --arg workspaceId "$workspace_id" \
      --arg destinationDefinitionId "$definition_id" \
      --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" \
      --arg host "$POSTGRES_HOST" \
      --argjson port "$POSTGRES_PORT" \
      --arg database "$POSTGRES_DB" \
      --arg schema "$RAW_SCHEMA" \
      --arg username "$POSTGRES_USER" \
      --arg password "$POSTGRES_PASSWORD" \
      '{
        workspaceId: $workspaceId,
        destinationDefinitionId: $destinationDefinitionId,
        name: $name,
        connectionConfiguration: {
          host: $host,
          port: $port,
          database: $database,
          schema: $schema,
          username: $username,
          password: $password,
          ssl_mode: { mode: "disable" },
          tunnel_method: { tunnel_method: "NO_TUNNEL" }
        }
      }'
    )"
  fi

  if [[ -n "$existing_id" ]]; then
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/destinations/${existing_id}" "$payload" | jq -r '.destinationId // .destinationId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/destinations/update" "$(jq -n --arg destinationId "$existing_id" --argjson payload "$payload" '$payload + {destinationId: $destinationId}')" | jq -r '.destinationId'
    fi
  else
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_post "${AIRBYTE_PUBLIC_API_PREFIX}/destinations" "$payload" | jq -r '.destinationId // .destinationId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/destinations/create" "$payload" | jq -r '.destinationId'
    fi
  fi
}

build_catalog() {
  local source_id="$1"

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    echo '{}'
    return 0
  fi

  api_post "${AIRBYTE_LEGACY_API_PREFIX}/sources/discover_schema" "{\"sourceId\":\"${source_id}\"}" \
    | jq '
      (.catalog.streams
      | map(select(.stream.name == "wards" or .stream.name == "patients" or .stream.name == "bed_events"))) as $streams
      | if ($streams | length) != 3 then
          error("Expected Airbyte discover_schema to return wards, patients, and bed_events")
        else {
          streams: ($streams | map({
            stream: .stream,
            syncMode: "full_refresh",
            destinationSyncMode: "overwrite",
            cursorField: [],
            primaryKey: (
              if .stream.name == "wards" then [["ward_id"]]
              elif .stream.name == "patients" then [["patient_id"]]
                else [["event_id"]]
              end
            )
          }))
        } end'
}

upsert_connection() {
  local source_id="$1"
  local destination_id="$2"
  local catalog="$3"
  local existing_id
  local payload

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    existing_id="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/connections?workspaceIds=$(workspace_id)" | jq -r --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" '.data[]? | select(.name == $name) | .connectionId' | head -n 1)"
  else
    existing_id="$(api_post "${AIRBYTE_LEGACY_API_PREFIX}/connections/list" "{\"workspaceId\":\"$(workspace_id)\"}" | jq -r --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" '.connections[]? | select(.name == $name) | .connectionId' | head -n 1)"
  fi

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    payload="$(jq -n \
      --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" \
      --arg sourceId "$source_id" \
      --arg destinationId "$destination_id" \
      '{
        name: $name,
        sourceId: $sourceId,
        destinationId: $destinationId,
        namespaceDefinition: "custom_format",
        namespaceFormat: "raw",
        prefix: "",
        status: "active",
        configurations: {}
      }'
    )"
  else
    payload="$(jq -n \
      --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" \
      --arg sourceId "$source_id" \
      --arg destinationId "$destination_id" \
      --argjson syncCatalog "$catalog" \
      '{
        name: $name,
        sourceId: $sourceId,
        destinationId: $destinationId,
        namespaceDefinition: "customformat",
        namespaceFormat: "raw",
        prefix: "",
        scheduleType: "manual",
        status: "active",
        syncCatalog: $syncCatalog
      }'
    )"
  fi

  if [[ -n "$existing_id" ]]; then
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_patch "${AIRBYTE_PUBLIC_API_PREFIX}/connections/${existing_id}" "$payload" | jq -r '.connectionId // .connectionId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/connections/update" "$(jq -n --arg connectionId "$existing_id" --argjson payload "$payload" '$payload + {connectionId: $connectionId}')" | jq -r '.connectionId'
    fi
  else
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      api_post "${AIRBYTE_PUBLIC_API_PREFIX}/connections" "$payload" | jq -r '.connectionId // .connectionId'
    else
      api_post "${AIRBYTE_LEGACY_API_PREFIX}/connections/create" "$payload" | jq -r '.connectionId'
    fi
  fi
}

wait_for_sync() {
  local job_id="$1"
  local status

  while true; do
    if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
      status="$(api_get "${AIRBYTE_PUBLIC_API_PREFIX}/jobs/${job_id}" | jq -r '.status // .job.status')"
    else
      status="$(api_post "${AIRBYTE_LEGACY_API_PREFIX}/jobs/get" "{\"id\":${job_id}}" | jq -r '.job.status')"
    fi
    case "$status" in
      succeeded)
        return 0
        ;;
      failed|cancelled|incomplete)
        fail "Airbyte sync job ${job_id} finished with status ${status}"
        ;;
      pending|running)
        sleep 5
        ;;
      *)
        sleep 5
        ;;
    esac
  done
}

verify_raw_tables() {
  log "Verifying Airbyte raw tables in Postgres"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('${RAW_SCHEMA}.wards');
select to_regclass('${RAW_SCHEMA}.patients');
select to_regclass('${RAW_SCHEMA}.bed_events');
select 'wards' as table_name, count(*) as row_count from ${RAW_SCHEMA}.wards
union all
select 'patients' as table_name, count(*) as row_count from ${RAW_SCHEMA}.patients
union all
select 'bed_events' as table_name, count(*) as row_count from ${RAW_SCHEMA}.bed_events;
SQL"

  kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -Atc \"
select
  coalesce(to_regclass('${RAW_SCHEMA}.wards')::text, '') = '${RAW_SCHEMA}.wards'
  and coalesce(to_regclass('${RAW_SCHEMA}.patients')::text, '') = '${RAW_SCHEMA}.patients'
  and coalesce(to_regclass('${RAW_SCHEMA}.bed_events')::text, '') = '${RAW_SCHEMA}.bed_events'
  and (select count(*) from ${RAW_SCHEMA}.wards) > 0
  and (select count(*) from ${RAW_SCHEMA}.patients) > 0
  and (select count(*) from ${RAW_SCHEMA}.bed_events) > 0;
\" | grep -qx t"
}

main() {
  local workspace
  local mysql_definition_id
  local postgres_definition_id
  local source_id
  local destination_id
  local catalog
  local connection_id
  local sync_job_id

  require_demo_prereqs
  ensure_cluster_access
  trap cleanup_airbyte_port_forward EXIT
  start_airbyte_port_forward
  detect_airbyte_api_mode

  workspace="$(workspace_id)"
  [[ -n "$workspace" && "$workspace" != "null" ]] || fail "Unable to resolve Airbyte workspaceId"

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    mysql_definition_id="$(definition_id "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces/${workspace}/definitions/sources" "sourceDefinitions" "MySQL")"
  else
    mysql_definition_id="$(definition_id "${AIRBYTE_LEGACY_API_PREFIX}/source_definitions/list_latest" "sourceDefinitions" "MySQL")"
  fi
  [[ -n "$mysql_definition_id" ]] || fail "Unable to resolve Airbyte MySQL source definition"

  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    postgres_definition_id="$(definition_id "${AIRBYTE_PUBLIC_API_PREFIX}/workspaces/${workspace}/definitions/destinations" "destinationDefinitions" "Postgres")"
  else
    postgres_definition_id="$(definition_id "${AIRBYTE_LEGACY_API_PREFIX}/destination_definitions/list_latest" "destinationDefinitions" "Postgres")"
  fi
  [[ -n "$postgres_definition_id" ]] || fail "Unable to resolve Airbyte Postgres destination definition"

  log "Configuring Airbyte MySQL source"
  source_id="$(upsert_source "$workspace" "$mysql_definition_id")"

  log "Configuring Airbyte Postgres raw destination"
  destination_id="$(upsert_destination "$workspace" "$postgres_definition_id")"

  log "Discovering MySQL schema and shaping the demo sync catalog"
  catalog="$(build_catalog "$source_id")"

  log "Configuring Airbyte connection"
  connection_id="$(upsert_connection "$source_id" "$destination_id" "$catalog")"

  log "Triggering first Airbyte sync"
  if [[ "$AIRBYTE_API_MODE" == "public" ]]; then
    sync_job_id="$(api_post "${AIRBYTE_PUBLIC_API_PREFIX}/jobs" "{\"connectionId\":\"${connection_id}\",\"jobType\":\"sync\"}" | jq -r '.jobId // .job.id')"
  else
    sync_job_id="$(api_post "${AIRBYTE_LEGACY_API_PREFIX}/connections/sync" "{\"connectionId\":\"${connection_id}\"}" | jq -r '.job.id')"
  fi
  [[ -n "$sync_job_id" && "$sync_job_id" != "null" ]] || fail "Unable to start Airbyte sync"

  wait_for_sync "$sync_job_id"
  verify_raw_tables
  log_success "Airbyte MySQL demo source synced into Postgres raw tables"
}

main "$@"
