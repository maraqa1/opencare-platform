# Runtime Logic

## Current Runtime Design

RCM runtime logic is implemented in the backend service rather than in a separate R runtime container.

Implementation:

- `apps/backend/app/services/revenue_cycle_service.py`
- `apps/backend/app/routes/revenue_cycle.py`

## Runtime Responsibilities

- Apply dashboard filters consistently.
- Calculate cash-command KPIs.
- Build recovery queue groupings and ranked work items.
- Build payer-control, leakage, team-performance, and executive narrative payloads.
- Generate board-pack payloads from live backend calculations.
- Promote recovery opportunities into governed decisions.
- Transition RCM decision states and write audit logs.

## Board Pack Runtime

The board pack source of truth is:

`GET /api/v1/rcm/board-pack`

The portal report route uses that payload and must not hard-code financial values. If metrics are unavailable, the report must show the unavailable metric and list it in Data Trust.

## Forecast Position

Cash forecast is currently a dbt mart, `analytics.fct_cash_forecast`, using deterministic recovery-plan logic. If another platform replaces this with Python, R, or a model service, it must preserve the output contract:

- `forecast_date`
- `payer_id`
- `department_id`
- `expected_cash`
- `cash_at_risk`
- `recoverable_cash`
- `confidence_score`
- `model_used`
- `run_timestamp`

## Porting Rules

- Do not move business calculations into browser components.
- Keep board-pack generation server-side.
- Keep decision mutations in governed API endpoints.
- Preserve plain-language labels and avoid unexplained abbreviations.
