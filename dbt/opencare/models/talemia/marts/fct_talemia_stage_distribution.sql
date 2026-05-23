{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    opportunity_stage,
    workflow_state,
    count(*)::integer as opportunity_count,
    sum(contract_value)::numeric(14, 2) as pipeline_value,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('fct_talemia_opportunity') }}
group by 1, 2
