# Bed Pressure Handover Dependency Register

## Purpose

This register documents files and platform capabilities that are referenced by the complete handover archive but are not part of the Bed Pressure business use-case contract itself.

Use this file when rebuilding the use case on another platform such as Click. It separates required platform plumbing from use-case-specific assets.

## Must Supply or Replace

### Shell Helper

- `install/helpers.sh`

Why it matters:

- All OpenCare shell scripts under `scripts/` source this helper.
- If the target platform does not use OpenCare install scripts, the implementation team can ignore the scripts and follow the documentation manually.
- If the team wants to run the scripts, this helper must be included or recreated.

Archive status:

- Included in the refreshed complete handover archive.

### Ingestion Layer

Files:

- `scripts/airbyte/apply_airbyte.sh`
- `scripts/airbyte/setup_mysql_demo.sh`
- `scripts/airbyte/test_demo_sync.sh`

Why it matters:

- Demo data is generated as MySQL source data.
- OpenCare uses Airbyte to move MySQL data into PostgreSQL raw tables.
- A target platform can replace Airbyte with its own ingestion path.

Click rebuild note:

- Use Click's native loader or pipeline to land the raw tables into the target warehouse.
- Minimum required logical raw tables are documented in `../docs/source_data_and_metadata.md`.

Archive status:

- Included in the refreshed complete handover archive as OpenCare reference plumbing.

## Platform Files Included for Reference

These are OpenCare platform files, not Bed Pressure business logic. Use or replace them depending on the target platform.

- `manifests/postgres/statefulset.yaml`
- `superset/superset_config.py`
- `superset/custom_theme.css`
- `sql/superset/superset_readonly.sql`

Click rebuild note:

- If Click provides its own warehouse and BI layer, these can be ignored.
- Keep the dbt, API, runtime, and portal contracts as the portable source of truth.

## Runtime State to Ignore

- `.state/demo-reports`
- `.state/demo-logs`
- Generated Airbyte diagnostic files

These are created at run time and should not be treated as source assets.

## Other Use Cases to Ignore for Bed Pressure

Shared scripts may reference these, but they are outside the Bed Pressure handover scope:

- `dbt/opencare/models/revenue_cycle/**`
- `dbt/opencare/models/talemia/**`
- `scripts/talemia/load_v4_raw.sh`

These belong to other use cases and are intentionally not required for a Bed Pressure rebuild.

## Security Note

`manifests/platform-config.yaml` in the live repository contains development defaults and local service credentials. In the complete handover archive, the copied file is sanitized and sensitive values are replaced with `SET_ME`.

Before deployment:

- Populate real secrets from the target platform's secret store.
- Do not commit real customer secrets into the bundle.
- Review SMTP, Keycloak, MinIO, PostgreSQL, Superset, and internal API token values.
