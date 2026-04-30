{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    cast(null as text) as owner_team,
    cast(null as text) as owner_user_id,
    cast(null as date) as period_start,
    cast(null as date) as period_end,
    cast(null as integer) as assigned_count,
    cast(null as integer) as completed_count,
    cast(null as numeric(14, 2)) as expected_recovery,
    cast(null as numeric(14, 2)) as actual_recovery,
    cast(null as numeric(10, 4)) as recovery_variance_pct,
    cast(null as numeric(10, 2)) as avg_resolution_hours,
    cast(null as integer) as overdue_count
where false
