# Backend API Contract

## API Prefix

The Bed Pressure portal consumes FastAPI endpoints under `/api/v1`.

## Occupancy

### `GET /api/v1/occupancy/current`

Purpose: current ward pressure sorted worst first.

Reads:

- `analytics.fct_bed_occupancy`
- `analytics.dim_ward`
- `staging.stg_bed_events`

Response includes:

- Summary counts for total wards, critical wards, warning wards, normal wards, total occupied beds, and total available beds.
- Items with ward id, ward code, ward name, specialty, occupied beds, staffed beds, available beds, occupancy rate, seven-day average occupancy, admissions today, discharges today, net flow, and status.

Status thresholds:

- `critical`: occupancy at or above 90 percent.
- `warning`: occupancy at or above 75 percent and below 90 percent.
- `normal`: occupancy below 75 percent.

### `GET /api/v1/occupancy/historical`

Parameters:

- `ward_id`: optional ward identifier.
- `days`: optional history window, bounded by the backend.

Purpose: ward or network historical occupancy trend.

Reads:

- `analytics.fct_bed_occupancy`
- `analytics.dim_ward`

## Forecasts

### `GET /api/v1/forecast`

Parameters:

- `ward_id`: optional ward filter.
- `days`: optional forecast horizon.

Reads:

- `output.forecast`
- Ward dimension tables for display labels.

Response includes:

- Runtime URL.
- Generated-at timestamp.
- Horizon days.
- Forecast rows with ward id, ward name, forecast date, predicted occupied beds, predicted occupancy, confidence interval, capacity beds, model used, occupancy rate, and breach risk.

## Anomalies

### `GET /api/v1/anomalies`

Parameters:

- `severity`: optional filter.

Reads:

- `output.anomaly`
- Ward dimension tables for display labels.

Response includes:

- Runtime URL.
- Generated-at timestamp.
- Alert rows with ward id, ward name, event date, anomaly type, severity, z-score, threshold, occupancy rate, and message.

### `GET /api/v1/anomalies/summary`

Purpose: compact alert count summary for current status and navigation badges.

## Decisions

### `POST /api/v1/decisions/generate`

Purpose: evaluate current occupancy, forecast, and anomaly signals and insert eligible decisions into `decision.decision_queue`.

### `GET /api/v1/decisions`

Purpose: list decision queue rows.

Important filters:

- `use_case`
- `status`
- `limit`
- `offset`

### `GET /api/v1/decisions/count`

Purpose: count active decisions, optionally by use case.

### `POST /api/v1/decisions/{decision_id}/assign`

Purpose: assign a decision to a human owner.

### `POST /api/v1/decisions/{decision_id}/start`

Purpose: mark a decision as in progress.

### `POST /api/v1/decisions/{decision_id}/complete`

Purpose: complete a decision after action evidence is provided.

### `POST /api/v1/decisions/{decision_id}/execute-all`

Purpose: execute all recommended actions for the selected decision.

### `POST /api/v1/decisions/{decision_id}/dismiss`

Purpose: dismiss a decision with reason.

### `GET /api/v1/decisions/{decision_id}/log`

Purpose: return append-only audit events for the decision.

### `GET /api/v1/decisions/{decision_id}/outcome`

Purpose: return measured outcome evidence.

## API Porting Rules

- Preserve route purpose even if route paths differ on another platform.
- Keep current status, forecast, anomaly, and decision APIs separate. This prevents the portal from blending evidence and action authority.
- Decision mutation endpoints must require authentication and human authorisation.
- API responses must include generated-at or freshness fields for runtime outputs.
