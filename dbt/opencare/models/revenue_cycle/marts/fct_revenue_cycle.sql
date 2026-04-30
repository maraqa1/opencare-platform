{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as revenue_cycle_id,
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as date) as claim_date,
    cast(null as text) as claim_status,
    cast(null as numeric(14, 2)) as gross_billed_amount,
    cast(null as numeric(14, 2)) as contracted_amount,
    cast(null as numeric(14, 2)) as expected_cash_amount,
    cast(null as numeric(14, 2)) as posted_cash_amount,
    cast(null as numeric(10, 2)) as ar_days,
    cast(null as timestamp) as as_of_timestamp
where false
