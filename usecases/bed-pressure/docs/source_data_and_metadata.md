# Source Data and Metadata

## Required Source Tables

The use case expects three operational source tables in the configured dbt raw source. The current dbt source name is `raw`, and its schema is controlled by `DBT_SOURCE_SCHEMA` or `RAW_SCHEMA`, defaulting to `raw`.

| Source table | Purpose | Required for |
| --- | --- | --- |
| `raw.wards` | Ward reference and capacity baseline | Dimensions, portal labels, BI grouping |
| `raw.patients` | Patient reference | Source completeness and future patient-level operations |
| `raw.bed_events` | Bed occupancy and movement events | Occupancy fact, flow, forecast, anomaly, decisions |

## `raw.wards`

Required columns:

- `ward_id`: source-system ward identifier. Must be stable and not null.
- `ward_code`: short operational code displayed in reports.
- `ward_name`: human-readable ward name.
- `service_line`: specialty or ward group.
- `licensed_beds`: physical licensed capacity.
- `staffed_beds_baseline`: staffed bed baseline used for reference.
- `updated_at`: source freshness timestamp.

Metadata:

- Classification: reference.
- PII: no.
- Owner: Capacity Management.
- Freshness inherited from the raw source unless overridden.

## `raw.patients`

Required columns:

- `patient_id`: source-system patient identifier.
- `medical_record_number`: medical record number.
- `date_of_birth`: date of birth if available.
- `sex_at_birth`: recorded sex at birth if available.
- `home_postcode`: postcode or equivalent geography if available.
- `updated_at`: source freshness timestamp.

Metadata:

- Classification: patient_identifiable.
- PII: yes.
- PII level: high for `patient_id` and `medical_record_number`.
- Freshness: warn after 4 hours, error after 8 hours.

The current dashboard and decision logic do not expose patient identifiers. If another platform uses patient-level drill-through, add role-based access control and masking before exposing these fields.

## `raw.bed_events`

Required columns:

- `event_id`: unique source event identifier.
- `event_timestamp`: timestamp when the event was recorded.
- `ward_id`: ward identifier.
- `patient_id`: nullable patient identifier.
- `event_type`: one of `midnight_census`, `admission`, `discharge`, or a mapped equivalent.
- `occupied_beds`: occupied bed count at the event.
- `licensed_beds`: licensed bed count at the event.
- `staffed_beds`: staffed bed count at the event.
- `scenario_tag`: nullable label used by demos or simulations.

Metadata:

- Classification: operational.
- PII: no in the current contract, because patient-level identifiers are not surfaced from this table.
- Freshness SLA: 2 hours.

## Event Type Mapping

If the source system uses different event names, map them before or inside `stg_bed_events`:

| Canonical value | Meaning |
| --- | --- |
| `midnight_census` | Daily census row used for occupancy facts and runtime input |
| `admission` | Admission movement used for daily flow |
| `discharge` | Discharge movement used for daily flow |

The analytics fact `fct_bed_occupancy` uses only `midnight_census` rows. Admissions and discharges are used in daily summaries and latest snapshots.

## Metadata Rules for Porting

- Keep source names stable even if physical schemas differ. Use dbt source configuration or environment variables to adapt schemas.
- Preserve loaded-at fields for freshness checks.
- Classify every source table as reference, operational, or patient identifiable.
- Do not expose patient-identifiable fields in portal or BI unless the target platform has explicit access control and masking.
- Keep ward identifiers consistent across raw events, dimensions, runtime outputs, and decision rows.
