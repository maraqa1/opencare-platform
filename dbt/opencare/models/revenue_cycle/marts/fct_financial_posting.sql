{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as posting_id,
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as date) as claim_date,
    cast(null as date) as payment_date,
    cast(null as date) as posting_date,
    cast(null as numeric(14, 2)) as gross_billed,
    cast(null as numeric(14, 2)) as contracted_amount,
    cast(null as numeric(14, 2)) as paid_amount,
    cast(null as text) as posting_type,
    cast(null as boolean) as overpayment_flag
where false
