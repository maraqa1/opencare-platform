{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as denial_id,
    cast(null as text) as claim_id,
    cast(null as text) as encounter_id,
    cast(null as text) as payer_id,
    cast(null as text) as department_id,
    cast(null as date) as denial_date,
    cast(null as text) as denial_reason,
    cast(null as text) as appeal_status,
    cast(null as numeric(14, 2)) as denied_amount,
    cast(null as date) as appeal_due_date,
    cast(null as text) as claim_status
where false
