with revenue_cycle as (
    select
        date_trunc('month', claim_date)::date as month_key,
        sum(coalesce(posted_cash_amount, 0)) as revenue_cycle_amount
    from {{ ref('fct_revenue_cycle') }}
    group by 1
),
financial_posting as (
    select
        date_trunc('month', posting_date)::date as month_key,
        sum(coalesce(paid_amount, 0)) as financial_posting_amount
    from {{ ref('fct_financial_posting') }}
    group by 1
)
select
    coalesce(rc.month_key, fp.month_key) as month_key,
    coalesce(rc.revenue_cycle_amount, 0) as revenue_cycle_amount,
    coalesce(fp.financial_posting_amount, 0) as financial_posting_amount
from revenue_cycle rc
full outer join financial_posting fp
    on rc.month_key = fp.month_key
where greatest(abs(coalesce(rc.revenue_cycle_amount, 0)), abs(coalesce(fp.financial_posting_amount, 0))) > 0
  and abs(coalesce(rc.revenue_cycle_amount, 0) - coalesce(fp.financial_posting_amount, 0))
      / greatest(abs(coalesce(rc.revenue_cycle_amount, 0)), abs(coalesce(fp.financial_posting_amount, 0))) > 0.001
