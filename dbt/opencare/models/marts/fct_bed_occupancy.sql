with census_events as (
    select
        event_date as date_day,
        ward_id,
        max(occupied_beds) as occupied_beds,
        max(licensed_beds) as licensed_beds,
        max(staffed_beds) as staffed_beds,
        max(occupancy_rate) as occupancy_rate
    from {{ ref('stg_bed_events') }}
    where event_type = 'midnight_census'
    group by 1, 2
)

select
    md5(concat(date_day::text, '||', ward_id)) as occupancy_fact_key,
    date_day,
    ward_id,
    occupied_beds,
    licensed_beds,
    staffed_beds,
    greatest(staffed_beds - occupied_beds, 0) as available_beds,
    occupancy_rate,
    case
        when occupancy_rate >= 0.9 then true
        else false
    end as pressure_flag
from census_events
