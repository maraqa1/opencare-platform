{{ config(materialized='table', tags=['jazan','analytics','service_coverage'], meta={'owner':'Data & Analytics Office','steward':'Data & Analytics Office','sensitivity_class':'internal','certification_status':'derived_proxy'}) }}

-- Derived municipal service-coverage fact for KPI-USC-04.
-- Grain: one row per (municipality_id, month_start_date).

with service_quality as (
    select * from {{ ref('fct_jazan_service_quality') }}
),
coverage as (
    select
        municipality_id,
        month_start_date,
        greatest(0.0, least(1.0,
            coalesce(service_request_closure_rate, 0.0) * 0.70
            + (1.0 - coalesce(reopen_rate, 0.0)) * 0.20
            + coalesce(avg_request_satisfaction_score, 0.70) * 0.10
        ))::numeric as service_coverage_rate,
        requests_received as service_requests_observed,
        requests_completed as service_requests_completed,
        type_street_lighting,
        type_waste_collection,
        type_road_maintenance,
        type_water_leak,
        type_sewer_overflow,
        last_refreshed_at
    from service_quality
)
select * from coverage
