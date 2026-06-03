{{ config(materialized='view', tags=['jazan','staging','date_spine']) }}

-- Date spine for monthly municipal facts. PostgreSQL-compatible implementation.

select generate_series(
    date_trunc('month', current_date - interval '24 months')::date,
    date_trunc('month', current_date)::date,
    interval '1 day'
)::date as day
