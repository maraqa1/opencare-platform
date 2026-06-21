with latest_day as (
    select max(date_day) as date_day
    from {{ ref('fct_bed_occupancy') }}
),

latest_flow as (
    select
        ward_id,
        count(*) filter (where event_type = 'admission') as admissions_today,
        count(*) filter (where event_type = 'discharge') as discharges_today
    from {{ ref('stg_bed_events') }}
    where event_date = (select date_day from latest_day)
    group by 1
)

select
    md5(concat(occupancy.date_day::text, '||', occupancy.ward_id, '||latest')) as latest_snapshot_key,
    occupancy.date_day,
    occupancy.ward_id,
    ward.ward_code,
    ward.ward_name,
    occupancy.occupied_beds,
    occupancy.staffed_beds,
    occupancy.available_beds,
    round(occupancy.occupancy_rate * 100, 2) as occupancy_rate_pct,
    coalesce(flow.admissions_today, 0) as admissions_today,
    coalesce(flow.discharges_today, 0) as discharges_today,
    coalesce(flow.admissions_today, 0) - coalesce(flow.discharges_today, 0) as net_flow,
    case
        when occupancy.occupancy_rate >= 0.90 then 'Critical'
        when occupancy.occupancy_rate >= 0.75 then 'Warning'
        else 'Normal'
    end as pressure_band
from {{ ref('fct_bed_occupancy') }} as occupancy
join latest_day
    on occupancy.date_day = latest_day.date_day
join {{ ref('dim_ward') }} as ward
    on occupancy.ward_id = ward.ward_id
left join latest_flow as flow
    on occupancy.ward_id = flow.ward_id
