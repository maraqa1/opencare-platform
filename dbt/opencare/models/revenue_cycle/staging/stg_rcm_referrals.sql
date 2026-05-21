select
    cast(referral_id as text) as referral_id,
    cast(encounter_id as text) as encounter_id,
    lower(trim(cast(acquisition_channel as text))) as acquisition_channel,
    cast(referral_source as text) as referral_source,
    cast(referral_date as date) as referral_date
from {{ source('raw', 'rcm_referrals') }}
