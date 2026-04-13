with daily_capacity as (
    select
        event_date as date_day,
        department_id,
        max(licensed_beds) as licensed_beds,
        max(staffed_beds) as staffed_beds
    from {{ ref('stg_bed_events') }}
    group by 1, 2
)

select
    md5(concat(date_day::text, '||', department_id)) as capacity_fact_key,
    date_day,
    department_id,
    licensed_beds,
    staffed_beds
from daily_capacity
