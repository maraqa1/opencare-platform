# Governance and Validation

## Governance Assets

The bundle declares governance metadata under `usecases/bed-pressure/governance`.

Files:

- `assets.yaml`: governed source, model, runtime, decision, and portal assets.
- `classification.yaml`: sensitivity and handling rules.
- `freshness.yaml`: freshness expectations by asset.
- `lineage.yaml`: source-to-output lineage.
- `ownership.yaml`: business and technical ownership.
- `quality.yaml`: data quality expectations.

## Classified Asset Chain

Minimum governed chain:

- `raw.wards`: reference asset, non-PII.
- `raw.patients`: patient-identifiable asset, high sensitivity.
- `raw.bed_events`: operational asset.
- `staging.stg_bed_events`: normalized event asset.
- `analytics.fct_bed_occupancy`: governed occupancy fact.
- `analytics.fct_bed_pressure_daily_summary`: board trend asset.
- `analytics.fct_bed_pressure_latest_snapshot`: current pressure asset.
- `analytics.fct_bed_pressure_executive_actions`: executive action board asset.
- `output.forecast`: runtime prediction asset.
- `output.anomaly`: runtime anomaly asset.
- `decision.decision_queue`: operational decision asset.
- `decision.decision_log`: audit asset.
- `decision.decision_outcomes`: outcome measurement asset.
- Portal Bed Pressure pages: decision-support surfaces.

## Lineage Requirement

Every number displayed in the portal or Superset must trace to one of these chains:

- Current status: raw bed events -> staging bed events -> occupancy fact -> occupancy API -> portal.
- Prediction: occupancy fact -> forecast runtime -> output forecast -> forecast API -> portal.
- Anomaly: occupancy fact -> anomaly runtime -> output anomaly -> anomaly API -> portal.
- Decision: occupancy fact plus runtime outputs -> decision engine -> decision queue -> decision API -> portal.
- Outcome: decision queue -> decision action -> decision outcome -> decision API -> portal.

## Freshness Rules

- Raw bed events should be refreshed within 2 hours.
- dbt marts should be refreshed after raw ingestion.
- Forecast runtime runs hourly at minute 20.
- Anomaly runtime runs hourly at minute 25.
- Decision generation runs on the platform-configured schedule or on demand.
- Portal should show freshness cues for runtime outputs and current status.

## Validation Checks

The bundle includes:

- `validation/checks.yaml`
- `validation/dashboard_rigidity_checks.yaml`
- `acceptance/dashboard_acceptance.yaml`
- `acceptance/populated_state_proof.yaml`
- `acceptance/promotion_contract.yaml`

Minimum validation before promotion:

- Required source tables exist and pass not-null tests.
- dbt staging and marts build successfully.
- `analytics.fct_bed_occupancy` contains recent ward-day data.
- Forecast runtime writes `output.forecast`.
- Anomaly runtime writes or intentionally clears `output.anomaly`.
- Decision generator can populate `decision.decision_queue` from real signals.
- Portal pages load without runtime errors.
- Governance workspace shows classified assets, lineage, freshness, and owners.
- BI dashboard renders without unregistered visualization plugins.

## Demo Readiness

A demo-ready environment may use seeded data, but it must still preserve the real contracts:

- Seeded rows must land in the same raw or output structures expected in production.
- Demo decision fallback rows must be labelled and non-mutating.
- No fake governance pass values should be shown as production evidence.
