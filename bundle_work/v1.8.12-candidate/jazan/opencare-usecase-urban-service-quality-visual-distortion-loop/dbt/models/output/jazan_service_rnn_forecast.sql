{{ config(materialized='table', tags=['jazan','output','forecast','derived_runtime_proxy']) }}

-- Deterministic forecast proxy for the golden bundle. Production may replace this with runtime image output.

select
    municipality_id,
    'visual_distortion_closure_quality'::varchar(64) as kpi_id,
    current_date as forecast_made_at,
    (current_date + interval '8 weeks')::date as forecast_horizon_end,
    case
        when visual_distortion_closure_quality is null then 0.50
        when visual_distortion_closure_quality < 0.75 then 0.85
        when visual_distortion_closure_quality < 0.85 then 0.45
        else 0.15
    end::numeric as breach_probability,
    current_timestamp as last_refreshed_at
from {{ ref('fct_jazan_visual_distortion_performance') }}
where month_start_date = (select max(month_start_date) from {{ ref('fct_jazan_visual_distortion_performance') }})

union all

select
    municipality_id,
    'service_request_closure_rate'::varchar(64) as kpi_id,
    current_date as forecast_made_at,
    (current_date + interval '8 weeks')::date as forecast_horizon_end,
    case
        when service_request_closure_rate is null then 0.50
        when service_request_closure_rate < 0.85 then 0.80
        when service_request_closure_rate < 0.90 then 0.40
        else 0.12
    end::numeric as breach_probability,
    current_timestamp as last_refreshed_at
from {{ ref('fct_jazan_service_quality') }}
where month_start_date = (select max(month_start_date) from {{ ref('fct_jazan_service_quality') }})
