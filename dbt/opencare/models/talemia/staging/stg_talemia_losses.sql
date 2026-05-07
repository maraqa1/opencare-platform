{{ config(tags=["talemia", "commercial-intelligence"]) }}

{% set raw = talemia_raw_relation('talemia_loss_reasons') %}

{% if raw %}
select
    nullif(loss_id, '')::text as loss_id,
    nullif(opportunity_id, '')::text as opportunity_id,
    nullif(opportunity_name_en, '')::text as opportunity_name_en,
    nullif(opportunity_name_ar, '')::text as opportunity_name_ar,
    coalesce(nullif(client_name, ''), 'Unknown')::text as client_name,
    coalesce(nullif(account_manager_name, ''), 'Unknown')::text as account_manager_name,
    coalesce(nullif(business_line_name, ''), 'Unknown')::text as business_line_name,
    case when nullif(loss_date, '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(loss_date, 10)::date end as loss_date,
    nullif(regexp_replace(coalesce(contract_value, ''), '[^0-9.-]', '', 'g'), '')::numeric(14, 2) as lost_value,
    nullif(loss_reason, '')::text as loss_reason,
    nullif(loss_category, '')::text as loss_category,
    nullif(competitor, '')::text as competitor,
    coalesce(nullif(parse_status, ''), 'unknown')::text as parse_status,
    nullif(regexp_replace(coalesce(match_confidence, ''), '[^0-9.-]', '', 'g'), '')::numeric(10, 4) as match_confidence,
    nullif(parser_warning, '')::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
from {{ raw }}
{% else %}
select
    null::text as loss_id,
    null::text as opportunity_id,
    null::text as opportunity_name_en,
    null::text as opportunity_name_ar,
    null::text as client_name,
    null::text as account_manager_name,
    null::text as business_line_name,
    null::date as loss_date,
    null::numeric(14, 2) as lost_value,
    null::text as loss_reason,
    null::text as loss_category,
    null::text as competitor,
    null::text as parse_status,
    null::numeric(10, 4) as match_confidence,
    null::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
where false
{% endif %}
