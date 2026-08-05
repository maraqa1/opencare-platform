# Runtime Models

## Runtime Services

The use case has two R Plumber runtimes:

| Runtime | Path | Reads | Writes | Schedule |
| --- | --- | --- | --- | --- |
| Bed forecast | `r-runtime/bed-forecast` | `analytics.fct_bed_occupancy` | `output.forecast` | `20 * * * *` |
| Bed anomaly | `r-runtime/anomaly` | `analytics.fct_bed_occupancy` | `output.anomaly` | `25 * * * *` |

Both services expose:

- `GET /healthz`: runtime health.
- `POST /run`: execute refresh and write output table.
- `GET /latest`: preview current output rows.

## Forecast Runtime

Implementation file: `r-runtime/bed-forecast/plumber.R`.

Environment variables:

- `OUTPUT_SCHEMA`, default `output`.
- `FORECAST_OUTPUT_TABLE`, default `forecast`.
- `FORECAST_MODEL_NAME`, default `auto.arima`.
- `FORECAST_LOOKBACK_DAYS`, default `14`.
- `FORECAST_HORIZON_DAYS`, default `7`.
- Database connection variables supplied by the runtime container.

Input:

- Reads recent ward history from `analytics.fct_bed_occupancy`.
- Requires `date_day`, `ward_id`, `occupied_beds`, `staffed_beds`, and occupancy-derived capacity.

Model behavior:

- Groups input by ward.
- Uses `forecast::auto.arima` when enough history exists.
- Falls back to a baseline forecast when ARIMA cannot be fit.
- Produces a daily forecast horizon per ward.
- Clamps forecast values so the output remains operationally sensible.

Output table contract: `output.forecast`.

Required columns:

- `ward_id`
- `forecast_date`
- `predicted_occupancy`
- `ci_lower`
- `ci_upper`
- `capacity_beds`
- `model_used`
- `run_timestamp`

Operational acceptance:

- `POST /run` writes `ward_count * horizon_days` rows.
- The table is replaced atomically through a staging table.
- `run_timestamp` identifies the latest model run.
- Backend `/api/v1/forecast` can read the latest run.

## Anomaly Runtime

Implementation file: `r-runtime/anomaly/plumber.R`.

Environment variables:

- `OUTPUT_SCHEMA`, default `output`.
- `ANOMALY_OUTPUT_TABLE`, default `anomaly`.
- `ANOMALY_LOOKBACK_DAYS`, default `30`.
- `ANOMALY_RECENT_WINDOW_DAYS`, default `7`.
- `ANOMALY_INFO_Z_SCORE`, default `1.5`.
- `ANOMALY_WARNING_Z_SCORE`, default `2.0`.
- `ANOMALY_CRITICAL_Z_SCORE`, default `2.5`.
- `ANOMALY_INFO_OCCUPANCY_RATE`, default `75`.
- `ANOMALY_WARNING_OCCUPANCY_RATE`, default `85`.
- `ANOMALY_CRITICAL_OCCUPANCY_RATE`, default `95`.
- `ANOMALY_MAX_ALERTS`, default `3`.

Input:

- Reads occupancy percentage history from `analytics.fct_bed_occupancy`.
- Splits each ward series into a baseline period and recent observation window.

Model behavior:

- Calculates baseline mean and standard deviation.
- Calculates z-score for recent ward observations.
- Classifies severity by z-score or occupancy percentage threshold.
- Emits anomaly type `high_occupancy` when occupancy thresholds are breached.
- Emits recent alerts ordered by severity, z-score, and date.

Output table contract: `output.anomaly`.

Required columns:

- `ward_id`
- `anomaly_date`
- `occupancy_rate`
- `anomaly_type`
- `severity`
- `z_score`
- `threshold_breached`
- `run_timestamp`

Operational acceptance:

- If no anomalies are found, the runtime clears the output table instead of leaving stale alerts.
- Backend `/api/v1/anomalies` and `/api/v1/anomalies/summary` can read the latest run.
- Severity values are `critical`, `warning`, or `info`.

## Porting Requirements

- The runtime database user must be able to read `analytics.fct_bed_occupancy` and create, truncate, and insert into the `output` schema.
- If another platform cannot run R Plumber, keep the same input and output table contracts and reimplement the logic in Python, SQL, or a model service.
- Keep runtime outputs append-safe or replace-safe. The current implementation replaces current output through staging tables.
- Do not have the portal calculate forecasts or anomalies. The portal should read runtime outputs through APIs.
