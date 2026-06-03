{{ config(materialized='table', tags=['jazan','analytics','permit_performance'], meta={'owner':'Data & Analytics Office','steward':'Data & Analytics Office','sensitivity_class':'internal','certification_status':'derived_proxy'}) }}

-- Derived municipal permit-performance fact for the golden bundle standard.
-- Grain: one row per (municipality_id, month_start_date).
-- This proxy model makes KPI-PIT-03 materially buildable in the bundle using the current available service-quality mart.

with service_quality as (
    select * from {{ ref('fct_jazan_service_quality') }}
),
permit_proxy as (
    select
        municipality_id,
        month_start_date,
        requests_received as permit_applications_received,
        requests_completed as permits_issued,
        coalesce(avg_resolution_hours, 0) / 24.0 as avg_permit_issuance_days,
        5.0::numeric as permit_issuance_target_days,
        case
            when coalesce(avg_resolution_hours, 0) / 24.0 <= 5.0 then true
            else false
        end as permit_issuance_within_target_flag,
        case
            when coalesce(avg_resolution_hours, 0) / 24.0 > 7.0 then true
            else false
        end as permit_issuance_breach_flag,
        service_request_closure_rate,
        last_refreshed_at
    from service_quality
)
select * from permit_proxy
