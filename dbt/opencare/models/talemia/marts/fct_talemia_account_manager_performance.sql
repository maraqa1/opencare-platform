{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    account_manager_name,
    coalesce(submission_year, extract(year from current_date)::integer) as year,
    count(*)::integer as managed_opportunities,
    count(distinct client_name)::integer as total_clients_managed,
    sum(qualified_sales)::numeric(14, 2) as qualified_value,
    sum(awarded_value)::numeric(14, 2) as awarded_value,
    sum(contract_value)::numeric(14, 2) as managed_pipeline_value,
    sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::integer as won_count,
    sum(case when lower(workflow_state) = 'lost' then 1 else 0 end)::integer as lost_count,
    case
        when count(*) = 0 then null
        else round(sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::numeric / count(*), 4)
    end as winning_pct,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
group by 1, 2
