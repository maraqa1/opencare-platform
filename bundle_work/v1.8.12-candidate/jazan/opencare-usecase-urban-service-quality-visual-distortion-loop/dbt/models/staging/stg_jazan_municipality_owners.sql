{{ config(materialized='view', tags=['jazan','staging','owner_lookup','decision_actions']) }}

-- Municipality owner lookup staging model.
-- Required by ticket/email decision actions. Does not expose personal identifiers to executive dashboards.

select
    cast(municipality_owner_id as varchar(64)) as municipality_owner_id,
    cast(municipality_id as varchar(8)) as municipality_id,
    cast(owner_role as varchar(128)) as owner_role,
    cast(owner_display_label as varchar(256)) as owner_display_label,
    cast(notification_channel as varchar(32)) as notification_channel,
    cast(active_flag as boolean) as active_flag,
    current_timestamp as last_refreshed_at
from {{ source('raw_jazan', 'municipality_owners') }}
where active_flag = true
