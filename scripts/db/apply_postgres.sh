#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

GOVERNANCE_SCHEMA="${GOVERNANCE_SCHEMA:-governance}"

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
create schema if not exists ${GOVERNANCE_SCHEMA};
create extension if not exists pgcrypto;

grant usage on schema ${RAW_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${STAGING_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${ANALYTICS_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${DICTIONARY_SCHEMA} to ${POSTGRES_USER};
grant usage on schema ${OUTPUT_SCHEMA} to ${POSTGRES_USER};
grant usage, create on schema decision to ${POSTGRES_USER};
grant usage, create on schema ${GOVERNANCE_SCHEMA} to ${POSTGRES_USER};
grant usage on schema public to ${POSTGRES_USER};
grant create on schema public to ${POSTGRES_USER};

create table if not exists ${GOVERNANCE_SCHEMA}.use_cases (
  slug varchar(120) primary key,
  name text not null,
  domain text,
  maturity text,
  owner text,
  steward text,
  review_cadence text,
  config_checksum text,
  config_source text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ${GOVERNANCE_SCHEMA}.governed_assets (
  asset_id varchar(240) primary key,
  use_case_slug varchar(120) references ${GOVERNANCE_SCHEMA}.use_cases(slug),
  asset_type varchar(50) not null,
  schema_name text,
  table_name text,
  display_name text,
  owner text,
  steward text,
  evidence_source text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ${GOVERNANCE_SCHEMA}.policies (
  policy_id varchar(160) not null,
  version varchar(80) not null,
  name text not null,
  status varchar(30) not null,
  owner text,
  standard_or_framework text,
  raw_definition jsonb not null default '{}',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  primary key (policy_id, version)
);

create table if not exists ${GOVERNANCE_SCHEMA}.policy_rules (
  policy_id varchar(160) not null,
  policy_version varchar(80) not null,
  rule_id varchar(160) not null,
  description text,
  classification varchar(30) not null,
  sensitivity varchar(20) not null,
  match_definition jsonb not null default '{}',
  actions jsonb not null default '[]',
  requires_review boolean not null default false,
  created_at timestamp not null default now(),
  primary key (policy_id, policy_version, rule_id),
  foreign key (policy_id, policy_version) references ${GOVERNANCE_SCHEMA}.policies(policy_id, version)
);

create table if not exists ${GOVERNANCE_SCHEMA}.issues (
  issue_id varchar(160) primary key,
  issue_type varchar(60) not null,
  status varchar(30) not null,
  severity varchar(20) not null,
  use_case_slug varchar(120) references ${GOVERNANCE_SCHEMA}.use_cases(slug),
  impacted_asset_id varchar(240),
  title text not null,
  description text,
  assigned_owner text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ${GOVERNANCE_SCHEMA}.audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  actor text not null,
  role text not null,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  use_case_slug varchar(120),
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_id text,
  approval_chain jsonb not null default '[]',
  created_at timestamp not null default now()
);

create or replace function ${GOVERNANCE_SCHEMA}.prevent_audit_log_mutation()
returns trigger
language plpgsql
as \$\$
begin
  raise exception 'governance audit_log is append-only';
end;
\$\$;

drop trigger if exists trg_prevent_audit_log_update on ${GOVERNANCE_SCHEMA}.audit_log;
create trigger trg_prevent_audit_log_update
before update on ${GOVERNANCE_SCHEMA}.audit_log
for each row execute function ${GOVERNANCE_SCHEMA}.prevent_audit_log_mutation();

drop trigger if exists trg_prevent_audit_log_delete on ${GOVERNANCE_SCHEMA}.audit_log;
create trigger trg_prevent_audit_log_delete
before delete on ${GOVERNANCE_SCHEMA}.audit_log
for each row execute function ${GOVERNANCE_SCHEMA}.prevent_audit_log_mutation();

create table if not exists ${GOVERNANCE_SCHEMA}.exceptions (
  exception_id varchar(160) primary key,
  target_type text not null,
  target_id text not null,
  owner text not null,
  reason text not null,
  expiry_date timestamp not null,
  status varchar(30) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ${GOVERNANCE_SCHEMA}.evidence_exports (
  export_id varchar(160) primary key,
  pack_id varchar(160) not null,
  status varchar(30) not null,
  requested_by text,
  requested_at timestamp not null default now(),
  completed_at timestamp,
  error_message text,
  storage_uri text
);

revoke update, delete on ${GOVERNANCE_SCHEMA}.audit_log from ${POSTGRES_USER};

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

alter table if exists decision.decision_queue add column if not exists decision_uid uuid default gen_random_uuid() not null;
alter table if exists decision.decision_queue add column if not exists decision_type varchar(50);
alter table if exists decision.decision_queue add column if not exists entity_type varchar(30);
alter table if exists decision.decision_queue add column if not exists priority varchar(20);
alter table if exists decision.decision_queue add column if not exists priority_score numeric(6,2) not null default 0;
alter table if exists decision.decision_queue add column if not exists urgency_score numeric(6,2) not null default 0;
alter table if exists decision.decision_queue add column if not exists impact_score numeric(6,2) not null default 0;
alter table if exists decision.decision_queue add column if not exists title varchar(200);
alter table if exists decision.decision_queue add column if not exists signal_summary text;
alter table if exists decision.decision_queue add column if not exists decision_summary text;
alter table if exists decision.decision_queue add column if not exists rationale text;
alter table if exists decision.decision_queue add column if not exists recommended_actions jsonb not null default '[]';
alter table if exists decision.decision_queue add column if not exists data_inputs jsonb not null default '{}';
alter table if exists decision.decision_outcomes add column if not exists measurement_status varchar(20) not null default 'measured';
alter table if exists decision.decision_outcomes add column if not exists measurement_method varchar(50);
alter table if exists decision.decision_outcomes add column if not exists measured_window_start timestamp;
alter table if exists decision.decision_outcomes add column if not exists measured_window_end timestamp;
alter table if exists decision.decision_queue add column if not exists model_version varchar(50);
alter table if exists decision.decision_queue add column if not exists model_accuracy numeric(5,2);
alter table if exists decision.decision_queue add column if not exists confidence_level varchar(20);
alter table if exists decision.decision_queue add column if not exists confidence_detail varchar(200);
alter table if exists decision.decision_queue add column if not exists freshness_seconds integer;
alter table if exists decision.decision_queue add column if not exists expected_beds_released integer;
alter table if exists decision.decision_queue add column if not exists expected_occupancy_before numeric(5,2);
alter table if exists decision.decision_queue add column if not exists expected_occupancy_after numeric(5,2);
alter table if exists decision.decision_queue add column if not exists expected_risk_reduction varchar(100);
alter table if exists decision.decision_queue add column if not exists owner_team varchar(100);
alter table if exists decision.decision_queue add column if not exists owner_user_id varchar(100);
alter table if exists decision.decision_queue add column if not exists assignee_user varchar(100);
alter table if exists decision.decision_queue add column if not exists assignee_email varchar(255);
alter table if exists decision.decision_queue add column if not exists source_opportunity_id varchar(100);
alter table if exists decision.decision_queue add column if not exists claim_id varchar(100);
alter table if exists decision.decision_queue add column if not exists payer_id varchar(100);
alter table if exists decision.decision_queue add column if not exists department_id varchar(100);
alter table if exists decision.decision_queue add column if not exists expected_recovery numeric(14,2);
alter table if exists decision.decision_queue add column if not exists due_at timestamp;
alter table if exists decision.decision_queue add column if not exists assigned_at timestamp;
alter table if exists decision.decision_queue add column if not exists updated_at timestamp not null default now();
alter table if exists decision.decision_queue add column if not exists expires_at timestamp;
alter table if exists decision.decision_queue add column if not exists completed_at timestamp;
alter table if exists decision.decision_queue add column if not exists dismissed_at timestamp;
alter table if exists decision.decision_queue add column if not exists dismissed_reason text;
alter table if exists decision.decision_queue add column if not exists escalation_count integer default 0;
alter table if exists decision.decision_queue add column if not exists last_escalated_at timestamp;
alter table if exists decision.decision_queue add column if not exists generation_run_id varchar(100);
alter table if exists decision.decision_queue add column if not exists source_anomaly_id integer;
alter table if exists decision.decision_queue add column if not exists source_forecast_id integer;
alter table if exists decision.decision_log add column if not exists performed_by_role varchar(50);
alter table if exists decision.decision_log add column if not exists reason text;
alter table if exists decision.decision_log add column if not exists notes text;
alter table if exists decision.decision_log add column if not exists metadata jsonb default '{}';
alter table if exists decision.decision_outcomes add column if not exists actual_recovery numeric(14,2);
alter table if exists decision.decision_outcomes add column if not exists recovery_variance_pct numeric(10,4);
alter table if exists decision.decision_outcomes add column if not exists time_to_resolution_hours numeric(10,2);
alter table if exists decision.decision_outcomes add column if not exists success_flag boolean;
alter table if exists decision.decision_outcomes add column if not exists cash_collected_after_decision numeric(14,2);
alter table if exists decision.decision_outcomes add column if not exists leakage_resolved_flag boolean;
alter table if exists decision.notification_log add column if not exists notification_type varchar(50);
alter table if exists decision.notification_log add column if not exists channel varchar(20);
alter table if exists decision.notification_log add column if not exists recipient_email varchar(255);
alter table if exists decision.notification_log add column if not exists recipient_team varchar(100);
alter table if exists decision.notification_log add column if not exists recipient_user varchar(100);
alter table if exists decision.notification_log add column if not exists subject varchar(255);
alter table if exists decision.notification_log add column if not exists sent_at timestamp default now();
alter table if exists decision.notification_log add column if not exists delivery_status varchar(20);
alter table if exists decision.notification_log add column if not exists error_message text;
alter table if exists decision.notification_log add column if not exists smtp_message_id varchar(255);

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
