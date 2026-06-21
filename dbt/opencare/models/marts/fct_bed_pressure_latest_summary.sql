with latest_day as (
    select max(date_day) as date_day
    from {{ ref('fct_bed_pressure_daily_summary') }}
)

select
    pressure_daily_summary_key as latest_summary_key,
    date_day,
    network_occupied_beds,
    network_staffed_beds,
    network_available_beds,
    network_occupancy_rate_pct,
    avg_ward_occupancy_pct,
    peak_ward_occupancy_pct,
    critical_ward_count,
    warning_ward_count,
    normal_ward_count,
    ward_count,
    admissions_total,
    discharges_total,
    net_flow
from {{ ref('fct_bed_pressure_daily_summary') }}
where date_day = (select date_day from latest_day)
