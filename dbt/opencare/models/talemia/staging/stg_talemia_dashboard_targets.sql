{{ config(tags=["talemia", "commercial-intelligence"]) }}

{% set raw = talemia_raw_relation('talemia_dashboard_targets') %}

{% if raw %}
select
    coalesce(nullif(dashboard_name, ''), 'Unknown')::text as dashboard_name,
    coalesce(nullif(kpi_name, ''), 'Unknown')::text as kpi_name,
    nullif(filter_context, '')::text as filter_context,
    nullif(visible_value, '')::text as visible_value,
    nullif(regexp_replace(coalesce(visible_value, ''), '[^0-9.-]', '', 'g'), '')::numeric(14, 2) as visible_numeric_value,
    nullif(source_screenshot, '')::text as source_screenshot,
    coalesce(nullif(parse_status, ''), 'unknown')::text as parse_status,
    nullif(regexp_replace(coalesce(match_confidence, ''), '[^0-9.-]', '', 'g'), '')::numeric(10, 4) as match_confidence,
    nullif(parser_warning, '')::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
from {{ raw }}
{% else %}
select
    null::text as dashboard_name,
    null::text as kpi_name,
    null::text as filter_context,
    null::text as visible_value,
    null::numeric(14, 2) as visible_numeric_value,
    null::text as source_screenshot,
    null::text as parse_status,
    null::numeric(10, 4) as match_confidence,
    null::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
where false
{% endif %}
