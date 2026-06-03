{{ config(
    materialized='view',
    tags=['jazan', 'staging', 'visual_distortion'],
    meta={
        'owner': 'Data & Analytics Office',
        'steward': 'Data & Analytics Office',
        'sensitivity_class': 'sensitive',
        'pii_columns': ['complainant_phone_hash', 'complainant_national_id_hash']
    }
) }}

/*
    stg_jazan_visual_distortion_cases
    ----------------------------------
    Typed, cleaned staging model over raw_jazan.visual_distortion_cases.

    Source system: Balady + MAKEEN visual-distortion case management module.
    Grain:        one row per case (case_id).

    Derivations applied here:
      - normalise case_status into a controlled vocabulary
      - compute closure_within_sla boolean against the per-category SLA matrix
      - compute evidence_completeness_score from required-evidence checklist
      - hash personally identifying complainant fields (PDPL compliance)
      - reject and quarantine rows with missing municipality_id (cannot attribute)

    Downstream consumers:
      - fct_jazan_visual_distortion_performance
      - business_trust_map node "analytics_visual_distortion"
*/

with source as (

    select *
    from {{ source('raw_jazan', 'visual_distortion_cases') }}

),

typed as (

    select
        cast(case_id as varchar(64))                          as case_id,
        cast(municipality_id as varchar(8))                   as municipality_id,
        cast(district_code as varchar(16))                    as district_code,
        cast(reported_at as timestamp)                        as reported_at,
        cast(acknowledged_at as timestamp)                    as acknowledged_at,
        cast(inspection_at as timestamp)                      as inspection_at,
        cast(closed_at as timestamp)                          as closed_at,
        cast(distortion_category as varchar(64))              as distortion_category_raw,
        cast(severity as varchar(16))                         as severity_raw,
        cast(case_status as varchar(32))                      as case_status_raw,
        cast(evidence_photo_count as integer)                 as evidence_photo_count,
        cast(evidence_gps_present as boolean)                 as evidence_gps_present,
        cast(evidence_inspector_signoff as boolean)           as evidence_inspector_signoff,
        cast(evidence_contractor_signoff as boolean)          as evidence_contractor_signoff,
        cast(repeat_offender_flag as boolean)                 as repeat_offender_flag,
        cast(complainant_phone as varchar(32))                as complainant_phone_raw,
        cast(complainant_national_id as varchar(16))          as complainant_national_id_raw,
        cast(load_ts as timestamp)                            as ingestion_ts
    from source

),

normalised as (

    select
        case_id,
        municipality_id,
        district_code,
        reported_at,
        acknowledged_at,
        inspection_at,
        closed_at,

        -- controlled vocabulary for distortion category
        case lower(trim(distortion_category_raw))
            when 'unlicensed billboard'        then 'unlicensed_billboard'
            when 'unlicensed_billboard'        then 'unlicensed_billboard'
            when 'abandoned construction'      then 'abandoned_construction'
            when 'abandoned_construction'      then 'abandoned_construction'
            when 'defaced facade'              then 'defaced_facade'
            when 'illegal signage'             then 'illegal_signage'
            when 'illegal_signage'             then 'illegal_signage'
            when 'exposed wiring'              then 'exposed_wiring'
            when 'vacant lot overgrowth'       then 'vacant_lot_overgrowth'
            when 'debris dumping'              then 'debris_dumping'
            else 'other'
        end                                                  as distortion_category,

        case lower(trim(severity_raw))
            when 'critical' then 'critical'
            when 'high'     then 'high'
            when 'medium'   then 'medium'
            when 'low'      then 'low'
            else 'medium'
        end                                                  as severity,

        case lower(trim(case_status_raw))
            when 'closed_verified'    then 'closed_verified'
            when 'closed_unverified'  then 'closed_unverified'
            when 'closed'             then 'closed_unverified'  -- legacy MAKEEN value, treat as unverified
            when 'in_progress'        then 'in_progress'
            when 'awaiting_evidence'  then 'awaiting_evidence'
            when 'acknowledged'       then 'acknowledged'
            when 'reported'           then 'reported'
            else 'unknown'
        end                                                  as case_status,

        evidence_photo_count,
        evidence_gps_present,
        evidence_inspector_signoff,
        evidence_contractor_signoff,
        repeat_offender_flag,

        -- PDPL: hash personally identifying complainant fields
        {{ dbt_utils.generate_surrogate_key(['complainant_phone_raw']) }}        as complainant_phone_hash,
        {{ dbt_utils.generate_surrogate_key(['complainant_national_id_raw']) }}  as complainant_national_id_hash,

        ingestion_ts

    from typed
    where municipality_id is not null     -- attribution required

),

with_sla as (

    select
        n.*,

        -- SLA in hours per (severity, category) from governance.policies.yaml
        case
            when severity = 'critical'                              then 24
            when severity = 'high' and distortion_category in
                ('unlicensed_billboard', 'exposed_wiring')          then 48
            when severity = 'high'                                  then 72
            when severity = 'medium'                                then 168   -- 7 days
            else 336                                                            -- 14 days
        end                                                  as sla_hours,

        -- elapsed hours between reported_at and closed_at, null if not closed
        case
            when closed_at is not null
            then extract(epoch from (closed_at - reported_at)) / 3600.0
            else null
        end                                                  as resolution_hours

    from normalised n

),

derived as (

    select
        *,

        -- closed within SLA (only meaningful for closed cases)
        case
            when case_status in ('closed_verified', 'closed_unverified')
                 and resolution_hours is not null
                 and resolution_hours <= sla_hours
            then true
            when case_status in ('closed_verified', 'closed_unverified')
                 and resolution_hours is not null
            then false
            else null
        end                                                  as closed_within_sla,

        -- evidence completeness 0..1
        (
            case when evidence_photo_count >= 3 then 0.30 else (evidence_photo_count / 3.0) * 0.30 end
          + case when evidence_gps_present then 0.20 else 0.0 end
          + case when evidence_inspector_signoff then 0.25 else 0.0 end
          + case when evidence_contractor_signoff then 0.25 else 0.0 end
        )                                                    as evidence_completeness_score,

        -- closure quality: closed within SLA AND fully verified AND complete evidence
        case
            when case_status = 'closed_verified'
                 and resolution_hours <= sla_hours
                 and evidence_inspector_signoff = true
                 and evidence_gps_present = true
                 and evidence_photo_count >= 3
            then true
            when case_status in ('closed_verified', 'closed_unverified')
            then false
            else null
        end                                                  as closure_meets_quality_bar

    from with_sla

)

select * from derived
