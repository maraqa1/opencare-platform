{{ config(materialized='table', tags=['jazan','output','intervention_corpus']) }}

-- Seed intervention corpus for recommendation matching.

select
    'INT-VD-001'::varchar(64) as intervention_id,
    'Jazan'::varchar(64) as source_region,
    'JZN-001'::varchar(8) as source_municipality_id,
    'unknown'::varchar(32) as source_municipality_archetype,
    'unknown'::varchar(32) as source_population_band,
    'visual_distortion_closure_quality'::varchar(64) as kpi_id,
    'high'::varchar(16) as severity_tier_at_intervention,
    'unlicensed_billboard'::varchar(64) as distortion_category,
    'targeted_inspection_campaign'::varchar(64) as intervention_type,
    'Run targeted inspection campaign and evidence review.'::text as intervention_summary,
    'تنفيذ حملة تفتيش موجهة ومراجعة الأدلة.'::text as intervention_summary_ar,
    0.12::numeric as measured_recovery_delta,
    21::integer as days_to_recovery,
    true as sustained_recovery_flag,
    'evidence://jazan/interventions/INT-VD-001'::varchar(256) as evidence_pack_uri,
    extract(year from current_date)::integer as executed_in_year

union all

select
    'INT-SR-001'::varchar(64),
    'Jazan'::varchar(64),
    'JZN-001'::varchar(8),
    'unknown'::varchar(32),
    'unknown'::varchar(32),
    'service_request_closure_rate'::varchar(64),
    'high'::varchar(16),
    'service_request'::varchar(64),
    'sla_backlog_sprint'::varchar(64),
    'Run SLA backlog sprint and daily closure review.'::text,
    'تنفيذ حملة إغلاق للطلبات المتأخرة ومراجعة يومية.'::text,
    0.10::numeric,
    14::integer,
    true,
    'evidence://jazan/interventions/INT-SR-001'::varchar(256),
    extract(year from current_date)::integer
