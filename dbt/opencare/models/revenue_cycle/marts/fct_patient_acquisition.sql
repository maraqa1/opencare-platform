{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as acquisition_id,
    cast(null as text) as encounter_id,
    cast(null as text) as acquisition_channel,
    cast(null as text) as referral_source,
    cast(null as date) as period_start,
    cast(null as date) as period_end,
    cast(null as integer) as encounter_count,
    cast(null as numeric(14, 2)) as gross_revenue,
    cast(null as numeric(14, 2)) as collected_revenue
where false
