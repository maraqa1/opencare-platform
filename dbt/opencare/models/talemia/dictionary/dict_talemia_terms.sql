{{ config(tags=["talemia", "commercial-intelligence"], schema="dictionary") }}

{% set raw = talemia_raw_relation('talemia_business_terms') %}

{% if raw %}
select
    nullif(term_id, '')::text as term_id,
    coalesce(nullif(term_name, ''), 'Unknown')::text as term_name,
    nullif(term_definition, '')::text as term_definition,
    nullif(source_sheet, '')::text as source_sheet,
    nullif(source_row_number, '')::text as source_row_number,
    coalesce(nullif(parse_status, ''), 'unknown')::text as parse_status,
    nullif(regexp_replace(coalesce(match_confidence, ''), '[^0-9.-]', '', 'g'), '')::numeric(10, 4) as match_confidence,
    nullif(parser_warning, '')::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
from {{ raw }}
{% else %}
select
    null::text as term_id,
    null::text as term_name,
    null::text as term_definition,
    null::text as source_sheet,
    null::text as source_row_number,
    null::text as parse_status,
    null::numeric(10, 4) as match_confidence,
    null::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
where false
{% endif %}
