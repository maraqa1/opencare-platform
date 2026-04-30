select
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as date) as claim_date,
    cast(null as date) as submission_date,
    cast(null as date) as payment_date,
    cast(null as text) as claim_status,
    cast(null as numeric(14, 2)) as gross_billed_amount,
    cast(null as numeric(14, 2)) as contracted_amount,
    cast(null as numeric(14, 2)) as paid_amount,
    cast(null as boolean) as overpayment_flag,
    cast(null as text) as source_system
where false
