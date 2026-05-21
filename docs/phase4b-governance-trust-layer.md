# Phase 4b: Governance, Lineage & Trust Layer

Phase 4b extends the investor-grade dashboard with an explicit trust surface:

- backend lineage APIs sourced from dbt metadata
- interactive portal lineage visualisation
- searchable data dictionary with inline lineage
- upgraded record specifications with freshness and test coverage
- governance tab with source freshness, impact analysis, quality, and compliance summaries

## Backend Contracts

- `/api/v1/lineage/models`
- `/api/v1/lineage/models/{model_name}`
- `/api/v1/lineage/models/{model_name}/upstream`
- `/api/v1/lineage/models/{model_name}/downstream`
- `/api/v1/lineage/impact/{source_name}`
- `/api/v1/lineage/freshness`
- `/api/v1/lineage/quality`
- `/api/v1/lineage/quality/{model_name}`
- `/api/v1/lineage/compliance`
- `/api/v1/lineage/reload`

The lineage service prefers `manifest.json` when present and falls back to checked-in dbt models plus schema metadata when the manifest is not bundled into the backend image.

## Metadata Coverage

The governance layer now pulls from repo-native dbt metadata:

- `dbt/opencare/models/sources.yml`
- `dbt/opencare/models/schema.yml`
- `dbt/opencare/models/dictionary/dict_metrics.sql`

Those files now carry freshness hints, classification tags, PII flags, ownership, retention, and metric descriptions aligned to the bed-pressure use case.

## Portal Surfaces

The governance story is accessible from the main occupancy experience:

- `Governance` tab on `/occupancy`
- inline lineage expansion inside the data dictionary
- richer record-spec sections for occupancy, forecast, and anomaly tables

## Validation

Recommended checks after rebuilding backend and portal images:

```bash
curl -s http://127.0.0.1:8000/api/v1/lineage/models/fct_bed_occupancy
curl -s http://127.0.0.1:8000/api/v1/lineage/freshness
curl -s http://127.0.0.1:8000/api/v1/lineage/compliance
```

```bash
curl -s http://127.0.0.1:3001/occupancy?tab=governance
curl -s http://127.0.0.1:3001/occupancy?tab=dictionary
```
