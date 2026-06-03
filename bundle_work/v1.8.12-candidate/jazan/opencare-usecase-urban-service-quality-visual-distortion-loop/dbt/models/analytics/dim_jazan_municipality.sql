{{ config(materialized='table', tags=['jazan','analytics','dimension','municipality']) }}

select
    municipality_id,
    municipality_name_en,
    municipality_name_ar,
    municipality_type,
    municipality_archetype,
    population_band,
    active_flag,
    last_refreshed_at
from {{ ref('stg_jazan_municipalities') }}
