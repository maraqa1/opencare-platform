{{ config(materialized='table', tags=['jazan','decision','lifecycle']) }}

-- Current-state action lifecycle snapshot.
-- One row per decision action with the latest known state and cross-system linkage.

select
    cast(null as varchar(64)) as action_lifecycle_id,
    cast(null as varchar(64)) as decision_id,
    cast(null as varchar(64)) as action_id,
    cast(null as varchar(64)) as action_type,
    cast(null as varchar(32)) as action_channel,
    cast(null as varchar(64)) as triggered_by,
    cast(null as varchar(64)) as authorized_by,
    cast(null as varchar(64)) as owner_role,
    cast(null as varchar(64)) as owner_lookup_ref,
    cast(null as varchar(32)) as current_state,
    cast(null as varchar(32)) as previous_state,
    cast(null as timestamp) as fired_at,
    cast(null as timestamp) as acknowledged_at,
    cast(null as timestamp) as due_at,
    cast(null as timestamp) as resolved_at,
    cast(null as varchar(32)) as sla_status,
    cast(null as integer) as escalation_level,
    cast(null as varchar(128)) as external_reference_id,
    cast(null as varchar(64)) as notification_id,
    cast(null as varchar(64)) as ticket_id,
    cast(null as varchar(64)) as audit_event_id,
    cast(null as varchar(64)) as evidence_pack_id,
    cast(null as varchar(64)) as recovery_outcome_id,
    cast(null as timestamp) as created_at,
    cast(null as timestamp) as updated_at
where false
