{{ config(materialized='table', tags=['jazan','analytics','emergency_readiness'], meta={'owner':'Data & Analytics Office','steward':'Data & Analytics Office','sensitivity_class':'internal','certification_status':'derived_proxy'}) }}

-- Derived emergency-readiness fact for KPI-ERR-05.
-- Grain: one row per (municipality_id, month_start_date).

with service_quality as (
    select * from {{ ref('fct_jazan_service_quality') }}
),
visual as (
    select * from {{ ref('fct_jazan_visual_distortion_performance') }}
),
joined as (
    select
        sq.municipality_id,
        sq.month_start_date,
        coalesce(sq.service_request_closure_rate, 0.0) as service_request_closure_rate,
        coalesce(v.visual_distortion_closure_quality, 0.0) as visual_distortion_closure_quality,
        coalesce(v.cases_critical, 0) as critical_visual_cases,
        coalesce(v.cases_high, 0) as high_visual_cases,
        sq.last_refreshed_at
    from service_quality sq
    left join visual v
      on sq.municipality_id = v.municipality_id
     and sq.month_start_date = v.month_start_date
),
readiness as (
    select
        municipality_id,
        month_start_date,
        greatest(0.0, least(1.0,
            service_request_closure_rate * 0.45
            + visual_distortion_closure_quality * 0.45
            + case when (critical_visual_cases + high_visual_cases) = 0 then 0.10 else 0.0 end
        ))::numeric as emergency_readiness_composite,
        critical_visual_cases,
        high_visual_cases,
        last_refreshed_at
    from joined
)
select * from readiness
