with base as (
    select
        latest_snapshot_key,
        date_day,
        ward_id,
        ward_code,
        ward,
        specialty,
        pressure_band,
        occupancy_rate_pct,
        available_beds,
        max(available_beds) over () as max_available_beds,
        trim(trailing '.' from trim(trailing '0' from round(occupancy_rate_pct::numeric, 1)::text)) as current_occupancy_text
    from {{ ref('fct_bed_pressure_latest_snapshot') }}
)

select
    md5(concat(latest_snapshot_key, '||executive-action')) as executive_action_key,
    date_day,
    ward_id,
    ward_code,
    ward,
    specialty,
    pressure_band as risk_level,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-critical">Critical</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-warning">Warning</span>'
        else '<span class="exec-badge exec-normal">Normal</span>'
    end as risk_level_badge,
    occupancy_rate_pct as current_occupancy_pct,
    concat(
        '<div class="exec-meter ',
        case
            when occupancy_rate_pct >= 95 then 'exec-meter--critical'
            when occupancy_rate_pct >= 85 then 'exec-meter--warning'
            else 'exec-meter--normal'
        end,
        '"><span class="exec-meter__fill" style="width:',
        greatest(18, least(100, round(occupancy_rate_pct)::int)),
        '%;"></span><span class="exec-meter__value">',
        current_occupancy_text,
        '%',
        '</span></div>'
    ) as current_occupancy_display,
    available_beds,
    concat(
        '<div class="exec-meter exec-meter--beds"><span class="exec-meter__fill" style="width:',
        greatest(
            18,
            least(
                100,
                case
                    when coalesce(max_available_beds, 0) = 0 then 0
                    else round((available_beds::numeric / max_available_beds::numeric) * 100)
                end::int
            )
        ),
        '%;"></span><span class="exec-meter__value">',
        available_beds,
        '</span></div>'
    ) as available_beds_display,
    case
        when occupancy_rate_pct >= 95 then 'CEO Escalation'
        when occupancy_rate_pct >= 85 then 'Operational Intervention'
        else 'Routine Monitoring'
    end as executive_priority,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-critical">CEO Escalation</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-warning">Operational Intervention</span>'
        else '<span class="exec-badge exec-normal">Routine Monitoring</span>'
    end as executive_priority_badge,
    case
        when occupancy_rate_pct >= 95 then 'No or limited capacity'
        when occupancy_rate_pct >= 85 then 'Pressure building'
        else 'Stable'
    end as issue,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-critical">No or limited capacity</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-warning">Pressure building</span>'
        else '<span class="exec-badge exec-normal">Stable</span>'
    end as issue_badge,
    case
        when occupancy_rate_pct >= 95 then 'Escalate discharge review'
        when occupancy_rate_pct >= 85 then 'Monitor admissions and prepare overflow'
        else 'Maintain monitoring'
    end as required_action,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-critical">Escalate discharge review</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-warning">Monitor admissions and prepare overflow</span>'
        else '<span class="exec-badge exec-normal">Maintain monitoring</span>'
    end as required_action_badge,
    case
        when occupancy_rate_pct >= 95 then 'Bed Manager'
        when occupancy_rate_pct >= 85 then 'Site Manager'
        else 'Ward Lead'
    end as owner,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-owner exec-owner-critical">Bed Manager</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-owner exec-owner-warning">Site Manager</span>'
        else '<span class="exec-badge exec-owner exec-owner-normal">Ward Lead</span>'
    end as owner_badge,
    case
        when occupancy_rate_pct >= 95 then 'Today'
        when occupancy_rate_pct >= 85 then '24 hours'
        else 'Routine'
    end as target_time,
    case
        when occupancy_rate_pct >= 95 then '<span class="exec-badge exec-critical">Today</span>'
        when occupancy_rate_pct >= 85 then '<span class="exec-badge exec-warning">24 hours</span>'
        else '<span class="exec-badge exec-normal">Routine</span>'
    end as target_time_badge,
    case
        when occupancy_rate_pct >= 95 then 300 + occupancy_rate_pct
        when occupancy_rate_pct >= 85 then 200 + occupancy_rate_pct
        else 100 + occupancy_rate_pct
    end as risk_sort_score,
    case
        when occupancy_rate_pct >= 95 then 3
        when occupancy_rate_pct >= 85 then 2
        else 1
    end as risk_priority
from base
