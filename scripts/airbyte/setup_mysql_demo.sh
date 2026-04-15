#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

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

api_post() {
  local path="$1"
  local payload="$2"
  curl -fsS \
    -H "Content-Type: application/json" \
    -X POST \
    "${AIRBYTE_API_URL}${path}" \
    -d "$payload"
}

workspace_id() {
  api_post "/api/v1/workspaces/list" "{}" | jq -r '.workspaces[0].workspaceId'
}

definition_id() {
  local endpoint="$1"
  local field="$2"
  local name="$3"

  api_post "$endpoint" "{}" | jq -r --arg name "$name" ".${field}[] | select(.name == \$name) | .${field%?}Id" | head -n 1
}

upsert_source() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  existing_id="$(api_post "/api/v1/sources/list" "{\"workspaceId\":\"${workspace_id}\"}" | jq -r --arg name "$DEMO_MYSQL_SOURCE_NAME" '.sources[]? | select(.name == $name) | .sourceId' | head -n 1)"

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

  if [[ -n "$existing_id" ]]; then
    api_post "/api/v1/sources/update" "$(jq -n --arg sourceId "$existing_id" --argjson payload "$payload" '$payload + {sourceId: $sourceId}')" | jq -r '.sourceId'
  else
    api_post "/api/v1/sources/create" "$payload" | jq -r '.sourceId'
  fi
}

upsert_destination() {
  local workspace_id="$1"
  local definition_id="$2"
  local existing_id
  local payload

  existing_id="$(api_post "/api/v1/destinations/list" "{\"workspaceId\":\"${workspace_id}\"}" | jq -r --arg name "$DEMO_AIRBYTE_DESTINATION_NAME" '.destinations[]? | select(.name == $name) | .destinationId' | head -n 1)"

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

  if [[ -n "$existing_id" ]]; then
    api_post "/api/v1/destinations/update" "$(jq -n --arg destinationId "$existing_id" --argjson payload "$payload" '$payload + {destinationId: $destinationId}')" | jq -r '.destinationId'
  else
    api_post "/api/v1/destinations/create" "$payload" | jq -r '.destinationId'
  fi
}

build_catalog() {
  local source_id="$1"

  api_post "/api/v1/sources/discover_schema" "{\"sourceId\":\"${source_id}\"}" \
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

  existing_id="$(api_post "/api/v1/connections/list" "{\"workspaceId\":\"$(workspace_id)\"}" | jq -r --arg name "$DEMO_AIRBYTE_CONNECTION_NAME" '.connections[]? | select(.name == $name) | .connectionId' | head -n 1)"

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

  if [[ -n "$existing_id" ]]; then
    api_post "/api/v1/connections/update" "$(jq -n --arg connectionId "$existing_id" --argjson payload "$payload" '$payload + {connectionId: $connectionId}')" | jq -r '.connectionId'
  else
    api_post "/api/v1/connections/create" "$payload" | jq -r '.connectionId'
  fi
}

wait_for_sync() {
  local job_id="$1"
  local status

  while true; do
    status="$(api_post "/api/v1/jobs/get" "{\"id\":${job_id}}" | jq -r '.job.status')"
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

  workspace="$(workspace_id)"
  [[ -n "$workspace" && "$workspace" != "null" ]] || fail "Unable to resolve Airbyte workspaceId"

  mysql_definition_id="$(definition_id "/api/v1/source_definitions/list_latest" "sourceDefinitions" "MySQL")"
  [[ -n "$mysql_definition_id" ]] || fail "Unable to resolve Airbyte MySQL source definition"

  postgres_definition_id="$(definition_id "/api/v1/destination_definitions/list_latest" "destinationDefinitions" "Postgres")"
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
  sync_job_id="$(api_post "/api/v1/connections/sync" "{\"connectionId\":\"${connection_id}\"}" | jq -r '.job.id')"
  [[ -n "$sync_job_id" && "$sync_job_id" != "null" ]] || fail "Unable to start Airbyte sync"

  wait_for_sync "$sync_job_id"
  verify_raw_tables
  log_success "Airbyte MySQL demo source synced into Postgres raw tables"
}

main "$@"
