# Bed Pressure Handover Checklist

## 1. Source Data

- Confirm the raw schema contains `wards`, `patients`, and `bed_events`.
- Confirm `bed_events` has daily `midnight_census` rows.
- Confirm `bed_events` has admission and discharge movement rows if flow metrics are required.
- Confirm ward IDs match across `wards`, `bed_events`, runtime outputs, and decisions.
- Confirm patient-identifiable fields are classified and not exposed in dashboards.

## 2. dbt

- Run dbt source tests for ward, patient, and bed event keys.
- Build `stg_bed_events`, `stg_wards`, and `stg_patients`.
- Build `dim_ward` and `fct_bed_occupancy`.
- Build Bed Pressure marts:
  - `fct_bed_pressure_daily_summary`
  - `fct_bed_pressure_latest_snapshot`
  - `fct_bed_pressure_distribution`
  - `fct_bed_pressure_executive_actions`
- Confirm `fct_bed_occupancy` is recent and has one row per ward per day.

## 3. Runtime Models

- Deploy `bed-forecast` runtime.
- Verify `GET /healthz` returns ok.
- Run `POST /run` and confirm `output.forecast` is populated.
- Deploy `anomaly` runtime.
- Verify `GET /healthz` returns ok.
- Run `POST /run` and confirm `output.anomaly` is populated or intentionally cleared.
- Confirm runtime outputs include `run_timestamp`.

## 4. Backend APIs

- Verify `/api/v1/occupancy/current`.
- Verify `/api/v1/occupancy/historical`.
- Verify `/api/v1/forecast`.
- Verify `/api/v1/anomalies`.
- Verify `/api/v1/anomalies/summary`.
- Verify `/api/v1/decisions`.
- Verify `/api/v1/decisions/generate`.
- Verify decision transition endpoints require human action.

## 5. Portal

- Confirm `/use-cases/bed-pressure/overview` loads.
- Confirm `/use-cases/bed-pressure/status` shows current ward pressure.
- Confirm `/use-cases/bed-pressure/predictions` shows forecast evidence.
- Confirm `/use-cases/bed-pressure/analysis` shows KPI cards, trend, pressure mix, top wards, and executive actions.
- Confirm `/use-cases/bed-pressure/decisions` shows live decisions or labelled demo fallback.
- Confirm empty states are useful and not visually broken.

## 6. Superset or BI

- Use supported visualization plugins only.
- Back the dashboard with Bed Pressure analytics marts.
- Confirm executive action table renders badges or uses native conditional formatting.
- Confirm dashboard can be demoed without unexpected visualization errors.

## 7. Decisions

- Generate decisions from real occupancy, forecast, and anomaly signals.
- Confirm duplicate suppression works for active decisions.
- Confirm decision state changes write to `decision.decision_log`.
- Confirm notifications are logged in `decision.notification_log`.
- Confirm completed decisions can be measured into `decision.decision_outcomes`.

## 8. Governance

- Register source assets, dbt models, runtime outputs, decision tables, portal screens, and BI datasets.
- Confirm classified assets are visible in the governance workspace.
- Confirm lineage path is visible from raw source to portal and decisions.
- Confirm owners and freshness are populated.
- Confirm no patient-identifiable fields are exposed outside approved contexts.

## 9. Promotion Gate

- Source freshness passes.
- dbt build passes.
- Runtime jobs run successfully.
- Backend API smoke tests pass.
- Portal routes load.
- BI dashboard renders.
- Decision queue is demonstrable.
- Governance evidence is complete.
