{{ config(materialized='table', tags=['jazan','output','anomaly','derived_runtime_proxy']) }}

-- Deterministic anomaly proxy for the golden bundle. Production may replace this with runtime image output.

select
    municipality_id,
    'visual_distortion_closure_quality'::varchar(64) as kpi_id,
    month_start_date as observation_month,
    case when visual_distortion_closure_quality < 0.75 then -2.5 else 0.2 end::numeric as z_score,
    case when visual_distortion_closure_quality < 0.75 then 'high' else 'low' end::varchar(16) as severity_tier,
    current_timestamp as last_refreshed_at
from {{ ref('fct_jazan_visual_distortion_performance') }}
where month_start_date = (select max(month_start_date) from {{ ref('fct_jazan_visual_distortion_performance') }})

union all

select
    municipality_id,
    'service_request_closure_rate'::varchar(64) as kpi_id,
    month_start_date as observation_month,
    case when service_request_closure_rate < 0.85 then -2.2 else 0.1 end::numeric as z_score,
    case when service_request_closure_rate < 0.85 then 'high' else 'low' end::varchar(16) as severity_tier,
    current_timestamp as last_refreshed_at
from {{ ref('fct_jazan_service_quality') }}
where month_start_date = (select max(month_start_date) from {{ ref('fct_jazan_service_quality') }})
