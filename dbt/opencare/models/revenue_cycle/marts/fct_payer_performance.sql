{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as payer_id,
    cast(null as date) as period_start,
    cast(null as date) as period_end,
    cast(null as numeric(14, 2)) as gross_billed,
    cast(null as numeric(14, 2)) as contracted_amount,
    cast(null as numeric(14, 2)) as paid_amount,
    cast(null as numeric(8, 4)) as actual_collection_rate,
    cast(null as numeric(10, 2)) as average_payment_days,
    cast(null as integer) as denied_claim_count
where false
