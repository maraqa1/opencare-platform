{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_id,
    client_name,
    client_department,
    account_manager_name,
    business_line_name,
    sector_type,
    opportunity_stage,
    workflow_state,
    winning_likelihood,
    submission_year as year,
    expected_award_quarter,
    contract_value as pipeline_value,
    qualified_sales as qualified_pipeline_value,
    converted_value_2026,
    case when lower(workflow_state) not in ('awarded', 'lost') then true else false end as is_active_pipeline,
    case when coalesce(qualified_sales, 0) > 0 then true else false end as is_qualified,
    as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
