{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    update_id,
    opportunity_id,
    opportunity_name_en,
    opportunity_name_ar,
    client_name,
    week_number,
    week_label,
    week_period,
    update_date,
    update_text,
    update_language,
    operational_signal,
    risk_flag,
    match_confidence,
    parser_warning,
    as_of_timestamp
from {{ ref('stg_talemia_updates') }}
where update_id is not null
