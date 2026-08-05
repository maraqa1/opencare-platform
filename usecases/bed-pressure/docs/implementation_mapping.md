# Implementation Mapping

This package maps to existing platform code.

Portal:

- `apps/portal/app/use-cases/bed-pressure`
- `apps/portal/components/bed-pressure`
- `apps/portal/components/DecisionCards.tsx`

Backend:

- `apps/backend/app/routes/occupancy.py`
- `apps/backend/app/routes/forecasts.py`
- `apps/backend/app/routes/anomalies.py`
- `apps/backend/app/routes/decisions.py`
- `apps/backend/app/services/decision_service.py`

Data and runtime:

- `dbt/opencare/models/marts/fct_bed_occupancy.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_daily_summary.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_latest_snapshot.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_distribution.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_executive_actions.sql`
- `manifests/runtimes/bed-forecast.yaml`
- `manifests/runtimes/anomaly.yaml`
- `manifests/decisions/cronjobs.yaml`

Governance:

- `apps/portal/lib/governance-registry.ts`
