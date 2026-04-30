{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as claim_aging_id,
    cast(null as text) as claim_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as date) as snapshot_date,
    cast(null as integer) as aging_bucket_days,
    cast(null as numeric(14, 2)) as outstanding_amount,
    cast(null as numeric(10, 2)) as ar_days,
    cast(null as text) as claim_status
where false
