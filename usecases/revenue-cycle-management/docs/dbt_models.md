# dbt Model Contract

## Staging Models

### `stg_rcm_claims`

Normalizes raw claim fields into stable text, date, numeric, and boolean types. It lower-cases `claim_status` and defaults `source_system` to `his_erp_demo` when missing.

Grain: one claim.

### `stg_rcm_financial_postings`

Normalizes ERP posting rows. It lower-cases `posting_type` and preserves the posting as the financial truth anchor.

Grain: one financial posting.

### `stg_rcm_referrals`

Normalizes referral/acquisition fields and lower-cases `acquisition_channel`.

Grain: one referral event.

## Analytics Marts

### `fct_revenue_cycle`

Claim and encounter revenue lifecycle fact. It joins claim data to posting summaries and calculates:

- Gross billed amount.
- Contracted amount.
- Expected cash amount.
- Posted cash amount.
- Average payment days.

Grain: one claim and encounter.

### `fct_cash_recovery_opportunity`

Ranked recovery queue. It identifies issues such as rejected claim appeal, payer underpayment, aged receivable escalation, late submission risk, coding backlog, and weekly cash recovery.

Important fields:

- `opportunity_id`
- `claim_id`
- `issue_type`
- `recoverable_amount`
- `expected_recovery_amount`
- `effort_hours`
- `priority_score`
- `owner_team`
- `status`
- `risk_level`
- `required_action`

Grain: one recovery opportunity.

### `fct_cash_forecast`

Deterministic expected cash forecast by date, payer, and department. It combines historical payment behavior with due recovery opportunities.

Grain: one forecast date, payer, and department.

### `fct_payer_contract_performance`

Payer accountability mart covering billed value, contracted value, paid value, underpayment, payment timing, and breach flags.

Grain: one payer per month.

### `fct_revenue_leakage`

Leakage finding table showing value at risk, root cause, area, and corrective focus.

Grain: one leakage finding.

### `fct_team_recovery_performance`

Owner and team accountability table showing assigned work, completed work, expected recovery, actual recovery, and overdue count.

Grain: one team or owner per reporting period.

## Minimum Acceptance

- `stg_rcm_claims.claim_id` is unique.
- Claim status values match the accepted status list.
- Recoverable and expected recovery values are non-negative.
- `fct_cash_recovery_opportunity` returns ranked rows for demo data.
- `fct_cash_forecast` returns future dates.
- The board-pack API can read marts without falling back to fabricated values.
