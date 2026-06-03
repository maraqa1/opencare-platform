{{ config(
    materialized='table',
    tags=['jazan', 'analytics', 'visual_distortion'],
    meta={
        'owner': 'Data & Analytics Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'Monthly municipal visual-distortion performance fact. Authoritative for MOMRAH KPI 1 reporting and the platform forecast/anomaly/risk runtimes.'
    }
) }}

/*
    fct_jazan_visual_distortion_performance
    ---------------------------------------
    Monthly fact at municipality grain.
    Authoritative source for:
      - KPI 1: visual_distortion_closure_quality
      - RNN forecast input
      - Anomaly detection input
      - Composite risk score (KPI 1 contribution)

    Grain: one row per (municipality_id, month_start_date).

    Each measure is named to match business/kpis.yaml and dictionary_terms.yaml.
*/

with cases as (

    select * from {{ ref('stg_jazan_visual_distortion_cases') }}

),

months as (

    -- generate 24-month rolling window per municipality
    select
        m.municipality_id,
        cast(date_trunc('month', d.day) as date)             as month_start_date
    from {{ ref('stg_jazan_municipalities') }} m
    cross join {{ ref('date_spine') }} d
    where d.day >= dateadd('month', -24, current_date)
      and d.day <= current_date
    group by 1, 2

),

cases_by_month as (

    select
        municipality_id,
        cast(date_trunc('month', coalesce(closed_at, reported_at)) as date) as month_start_date,
        count(*)                                             as cases_opened,
        count(*) filter (where case_status in ('closed_verified', 'closed_unverified')) as cases_closed,
        count(*) filter (where case_status = 'closed_verified')                          as cases_closed_verified,
        count(*) filter (where closed_within_sla = true)                                 as cases_closed_within_sla,
        count(*) filter (where closure_meets_quality_bar = true)                         as cases_meeting_quality_bar,
        count(*) filter (where repeat_offender_flag = true)                              as cases_repeat_offender,
        avg(case when closed_at is not null then resolution_hours end)                   as avg_resolution_hours,
        avg(evidence_completeness_score)                                                  as avg_evidence_completeness,
        sum(case when severity = 'critical' then 1 else 0 end)                           as cases_critical,
        sum(case when severity = 'high'     then 1 else 0 end)                           as cases_high,
        sum(case when severity = 'medium'   then 1 else 0 end)                           as cases_medium,
        sum(case when severity = 'low'      then 1 else 0 end)                           as cases_low
    from cases
    where reported_at is not null
    group by 1, 2

),

joined as (

    select
        m.municipality_id,
        m.month_start_date,
        coalesce(c.cases_opened, 0)              as cases_opened,
        coalesce(c.cases_closed, 0)              as cases_closed,
        coalesce(c.cases_closed_verified, 0)     as cases_closed_verified,
        coalesce(c.cases_closed_within_sla, 0)   as cases_closed_within_sla,
        coalesce(c.cases_meeting_quality_bar, 0) as cases_meeting_quality_bar,
        coalesce(c.cases_repeat_offender, 0)     as cases_repeat_offender,
        c.avg_resolution_hours,
        c.avg_evidence_completeness,
        coalesce(c.cases_critical, 0)            as cases_critical,
        coalesce(c.cases_high, 0)                as cases_high,
        coalesce(c.cases_medium, 0)              as cases_medium,
        coalesce(c.cases_low, 0)                 as cases_low
    from months m
    left join cases_by_month c
      on m.municipality_id = c.municipality_id
     and m.month_start_date = c.month_start_date

),

with_kpi as (

    select
        *,

        -- KPI 1: visual_distortion_closure_quality
        -- Definition (governed in business/kpis.yaml):
        --   (cases closed meeting full quality bar) / (total cases closed)
        -- Null when no cases closed in month (do not report on zero denominator).
        case
            when cases_closed > 0
            then cases_meeting_quality_bar::numeric / cases_closed::numeric
            else null
        end                                                  as visual_distortion_closure_quality,

        case
            when cases_closed > 0
            then cases_closed_within_sla::numeric / cases_closed::numeric
            else null
        end                                                  as closure_within_sla_rate,

        case
            when cases_closed > 0
            then cases_closed_verified::numeric / cases_closed::numeric
            else null
        end                                                  as evidence_verification_rate,

        case
            when cases_opened > 0
            then cases_repeat_offender::numeric / cases_opened::numeric
            else null
        end                                                  as repeat_offender_rate

    from joined

)

select
    municipality_id,
    month_start_date,
    cases_opened,
    cases_closed,
    cases_closed_verified,
    cases_closed_within_sla,
    cases_meeting_quality_bar,
    cases_repeat_offender,
    avg_resolution_hours,
    avg_evidence_completeness,
    cases_critical,
    cases_high,
    cases_medium,
    cases_low,
    visual_distortion_closure_quality,    -- KPI 1
    closure_within_sla_rate,
    evidence_verification_rate,
    repeat_offender_rate,
    current_timestamp                                       as last_refreshed_at
from with_kpi
