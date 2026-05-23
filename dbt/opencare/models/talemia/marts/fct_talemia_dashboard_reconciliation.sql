{{ config(tags=["talemia", "commercial-intelligence"]) }}

select
    t.dashboard_name,
    t.kpi_name,
    t.filter_context,
    t.visible_value as dashboard_visible_value,
    t.visible_numeric_value as dashboard_numeric_value,
    k.kpi_value as calculated_value,
    case
        when t.visible_numeric_value is null or k.kpi_value is null then null
        else round(k.kpi_value - t.visible_numeric_value, 2)
    end as variance_value,
    case
        when t.visible_numeric_value is null or k.kpi_value is null then 'not_comparable'
        when abs(k.kpi_value - t.visible_numeric_value) <= 1 then 'matched'
        else 'variance'
    end as reconciliation_status,
    t.parse_status,
    t.match_confidence,
    t.parser_warning,
    current_timestamp::timestamp as as_of_timestamp
from {{ ref('stg_talemia_dashboard_targets') }} t
left join {{ ref('fct_talemia_kpi_performance') }} k
    on lower(k.kpi_name) = lower(t.kpi_name)
