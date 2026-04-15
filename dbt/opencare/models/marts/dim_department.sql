select
    ward_id as department_id,
    ward_code as department_code,
    ward_name as department_name,
    service_line
from {{ ref('dim_ward') }}
