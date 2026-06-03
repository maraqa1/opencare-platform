{{ config(materialized='view', tags=['jazan','staging','municipality']) }}

-- Canonical municipality staging model used by all Jazan municipal facts.
-- Derived from observed raw service and visual-distortion sources so the bundle is self-contained.

with service_municipalities as (
    select distinct cast(municipality_id as varchar(8)) as municipality_id
    from {{ source('raw_jazan', 'service_requests') }}
    where municipality_id is not null
),
visual_municipalities as (
    select distinct cast(municipality_id as varchar(8)) as municipality_id
    from {{ source('raw_jazan', 'visual_distortion_cases') }}
    where municipality_id is not null
),
unioned as (
    select municipality_id from service_municipalities
    union
    select municipality_id from visual_municipalities
)
select
    municipality_id,
    municipality_id as municipality_name_en,
    municipality_id as municipality_name_ar,
    'municipality' as municipality_type,
    'unknown' as municipality_archetype,
    'unknown' as population_band,
    true as active_flag,
    current_timestamp as last_refreshed_at
from unioned
