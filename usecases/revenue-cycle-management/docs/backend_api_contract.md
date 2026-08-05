# Backend API Contract

## API Families

The current implementation exposes two route families:

- `/api/v1/revenue-cycle`: main portal payloads.
- `/api/v1/rcm`: board-pack and decision workflow endpoints.

## Main Portal Endpoints

- `GET /api/v1/revenue-cycle/cash-command`
- `GET /api/v1/revenue-cycle/journey`
- `GET /api/v1/revenue-cycle/recovery-queue`
- `GET /api/v1/revenue-cycle/payer-control`
- `GET /api/v1/revenue-cycle/leakage`
- `GET /api/v1/revenue-cycle/team-performance`
- `GET /api/v1/revenue-cycle/executive-narrative`
- `GET /api/v1/revenue-cycle/summary`

Common filters include:

- `date_from`
- `date_to`
- `facility`
- `payer`
- `department`
- `specialty`
- `patient_type`
- `claim_status`

Recovery queue filters also include:

- `issue_type`
- `owner`
- `status`
- `priority`
- `due_window`
- `min_value`
- `search`
- `sort_by`
- `group_by`
- `view`

## Board Pack Endpoint

`GET /api/v1/rcm/board-pack`

Purpose: generate a complete CFO-ready report payload with executive cover, storyline, cash command, recovery queue, decision layer, board talk track, and data trust.

## Decision Endpoints

- `GET /api/v1/rcm/decision-queue`
- `GET /api/v1/rcm/decisions/{decision_id}`
- `POST /api/v1/rcm/recovery-items/{source_item_id}/promote`
- `POST /api/v1/rcm/decisions/{decision_id}/approve`
- `POST /api/v1/rcm/decisions/{decision_id}/reject`
- `POST /api/v1/rcm/decisions/{decision_id}/revise`
- `POST /api/v1/rcm/decisions/{decision_id}/dispatch`
- `POST /api/v1/rcm/decisions/{decision_id}/escalate`
- `POST /api/v1/rcm/decisions/{decision_id}/note`
- `POST /api/v1/rcm/decisions/{decision_id}/assign`

## API Porting Rules

- Preserve the separation between insight endpoints and decision mutation endpoints.
- Every decision mutation must require a human action and write audit evidence.
- Board-pack payload must include generated timestamp, currency, filters, narrative, metrics, and data trust.
