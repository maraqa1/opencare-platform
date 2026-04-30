select
    cast(claim_id as text) as claim_id,
    cast(encounter_id as text) as encounter_id,
    cast(payer_id as text) as payer_id,
    cast(department_id as text) as department_id,
    cast(claim_date as date) as claim_date,
    cast(submission_date as date) as submission_date,
    cast(payment_date as date) as payment_date,
    lower(trim(cast(claim_status as text))) as claim_status,
    cast(gross_billed_amount as numeric(14, 2)) as gross_billed_amount,
    cast(contracted_amount as numeric(14, 2)) as contracted_amount,
    cast(paid_amount as numeric(14, 2)) as paid_amount,
    cast(coalesce(overpayment_flag, false) as boolean) as overpayment_flag,
    cast(coalesce(source_system, 'his_erp_demo') as text) as source_system
from {{ source('raw', 'rcm_claims') }}
