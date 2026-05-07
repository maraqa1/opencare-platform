{{ config(tags=["talemia", "commercial-intelligence"]) }}

with annual as (
    select
        coalesce(submission_year, extract(year from current_date)::integer) as year,
        sum(awarded_value)::numeric(14, 2) as awarded_value,
        sum(converted_value_2026)::numeric(14, 2) as converted_value_2026,
        count(*)::integer as opportunity_count
    from {{ ref('fct_talemia_opportunity') }}
    group by 1
)
select
    year,
    awarded_value,
    converted_value_2026,
    opportunity_count,
    case
        when lag(awarded_value) over (order by year) is null or lag(awarded_value) over (order by year) = 0 then null
        else round((awarded_value - lag(awarded_value) over (order by year)) / lag(awarded_value) over (order by year), 4)
    end as awarded_growth_rate,
    current_timestamp::timestamp as as_of_timestamp
from annual
