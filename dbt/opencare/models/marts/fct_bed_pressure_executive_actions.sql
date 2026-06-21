select
    md5(concat(latest_snapshot_key, '||executive-action')) as executive_action_key,
    date_day,
    ward_id,
    ward_code,
    ward,
    specialty,
    pressure_band as risk_level,
    case
        when occupancy_rate_pct >= 95 then '<span class="oc-risk-pill oc-risk-pill--critical">Critical</span>'
        when occupancy_rate_pct >= 85 then '<span class="oc-risk-pill oc-risk-pill--warning">Warning</span>'
        else '<span class="oc-risk-pill oc-risk-pill--normal">Normal</span>'
    end as risk_level_badge,
    occupancy_rate_pct as current_occupancy_pct,
    available_beds,
    case
        when occupancy_rate_pct >= 95 then 'No or limited capacity'
        when occupancy_rate_pct >= 85 then 'Pressure building'
        else 'Stable'
    end as issue,
    case
        when occupancy_rate_pct >= 95 then '<span class="oc-issue-pill oc-issue-pill--critical">No or limited capacity</span>'
        when occupancy_rate_pct >= 85 then '<span class="oc-issue-pill oc-issue-pill--warning">Pressure building</span>'
        else '<span class="oc-issue-pill oc-issue-pill--normal">Stable</span>'
    end as issue_badge,
    case
        when occupancy_rate_pct >= 95 then 'Escalate discharge review'
        when occupancy_rate_pct >= 85 then 'Monitor admissions and prepare overflow'
        else 'Maintain monitoring'
    end as required_action,
    case
        when occupancy_rate_pct >= 95 then '<span class="oc-action-pill oc-action-pill--critical">Escalate discharge review</span>'
        when occupancy_rate_pct >= 85 then '<span class="oc-action-pill oc-action-pill--warning">Monitor admissions and prepare overflow</span>'
        else '<span class="oc-action-pill oc-action-pill--normal">Maintain monitoring</span>'
    end as required_action_badge,
    case
        when occupancy_rate_pct >= 95 then 'Bed Manager'
        when occupancy_rate_pct >= 85 then 'Site Manager'
        else 'Ward Lead'
    end as owner,
    case
        when occupancy_rate_pct >= 95 then '<span class="oc-owner-pill oc-owner-pill--critical">Bed Manager</span>'
        when occupancy_rate_pct >= 85 then '<span class="oc-owner-pill oc-owner-pill--warning">Site Manager</span>'
        else '<span class="oc-owner-pill oc-owner-pill--normal">Ward Lead</span>'
    end as owner_badge,
    case
        when occupancy_rate_pct >= 95 then 'Today'
        when occupancy_rate_pct >= 85 then '24 hours'
        else 'Routine'
    end as target_time,
    case
        when occupancy_rate_pct >= 95 then '<span class="oc-target-pill oc-target-pill--critical">Today</span>'
        when occupancy_rate_pct >= 85 then '<span class="oc-target-pill oc-target-pill--warning">24 hours</span>'
        else '<span class="oc-target-pill oc-target-pill--normal">Routine</span>'
    end as target_time_badge,
    case
        when occupancy_rate_pct >= 95 then 3
        when occupancy_rate_pct >= 85 then 2
        else 1
    end as risk_priority
from {{ ref('fct_bed_pressure_latest_snapshot') }}
