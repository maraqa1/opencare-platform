#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/postgres/statefulset.yaml"
wait_for_statefulset postgres

kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -v ON_ERROR_STOP=1 -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' <<'SQL'
create schema if not exists ${RAW_SCHEMA};
create schema if not exists ${STAGING_SCHEMA};
create schema if not exists ${ANALYTICS_SCHEMA};
create schema if not exists ${DICTIONARY_SCHEMA};
create schema if not exists ${OUTPUT_SCHEMA};

grant usage on schema ${RAW_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${STAGING_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${ANALYTICS_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${DICTIONARY_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${OUTPUT_SCHEMA} to ${POSTGRES_USER};
grant usage on schema public to ${POSTGRES_USER};
grant create on schema public to ${POSTGRES_USER};

create table if not exists ${RAW_SCHEMA}.departments (
  department_id text primary key,
  department_code text not null,
  department_name text not null,
  service_line text
);

create table if not exists ${RAW_SCHEMA}.bed_events (
  event_id text primary key,
  event_timestamp timestamp not null,
  department_id text not null,
  occupied_beds integer not null,
  licensed_beds integer,
  staffed_beds integer
);

insert into ${RAW_SCHEMA}.departments (department_id, department_code, department_name, service_line)
values ('DEMO-ED', 'ED', 'Emergency Department', 'Emergency Care')
on conflict (department_id) do update
set department_code = excluded.department_code,
    department_name = excluded.department_name,
    service_line = excluded.service_line;

insert into ${RAW_SCHEMA}.bed_events (event_id, event_timestamp, department_id, occupied_beds, licensed_beds, staffed_beds)
values ('DEMO-EVENT-001', current_timestamp, 'DEMO-ED', 12, 20, 18)
on conflict (event_id) do update
set event_timestamp = excluded.event_timestamp,
    department_id = excluded.department_id,
    occupied_beds = excluded.occupied_beds,
    licensed_beds = excluded.licensed_beds,
    staffed_beds = excluded.staffed_beds;
SQL"
log_success "Postgres schemas and raw source tables ensured"
