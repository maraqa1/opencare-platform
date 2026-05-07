{{ config(tags=["talemia", "commercial-intelligence"]) }}

{% set raw = talemia_raw_relation('extraction_quality_report') %}

{% if raw %}
select
    nullif(check_name, '')::text as check_name,
    nullif(check_value, '')::text as check_value,
    coalesce(nullif(severity, ''), 'unknown')::text as quality_status,
    case when nullif(extracted_at, '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(extracted_at, 19)::timestamp end as extracted_at,
    current_timestamp::timestamp as as_of_timestamp
from {{ raw }}
{% else %}
select
    null::text as check_name,
    null::text as check_value,
    null::text as quality_status,
    null::timestamp as extracted_at,
    current_timestamp::timestamp as as_of_timestamp
where false
{% endif %}
