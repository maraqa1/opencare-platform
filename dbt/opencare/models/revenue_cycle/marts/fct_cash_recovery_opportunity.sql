{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with base as (
    select
        c.*,
        greatest(
            coalesce(c.contracted_amount, c.gross_billed_amount, 0) - coalesce(c.paid_amount, 0),
            0
        )::numeric(14, 2) as outstanding_amount,
        cast(right(c.claim_id, 2) as integer) as claim_suffix
    from {{ ref('stg_rcm_claims') }} c
),
candidate_rows as (
    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        case
            when claim_status in ('denied', 'appealed') then 'denial_appeal_priority'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'payer_underpayment_review'
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 'aged_ar_escalation'
            when submission_date is not null and submission_date > claim_date + 5 then 'late_submission_risk'
            when claim_status = 'writeoff' then 'coding_backlog_escalation'
            else 'recover_cash_this_week'
        end as issue_type,
        case
            when claim_status in ('denied', 'appealed') then 'High-value denied balance is awaiting structured follow-up.'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'Payment posted below contracted reimbursement expectation.'
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 'Aged receivable has remained outstanding beyond 90 days and needs payer escalation.'
            when submission_date is not null and submission_date > claim_date + 5 then 'Claim is at risk because submission missed the internal SLA.'
            when claim_status = 'writeoff' then 'Writeoff candidate should be reviewed for coding and appeal recovery.'
            else 'Outstanding claim balance should be worked inside the weekly cash window.'
        end as issue_reason,
        (current_date - ((claim_suffix % 6) + 1))::date as detected_date,
        (current_date + ((claim_suffix % 10) + 1))::date as due_date,
        case
            when claim_status in ('denied', 'appealed', 'writeoff') then greatest(outstanding_amount, coalesce(gross_billed_amount, 0) * 0.35)
            else greatest(outstanding_amount, coalesce(contracted_amount, gross_billed_amount, 0) * 0.2)
        end::numeric(14, 2) as recoverable_amount,
        case
            when claim_status in ('denied', 'appealed') then 0.82
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 0.9
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 0.78
            when claim_status = 'writeoff' then 0.45
            else 0.74
        end::numeric(10, 4) as recovery_ratio,
        case
            when claim_status in ('denied', 'appealed') then 5.5
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 2.0
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 3.5
            when submission_date is not null and submission_date > claim_date + 5 then 1.5
            when claim_status = 'writeoff' then 4.5
            else 3.0
        end::numeric(10, 2) as effort_hours,
        case
            when claim_status in ('denied', 'appealed') then 'Denials Management'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'Payer Relations'
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 'Payer Relations'
            when submission_date is not null and submission_date > claim_date + 5 then 'Revenue Integrity'
            when claim_status = 'writeoff' then 'Coding'
            else 'Revenue Integrity'
        end as owner_team,
        case
            when claim_status in ('denied', 'appealed') then 'denials.lead'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'payer.relations'
            when claim_status in ('open', 'submitted') and current_date - claim_date > 90 then 'payer.relations'
            when submission_date is not null and submission_date > claim_date + 5 then 'revenue.integrity'
            when claim_status = 'writeoff' then 'coding.lead'
            else 'revenue.integrity'
        end as owner_user_id,
        case
            when claim_status = 'appealed' then 'in_progress'
            when claim_status = 'writeoff' then 'assigned'
            when claim_status = 'paid' and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'assigned'
            else 'open'
        end as status,
        source_system,
        outstanding_amount
    from base
    where
        claim_status in ('open', 'submitted', 'denied', 'appealed', 'writeoff')
        or (paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98)
)

select
    md5(concat(claim_id, '||', issue_type)) as opportunity_id,
    claim_id,
    encounter_id,
    payer_id,
    department_id,
    issue_type,
    issue_reason,
    detected_date,
    due_date,
    recoverable_amount,
    (recoverable_amount * recovery_ratio)::numeric(14, 2) as expected_recovery_amount,
    effort_hours,
    ((recoverable_amount * recovery_ratio) / nullif(effort_hours, 0))::numeric(14, 4) as priority_score,
    case
        when issue_type = 'denial_appeal_priority' then 'Denied claims'
        when issue_type = 'payer_underpayment_review' then 'Underpayments'
        when issue_type = 'aged_ar_escalation' then 'A/R > 90 days'
        when issue_type = 'late_submission_risk' then 'DNFB / submission delay'
        when issue_type = 'coding_backlog_escalation' then 'Coding backlog'
        else 'Recovery queue'
    end as area,
    recoverable_amount::numeric(14, 2) as revenue_at_risk,
    issue_reason as root_cause,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation') then 'Critical'
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation') then 'Warning'
        else 'Normal'
    end as risk_level,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation')
            then '<span class="exec-badge exec-critical" style="background-color:#fee2e2;color:#991b1b;font-weight:700;padding:4px 10px;border:1px solid #fca5a5;border-radius:999px;">Critical</span>'
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation')
            then '<span class="exec-badge exec-warning" style="background-color:#fef3c7;color:#92400e;font-weight:700;padding:4px 10px;border:1px solid #fbbf24;border-radius:999px;">Warning</span>'
        else '<span class="exec-badge exec-normal" style="background-color:#dcfce7;color:#166534;font-weight:700;padding:4px 10px;border:1px solid #86efac;border-radius:999px;">Normal</span>'
    end as risk_level_badge,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation') then 'CFO Escalation'
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation') then 'RCM Director Action'
        else 'Routine Monitoring'
    end as executive_priority,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation')
            then '<span class="exec-badge exec-critical" style="background-color:#fee2e2;color:#991b1b;font-weight:700;padding:4px 10px;border:1px solid #fca5a5;border-radius:999px;">CFO Escalation</span>'
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation')
            then '<span class="exec-badge exec-warning" style="background-color:#fef3c7;color:#92400e;font-weight:700;padding:4px 10px;border:1px solid #fbbf24;border-radius:999px;">RCM Director Action</span>'
        else '<span class="exec-badge exec-normal" style="background-color:#dcfce7;color:#166534;font-weight:700;padding:4px 10px;border:1px solid #86efac;border-radius:999px;">Routine Monitoring</span>'
    end as executive_priority_badge,
    case
        when issue_type = 'denial_appeal_priority' then 'Review authorization, eligibility, and coding denial root causes'
        when issue_type = 'payer_underpayment_review' then 'Validate contract rates and recover short-payment'
        when issue_type = 'aged_ar_escalation' then 'Escalate payer settlement meeting'
        when issue_type = 'late_submission_risk' then 'Clear billing backlog and submit claims inside SLA'
        when issue_type = 'coding_backlog_escalation' then 'Clear coding backlog and review write-off recovery'
        else 'Maintain monitoring and work ranked queue'
    end as required_action,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation')
            then '<span class="exec-badge exec-critical" style="background-color:#fee2e2;color:#991b1b;font-weight:700;padding:4px 10px;border:1px solid #fca5a5;border-radius:999px;">Act today</span>'
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation')
            then '<span class="exec-badge exec-warning" style="background-color:#fef3c7;color:#92400e;font-weight:700;padding:4px 10px;border:1px solid #fbbf24;border-radius:999px;">48 hours</span>'
        else '<span class="exec-badge exec-normal" style="background-color:#dcfce7;color:#166534;font-weight:700;padding:4px 10px;border:1px solid #86efac;border-radius:999px;">This week</span>'
    end as target_date_display,
    owner_team,
    owner_user_id,
    case
        when owner_team in ('Finance', 'Payer Relations') then '<span class="exec-badge exec-finance" style="background-color:#e0f2fe;color:#075985;font-weight:700;padding:4px 10px;border:1px solid #7dd3fc;border-radius:999px;">' || owner_team || '</span>'
        when owner_team in ('Denials Management', 'Revenue Integrity') then '<span class="exec-badge exec-warning" style="background-color:#fef3c7;color:#92400e;font-weight:700;padding:4px 10px;border:1px solid #fbbf24;border-radius:999px;">' || owner_team || '</span>'
        else '<span class="exec-badge exec-normal" style="background-color:#dcfce7;color:#166534;font-weight:700;padding:4px 10px;border:1px solid #86efac;border-radius:999px;">' || owner_team || '</span>'
    end as owner_badge,
    status,
    case
        when status in ('in_progress', 'under_review') then '<span class="exec-badge exec-warning" style="background-color:#fef3c7;color:#92400e;font-weight:700;padding:4px 10px;border:1px solid #fbbf24;border-radius:999px;">In progress</span>'
        when status in ('assigned', 'open', 'new') then '<span class="exec-badge exec-critical" style="background-color:#fee2e2;color:#991b1b;font-weight:700;padding:4px 10px;border:1px solid #fca5a5;border-radius:999px;">Open</span>'
        else '<span class="exec-badge exec-normal" style="background-color:#dcfce7;color:#166534;font-weight:700;padding:4px 10px;border:1px solid #86efac;border-radius:999px;">Resolved</span>'
    end as status_badge,
    case
        when recoverable_amount >= 20000 or issue_type in ('denial_appeal_priority', 'payer_underpayment_review', 'aged_ar_escalation') then 300 + recoverable_amount
        when recoverable_amount >= 10000 or issue_type in ('late_submission_risk', 'coding_backlog_escalation') then 200 + recoverable_amount
        else 100 + recoverable_amount
    end as risk_sort_score,
    source_system,
    concat(
        'Outstanding balance ',
        outstanding_amount::text,
        '; issue type ',
        issue_type,
        '; due ',
        due_date::text
    ) as evidence_summary
from candidate_rows
