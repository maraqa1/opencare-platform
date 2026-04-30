{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as leakage_id,
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as date) as detected_date,
    cast(null as text) as leakage_type,
    cast(null as text) as leakage_reason,
    cast(null as numeric(14, 2)) as leakage_amount,
    cast(null as text) as owner_team,
    cast(null as text) as owner_user_id,
    cast(null as text) as status
where false
