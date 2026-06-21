{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with base as (
    select
        claim_id,
        payer_id,
        department_id,
        claim_date,
        claim_status,
        greatest(
            coalesce(contracted_amount, gross_billed_amount, 0) - coalesce(paid_amount, 0),
            0
        )::numeric(14, 2) as outstanding_amount
    from {{ ref('stg_rcm_claims') }}
)

select
    md5(concat(claim_id, '||', current_date::text)) as claim_aging_id,
    claim_id,
    payer_id,
    department_id,
    current_date as snapshot_date,
    greatest(current_date - claim_date, 0) as aging_bucket_days,
    case
        when greatest(current_date - claim_date, 0) <= 30 then '0-30 days'
        when greatest(current_date - claim_date, 0) <= 60 then '31-60 days'
        when greatest(current_date - claim_date, 0) <= 90 then '61-90 days'
        when greatest(current_date - claim_date, 0) <= 180 then '91-180 days'
        else '180+ days'
    end as aging_bucket_label,
    case
        when greatest(current_date - claim_date, 0) <= 30 then 1
        when greatest(current_date - claim_date, 0) <= 60 then 2
        when greatest(current_date - claim_date, 0) <= 90 then 3
        when greatest(current_date - claim_date, 0) <= 180 then 4
        else 5
    end as aging_bucket_sort,
    case
        when greatest(current_date - claim_date, 0) <= 30 then 'green'
        when greatest(current_date - claim_date, 0) <= 60 then 'blue'
        when greatest(current_date - claim_date, 0) <= 90 then 'amber'
        when greatest(current_date - claim_date, 0) <= 180 then 'red'
        else 'dark_red'
    end as aging_bucket_band,
    outstanding_amount,
    greatest(current_date - claim_date, 0)::numeric(10, 2) as ar_days,
    claim_status
from base
where outstanding_amount > 0
