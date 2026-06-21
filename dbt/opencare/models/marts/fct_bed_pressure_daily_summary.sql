with daily_flow as (
    select
        event_date as date_day,
        count(*) filter (where event_type = 'admission') as admissions_total,
        count(*) filter (where event_type = 'discharge') as discharges_total
    from {{ ref('stg_bed_events') }}
    group by 1
),

daily_pressure as (
    select
        date_day,
        sum(occupied_beds) as network_occupied_beds,
        sum(staffed_beds) as network_staffed_beds,
        sum(available_beds) as network_available_beds,
        round(
            case
                when sum(staffed_beds) = 0 then 0
                else sum(occupied_beds)::numeric / sum(staffed_beds)::numeric * 100
            end,
            2
        ) as network_occupancy_rate_pct,
        round(avg(occupancy_rate) * 100, 2) as avg_ward_occupancy_pct,
        round(max(occupancy_rate) * 100, 2) as peak_ward_occupancy_pct,
        count(*) filter (where occupancy_rate >= 0.90) as critical_ward_count,
        count(*) filter (where occupancy_rate >= 0.75 and occupancy_rate < 0.90) as warning_ward_count,
        count(*) filter (where occupancy_rate < 0.75) as normal_ward_count,
        count(*) as ward_count
    from {{ ref('fct_bed_occupancy') }}
    group by 1
)

select
    md5(date_day::text) as pressure_daily_summary_key,
    pressure.date_day,
    pressure.network_occupied_beds,
    pressure.network_staffed_beds,
    pressure.network_available_beds,
    pressure.network_occupancy_rate_pct,
    pressure.avg_ward_occupancy_pct,
    pressure.peak_ward_occupancy_pct,
    pressure.critical_ward_count,
    pressure.warning_ward_count,
    pressure.normal_ward_count,
    pressure.ward_count,
    coalesce(flow.admissions_total, 0) as admissions_total,
    coalesce(flow.discharges_total, 0) as discharges_total,
    coalesce(flow.admissions_total, 0) - coalesce(flow.discharges_total, 0) as net_flow
from daily_pressure as pressure
left join daily_flow as flow
    on pressure.date_day = flow.date_day
