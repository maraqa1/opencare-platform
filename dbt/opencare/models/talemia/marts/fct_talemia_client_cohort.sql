{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    client_name,
    min(coalesce(submission_year, extract(year from current_date)::integer)) as first_seen_year,
    max(coalesce(submission_year, extract(year from current_date)::integer)) as latest_seen_year,
    count(*)::integer as opportunity_count,
    sum(contract_value)::numeric(14, 2) as total_contract_value,
    case when min(coalesce(submission_year, extract(year from current_date)::integer)) = extract(year from current_date)::integer then true else false end as is_new_client,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
group by 1
