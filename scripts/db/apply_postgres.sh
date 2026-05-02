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
create schema if not exists decision;
create extension if not exists pgcrypto;

grant usage on schema ${RAW_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${STAGING_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${ANALYTICS_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${DICTIONARY_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${OUTPUT_SCHEMA} to ${POSTGRES_USER};
grant usage, create on schema decision to ${POSTGRES_USER};
grant usage on schema public to ${POSTGRES_USER};
grant create on schema public to ${POSTGRES_USER};

create table if not exists decision.decision_queue (
  id serial primary key,
  decision_uid uuid default gen_random_uuid() not null,
  use_case varchar(50) not null,
  decision_type varchar(50) not null,
  entity_type varchar(30) not null,
  entity_id varchar(50) not null,
  entity_name varchar(100) not null,
  priority varchar(20) not null,
  priority_score numeric(6,2) not null,
  urgency_score numeric(6,2) not null,
  impact_score numeric(6,2) not null,
  title varchar(200) not null,
  signal_summary text not null,
  decision_summary text not null,
  rationale text not null,
  recommended_actions jsonb not null default '[]',
  data_inputs jsonb not null default '{}',
  model_version varchar(50),
  model_accuracy numeric(5,2),
  confidence_level varchar(20),
  confidence_detail varchar(200),
  freshness_seconds integer,
  expected_beds_released integer,
  expected_occupancy_before numeric(5,2),
  expected_occupancy_after numeric(5,2),
  expected_risk_reduction varchar(100),
  status varchar(20) not null default 'recommended',
  owner_team varchar(100),
  owner_user_id varchar(100),
  assignee_user varchar(100),
  assignee_email varchar(255),
  source_opportunity_id varchar(100),
  claim_id varchar(100),
  payer_id varchar(100),
  department_id varchar(100),
  expected_recovery numeric(14,2),
  due_at timestamp,
  assigned_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  expires_at timestamp,
  completed_at timestamp,
  dismissed_at timestamp,
  dismissed_reason text,
  escalation_count integer default 0,
  last_escalated_at timestamp,
  generation_run_id varchar(100),
  source_anomaly_id integer,
  source_forecast_id integer
);

create table if not exists decision.decision_log (
  id serial primary key,
  decision_id integer not null references decision.decision_queue(id),
  previous_state varchar(20),
  new_state varchar(20) not null,
  action varchar(50) not null,
  performed_by varchar(100),
  performed_by_role varchar(50),
  reason text,
  notes text,
  metadata jsonb default '{}',
  created_at timestamp not null default now()
);

create table if not exists decision.decision_outcomes (
  id serial primary key,
  decision_id integer not null references decision.decision_queue(id),
  predicted_beds_released integer,
  predicted_occupancy_after numeric(5,2),
  predicted_risk_after varchar(20),
  actual_beds_released integer,
  actual_occupancy_after numeric(5,2),
  actual_risk_after varchar(20),
  prediction_accurate boolean,
  accuracy_notes text,
  actual_recovery numeric(14,2),
  recovery_variance_pct numeric(10,4),
  time_to_resolution_hours numeric(10,2),
  success_flag boolean,
  cash_collected_after_decision numeric(14,2),
  leakage_resolved_flag boolean,
  measured_at timestamp not null default now(),
  measurement_window_hours integer default 24,
  measurement_status varchar(20) not null default 'measured',
  measurement_method varchar(50),
  measured_window_start timestamp,
  measured_window_end timestamp
);

alter table if exists decision.decision_outcomes add column if not exists measurement_status varchar(20) not null default 'measured';
alter table if exists decision.decision_outcomes add column if not exists measurement_method varchar(50);
alter table if exists decision.decision_outcomes add column if not exists measured_window_start timestamp;
alter table if exists decision.decision_outcomes add column if not exists measured_window_end timestamp;
alter table if exists decision.decision_queue add column if not exists owner_user_id varchar(100);
alter table if exists decision.decision_queue add column if not exists source_opportunity_id varchar(100);
alter table if exists decision.decision_queue add column if not exists claim_id varchar(100);
alter table if exists decision.decision_queue add column if not exists payer_id varchar(100);
alter table if exists decision.decision_queue add column if not exists department_id varchar(100);
alter table if exists decision.decision_queue add column if not exists expected_recovery numeric(14,2);
alter table if exists decision.decision_queue add column if not exists due_at timestamp;
alter table if exists decision.decision_outcomes add column if not exists actual_recovery numeric(14,2);
alter table if exists decision.decision_outcomes add column if not exists recovery_variance_pct numeric(10,4);
alter table if exists decision.decision_outcomes add column if not exists time_to_resolution_hours numeric(10,2);
alter table if exists decision.decision_outcomes add column if not exists success_flag boolean;
alter table if exists decision.decision_outcomes add column if not exists cash_collected_after_decision numeric(14,2);
alter table if exists decision.decision_outcomes add column if not exists leakage_resolved_flag boolean;

create table if not exists decision.notification_log (
  id serial primary key,
  decision_id integer not null references decision.decision_queue(id),
  notification_type varchar(50) not null,
  channel varchar(20) not null,
  recipient_email varchar(255),
  recipient_team varchar(100),
  recipient_user varchar(100),
  subject varchar(255),
  sent_at timestamp default now(),
  delivery_status varchar(20) not null,
  error_message text,
  smtp_message_id varchar(255)
);

create index if not exists idx_decision_queue_status on decision.decision_queue(status);
create index if not exists idx_decision_queue_use_case on decision.decision_queue(use_case, status);
create index if not exists idx_decision_queue_entity on decision.decision_queue(entity_id, status);
create index if not exists idx_decision_queue_priority on decision.decision_queue(priority_score desc);
create index if not exists idx_decision_log_decision on decision.decision_log(decision_id);
create index if not exists idx_decision_log_action on decision.decision_log(action);
create index if not exists idx_decision_outcomes_decision on decision.decision_outcomes(decision_id);
create index if not exists idx_notification_log_decision on decision.notification_log(decision_id);

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
