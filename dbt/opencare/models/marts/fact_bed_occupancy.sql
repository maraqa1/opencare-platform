select
    occupancy_fact_key,
    date_day,
    ward_id as department_id,
    occupied_beds,
    staffed_beds,
    occupancy_rate,
    available_beds,
    pressure_flag
from {{ ref('fct_bed_occupancy') }}
