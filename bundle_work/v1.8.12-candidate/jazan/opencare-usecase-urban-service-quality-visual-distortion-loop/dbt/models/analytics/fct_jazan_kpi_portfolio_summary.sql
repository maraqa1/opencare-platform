{{ config(materialized='table', tags=['jazan','analytics','portfolio_summary']) }}

-- Portfolio summary across the six KPI tracks declared in business/kpis.yaml.

select municipality_id, month_start_date, 'KPI-VDQ-01'::varchar(32) as kpi_id, visual_distortion_closure_quality::numeric as kpi_value, 0.85::numeric as target_value, last_refreshed_at from {{ ref('fct_jazan_visual_distortion_performance') }}
union all
select municipality_id, month_start_date, 'KPI-SRC-02'::varchar(32), service_request_closure_rate::numeric, 0.90::numeric, last_refreshed_at from {{ ref('fct_jazan_service_quality') }}
union all
select municipality_id, month_start_date, 'KPI-PIT-03'::varchar(32), avg_permit_issuance_days::numeric, 5.0::numeric, last_refreshed_at from {{ ref('fct_jazan_permit_performance') }}
union all
select municipality_id, month_start_date, 'KPI-USC-04'::varchar(32), service_coverage_rate::numeric, 0.95::numeric, last_refreshed_at from {{ ref('fct_jazan_service_coverage') }}
union all
select municipality_id, month_start_date, 'KPI-ERR-05'::varchar(32), emergency_readiness_composite::numeric, 0.80::numeric, last_refreshed_at from {{ ref('fct_jazan_emergency_readiness') }}
union all
select municipality_id, month_start_date, 'KPI-CSI-06'::varchar(32), weighted_satisfaction_index::numeric, 0.75::numeric, last_refreshed_at from {{ ref('fct_jazan_citizen_satisfaction') }}
