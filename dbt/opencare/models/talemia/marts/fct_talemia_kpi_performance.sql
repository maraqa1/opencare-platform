{{ config(tags=["talemia", "commercial-intelligence"]) }}

with base as (
    select * from {{ ref('fct_talemia_opportunity') }}
),
metrics as (
    select 'YTD Opportunities'::text as kpi_name, count(*)::numeric as kpi_value, 'count'::text as unit from base
    union all select 'Pipeline Opportunities', count(*)::numeric, 'count' from base where lower(workflow_state) not in ('awarded', 'lost')
    union all select 'Pipeline Value', coalesce(sum(contract_value), 0), 'currency' from base
    union all select 'Qualified Pipeline', coalesce(sum(qualified_sales), 0), 'currency' from base
    union all select 'Wins Value', coalesce(sum(awarded_value), 0), 'currency' from base where lower(workflow_state) = 'awarded'
    union all select 'YTD Wins', count(*)::numeric, 'count' from base where lower(workflow_state) = 'awarded'
    union all select 'Client Count', count(distinct client_name)::numeric, 'count' from base
    union all select 'New Clients', count(distinct client_name)::numeric, 'count' from base
    union all select 'Hit Rate',
        case when count(*) = 0 then null else sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::numeric / count(*) end,
        'ratio'
    from base
    union all select 'Win Rate',
        case
            when sum(case when lower(workflow_state) in ('awarded', 'lost') then 1 else 0 end) = 0 then null
            else sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::numeric
                / sum(case when lower(workflow_state) in ('awarded', 'lost') then 1 else 0 end)
        end,
        'ratio'
    from base
)
select
    kpi_name,
    kpi_value,
    unit,
    'TALEMIA Business Intelligence'::text as dashboard_name,
    current_timestamp::timestamp as as_of_timestamp
from metrics
