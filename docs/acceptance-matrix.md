# OpenCare Phase 1 Acceptance Matrix

## 1. Generate the synthetic MySQL source dataset

### Install-integrated option

Set the following env values before `bash install/install.sh` to run the full Phase 1 proof flow automatically during installation:

```bash
export DEMO_PROOF_FLOW_ENABLED=true
export DEMO_MYSQL_PASSWORD='your-mysql-password'
```

The install then executes `scripts/demo/apply_demo_proof.sh` after the Airbyte deployment phase.

### Command

```bash
python3 scripts/demo/generate_demo_data.py --output-dir seed/mysql
```

### Expected outputs

- `seed/mysql/opencare_demo_mysql.sql`
- `seed/mysql/opencare_demo_validation.sql`
- `seed/mysql/opencare_demo_summary.json`

### Expected success conditions

- `wards_row_count = 12`
- `patients_row_count = 2400`
- `bed_events_row_count = 12363`
- `min_event_date = 2024-10-01`
- `max_event_date = 2026-03-31`
- `null_ward_id_rows = 0`
- `event_type_distribution` contains:
  - `midnight_census = 6564`
  - `admission = 3282`
  - `discharge = 2188`
  - `transfer_in = 200`
  - `transfer_out = 129`

## 2. Seed the external MySQL source database

### Command

```bash
mysql -h "$DEMO_MYSQL_HOST" -P "$DEMO_MYSQL_PORT" -u "$DEMO_MYSQL_USER" -p"$DEMO_MYSQL_PASSWORD" "$DEMO_MYSQL_DATABASE" < seed/mysql/opencare_demo_mysql.sql
```

### Validation command

```bash
mysql -h "$DEMO_MYSQL_HOST" -P "$DEMO_MYSQL_PORT" -u "$DEMO_MYSQL_USER" -p"$DEMO_MYSQL_PASSWORD" "$DEMO_MYSQL_DATABASE" < seed/mysql/opencare_demo_validation.sql
```

### Expected success conditions

- the validation SQL returns the row counts listed in section 1
- the date range is `2024-10-01` to `2026-03-31`
- `null_ward_id_rows = 0`
- every expected event type is present with a non-zero count

## 3. Configure Airbyte and trigger the first sync

### Command

```bash
bash scripts/airbyte/setup_mysql_demo.sh
```

### Expected success conditions

- Airbyte creates or updates:
  - source `OpenCare Demo MySQL`
  - destination `OpenCare Raw Postgres`
  - connection `OpenCare Bed Occupancy Demo`
- the first Airbyte sync completes successfully
- Postgres raw tables exist:
  - `raw_demo.wards`
  - `raw_demo.patients`
  - `raw_demo.bed_events`

### Raw-table SQL checks

```sql
select 'wards' as table_name, count(*) as row_count from raw_demo.wards
union all
select 'patients' as table_name, count(*) as row_count from raw_demo.patients
union all
select 'bed_events' as table_name, count(*) as row_count from raw_demo.bed_events;
```

### Expected raw-table results

- `raw_demo.wards = 12`
- `raw_demo.patients = 2400`
- `raw_demo.bed_events = 12363`

## 4. Run dbt

### Commands

```bash
cd dbt/opencare
cp profiles.template.yml profiles.yml
dbt debug --profiles-dir . --project-dir .
DBT_SOURCE_SCHEMA=raw_demo dbt debug --profiles-dir . --project-dir .
DBT_SOURCE_SCHEMA=raw_demo dbt run --profiles-dir . --project-dir . --select stg_wards stg_patients stg_bed_events dim_ward dim_date fct_bed_occupancy fact_capacity dict_metrics fact_bed_occupancy dim_department dim_time
DBT_SOURCE_SCHEMA=raw_demo dbt test --profiles-dir . --project-dir .
```

### Expected success conditions

- `dbt debug` succeeds against Postgres
- `dbt run` builds the required schemas:
  - `staging`
  - `analytics`
  - `dictionary`
- `dbt test` passes source and model tests

## 5. Validate analytics and dictionary outputs

### SQL checks

```sql
select count(*) as dim_ward_count from analytics.dim_ward;
select count(*) as dim_date_count from analytics.dim_date;
select count(*) as fct_bed_occupancy_count from analytics.fct_bed_occupancy;
select count(*) as dict_metrics_count from dictionary.dict_metrics;
select min(date_day) as min_date_day, max(date_day) as max_date_day from analytics.dim_date;
select count(*) as pressure_days from analytics.fct_bed_occupancy where pressure_flag is true;
```

### Expected results

- `analytics.dim_ward = 12`
- `analytics.dim_date = 547`
- `analytics.fct_bed_occupancy = 6564`
- `dictionary.dict_metrics = 4`
- `analytics.dim_date` spans `2024-10-01` to `2026-03-31`
- `pressure_days > 0`

## 6. dbt test coverage expected in this phase

- source `not_null` and `unique` coverage for `wards`, `patients`, and `bed_events`
- accepted values on `stg_bed_events.event_type`
- relationships from `stg_bed_events.ward_id` to `stg_wards.ward_id`
- relationships from non-null `stg_bed_events.patient_id` to `stg_patients.patient_id`
- uniqueness/not-null on `analytics.dim_ward`, `analytics.dim_date`, `analytics.fct_bed_occupancy`, and `dictionary.dict_metrics`
