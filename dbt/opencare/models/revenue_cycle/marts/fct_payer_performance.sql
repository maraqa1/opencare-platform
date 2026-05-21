{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    payer_id,
    min(claim_date) as period_start,
    max(coalesce(payment_date, current_date)) as period_end,
    sum(coalesce(gross_billed_amount, 0))::numeric(14, 2) as gross_billed,
    sum(coalesce(contracted_amount, gross_billed_amount, 0))::numeric(14, 2) as contracted_amount,
    sum(coalesce(paid_amount, 0))::numeric(14, 2) as paid_amount,
    (
        sum(coalesce(paid_amount, 0))
        / nullif(sum(coalesce(contracted_amount, gross_billed_amount, 0)), 0)
    )::numeric(8, 4) as actual_collection_rate,
    avg(greatest(coalesce(payment_date, current_date) - claim_date, 0))::numeric(10, 2) as average_payment_days,
    count(*) filter (where claim_status in ('denied', 'appealed', 'writeoff'))::integer as denied_claim_count
from {{ ref('stg_rcm_claims') }}
group by 1
