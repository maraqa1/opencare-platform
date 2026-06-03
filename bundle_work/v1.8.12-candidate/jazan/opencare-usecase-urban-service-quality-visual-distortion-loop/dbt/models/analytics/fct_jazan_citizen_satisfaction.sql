{{ config(materialized='table', tags=['jazan','analytics','citizen_satisfaction'], meta={'owner':'Data & Analytics Office','steward':'Data & Analytics Office','sensitivity_class':'internal','certification_status':'derived_proxy'}) }}

-- Derived citizen-satisfaction fact for KPI-CSI-06.
-- Grain: one row per (municipality_id, month_start_date).

with service_quality as (
    select * from {{ ref('fct_jazan_service_quality') }}
),
satisfaction as (
    select
        municipality_id,
        month_start_date,
        greatest(0.0, least(1.0,
            coalesce(avg_request_satisfaction_score, 0.70) * 0.65
            + coalesce(service_request_closure_rate, 0.0) * 0.25
            + (1.0 - coalesce(reopen_rate, 0.0)) * 0.10
        ))::numeric as weighted_satisfaction_index,
        avg_request_satisfaction_score,
        requests_received,
        requests_completed,
        reopen_rate,
        last_refreshed_at
    from service_quality
)
select * from satisfaction
