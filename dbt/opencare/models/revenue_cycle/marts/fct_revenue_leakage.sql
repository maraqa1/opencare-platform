{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

with base as (
    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        claim_date,
        submission_date,
        payment_date,
        claim_status,
        gross_billed_amount,
        contracted_amount,
        paid_amount,
        greatest(
            coalesce(contracted_amount, gross_billed_amount, 0) - coalesce(paid_amount, 0),
            0
        )::numeric(14, 2) as outstanding_amount,
        cast(right(claim_id, 2) as integer) as claim_suffix
    from {{ ref('stg_rcm_claims') }}
)

select
    md5(concat(claim_id, '||', leakage_type)) as leakage_id,
    claim_id,
    encounter_id,
    payer_id,
    department_id,
    detected_date,
    leakage_type,
    leakage_reason,
    leakage_amount,
    owner_team,
    owner_user_id,
    status
from (
    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        coalesce(submission_date, claim_date) as detected_date,
        'unbilled_encounters' as leakage_type,
        'Encounter remains open beyond the billing window.' as leakage_reason,
        greatest(coalesce(contracted_amount, gross_billed_amount, 0), 0)::numeric(14, 2) as leakage_amount,
        'Patient Access' as owner_team,
        'patient.access' as owner_user_id,
        'open' as status
    from base
    where claim_status = 'open'

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        submission_date as detected_date,
        'late_submissions' as leakage_type,
        'Claim submission lag exceeded the five-day internal SLA.' as leakage_reason,
        (coalesce(contracted_amount, gross_billed_amount, 0) * 0.25)::numeric(14, 2) as leakage_amount,
        'Revenue Integrity' as owner_team,
        'revenue.integrity' as owner_user_id,
        'open' as status
    from base
    where submission_date is not null
      and submission_date > claim_date + 5

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        coalesce(payment_date, current_date) as detected_date,
        'denied_not_appealed' as leakage_type,
        'Denied claim has not yet moved into appeal work.' as leakage_reason,
        outstanding_amount as leakage_amount,
        'Denials Management' as owner_team,
        'denials.lead' as owner_user_id,
        'open' as status
    from base
    where claim_status = 'denied'

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        coalesce(payment_date, current_date) as detected_date,
        'underpayments' as leakage_type,
        'Paid below contract expectation.' as leakage_reason,
        greatest(coalesce(contracted_amount, 0) - coalesce(paid_amount, 0), 0)::numeric(14, 2) as leakage_amount,
        'Payer Relations' as owner_team,
        'payer.relations' as owner_user_id,
        'open' as status
    from base
    where paid_amount > 0
      and coalesce(paid_amount, 0) < coalesce(contracted_amount, gross_billed_amount, 0) * 0.98

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        claim_date as detected_date,
        'undercoding' as leakage_type,
        'Charge capture suggests a low-complexity coding pattern for a high-acuity department.' as leakage_reason,
        (coalesce(gross_billed_amount, 0) * 0.18)::numeric(14, 2) as leakage_amount,
        'Coding' as owner_team,
        'coding.lead' as owner_user_id,
        'open' as status
    from base
    where department_id in ('WARD-04', 'WARD-08')
      and coalesce(gross_billed_amount, 0) < 3500

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        coalesce(payment_date, current_date) as detected_date,
        'writeoffs' as leakage_type,
        'Claim moved into writeoff before full recovery.' as leakage_reason,
        outstanding_amount as leakage_amount,
        'Finance' as owner_team,
        'finance.control' as owner_user_id,
        'open' as status
    from base
    where claim_status = 'writeoff'

    union all

    select
        claim_id,
        encounter_id,
        payer_id,
        department_id,
        claim_date as detected_date,
        'missing_authorization' as leakage_type,
        'Authorization evidence is incomplete for this payer pathway.' as leakage_reason,
        (coalesce(contracted_amount, gross_billed_amount, 0) * 0.22)::numeric(14, 2) as leakage_amount,
        'Patient Access' as owner_team,
        'patient.access' as owner_user_id,
        'open' as status
    from base
    where claim_suffix % 7 = 0
) leakage_rows
