# Bed Pressure Intelligence Golden Bundle

This folder is the canonical, self-contained contract package for the Bed Pressure Intelligence use case.

It declares the full use-case boundary: business objectives, KPIs, source data, dbt models, R runtimes, APIs, portal screens, decisions, governance, validation, and demo acceptance. Use it as the repeatable source of truth when installing, validating, or rebuilding this use case on OpenCare or another platform with equivalent components.

## Implementation Files

- Portal route files: `apps/portal/app/use-cases/bed-pressure`
- Portal components: `apps/portal/components/bed-pressure`
- Decision UI: `apps/portal/components/DecisionCards.tsx`
- Backend APIs: `apps/backend/app/routes/occupancy.py`, `forecasts.py`, `anomalies.py`, `decisions.py`
- Backend decision engine: `apps/backend/app/services/decision_service.py`
- dbt source and model contracts: `dbt/opencare/models/sources.yml`, `staging`, and `marts`
- R runtimes: `r-runtime/bed-forecast`, `r-runtime/anomaly`
- Kubernetes runtime schedules: `manifests/runtimes`, `manifests/decisions`, `manifests/dbt`
- Superset-ready marts: `analytics.fct_bed_pressure_daily_summary`, `analytics.fct_bed_pressure_latest_snapshot`, `analytics.fct_bed_pressure_distribution`, `analytics.fct_bed_pressure_executive_actions`

## Documentation Map

Read these in order when implementing the use case on another platform:

- [Architecture](docs/architecture.md): end-to-end component map and runtime flow.
- [Source Data and Metadata](docs/source_data_and_metadata.md): required raw tables, columns, freshness, sensitivity, and source mapping rules.
- [dbt Models](docs/dbt_models.md): raw to staging to analytics transformations, grains, metrics, tests, and BI marts.
- [Runtime Models](docs/runtime_models.md): R forecast and anomaly services, model logic, inputs, outputs, schedules, and environment variables.
- [Backend API Contract](docs/backend_api_contract.md): API endpoints consumed by the portal and decision layer.
- [Portal Implementation](docs/portal_implementation.md): pages, components, routes, API bindings, and demo behavior.
- [Decision Workflow](docs/decision_workflow.md): decision rules, queue schema, action states, audit, notification, and outcomes.
- [Governance and Validation](docs/governance_and_validation.md): classified assets, lineage, ownership, freshness, controls, and acceptance checks.
- [Implementation Guide](docs/implementation_guide.md): step-by-step rebuild plan for a fresh environment.
- [Demo Script](docs/demo_script.md): operator-facing demo path.
- [Implementation Mapping](docs/implementation_mapping.md): concise file-to-layer mapping.
- [Handover Package](handover/README.md): compact delivery brief, checklist, file manifest, and VM pull steps.

## Non-Negotiable Contracts

- The business contract is the source of truth for thresholds, personas, decisions, and screen intent.
- No external action is autonomous; decision actions require human authorisation.
- Forecast and anomaly outputs must be written to governed output tables, not mocked in the portal.
- Demo fallback data may be used only when explicitly labelled and must not write audit events.
- Governance must show classified assets, freshness, ownership, and lineage from source to portal.
