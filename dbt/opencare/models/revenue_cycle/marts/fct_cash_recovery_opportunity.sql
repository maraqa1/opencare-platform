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
            when submission_date is not null and submission_date > claim_date + 5 then 'late_submission_risk'
            when claim_status = 'writeoff' then 'coding_backlog_escalation'
            else 'recover_cash_this_week'
        end as issue_type,
        case
            when claim_status in ('denied', 'appealed') then 'High-value denied balance is awaiting structured follow-up.'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'Payment posted below contracted reimbursement expectation.'
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
            when claim_status = 'writeoff' then 0.45
            else 0.74
        end::numeric(10, 4) as recovery_ratio,
        case
            when claim_status in ('denied', 'appealed') then 5.5
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 2.0
            when submission_date is not null and submission_date > claim_date + 5 then 1.5
            when claim_status = 'writeoff' then 4.5
            else 3.0
        end::numeric(10, 2) as effort_hours,
        case
            when claim_status in ('denied', 'appealed') then 'Denials Management'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'Payer Relations'
            when submission_date is not null and submission_date > claim_date + 5 then 'Revenue Integrity'
            when claim_status = 'writeoff' then 'Coding'
            else 'Revenue Integrity'
        end as owner_team,
        case
            when claim_status in ('denied', 'appealed') then 'denials.lead'
            when paid_amount > 0 and paid_amount < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98 then 'payer.relations'
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
    owner_team,
    owner_user_id,
    status,
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
