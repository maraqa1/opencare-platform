{{ config(
    materialized='incremental',
    unique_key='recovery_outcome_id',
    tags=['jazan', 'decision', 'recovery_outcome'],
    meta={
        'owner': 'Performance Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'Measured recovery outcome 30 days after a corrective action closes. This is the feedback loop: it tells the platform whether the recommended intervention actually worked, which then feeds the recommendation effectiveness ranking for future cases.'
    }
) }}

/*
    jazan_visual_distortion_recovery_outcome
    ----------------------------------------
    Before/target/after measurement for each corrective action closure.

    Logic:
      - For every corrective action that closed at least 30 days ago,
        compute the KPI value 30 days after closure
      - Compare to the KPI value at the moment of the original decision candidate
      - Record recovery delta, sustained-recovery indicator, and intervention link

    This model is the closed-loop. Its output drives:
      - the workspace "outcome feedback" screen
      - the recommendation engine's effectiveness ranking
      - the MOMRAH evidence pack
*/

with closed_actions as (

    select
        action_id,
        decision_candidate_id,
        municipality_id,
        kpi_id,
        baseline_kpi_value,
        recommended_intervention_id,
        intervention_type,
        action_started_at,
        action_closed_at,
        baseline_evidence_month,
        contributing_signals_json,
        verified_by_user,
        verified_at,
        evidence_pack_uri
    from {{ ref('jazan_decision_action_events') }}
    where decision_status = 'closed'
      and action_closed_at <= dateadd('day', -30, current_date)
    {% if is_incremental() %}
      and action_closed_at > (select coalesce(max(action_closed_at), '1900-01-01') from {{ this }})
    {% endif %}

),

post_action_kpi as (

    -- KPI value in the month that is 30 days after action closure
    -- For KPI 1: visual_distortion_closure_quality
    select
        ca.action_id,
        ca.municipality_id,
        ca.kpi_id,
        f.month_start_date                                            as post_action_month,
        f.visual_distortion_closure_quality                           as post_action_kpi_value
    from closed_actions ca
    join {{ ref('fct_jazan_visual_distortion_performance') }} f
      on ca.municipality_id = f.municipality_id
     and f.month_start_date = date_trunc('month', dateadd('day', 30, ca.action_closed_at))
    where ca.kpi_id = 'visual_distortion_closure_quality'

    union all

    -- For KPI 2: service_request_closure_rate
    select
        ca.action_id,
        ca.municipality_id,
        ca.kpi_id,
        s.month_start_date                                            as post_action_month,
        s.service_request_closure_rate                                as post_action_kpi_value
    from closed_actions ca
    join {{ ref('fct_jazan_service_quality') }} s
      on ca.municipality_id = s.municipality_id
     and s.month_start_date = date_trunc('month', dateadd('day', 30, ca.action_closed_at))
    where ca.kpi_id = 'service_request_closure_rate'

),

post_action_sustained as (

    -- KPI value in the month that is 90 days after action closure (for sustained recovery)
    select
        ca.action_id,
        f.visual_distortion_closure_quality                           as kpi_at_day_90
    from closed_actions ca
    join {{ ref('fct_jazan_visual_distortion_performance') }} f
      on ca.municipality_id = f.municipality_id
     and f.month_start_date = date_trunc('month', dateadd('day', 90, ca.action_closed_at))
    where ca.kpi_id = 'visual_distortion_closure_quality'

    union all

    select
        ca.action_id,
        s.service_request_closure_rate                                as kpi_at_day_90
    from closed_actions ca
    join {{ ref('fct_jazan_service_quality') }} s
      on ca.municipality_id = s.municipality_id
     and s.month_start_date = date_trunc('month', dateadd('day', 90, ca.action_closed_at))
    where ca.kpi_id = 'service_request_closure_rate'

),

target_table as (

    -- governed target per KPI from business/kpis.yaml
    select cast('visual_distortion_closure_quality' as varchar(64))   as kpi_id, 0.85::numeric as target_value
    union all
    select 'service_request_closure_rate',                                       0.90::numeric

),

joined as (

    select
        ca.action_id                                                  as action_id,
        ca.decision_candidate_id,
        ca.municipality_id,
        ca.kpi_id,
        ca.recommended_intervention_id,
        ca.intervention_type,
        ca.action_started_at,
        ca.action_closed_at,
        ca.verified_by_user,
        ca.verified_at,
        ca.evidence_pack_uri,
        ca.baseline_kpi_value,
        tt.target_value,
        pa.post_action_kpi_value,
        ps.kpi_at_day_90,

        (pa.post_action_kpi_value - ca.baseline_kpi_value)            as recovery_delta_30d,

        case
            when pa.post_action_kpi_value >= tt.target_value
            then true else false
        end                                                           as recovered_above_target,

        case
            when ps.kpi_at_day_90 is not null
                 and ps.kpi_at_day_90 >= tt.target_value
            then true
            when ps.kpi_at_day_90 is null
            then null
            else false
        end                                                           as sustained_at_day_90
    from closed_actions ca
    left join post_action_kpi       pa on ca.action_id = pa.action_id
    left join post_action_sustained ps on ca.action_id = ps.action_id
    left join target_table          tt on ca.kpi_id    = tt.kpi_id

),

final as (

    select
        {{ dbt_utils.generate_surrogate_key([
            'action_id', 'action_closed_at'
        ]) }}                                                         as recovery_outcome_id,

        action_id,
        decision_candidate_id,
        municipality_id,
        kpi_id,
        recommended_intervention_id,
        intervention_type,
        action_started_at,
        action_closed_at,
        verified_by_user,
        verified_at,
        evidence_pack_uri,

        round(baseline_kpi_value::numeric,    4)                       as baseline_kpi_value,
        round(target_value::numeric,          4)                       as target_value,
        round(post_action_kpi_value::numeric, 4)                       as post_action_kpi_value,
        round(kpi_at_day_90::numeric,         4)                       as kpi_at_day_90,
        round(recovery_delta_30d::numeric,    4)                       as recovery_delta_30d,
        recovered_above_target,
        sustained_at_day_90,

        case
            when recovered_above_target = true and sustained_at_day_90 = true       then 'high'
            when recovered_above_target = true and sustained_at_day_90 is null      then 'pending_sustainment'
            when recovered_above_target = true                                      then 'recovered_not_sustained'
            when recovery_delta_30d > 0                                             then 'partial'
            when recovery_delta_30d <= 0                                            then 'no_improvement'
            else 'unknown'
        end                                                            as intervention_effectiveness_tier,

        current_timestamp                                              as computed_at
    from joined

)

select * from final
