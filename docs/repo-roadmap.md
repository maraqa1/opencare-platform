# OpenCare Repo Roadmap

## Phase 1: Synthetic Source Data and Ingest/Transform Proof

Phase 1 establishes the Hospital Bed Occupancy Intelligence demo data path end to end without bypassing Airbyte or dbt.

### Scope implemented

- Deterministic synthetic MySQL demo data generation for `wards`, `patients`, and `bed_events`
- Airbyte setup automation for:
  - MySQL source
  - Postgres destination targeting the `raw` schema
  - first sync trigger
  - raw-table verification in Postgres
- dbt staging and mart outputs for:
  - `staging.stg_wards`
  - `staging.stg_patients`
  - `staging.stg_bed_events`
  - `analytics.dim_ward`
  - `analytics.dim_date`
  - `analytics.fct_bed_occupancy`
  - `dictionary.dict_metrics`
- Compatibility models retained for existing runtime readers:
  - `analytics.fact_bed_occupancy`
  - `analytics.fact_capacity`
  - `analytics.dim_department`
  - `analytics.dim_time`

### Default demo dataset characteristics

- 12 wards
- 2,400 patients
- 18 months of history from `2024-10-01` through `2026-03-31`
- 12,363 `bed_events` rows
- deliberate pressure and anomaly scenarios:
  - `winter_respiratory_surge`
  - `elective_backlog_pressure`
  - `critical_care_staffing_squeeze`

### Operator flow

1. Generate deterministic MySQL seed files:
   - `python3 scripts/demo/generate_demo_data.py --output-dir seed/mysql`
2. Load the generated SQL into the external MySQL source database.
3. Configure and run Airbyte:
   - `bash scripts/airbyte/setup_mysql_demo.sh`
4. Run dbt and dbt tests against the ingested raw data.
5. Validate row counts in `raw`, `analytics`, and `dictionary`.

### Install-integrated execution

The same Phase 1 proof flow can now run as part of `bash install/install.sh` by setting:

- `DEMO_PROOF_FLOW_ENABLED=true`
- `DEMO_MYSQL_PASSWORD=...`

When enabled, the install pipeline adds a `demo` phase that:

1. generates the synthetic MySQL dataset
2. loads it into the configured MySQL source
3. validates the MySQL source tables
4. runs the Airbyte demo sync
5. reruns dbt
6. verifies the expected raw and analytics counts

### Next product step after Phase 1

Once the synthetic source path is proven, the next repo milestone is Phase 2: expose the occupancy outputs through the backend, portal, and Superset using the same `analytics` and `dictionary` contract.
