{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with opportunities as (
    select
        owner_team,
        owner_user_id,
        due_date,
        status,
        expected_recovery_amount,
        case
            when status in ('completed', 'resolved', 'closed') then expected_recovery_amount * 0.90
            when status = 'in_progress' then expected_recovery_amount * 0.35
            else 0
        end::numeric(14, 2) as actual_recovery_amount,
        case
            when status in ('completed', 'resolved', 'closed') then 48
            when status = 'in_progress' then 36
            when status = 'assigned' then 24
            else 18
        end::numeric(10, 2) as resolution_hours
    from {{ ref('fct_cash_recovery_opportunity') }}
)

select
    owner_team,
    owner_user_id,
    date_trunc('month', current_date)::date as period_start,
    current_date as period_end,
    count(*) filter (where status in ('assigned', 'in_progress'))::integer as assigned_count,
    count(*) filter (where status in ('completed', 'resolved', 'closed'))::integer as completed_count,
    sum(expected_recovery_amount)::numeric(14, 2) as expected_recovery,
    sum(actual_recovery_amount)::numeric(14, 2) as actual_recovery,
    (
        (sum(actual_recovery_amount) - sum(expected_recovery_amount))
        / nullif(sum(expected_recovery_amount), 0)
    )::numeric(10, 4) as recovery_variance_pct,
    avg(resolution_hours)::numeric(10, 2) as avg_resolution_hours,
    count(*) filter (
        where due_date < current_date
          and status not in ('completed', 'resolved', 'closed', 'dismissed', 'expired')
    )::integer as overdue_count
from opportunities
group by 1, 2
