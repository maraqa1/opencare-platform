{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with segments as (
    select distinct payer_id, department_id
    from {{ ref('stg_rcm_claims') }}
),
future_days as (
    select generate_series(current_date + 1, current_date + 30, interval '1 day')::date as forecast_date
),
historical as (
    select
        payer_id,
        department_id,
        avg(coalesce(paid_amount, 0))::numeric(14, 2) as avg_paid_amount,
        sum(
            greatest(
                coalesce(contracted_amount, gross_billed_amount, 0) - coalesce(paid_amount, 0),
                0
            )
        )::numeric(14, 2) as outstanding_amount
    from {{ ref('stg_rcm_claims') }}
    group by 1, 2
),
opportunity_due as (
    select
        due_date as forecast_date,
        payer_id,
        department_id,
        sum(expected_recovery_amount)::numeric(14, 2) as recoverable_cash,
        sum(greatest(recoverable_amount - expected_recovery_amount, 0))::numeric(14, 2) as residual_risk
    from {{ ref('fct_cash_recovery_opportunity') }}
    group by 1, 2, 3
)

select
    d.forecast_date,
    s.payer_id,
    s.department_id,
    (
        coalesce(h.avg_paid_amount, 0)
        * case when extract(isodow from d.forecast_date) between 1 and 5 then 1.0 else 0.65 end
        + coalesce(o.recoverable_cash, 0)
    )::numeric(14, 2) as expected_cash,
    (
        coalesce(o.residual_risk, 0)
        + coalesce(h.outstanding_amount, 0) * 0.015
    )::numeric(14, 2) as cash_at_risk,
    coalesce(o.recoverable_cash, 0)::numeric(14, 2) as recoverable_cash,
    0.8200::numeric(8, 4) as confidence_score,
    'deterministic_recovery_plan' as model_used,
    current_timestamp as run_timestamp
from segments s
cross join future_days d
left join historical h
    on h.payer_id = s.payer_id
   and h.department_id = s.department_id
left join opportunity_due o
    on o.payer_id = s.payer_id
   and o.department_id = s.department_id
   and o.forecast_date = d.forecast_date
