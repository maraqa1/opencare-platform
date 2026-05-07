{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_id,
    business_line_name,
    account_manager_name,
    sector_type,
    winning_likelihood,
    submission_year as year,
    expected_award_quarter,
    expected_award_date,
    contract_value as pipeline_value,
    qualified_sales as qualified_pipeline_value,
    converted_value_2026,
    case when expected_award_date is null and nullif(expected_award_quarter, '') is null then true else false end as forecast_limited_flag,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
