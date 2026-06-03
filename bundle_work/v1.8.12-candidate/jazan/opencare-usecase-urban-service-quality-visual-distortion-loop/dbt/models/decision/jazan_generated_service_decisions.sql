{{ config(
    materialized='incremental',
    unique_key='decision_candidate_id',
    tags=['jazan', 'decision', 'runtime_output'],
    meta={
        'owner': 'Performance Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'Generated decision candidates from forecast, anomaly, risk and recommendation runtimes. NEVER autonomously acted upon - every candidate requires a Performance Office reviewer to approve, revise, escalate, ticket, or notify. Each candidate captures the full evidence pack at the time of generation.',
        'human_in_the_loop': True
    }
) }}

/*
    jazan_generated_service_decisions
    ---------------------------------
    Decision candidate generator.

    Inputs:
      - output.jazan_municipality_service_risk_score   (which municipalities to act on)
      - output.jazan_recommended_intervention          (what to do)
      - analytics.fct_jazan_visual_distortion_performance / fct_jazan_service_quality
                                                       (current evidence)

    Output:
      - decision.jazan_generated_service_decisions
      - one row per (municipality, kpi, generation_run_date) that is in high/critical
        risk AND does not already have an open candidate or active corrective action

    Important business rules (governed in contracts/decision.yaml):
      1. NEVER overwrite an existing open candidate. A new candidate is suppressed
         while one is "awaiting review" or "under revision".
      2. NEVER create a candidate while a corrective action is active for the same
         (municipality, kpi) - wait for measurement to close the loop.
      3. Every candidate carries the evidence snapshot at the moment of generation,
         not a live link. This makes the audit record immutable.
*/

with current_risk as (

    select
        municipality_id,
        kpi_id,
        composite_risk_score,
        risk_tier,
        signal_forecast,
        signal_anomaly,
        signal_recurrence,
        signal_complaint,
        contrib_forecast,
        contrib_anomaly,
        contrib_recurrence,
        contrib_complaint,
        score_date
    from {{ ref('jazan_municipality_service_risk_score') }}
    where risk_tier in ('high', 'critical')
      and score_date = current_date

),

recommendations_packed as (

    select
        municipality_id,
        kpi_id,
        array_agg(
            json_build_object(
                'rank',                  recommendation_rank,
                'intervention_id',       recommendation_id,
                'intervention_type',     intervention_type,
                'summary',               intervention_summary,
                'summary_ar',            intervention_summary_ar,
                'source_region',         source_region,
                'measured_recovery',     measured_recovery_delta,
                'days_to_recovery',      days_to_recovery,
                'sustained',             sustained_recovery_flag,
                'similarity_score',      similarity_score,
                'effectiveness_score',   effectiveness_score
            )
            order by recommendation_rank
        )                                                     as recommendations_json
    from {{ ref('jazan_recommended_intervention') }}
    where recommendation_rank <= 3
    group by 1, 2

),

evidence_snapshot as (

    select
        municipality_id,
        cast('visual_distortion_closure_quality' as varchar(64))      as kpi_id,
        month_start_date                                              as evidence_month,
        visual_distortion_closure_quality                             as current_kpi_value,
        cases_opened, cases_closed, cases_meeting_quality_bar,
        closure_within_sla_rate, evidence_verification_rate,
        repeat_offender_rate, avg_resolution_hours, avg_evidence_completeness
    from {{ ref('fct_jazan_visual_distortion_performance') }}
    where month_start_date = (
        select max(month_start_date) from {{ ref('fct_jazan_visual_distortion_performance') }}
    )

    union all

    select
        municipality_id,
        cast('service_request_closure_rate' as varchar(64))           as kpi_id,
        month_start_date                                              as evidence_month,
        service_request_closure_rate                                  as current_kpi_value,
        requests_received as cases_opened,
        requests_completed as cases_closed,
        requests_completed_within_sla as cases_meeting_quality_bar,
        cast(null as numeric) as closure_within_sla_rate,
        cast(null as numeric) as evidence_verification_rate,
        reopen_rate as repeat_offender_rate,
        avg_resolution_hours,
        cast(null as numeric) as avg_evidence_completeness
    from {{ ref('fct_jazan_service_quality') }}
    where month_start_date = (
        select max(month_start_date) from {{ ref('fct_jazan_service_quality') }}
    )

),

open_candidates_and_actions as (

    -- suppression set: anything currently open for this (muni, kpi)
    select distinct municipality_id, kpi_id
    from {{ ref('jazan_decision_action_events') }}
    where decision_status in (
        'awaiting_review', 'under_revision',
        'assigned', 'in_progress', 'evidence_submitted'
    )
    {% if is_incremental() %}
      and event_ts > (select coalesce(max(generated_at), '1900-01-01') from {{ this }})
    {% endif %}

),

candidates as (

    select
        cr.municipality_id,
        cr.kpi_id,
        cr.composite_risk_score,
        cr.risk_tier,
        cr.score_date,
        cr.contrib_forecast,
        cr.contrib_anomaly,
        cr.contrib_recurrence,
        cr.contrib_complaint,
        es.evidence_month,
        es.current_kpi_value,
        es.cases_opened,
        es.cases_closed,
        es.cases_meeting_quality_bar,
        es.closure_within_sla_rate,
        es.evidence_verification_rate,
        es.repeat_offender_rate,
        es.avg_resolution_hours,
        es.avg_evidence_completeness,
        rp.recommendations_json
    from current_risk cr
    left join evidence_snapshot es
      on cr.municipality_id = es.municipality_id
     and cr.kpi_id = es.kpi_id
    left join recommendations_packed rp
      on cr.municipality_id = rp.municipality_id
     and cr.kpi_id = rp.kpi_id
    left join open_candidates_and_actions oc
      on cr.municipality_id = oc.municipality_id
     and cr.kpi_id = oc.kpi_id
    where oc.municipality_id is null              -- suppression rule

),

final as (

    select
        -- stable, reproducible candidate id
        {{ dbt_utils.generate_surrogate_key([
            'municipality_id', 'kpi_id', 'score_date'
        ]) }}                                                        as decision_candidate_id,

        municipality_id,
        kpi_id,
        risk_tier,
        composite_risk_score,
        score_date,

        contrib_forecast,
        contrib_anomaly,
        contrib_recurrence,
        contrib_complaint,

        evidence_month,
        current_kpi_value,
        cases_opened,
        cases_closed,
        cases_meeting_quality_bar,
        closure_within_sla_rate,
        evidence_verification_rate,
        repeat_offender_rate,
        avg_resolution_hours,
        avg_evidence_completeness,

        recommendations_json,

        -- governance flags
        true                                                         as human_approval_required,
        false                                                        as ready_for_external_notification,

        -- status starts at awaiting_review
        cast('awaiting_review' as varchar(32))                       as decision_status,
        current_timestamp                                            as generated_at,

        -- runtime provenance: which runtime IDs contributed (audit)
        json_build_object(
            'forecast_runtime',      'rt_jazan_service_rnn_forecast',
            'anomaly_runtime',       'rt_jazan_service_anomaly',
            'risk_score_model',      'jazan_municipality_service_risk_score',
            'recommendation_model',  'jazan_recommended_intervention',
            'decision_runtime',      'rt_jazan_decision_candidate'
        )                                                            as runtime_provenance

    from candidates

)

select * from final
{% if is_incremental() %}
where generated_at > (select coalesce(max(generated_at), '1900-01-01') from {{ this }})
{% endif %}
