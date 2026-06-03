{{ config(
    materialized='table',
    tags=['jazan', 'output', 'recommendation', 'runtime_output'],
    meta={
        'owner': 'Data Science Runtime',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'internal',
        'certification_status': 'reviewed',
        'business_definition': 'For each high-risk (municipality, kpi) pair, return the top-N historical interventions in comparable peer municipalities ranked by measured recovery effectiveness. Each recommendation surfaces its source case so a reviewer can audit it.'
    }
) }}

/*
    jazan_recommended_intervention
    ------------------------------
    Top-N intervention recommendations per (municipality_id, kpi_id) for any
    currently high-risk situation.

    Similarity dimensions (all governed in contracts/model.yaml#similarity_features):
      - municipality_archetype  (urban / urban_rural / coastal / island / highland / agricultural)
      - population_band         (large / medium / small / micro)
      - kpi_id                  (must match exactly)
      - severity_tier           (must match: high or critical)
      - distortion_category     (when KPI 1; categorical match)

    Effectiveness ranking dimensions:
      - measured_recovery_delta (KPI improvement 30 days post-action)
      - days_to_recovery        (lower is better)
      - sustained_recovery_flag (still recovered at day 90)

    Note: the historical intervention corpus is seeded from cross-regional MOMRAH
    case studies in the first release; thereafter it grows from Jazan's own closed
    recovery outcomes via decision.jazan_visual_distortion_recovery_outcome.
*/

with current_risk as (

    select
        r.municipality_id,
        r.kpi_id,
        r.composite_risk_score,
        r.risk_tier,
        m.municipality_archetype,
        m.population_band
    from {{ ref('jazan_municipality_service_risk_score') }} r
    join {{ ref('dim_jazan_municipality') }} m
      on r.municipality_id = m.municipality_id
    where r.risk_tier in ('high', 'critical')

),

historical_interventions as (

    -- pool of all closed interventions across the Kingdom seeded at v1 (cross-region
    -- case studies), augmented over time by Jazan's own closures
    select
        intervention_id,
        source_region,
        source_municipality_id,
        source_municipality_archetype,
        source_population_band,
        kpi_id,
        severity_tier_at_intervention,
        distortion_category,
        intervention_type,
        intervention_summary,
        intervention_summary_ar,
        measured_recovery_delta,
        days_to_recovery,
        sustained_recovery_flag,
        evidence_pack_uri,
        executed_in_year
    from {{ ref('jazan_intervention_corpus') }}

),

ranked as (

    select
        cr.municipality_id,
        cr.kpi_id,
        cr.composite_risk_score,
        cr.risk_tier,

        hi.intervention_id                    as recommendation_id,
        hi.intervention_type,
        hi.intervention_summary,
        hi.intervention_summary_ar,
        hi.source_region,
        hi.source_municipality_id             as source_municipality_id,
        hi.executed_in_year,
        hi.measured_recovery_delta,
        hi.days_to_recovery,
        hi.sustained_recovery_flag,
        hi.evidence_pack_uri,

        -- effectiveness score: recovery delta weighted by sustained recovery and speed
        (
            hi.measured_recovery_delta
            * (case when hi.sustained_recovery_flag then 1.10 else 1.00 end)
            * (case
                when hi.days_to_recovery <= 14 then 1.10
                when hi.days_to_recovery <= 30 then 1.00
                when hi.days_to_recovery <= 60 then 0.92
                else 0.80
              end)
        )                                                     as effectiveness_score,

        -- similarity score 0..1
        (
            (case when hi.kpi_id = cr.kpi_id then 0.40 else 0.0 end)
          + (case when hi.source_municipality_archetype = cr.municipality_archetype then 0.30 else 0.0 end)
          + (case when hi.source_population_band       = cr.population_band       then 0.20 else 0.0 end)
          + (case when hi.severity_tier_at_intervention = cr.risk_tier            then 0.10 else 0.0 end)
        )                                                     as similarity_score,

        -- combined rank score: similarity-weighted effectiveness
        (
            (case when hi.kpi_id = cr.kpi_id then 0.40 else 0.0 end)
          + (case when hi.source_municipality_archetype = cr.municipality_archetype then 0.30 else 0.0 end)
          + (case when hi.source_population_band       = cr.population_band       then 0.20 else 0.0 end)
          + (case when hi.severity_tier_at_intervention = cr.risk_tier            then 0.10 else 0.0 end)
        )
        *
        (
            hi.measured_recovery_delta
            * (case when hi.sustained_recovery_flag then 1.10 else 1.00 end)
            * (case
                when hi.days_to_recovery <= 14 then 1.10
                when hi.days_to_recovery <= 30 then 1.00
                when hi.days_to_recovery <= 60 then 0.92
                else 0.80
              end)
        )                                                     as rank_score

    from current_risk cr
    cross join historical_interventions hi
    where hi.kpi_id = cr.kpi_id                  -- KPI must match exactly
      and hi.measured_recovery_delta > 0          -- only positive-outcome interventions

),

top_n as (

    select
        *,
        row_number() over (
            partition by municipality_id, kpi_id
            order by rank_score desc, sustained_recovery_flag desc, days_to_recovery asc
        )                                                     as recommendation_rank
    from ranked

)

select
    municipality_id,
    kpi_id,
    composite_risk_score,
    risk_tier,
    recommendation_rank,
    recommendation_id,
    intervention_type,
    intervention_summary,
    intervention_summary_ar,
    source_region,
    source_municipality_id,
    executed_in_year,
    measured_recovery_delta,
    days_to_recovery,
    sustained_recovery_flag,
    evidence_pack_uri,
    round(similarity_score::numeric,    3)                    as similarity_score,
    round(effectiveness_score::numeric, 3)                    as effectiveness_score,
    round(rank_score::numeric,          3)                    as rank_score,
    current_timestamp                                         as computed_at
from top_n
where recommendation_rank <= 3                                -- top 3 per (muni, kpi)
order by municipality_id, kpi_id, recommendation_rank
