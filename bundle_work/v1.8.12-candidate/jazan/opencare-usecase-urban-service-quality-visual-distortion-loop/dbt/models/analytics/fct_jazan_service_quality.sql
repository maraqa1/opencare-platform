{{ config(
    materialized='table',
    tags=['jazan', 'analytics', 'service_quality'],
    meta={
        'owner': 'Data & Analytics Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'Monthly municipal service-request performance fact. Authoritative for MOMRAH KPI 2 (service request closure rate) and per-request-type breakdowns used in the model intelligence screen.'
    }
) }}

/*
    fct_jazan_service_quality
    -------------------------
    Monthly fact at municipality grain.
    Authoritative source for:
      - KPI 2: service_request_closure_rate
      - per-request-type SLA performance
      - reopened-request signal (quality indicator)
      - citizen satisfaction at the request grain (rolls up to KPI 6 in the satisfaction mart)

    Grain: one row per (municipality_id, month_start_date).
*/

with requests as (

    select * from {{ ref('stg_jazan_service_requests') }}

),

months as (

    select
        m.municipality_id,
        cast(date_trunc('month', d.day) as date)             as month_start_date
    from {{ ref('stg_jazan_municipalities') }} m
    cross join {{ ref('date_spine') }} d
    where d.day >= dateadd('month', -24, current_date)
      and d.day <= current_date
    group by 1, 2

),

requests_by_month as (

    select
        municipality_id,
        cast(date_trunc('month', coalesce(completed_at, submitted_at)) as date) as month_start_date,
        count(*)                                                                 as requests_received,
        count(*) filter (where status = 'completed')                             as requests_completed,
        count(*) filter (where completed_within_sla = true)                      as requests_completed_within_sla,
        count(*) filter (where was_reopened = true)                              as requests_reopened,
        count(*) filter (where status = 'rejected')                              as requests_rejected,
        avg(case when status = 'completed' then resolution_hours end)            as avg_resolution_hours,
        avg(citizen_satisfaction_score)                                          as avg_request_satisfaction_score,

        -- per-type breakdowns
        count(*) filter (where request_type = 'street_lighting')                 as type_street_lighting,
        count(*) filter (where request_type = 'waste_collection')                as type_waste_collection,
        count(*) filter (where request_type = 'road_maintenance')                as type_road_maintenance,
        count(*) filter (where request_type = 'water_leak')                      as type_water_leak,
        count(*) filter (where request_type = 'sewer_overflow')                  as type_sewer_overflow,

        count(*) filter (where channel = 'balady')                               as ch_balady,
        count(*) filter (where channel = 'call_centre')                          as ch_call_centre,
        count(*) filter (where channel = 'walk_in')                              as ch_walk_in
    from requests
    where submitted_at is not null
    group by 1, 2

),

joined as (

    select
        m.municipality_id,
        m.month_start_date,
        coalesce(r.requests_received, 0)               as requests_received,
        coalesce(r.requests_completed, 0)              as requests_completed,
        coalesce(r.requests_completed_within_sla, 0)   as requests_completed_within_sla,
        coalesce(r.requests_reopened, 0)               as requests_reopened,
        coalesce(r.requests_rejected, 0)               as requests_rejected,
        r.avg_resolution_hours,
        r.avg_request_satisfaction_score,
        coalesce(r.type_street_lighting, 0)            as type_street_lighting,
        coalesce(r.type_waste_collection, 0)           as type_waste_collection,
        coalesce(r.type_road_maintenance, 0)           as type_road_maintenance,
        coalesce(r.type_water_leak, 0)                 as type_water_leak,
        coalesce(r.type_sewer_overflow, 0)             as type_sewer_overflow,
        coalesce(r.ch_balady, 0)                       as ch_balady,
        coalesce(r.ch_call_centre, 0)                  as ch_call_centre,
        coalesce(r.ch_walk_in, 0)                      as ch_walk_in
    from months m
    left join requests_by_month r
      on m.municipality_id = r.municipality_id
     and m.month_start_date = r.month_start_date

),

with_kpi as (

    select
        *,
        -- KPI 2: service_request_closure_rate
        -- (requests completed within SLA) / (requests received in month)
        -- Excludes rejected from numerator AND denominator (per MOMRAH guidance)
        case
            when (requests_received - requests_rejected) > 0
            then requests_completed_within_sla::numeric
                 / (requests_received - requests_rejected)::numeric
            else null
        end                                                  as service_request_closure_rate,

        case
            when requests_completed > 0
            then requests_reopened::numeric / requests_completed::numeric
            else null
        end                                                  as reopen_rate,

        case
            when requests_received > 0
            then requests_rejected::numeric / requests_received::numeric
            else null
        end                                                  as rejection_rate

    from joined

)

select
    municipality_id,
    month_start_date,
    requests_received,
    requests_completed,
    requests_completed_within_sla,
    requests_reopened,
    requests_rejected,
    avg_resolution_hours,
    avg_request_satisfaction_score,
    service_request_closure_rate,                       -- KPI 2
    reopen_rate,
    rejection_rate,
    type_street_lighting,
    type_waste_collection,
    type_road_maintenance,
    type_water_leak,
    type_sewer_overflow,
    ch_balady,
    ch_call_centre,
    ch_walk_in,
    current_timestamp                                   as last_refreshed_at
from with_kpi
