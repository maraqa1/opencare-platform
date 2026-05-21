{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    p.posting_id,
    p.claim_id,
    p.encounter_id,
    c.payer_id,
    c.claim_date,
    c.payment_date,
    p.posting_date,
    coalesce(c.gross_billed_amount, 0)::numeric(14, 2) as gross_billed,
    coalesce(c.contracted_amount, c.gross_billed_amount, 0)::numeric(14, 2) as contracted_amount,
    case
        when p.posting_type in ('cash_receipt', 'cash_adjustment') then coalesce(p.posting_amount, 0)
        else 0
    end::numeric(14, 2) as paid_amount,
    p.posting_type,
    c.overpayment_flag
from {{ ref('stg_rcm_financial_postings') }} p
join {{ ref('stg_rcm_claims') }} c
    on c.claim_id = p.claim_id
   and c.encounter_id = p.encounter_id
