{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with denied_claims as (
    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        claim_status,
        coalesce(submission_date, claim_date) + 7 as denial_date,
        greatest(
            coalesce(contracted_amount, gross_billed_amount, 0) - coalesce(paid_amount, 0),
            coalesce(gross_billed_amount, 0) * 0.35
        )::numeric(14, 2) as denied_amount
    from {{ ref('stg_rcm_claims') }}
    where claim_status in ('denied', 'appealed', 'writeoff')
)

select
    md5(concat(claim_id, '||', claim_status)) as denial_id,
    claim_id,
    encounter_id,
    payer_id,
    department_id,
    denial_date::date as denial_date,
    case
        when department_id in ('WARD-04', 'WARD-08') then 'clinical_documentation_gap'
        when payer_id in ('PAYER-C', 'PAYER-D') then 'authorization_missing'
        else 'coding_query'
    end as denial_reason,
    case
        when claim_status = 'appealed' then 'in_review'
        when claim_status = 'denied' then 'not_started'
        else 'writeoff'
    end as appeal_status,
    denied_amount,
    (denial_date + 14)::date as appeal_due_date,
    claim_status
from denied_claims
