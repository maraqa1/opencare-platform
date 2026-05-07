{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_id,
    business_line_name,
    account_manager_name,
    winning_likelihood,
    case
        when lower(winning_likelihood) like '%high%' then 'high'
        when lower(winning_likelihood) like '%medium%' or lower(winning_likelihood) like '%mid%' then 'medium'
        when lower(winning_likelihood) like '%low%' then 'low'
        else 'unknown'
    end as likelihood_band,
    contract_value,
    case
        when coalesce(contract_value, 0) >= 1000000 and lower(winning_likelihood) like '%low%' then 'high_value_low_likelihood'
        when parser_warning is not null then 'parser_warning'
        else null
    end as risk_flag,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
