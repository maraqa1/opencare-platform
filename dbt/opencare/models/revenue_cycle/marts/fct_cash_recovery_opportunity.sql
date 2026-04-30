{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as opportunity_id,
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as text) as issue_type,
    cast(null as text) as issue_reason,
    cast(null as date) as detected_date,
    cast(null as date) as due_date,
    cast(null as numeric(14, 2)) as recoverable_amount,
    cast(null as numeric(14, 2)) as expected_recovery_amount,
    cast(null as numeric(10, 2)) as effort_hours,
    cast(null as numeric(14, 4)) as priority_score,
    cast(null as text) as owner_team,
    cast(null as text) as owner_user_id,
    cast(null as text) as status,
    cast(null as text) as source_system,
    cast(null as text) as evidence_summary
where false
