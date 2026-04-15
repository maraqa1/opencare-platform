select
    cast(patient_id as text) as patient_id,
    trim(cast(medical_record_number as text)) as medical_record_number,
    cast(date_of_birth as date) as date_of_birth,
    upper(trim(cast(sex_at_birth as text))) as sex_at_birth,
    trim(cast(home_postcode as text)) as home_postcode
from {{ source('raw', 'patients') }}
