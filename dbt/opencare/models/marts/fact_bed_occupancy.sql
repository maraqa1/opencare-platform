with daily_occupancy as (
    select
        event_date as date_day,
        department_id,
        max(occupied_beds) as occupied_beds,
        max(staffed_beds) as staffed_beds,
        max(occupancy_rate) as occupancy_rate
    from {{ ref('stg_bed_events') }}
    group by 1, 2
)

select
    md5(concat(date_day::text, '||', department_id)) as occupancy_fact_key,
    date_day,
    department_id,
    occupied_beds,
    staffed_beds,
    occupancy_rate
from daily_occupancy
