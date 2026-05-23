{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_id,
    client_name,
    account_manager_name,
    business_line_name,
    sector_type,
    opportunity_stage,
    workflow_state,
    winning_likelihood,
    submission_year as year,
    contract_value,
    qualified_sales,
    converted_value_2026,
    awarded_value,
    case when lower(workflow_state) = 'awarded' or lower(opportunity_stage) = 'awarded' then true else false end as is_won,
    case when lower(workflow_state) = 'lost' or lower(opportunity_stage) = 'lost' then true else false end as is_lost,
    loss_reason,
    competitor,
    award_date,
    loss_date,
    as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
