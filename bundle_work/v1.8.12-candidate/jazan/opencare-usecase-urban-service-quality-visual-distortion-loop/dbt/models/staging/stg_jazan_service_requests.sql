{{ config(
    materialized='view',
    tags=['jazan', 'staging', 'service_quality'],
    meta={
        'owner': 'Data & Analytics Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'sensitive'
    }
) }}

/*
    stg_jazan_service_requests
    --------------------------
    Typed, cleaned staging over raw_jazan.service_requests.

    Source: Balady service-request channel + walk-in/call-centre logs ingested via MAKEEN.
    Grain:  one row per service request (request_id).

    The service-request universe spans many request types (street lighting, waste
    collection, road maintenance, water leaks, sewerage, public-facility issues, etc).
    SLA varies by request_type and priority. SLA matrix sourced from
    governance/policies.yaml#service_request_sla.
*/

with source as (

    select *
    from {{ source('raw_jazan', 'service_requests') }}

),

typed as (

    select
        cast(request_id as varchar(64))                       as request_id,
        cast(municipality_id as varchar(8))                   as municipality_id,
        cast(district_code as varchar(16))                    as district_code,
        cast(channel as varchar(32))                          as channel_raw,
        cast(request_type as varchar(64))                     as request_type_raw,
        cast(priority as varchar(16))                         as priority_raw,
        cast(submitted_at as timestamp)                       as submitted_at,
        cast(acknowledged_at as timestamp)                    as acknowledged_at,
        cast(assigned_at as timestamp)                        as assigned_at,
        cast(completed_at as timestamp)                       as completed_at,
        cast(status as varchar(32))                           as status_raw,
        cast(reopened_count as integer)                       as reopened_count,
        cast(citizen_satisfaction_score as numeric(3,2))      as citizen_satisfaction_score_raw,
        cast(load_ts as timestamp)                            as ingestion_ts
    from source

),

normalised as (

    select
        request_id,
        municipality_id,
        district_code,
        case lower(trim(channel_raw))
            when 'balady'   then 'balady'
            when 'app'      then 'balady'
            when 'call'     then 'call_centre'
            when 'walk_in'  then 'walk_in'
            else 'other'
        end                                                  as channel,

        case lower(trim(request_type_raw))
            when 'street lighting'      then 'street_lighting'
            when 'street_lighting'      then 'street_lighting'
            when 'waste collection'     then 'waste_collection'
            when 'waste_collection'     then 'waste_collection'
            when 'road maintenance'     then 'road_maintenance'
            when 'water leak'           then 'water_leak'
            when 'sewer overflow'       then 'sewer_overflow'
            when 'public facility'      then 'public_facility'
            when 'tree maintenance'     then 'tree_maintenance'
            when 'pest control'         then 'pest_control'
            when 'noise complaint'      then 'noise_complaint'
            else 'other'
        end                                                  as request_type,

        case lower(trim(priority_raw))
            when 'urgent' then 'urgent'
            when 'high'   then 'high'
            when 'normal' then 'normal'
            when 'low'    then 'low'
            else 'normal'
        end                                                  as priority,

        submitted_at,
        acknowledged_at,
        assigned_at,
        completed_at,

        case lower(trim(status_raw))
            when 'completed'    then 'completed'
            when 'closed'       then 'completed'
            when 'in_progress'  then 'in_progress'
            when 'assigned'     then 'assigned'
            when 'acknowledged' then 'acknowledged'
            when 'submitted'    then 'submitted'
            when 'rejected'     then 'rejected'
            else 'unknown'
        end                                                  as status,

        reopened_count,
        nullif(citizen_satisfaction_score_raw, -1)           as citizen_satisfaction_score,
        ingestion_ts
    from typed
    where municipality_id is not null

),

with_sla as (

    select
        n.*,

        -- SLA in hours derived from (request_type, priority); values match governance/policies.yaml
        case
            when priority = 'urgent'                                              then 4
            when request_type in ('water_leak', 'sewer_overflow') and priority = 'high' then 8
            when request_type in ('water_leak', 'sewer_overflow')                 then 24
            when request_type = 'street_lighting' and priority = 'high'           then 24
            when request_type = 'street_lighting'                                 then 72
            when request_type = 'waste_collection'                                then 24
            when request_type = 'road_maintenance' and priority = 'high'          then 72
            when request_type = 'road_maintenance'                                then 336   -- 14 days
            when priority = 'high'                                                then 48
            when priority = 'normal'                                              then 120   -- 5 days
            else 240                                                                          -- 10 days
        end                                                  as sla_hours,

        case
            when completed_at is not null
            then extract(epoch from (completed_at - submitted_at)) / 3600.0
            else null
        end                                                  as resolution_hours

    from normalised n

),

derived as (

    select
        *,
        case
            when status = 'completed'
                 and resolution_hours <= sla_hours
            then true
            when status = 'completed'
            then false
            else null
        end                                                  as completed_within_sla,

        case
            when reopened_count > 0 then true
            else false
        end                                                  as was_reopened

    from with_sla

)

select * from derived
