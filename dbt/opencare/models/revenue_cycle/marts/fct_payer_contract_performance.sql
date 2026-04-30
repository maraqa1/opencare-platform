{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as payer_id,
    cast(null as date) as month_key,
    cast(null as numeric(14, 2)) as gross_billed,
    cast(null as numeric(14, 2)) as contracted_amount,
    cast(null as numeric(14, 2)) as paid_amount,
    cast(null as numeric(14, 2)) as underpayment_amount,
    cast(null as numeric(8, 4)) as contract_rate_pct,
    cast(null as numeric(8, 4)) as actual_collection_rate,
    cast(null as integer) as payment_sla_days,
    cast(null as integer) as actual_payment_days,
    cast(null as integer) as sla_breach_count,
    cast(null as boolean) as overpayment_flag,
    cast(null as boolean) as contract_breach_flag,
    cast(null as boolean) as renegotiation_flag
where false
