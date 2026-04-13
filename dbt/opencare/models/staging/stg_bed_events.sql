with source_data as (
    select
        cast(event_id as text) as bed_event_key,
        cast(event_timestamp as timestamp) as event_timestamp,
        cast(event_timestamp as date) as event_date,
        cast(department_id as text) as department_id,
        cast(occupied_beds as integer) as occupied_beds,
        cast(licensed_beds as integer) as licensed_beds,
        cast(staffed_beds as integer) as staffed_beds
    from {{ source('raw', 'bed_events') }}
)

select
    bed_event_key,
    event_timestamp,
    event_date,
    department_id,
    occupied_beds,
    licensed_beds,
    staffed_beds,
    case
        when staffed_beds is null or staffed_beds = 0 then null
        else round(occupied_beds::numeric / staffed_beds::numeric, 4)
    end as occupancy_rate
from source_data
