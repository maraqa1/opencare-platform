{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with claims_enriched as (
    select
        payer_id,
        date_trunc('month', claim_date)::date as month_key,
        coalesce(gross_billed_amount, 0)::numeric(14, 2) as gross_billed_amount,
        coalesce(contracted_amount, gross_billed_amount, 0)::numeric(14, 2) as contracted_amount,
        coalesce(paid_amount, 0)::numeric(14, 2) as paid_amount,
        greatest(
            coalesce(contracted_amount, gross_billed_amount, 0) - coalesce(paid_amount, 0),
            0
        )::numeric(14, 2) as underpayment_amount,
        case
            when payer_id = 'PAYER-A' then 28
            when payer_id = 'PAYER-B' then 35
            when payer_id = 'PAYER-C' then 42
            else 30
        end as payment_sla_days,
        greatest(coalesce(payment_date, current_date) - claim_date, 0) as actual_payment_days,
        overpayment_flag
    from {{ ref('stg_rcm_claims') }}
)

select
    payer_id,
    month_key,
    sum(gross_billed_amount)::numeric(14, 2) as gross_billed,
    sum(contracted_amount)::numeric(14, 2) as contracted_amount,
    sum(paid_amount)::numeric(14, 2) as paid_amount,
    sum(underpayment_amount)::numeric(14, 2) as underpayment_amount,
    (
        sum(contracted_amount) / nullif(sum(gross_billed_amount), 0)
    )::numeric(8, 4) as contract_rate_pct,
    (
        sum(paid_amount) / nullif(sum(contracted_amount), 0)
    )::numeric(8, 4) as actual_collection_rate,
    max(payment_sla_days)::integer as payment_sla_days,
    avg(actual_payment_days)::integer as actual_payment_days,
    count(*) filter (where actual_payment_days > payment_sla_days)::integer as sla_breach_count,
    bool_or(overpayment_flag) as overpayment_flag,
    (
        sum(underpayment_amount) > 1000
        or count(*) filter (where actual_payment_days > payment_sla_days) > 0
    ) as contract_breach_flag,
    (
        sum(underpayment_amount) > 3000
        or (
            sum(paid_amount) / nullif(sum(contracted_amount), 0)
        ) < 0.9
    ) as renegotiation_flag
from claims_enriched
group by 1, 2
