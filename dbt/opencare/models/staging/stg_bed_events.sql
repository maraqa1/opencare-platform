with source_data as (
    select distinct
        cast(event_id as text) as bed_event_key,
        cast(event_timestamp as timestamp) as event_timestamp,
        cast(event_timestamp as date) as event_date,
        cast(ward_id as text) as ward_id,
        nullif(trim(cast(patient_id as text)), '') as patient_id,
        lower(trim(cast(event_type as text))) as event_type,
        cast(occupied_beds as integer) as occupied_beds,
        cast(licensed_beds as integer) as licensed_beds,
        cast(staffed_beds as integer) as staffed_beds,
        nullif(trim(cast(scenario_tag as text)), '') as scenario_tag
    from {{ source('raw', 'bed_events') }}
)

select
    bed_event_key,
    event_timestamp,
    event_date,
    ward_id,
    patient_id,
    event_type,
    occupied_beds,
    licensed_beds,
    staffed_beds,
    scenario_tag,
    case
        when staffed_beds is null or staffed_beds = 0 then null
        else round(occupied_beds::numeric / staffed_beds::numeric, 4)
    end as occupancy_rate
from source_data
