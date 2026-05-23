{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    business_line_name,
    coalesce(submission_year, extract(year from current_date)::integer) as year,
    count(*)::integer as opportunity_count,
    sum(contract_value)::numeric(14, 2) as pipeline_value,
    sum(qualified_sales)::numeric(14, 2) as qualified_pipeline_value,
    sum(awarded_value)::numeric(14, 2) as awarded_value,
    sum(case when lower(workflow_state) = 'lost' then contract_value else 0 end)::numeric(14, 2) as lost_value,
    sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::integer as won_count,
    sum(case when lower(workflow_state) = 'lost' then 1 else 0 end)::integer as lost_count,
    case
        when sum(case when lower(workflow_state) in ('awarded', 'lost') then 1 else 0 end) = 0 then null
        else round(
            sum(case when lower(workflow_state) = 'awarded' then 1 else 0 end)::numeric
            / sum(case when lower(workflow_state) in ('awarded', 'lost') then 1 else 0 end),
            4
        )
    end as win_rate,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
group by 1, 2
