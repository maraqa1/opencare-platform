select
    md5(concat(latest_snapshot_key, '||executive-action')) as executive_action_key,
    date_day,
    ward_id,
    ward_code,
    ward,
    specialty,
    pressure_band as risk_level,
    occupancy_rate_pct as current_occupancy_pct,
    available_beds,
    case
        when occupancy_rate_pct >= 95 then 'No or limited capacity'
        when occupancy_rate_pct >= 85 then 'Pressure building'
        else 'Stable'
    end as issue,
    case
        when occupancy_rate_pct >= 95 then 'Escalate discharge review'
        when occupancy_rate_pct >= 85 then 'Monitor admissions and prepare overflow'
        else 'Maintain monitoring'
    end as required_action,
    case
        when occupancy_rate_pct >= 95 then 'Bed Manager'
        when occupancy_rate_pct >= 85 then 'Site Manager'
        else 'Ward Lead'
    end as owner,
    case
        when occupancy_rate_pct >= 95 then 'Today'
        when occupancy_rate_pct >= 85 then '24 hours'
        else 'Routine'
    end as target_time,
    case
        when occupancy_rate_pct >= 95 then 3
        when occupancy_rate_pct >= 85 then 2
        else 1
    end as risk_priority
from {{ ref('fct_bed_pressure_latest_snapshot') }}
