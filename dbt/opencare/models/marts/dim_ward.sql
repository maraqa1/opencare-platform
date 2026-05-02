select
    ward_id,
    ward_code,
    ward_name,
    service_line,
    licensed_beds,
    staffed_beds_baseline
from {{ ref('stg_wards') }}
