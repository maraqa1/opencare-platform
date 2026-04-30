{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as date) as forecast_date,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as numeric(14, 2)) as expected_cash,
    cast(null as numeric(14, 2)) as cash_at_risk,
    cast(null as numeric(14, 2)) as recoverable_cash,
    cast(null as numeric(8, 4)) as confidence_score,
    cast(null as text) as model_used,
    cast(null as timestamp) as run_timestamp
where false
