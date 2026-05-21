{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_id,
    business_line_name,
    account_manager_name,
    submission_year as year,
    created_date,
    submission_date,
    expected_award_date,
    close_date,
    case
        when created_date is not null and close_date is not null then greatest(close_date - created_date, 0)
        when submission_date is not null and close_date is not null then greatest(close_date - submission_date, 0)
        else null
    end::numeric(10, 2) as sales_cycle_days,
    case when created_date is null or close_date is null then true else false end as partial_date_flag,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
