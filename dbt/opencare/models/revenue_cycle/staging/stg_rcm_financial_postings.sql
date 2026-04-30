select
    cast(posting_id as text) as posting_id,
    cast(claim_id as text) as claim_id,
    cast(encounter_id as text) as encounter_id,
    cast(gl_account as text) as gl_account,
    cast(posting_date as date) as posting_date,
    lower(trim(cast(posting_type as text))) as posting_type,
    cast(posting_amount as numeric(14, 2)) as posting_amount,
    cast(coalesce(source_system, 'his_erp_demo') as text) as source_system
from {{ source('raw', 'rcm_financial_postings') }}
