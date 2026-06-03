{{ config(materialized='table', tags=['jazan','decision','audit']) }}

-- Append-only audit event stream for decision action lifecycle transitions.
-- Real rows are written by the OpenCare decision workflow after human authorisation.

select
    cast(null as varchar(64)) as decision_event_id,
    cast(null as varchar(64)) as action_lifecycle_id,
    cast(null as varchar(64)) as decision_id,
    cast(null as varchar(64)) as action_id,
    cast(null as varchar(64)) as action_type,
    cast(null as varchar(32)) as action_channel,
    cast(null as varchar(32)) as previous_state,
    cast(null as varchar(32)) as current_state,
    cast(null as varchar(64)) as actor_id,
    cast(null as varchar(64)) as actor_role,
    cast(null as boolean) as human_authorised,
    cast(null as varchar(128)) as external_reference_id,
    cast(null as varchar(64)) as notification_id,
    cast(null as varchar(64)) as ticket_id,
    cast(null as varchar(64)) as evidence_pack_id,
    cast(null as varchar(64)) as recovery_outcome_id,
    cast(null as timestamp) as event_ts,
    cast(null as varchar(128)) as audit_event
where false
