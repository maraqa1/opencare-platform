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
    outstanding_amount,
    greatest(current_date - claim_date, 0)::numeric(10, 2) as ar_days,
    claim_status
from base
where outstanding_amount > 0
