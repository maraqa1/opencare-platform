{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with posting_summary as (
    select
        claim_id,
        encounter_id,
        sum(
            case
                when posting_type in ('cash_receipt', 'cash_adjustment') then coalesce(posting_amount, 0)
                else 0
            end
        )::numeric(14, 2) as posted_cash_amount
    from {{ ref('stg_rcm_financial_postings') }}
    group by 1, 2
)

select
    md5(concat(c.claim_id, '||', c.encounter_id)) as revenue_cycle_id,
    c.claim_id,
    c.encounter_id,
    c.payer_id,
    c.department_id,
    c.claim_date,
    c.claim_status,
    coalesce(c.gross_billed_amount, 0)::numeric(14, 2) as gross_billed_amount,
    coalesce(c.contracted_amount, c.gross_billed_amount, 0)::numeric(14, 2) as contracted_amount,
    coalesce(c.contracted_amount, c.gross_billed_amount, 0)::numeric(14, 2) as expected_cash_amount,
    coalesce(ps.posted_cash_amount, c.paid_amount, 0)::numeric(14, 2) as posted_cash_amount,
    greatest(
        coalesce(c.payment_date, current_date) - c.claim_date,
        0
    )::numeric(10, 2) as ar_days,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('stg_rcm_claims') }} c
left join posting_summary ps
    on ps.claim_id = c.claim_id
   and ps.encounter_id = c.encounter_id
