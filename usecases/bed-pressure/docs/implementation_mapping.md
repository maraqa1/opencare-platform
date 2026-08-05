# Implementation Mapping

This package maps the Bed Pressure golden contract to the current OpenCare implementation.

## Bundle Contract

- Package root: `usecases/bed-pressure`
- Use case manifest: `usecases/bed-pressure/manifest/usecase.yaml`
- Business objectives: `usecases/bed-pressure/business/objectives.yaml`
- KPIs: `usecases/bed-pressure/business/kpis.yaml`
- Decisions: `usecases/bed-pressure/business/decisions.yaml`
- Screen catalog: `usecases/bed-pressure/screens/screen_catalog.yaml`
- Acceptance: `usecases/bed-pressure/acceptance`
- Validation: `usecases/bed-pressure/validation`

## Source and dbt

- dbt sources: `dbt/opencare/models/sources.yml`
- Staging bed events: `dbt/opencare/models/staging/stg_bed_events.sql`
- Staging wards: `dbt/opencare/models/staging/stg_wards.sql`
- Staging patients: `dbt/opencare/models/staging/stg_patients.sql`
- Occupancy fact: `dbt/opencare/models/marts/fct_bed_occupancy.sql`
- Compatibility fact: `dbt/opencare/models/marts/fact_bed_occupancy.sql`
- Daily summary: `dbt/opencare/models/marts/fct_bed_pressure_daily_summary.sql`
- Latest snapshot: `dbt/opencare/models/marts/fct_bed_pressure_latest_snapshot.sql`
- Distribution: `dbt/opencare/models/marts/fct_bed_pressure_distribution.sql`
- Executive actions: `dbt/opencare/models/marts/fct_bed_pressure_executive_actions.sql`
- Model documentation and tests: `dbt/opencare/models/schema.yml`

## Runtime

- Forecast runtime: `r-runtime/bed-forecast`
- Anomaly runtime: `r-runtime/anomaly`
- Forecast deployment: `manifests/runtimes/bed-forecast.yaml`
- Anomaly deployment: `manifests/runtimes/anomaly.yaml`
- Runtime schedule declarations: `usecases/bed-pressure/runtime/schedules.yaml`

## Backend

- Current occupancy route: `apps/backend/app/routes/occupancy.py`
- Forecast route: `apps/backend/app/routes/forecasts.py`
- Anomaly route: `apps/backend/app/routes/anomalies.py`
- Decision route: `apps/backend/app/routes/decisions.py`
- Decision engine: `apps/backend/app/services/decision_service.py`

## Portal

- Workspace routes: `apps/portal/app/use-cases/bed-pressure`
- Current status component: `apps/portal/components/bed-pressure/OccupancyGrid.tsx`
- Forecast component: `apps/portal/components/bed-pressure/ForecastView.tsx`
- Anomaly component: `apps/portal/components/bed-pressure/AnomalyAlerts.tsx`
- Analysis canvas: `apps/portal/components/bed-pressure/BedPressureAnalysisCanvas.tsx`
- Decision cards: `apps/portal/components/DecisionCards.tsx`

## Governance

- Bundle governance files: `usecases/bed-pressure/governance`
- Platform registry: `apps/portal/lib/governance-registry.ts`
