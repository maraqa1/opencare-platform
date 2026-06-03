{{ config(materialized='table', tags=['jazan','analytics','dimension','owner_lookup','decision_actions']) }}

-- Buildable owner lookup consumed by human-authorized external action workflows.
-- Action buttons reference this table through options_source=dim_jazan_municipality_owners.

select
    municipality_owner_id,
    municipality_id,
    owner_role,
    owner_display_label,
    notification_channel,
    active_flag,
    last_refreshed_at
from {{ ref('stg_jazan_municipality_owners') }}
