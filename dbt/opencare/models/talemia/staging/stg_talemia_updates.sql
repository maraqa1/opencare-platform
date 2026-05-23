{{ config(tags=["talemia", "commercial-intelligence"]) }}

{% set raw = talemia_raw_relation('talemia_opportunity_updates_long') %}

{% if raw %}
select
    nullif(update_id, '')::text as update_id,
    nullif(opportunity_id, '')::text as opportunity_id,
    nullif(opportunity_name_en, '')::text as opportunity_name_en,
    nullif(opportunity_name_ar, '')::text as opportunity_name_ar,
    coalesce(nullif(client_name, ''), 'Unknown')::text as client_name,
    nullif(week_number, '')::text as week_number,
    nullif(week_label, '')::text as week_label,
    nullif(week_period, '')::text as week_period,
    case when nullif(update_date, '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(update_date, 10)::date end as update_date,
    nullif(update_text, '')::text as update_text,
    nullif(update_language, '')::text as update_language,
    nullif(operational_signal, '')::text as operational_signal,
    nullif(risk_flag, '')::text as risk_flag,
    nullif(regexp_replace(coalesce(match_confidence, ''), '[^0-9.-]', '', 'g'), '')::numeric(10, 4) as match_confidence,
    nullif(parser_warning, '')::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
from {{ raw }}
{% else %}
select
    null::text as update_id,
    null::text as opportunity_id,
    null::text as opportunity_name_en,
    null::text as opportunity_name_ar,
    null::text as client_name,
    null::text as week_number,
    null::text as week_label,
    null::text as week_period,
    null::date as update_date,
    null::text as update_text,
    null::text as update_language,
    null::text as operational_signal,
    null::text as risk_flag,
    null::numeric(10, 4) as match_confidence,
    null::text as parser_warning,
    current_timestamp::timestamp as as_of_timestamp
where false
{% endif %}
