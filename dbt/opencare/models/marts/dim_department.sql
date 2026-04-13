select
    department_id,
    department_code,
    department_name,
    service_line
from {{ ref('stg_departments') }}
