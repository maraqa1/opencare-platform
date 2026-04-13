select
    cast(department_id as text) as department_id,
    trim(cast(department_code as text)) as department_code,
    trim(cast(department_name as text)) as department_name,
    trim(cast(service_line as text)) as service_line
from {{ source('raw', 'departments') }}
