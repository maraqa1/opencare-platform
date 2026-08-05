# Governance and Validation

## Governed Assets

- `raw.rcm_claims`
- `raw.rcm_financial_postings`
- `raw.rcm_referrals`
- Revenue-cycle staging models.
- Revenue-cycle analytics marts.
- `decision.decision_queue`
- `decision.decision_log`
- Portal RCM pages.
- Board-pack report route.

## Lineage

Minimum lineage paths:

- Claims and postings to cash-command KPIs.
- Claims to recovery opportunities.
- Recovery opportunities to decisions.
- Payer claim/payment evidence to payer-control screen.
- Analytics marts to board-pack payload.

## Validation Gates

- Source tables exist and have expected fields.
- dbt revenue-cycle models build.
- Cash-command API returns live payload.
- Recovery queue returns ranked work items.
- Board-pack API returns generated payload with Data Trust.
- Decision promotion endpoint creates governed decision rows.
- Decision transitions write audit logs.
- Portal pages load without static placeholder values.

## Data Trust

Board Pack Data Trust must include:

- Source tables used.
- Freshness.
- Missing or unavailable metrics.
- Filters applied.
- Currency.
- Generated timestamp.
