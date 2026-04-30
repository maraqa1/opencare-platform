with revenue_cycle as (
    select
        claim_id,
        encounter_id,
        sum(coalesce(posted_cash_amount, 0)) as revenue_cycle_amount
    from {{ ref('fct_revenue_cycle') }}
    group by 1, 2
),
financial_posting as (
    select
        claim_id,
        encounter_id,
        sum(coalesce(paid_amount, 0)) as financial_posting_amount
    from {{ ref('fct_financial_posting') }}
    group by 1, 2
)
select
    coalesce(rc.claim_id, fp.claim_id) as claim_id,
    coalesce(rc.encounter_id, fp.encounter_id) as encounter_id,
    coalesce(rc.revenue_cycle_amount, 0) as revenue_cycle_amount,
    coalesce(fp.financial_posting_amount, 0) as financial_posting_amount
from revenue_cycle rc
full outer join financial_posting fp
    on rc.claim_id = fp.claim_id
   and rc.encounter_id = fp.encounter_id
where greatest(abs(coalesce(rc.revenue_cycle_amount, 0)), abs(coalesce(fp.financial_posting_amount, 0))) > 0
  and abs(coalesce(rc.revenue_cycle_amount, 0) - coalesce(fp.financial_posting_amount, 0))
      / greatest(abs(coalesce(rc.revenue_cycle_amount, 0)), abs(coalesce(fp.financial_posting_amount, 0))) > 0.001
