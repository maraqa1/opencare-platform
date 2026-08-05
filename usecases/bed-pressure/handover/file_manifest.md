# Bed Pressure File Manifest

## Canonical Bundle

- `usecases/bed-pressure/package.yaml`
- `usecases/bed-pressure/README.md`

## Manifest

- `usecases/bed-pressure/manifest/usecase.yaml`
- `usecases/bed-pressure/manifest/personas.yaml`
- `usecases/bed-pressure/manifest/navigation.yaml`
- `usecases/bed-pressure/manifest/principles.yaml`

## Business Contract

- `usecases/bed-pressure/business/objectives.yaml`
- `usecases/bed-pressure/business/kpis.yaml`
- `usecases/bed-pressure/business/decisions.yaml`
- `usecases/bed-pressure/business/workflows.yaml`

## Data Contract

- `usecases/bed-pressure/data/source_systems.yaml`
- `usecases/bed-pressure/data/entities.yaml`
- `usecases/bed-pressure/data/pipeline.yaml`
- `usecases/bed-pressure/data/output_tables.yaml`
- `usecases/bed-pressure/bindings/data_bindings.yaml`

## dbt Contract

- `usecases/bed-pressure/dbt/model_index.yaml`
- `dbt/opencare/models/sources.yml`
- `dbt/opencare/models/staging/stg_bed_events.sql`
- `dbt/opencare/models/staging/stg_wards.sql`
- `dbt/opencare/models/staging/stg_patients.sql`
- `dbt/opencare/models/marts/dim_ward.sql`
- `dbt/opencare/models/marts/fct_bed_occupancy.sql`
- `dbt/opencare/models/marts/fact_bed_occupancy.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_daily_summary.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_latest_snapshot.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_distribution.sql`
- `dbt/opencare/models/marts/fct_bed_pressure_executive_actions.sql`
- `dbt/opencare/models/schema.yml`

## Runtime Contract

- `usecases/bed-pressure/runtime/runtimes.yaml`
- `usecases/bed-pressure/runtime/schedules.yaml`
- `usecases/bed-pressure/runtime/images.yaml`
- `usecases/bed-pressure/runtime/evidence.yaml`
- `r-runtime/bed-forecast/plumber.R`
- `r-runtime/bed-forecast/main.R`
- `r-runtime/bed-forecast/Dockerfile`
- `r-runtime/anomaly/plumber.R`
- `r-runtime/anomaly/main.R`
- `r-runtime/anomaly/Dockerfile`
- `manifests/runtimes/bed-forecast.yaml`
- `manifests/runtimes/anomaly.yaml`

## Backend Contract

- `apps/backend/app/routes/occupancy.py`
- `apps/backend/app/routes/forecasts.py`
- `apps/backend/app/routes/anomalies.py`
- `apps/backend/app/routes/decisions.py`
- `apps/backend/app/services/decision_service.py`

## Portal Contract

- `apps/portal/app/use-cases/bed-pressure/layout.tsx`
- `apps/portal/app/use-cases/bed-pressure/page.tsx`
- `apps/portal/app/use-cases/bed-pressure/overview/page.tsx`
- `apps/portal/app/use-cases/bed-pressure/status/page.tsx`
- `apps/portal/app/use-cases/bed-pressure/predictions/page.tsx`
- `apps/portal/app/use-cases/bed-pressure/analysis/page.tsx`
- `apps/portal/app/use-cases/bed-pressure/decisions/page.tsx`
- `apps/portal/components/bed-pressure/OccupancyGrid.tsx`
- `apps/portal/components/bed-pressure/ForecastView.tsx`
- `apps/portal/components/bed-pressure/AnomalyAlerts.tsx`
- `apps/portal/components/bed-pressure/BedPressureAnalysisCanvas.tsx`
- `apps/portal/components/DecisionCards.tsx`

## Decisions

- `usecases/bed-pressure/decision-workflows/action_lifecycle.yaml`
- `usecases/bed-pressure/decisions/action_buttons.yaml`
- `usecases/bed-pressure/decisions/audit.yaml`
- `usecases/bed-pressure/decisions/decision_states.yaml`
- `usecases/bed-pressure/decisions/notifications.yaml`
- `manifests/decisions/cronjobs.yaml`

## Screens and Acceptance

- `usecases/bed-pressure/screens/screen_catalog.yaml`
- `usecases/bed-pressure/screens/dashboard_implementation_matrix.yaml`
- `usecases/bed-pressure/screens/component_anatomy.yaml`
- `usecases/bed-pressure/screens/story_flow.yaml`
- `usecases/bed-pressure/screens/visual_grammar.yaml`
- `usecases/bed-pressure/acceptance/dashboard_acceptance.yaml`
- `usecases/bed-pressure/acceptance/populated_state_proof.yaml`
- `usecases/bed-pressure/acceptance/promotion_contract.yaml`

## Governance

- `usecases/bed-pressure/governance/assets.yaml`
- `usecases/bed-pressure/governance/classification.yaml`
- `usecases/bed-pressure/governance/freshness.yaml`
- `usecases/bed-pressure/governance/lineage.yaml`
- `usecases/bed-pressure/governance/ownership.yaml`
- `usecases/bed-pressure/governance/quality.yaml`
- `usecases/bed-pressure/bindings/governance_bindings.yaml`

## Implementation Documentation

- `usecases/bed-pressure/docs/architecture.md`
- `usecases/bed-pressure/docs/source_data_and_metadata.md`
- `usecases/bed-pressure/docs/dbt_models.md`
- `usecases/bed-pressure/docs/runtime_models.md`
- `usecases/bed-pressure/docs/backend_api_contract.md`
- `usecases/bed-pressure/docs/portal_implementation.md`
- `usecases/bed-pressure/docs/decision_workflow.md`
- `usecases/bed-pressure/docs/governance_and_validation.md`
- `usecases/bed-pressure/docs/implementation_guide.md`
- `usecases/bed-pressure/docs/demo_script.md`
- `usecases/bed-pressure/docs/implementation_mapping.md`
