#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

apply_file "$ROOT_DIR/manifests/postgres/statefulset.yaml"
wait_for_statefulset postgres

kubectl -n "$NAMESPACE" exec -i postgres-0 -- sh -c "psql -v ON_ERROR_STOP=1 -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' <<'SQL'
alter role ${POSTGRES_USER} with login password '${POSTGRES_PASSWORD}';

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

create table if not exists ${RAW_SCHEMA}.wards (
  ward_id text primary key,
  ward_code text not null,
  ward_name text not null,
  service_line text,
  licensed_beds integer,
  staffed_beds_baseline integer
);

create table if not exists ${RAW_SCHEMA}.patients (
  patient_id text primary key,
  medical_record_number text not null,
  date_of_birth date,
  sex_at_birth text,
  home_postcode text
);

create table if not exists ${RAW_SCHEMA}.bed_events (
  event_id text primary key,
  event_timestamp timestamp not null,
  ward_id text not null,
  patient_id text,
  event_type text not null,
  occupied_beds integer not null,
  licensed_beds integer,
  staffed_beds integer,
  scenario_tag text
);

do \$\$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = '${RAW_SCHEMA}'
      and table_name = 'bed_events'
      and column_name = 'department_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = '${RAW_SCHEMA}'
      and table_name = 'bed_events'
      and column_name = 'ward_id'
  ) then
    execute 'alter table ${RAW_SCHEMA}.bed_events rename column department_id to ward_id';
  end if;
end
\$\$;

alter table ${RAW_SCHEMA}.bed_events
  add column if not exists ward_id text,
  add column if not exists patient_id text,
  add column if not exists event_type text,
  add column if not exists scenario_tag text;

update ${RAW_SCHEMA}.bed_events
set event_type = 'midnight_census'
where event_type is null;

insert into ${RAW_SCHEMA}.wards (ward_id, ward_code, ward_name, service_line, licensed_beds, staffed_beds_baseline)
values ('WARD-DEMO-01', 'WARD01', 'Demo Emergency Ward', 'Emergency Care', 24, 20)
on conflict (ward_id) do update
set ward_code = excluded.ward_code,
    ward_name = excluded.ward_name,
    service_line = excluded.service_line,
    licensed_beds = excluded.licensed_beds,
    staffed_beds_baseline = excluded.staffed_beds_baseline;

insert into ${RAW_SCHEMA}.patients (patient_id, medical_record_number, date_of_birth, sex_at_birth, home_postcode)
values ('PAT-DEMO-001', 'MRN-DEMO-001', date '1988-01-12', 'F', 'OC1 2DE')
on conflict (patient_id) do update
set medical_record_number = excluded.medical_record_number,
    date_of_birth = excluded.date_of_birth,
    sex_at_birth = excluded.sex_at_birth,
    home_postcode = excluded.home_postcode;

insert into ${RAW_SCHEMA}.bed_events (
  event_id,
  event_timestamp,
  ward_id,
  patient_id,
  event_type,
  occupied_beds,
  licensed_beds,
  staffed_beds,
  scenario_tag
)
values ('DEMO-EVENT-001', current_timestamp, 'WARD-DEMO-01', 'PAT-DEMO-001', 'midnight_census', 12, 24, 20, 'bootstrap')
on conflict (event_id) do update
set event_timestamp = excluded.event_timestamp,
    ward_id = excluded.ward_id,
    patient_id = excluded.patient_id,
    event_type = excluded.event_type,
    occupied_beds = excluded.occupied_beds,
    licensed_beds = excluded.licensed_beds,
    staffed_beds = excluded.staffed_beds,
    scenario_tag = excluded.scenario_tag;
SQL"
log_success "Postgres schemas and raw source tables ensured"
