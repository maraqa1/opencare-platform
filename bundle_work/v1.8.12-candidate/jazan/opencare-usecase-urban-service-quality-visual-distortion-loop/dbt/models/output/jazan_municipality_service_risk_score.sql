{{ config(
    materialized='table',
    tags=['jazan', 'output', 'risk_score', 'runtime_output'],
    meta={
        'owner': 'Data Science Runtime',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'Transparent municipality-KPI risk score blending forecast breach probability, anomaly z-score, historical recurrence, and citizen complaint volume. All weights are explicit and explainable to a non-technical reviewer.',
        'explainability': 'feature contributions are returned per row so the workspace can render a stacked-bar breakdown of why the score is what it is'
    }
) }}

/*
    jazan_municipality_service_risk_score
    -------------------------------------
    Composite risk score per (municipality, kpi, score_date).

    This model is intentionally TRANSPARENT and RULE-BASED. It is not an opaque ML
    classifier. The score is a weighted blend of four signals that any reviewer can
    inspect. Weights are governed by contracts/model.yaml#risk_score_weights and can
    be tuned without retraining anything.

    Signals:
      1. forecast_breach_probability   (from output.jazan_service_rnn_forecast)
      2. anomaly_severity              (from output.jazan_service_quality_anomaly)
      3. historical_recurrence_signal  (computed here from the relevant fact mart)
      4. complaint_volume_pressure     (computed here from satisfaction/complaint streams)

    The score is 0–100. The tier banding (low / moderate / high / critical) is also
    governed and is exposed so the workspace can colour-code consistently.
*/

{% set weight_forecast    = var('risk_weight_forecast',    0.38) %}
{% set weight_anomaly     = var('risk_weight_anomaly',     0.24) %}
{% set weight_recurrence  = var('risk_weight_recurrence',  0.18) %}
{% set weight_complaint   = var('risk_weight_complaint',   0.20) %}

with forecast as (

    select
        municipality_id,
        kpi_id,
        forecast_made_at,
        forecast_horizon_end,
        breach_probability
    from {{ ref('jazan_service_rnn_forecast') }}
    where forecast_made_at = (select max(forecast_made_at) from {{ ref('jazan_service_rnn_forecast') }})

),

anomaly as (

    select
        municipality_id,
        kpi_id,
        observation_month,
        z_score,
        severity_tier
    from {{ ref('jazan_service_quality_anomaly') }}
    where observation_month = (select max(observation_month) from {{ ref('jazan_service_quality_anomaly') }})

),

-- Historical recurrence: how often has THIS municipality breached THIS kpi in the last 24 months?
recurrence as (

    select
        municipality_id,
        'visual_distortion_closure_quality' as kpi_id,
        sum(case when visual_distortion_closure_quality is not null
                  and visual_distortion_closure_quality < 0.75
                 then 1 else 0 end)::numeric
            / nullif(count(*) filter (where visual_distortion_closure_quality is not null), 0)::numeric
                                                          as recurrence_rate,
        count(*) filter (where visual_distortion_closure_quality is not null
                           and visual_distortion_closure_quality < 0.75) as months_in_breach
    from {{ ref('fct_jazan_visual_distortion_performance') }}
    where month_start_date >= dateadd('month', -24, current_date)
    group by 1

    union all

    select
        municipality_id,
        'service_request_closure_rate' as kpi_id,
        sum(case when service_request_closure_rate is not null
                  and service_request_closure_rate < 0.90
                 then 1 else 0 end)::numeric
            / nullif(count(*) filter (where service_request_closure_rate is not null), 0)::numeric,
        count(*) filter (where service_request_closure_rate is not null
                           and service_request_closure_rate < 0.90)
    from {{ ref('fct_jazan_service_quality') }}
    where month_start_date >= dateadd('month', -24, current_date)
    group by 1

),

-- Complaint pressure: severity-weighted citizen complaint volume vs municipality baseline
complaint as (

    select
        municipality_id,
        cast('visual_distortion_closure_quality' as varchar(64))     as kpi_id,
        sum(cases_critical * 4 + cases_high * 3 + cases_medium * 2 + cases_low * 1)::numeric
            / nullif(count(*) filter (where cases_opened > 0), 0)
                                                                     as current_pressure
    from {{ ref('fct_jazan_visual_distortion_performance') }}
    where month_start_date >= dateadd('month', -3, current_date)
    group by 1

),

complaint_baseline as (

    select
        municipality_id,
        cast('visual_distortion_closure_quality' as varchar(64))     as kpi_id,
        avg(cases_critical * 4 + cases_high * 3 + cases_medium * 2 + cases_low * 1)
                                                                     as baseline_pressure
    from {{ ref('fct_jazan_visual_distortion_performance') }}
    where month_start_date between dateadd('month', -24, current_date)
                                and dateadd('month', -4, current_date)
    group by 1

),

complaint_signal as (

    select
        c.municipality_id,
        c.kpi_id,
        case
            when cb.baseline_pressure is null or cb.baseline_pressure = 0 then 0.0
            else least(1.0, greatest(0.0,
                (c.current_pressure - cb.baseline_pressure) / nullif(cb.baseline_pressure, 0)))
        end                                                          as complaint_volume_pressure
    from complaint c
    left join complaint_baseline cb
      on c.municipality_id = cb.municipality_id
     and c.kpi_id = cb.kpi_id

),

blended as (

    select
        coalesce(f.municipality_id, a.municipality_id, r.municipality_id, cs.municipality_id) as municipality_id,
        coalesce(f.kpi_id, a.kpi_id, r.kpi_id, cs.kpi_id)                                    as kpi_id,

        -- normalised signals 0..1
        coalesce(f.breach_probability, 0.0)                                                   as signal_forecast,
        coalesce(least(1.0, abs(a.z_score) / 3.0), 0.0)                                       as signal_anomaly,
        coalesce(r.recurrence_rate, 0.0)                                                      as signal_recurrence,
        coalesce(cs.complaint_volume_pressure, 0.0)                                           as signal_complaint,

        -- explainable feature contributions in score units (out of 100)
        coalesce(f.breach_probability, 0.0)                       * {{ weight_forecast }}   * 100 as contrib_forecast,
        coalesce(least(1.0, abs(a.z_score) / 3.0), 0.0)           * {{ weight_anomaly }}    * 100 as contrib_anomaly,
        coalesce(r.recurrence_rate, 0.0)                          * {{ weight_recurrence }} * 100 as contrib_recurrence,
        coalesce(cs.complaint_volume_pressure, 0.0)               * {{ weight_complaint }}  * 100 as contrib_complaint

    from forecast f
    full outer join anomaly         a  on f.municipality_id = a.municipality_id  and f.kpi_id = a.kpi_id
    full outer join recurrence      r  on coalesce(f.municipality_id, a.municipality_id) = r.municipality_id
                                       and coalesce(f.kpi_id, a.kpi_id) = r.kpi_id
    full outer join complaint_signal cs on coalesce(f.municipality_id, a.municipality_id, r.municipality_id) = cs.municipality_id
                                       and coalesce(f.kpi_id, a.kpi_id, r.kpi_id) = cs.kpi_id

),

final as (

    select
        municipality_id,
        kpi_id,
        current_date                                          as score_date,

        signal_forecast,
        signal_anomaly,
        signal_recurrence,
        signal_complaint,

        round(contrib_forecast::numeric,   2)                 as contrib_forecast,
        round(contrib_anomaly::numeric,    2)                 as contrib_anomaly,
        round(contrib_recurrence::numeric, 2)                 as contrib_recurrence,
        round(contrib_complaint::numeric,  2)                 as contrib_complaint,

        round(
            (contrib_forecast + contrib_anomaly + contrib_recurrence + contrib_complaint)::numeric,
            2
        )                                                     as composite_risk_score,

        case
            when (contrib_forecast + contrib_anomaly + contrib_recurrence + contrib_complaint) >= 80 then 'critical'
            when (contrib_forecast + contrib_anomaly + contrib_recurrence + contrib_complaint) >= 60 then 'high'
            when (contrib_forecast + contrib_anomaly + contrib_recurrence + contrib_complaint) >= 35 then 'moderate'
            else 'low'
        end                                                   as risk_tier,

        current_timestamp                                     as computed_at
    from blended
    where municipality_id is not null
      and kpi_id is not null

)

select * from final
order by composite_risk_score desc
