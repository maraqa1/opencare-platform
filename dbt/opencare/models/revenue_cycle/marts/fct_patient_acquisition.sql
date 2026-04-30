{{ config(tags=["revenue-cycle", "finance", "cfo"], contract={"enforced": true}) }}

select
    md5(concat(r.referral_id, '||', r.encounter_id)) as acquisition_id,
    r.encounter_id,
    r.acquisition_channel,
    r.referral_source,
    date_trunc('month', r.referral_date)::date as period_start,
    (date_trunc('month', r.referral_date) + interval '1 month - 1 day')::date as period_end,
    1::integer as encounter_count,
    coalesce(c.gross_billed_amount, 0)::numeric(14, 2) as gross_revenue,
    coalesce(c.paid_amount, 0)::numeric(14, 2) as collected_revenue
from {{ ref('stg_rcm_referrals') }} r
left join {{ ref('stg_rcm_claims') }} c
    on c.encounter_id = r.encounter_id
