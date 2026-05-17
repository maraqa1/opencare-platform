from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from psycopg import sql
from psycopg.types.json import Jsonb

from app.config import settings
from app.db import connect


class GovernanceActionError(ValueError):
    pass


def _governance_table(name: str) -> sql.Composed:
    return sql.SQL("{}.{}").format(sql.Identifier(settings.governance_schema), sql.Identifier(name))


def _actor(payload: dict[str, Any]) -> str:
    return str(payload.get("actor") or "portal_user")


def _role(payload: dict[str, Any]) -> str:
    return str(payload.get("role") or "operator")


def _insert_audit(
    conn: Any,
    *,
    actor: str,
    role: str,
    event_type: str,
    target_type: str,
    target_id: str,
    use_case_slug: str | None = None,
    before_state: dict[str, Any] | None = None,
    after_state: dict[str, Any] | None = None,
    reason: str | None = None,
    request_id: str | None = None,
    approval_chain: list[dict[str, Any]] | None = None,
) -> None:
    conn.execute(
        sql.SQL(
            """
            insert into {} (
              actor,
              role,
              event_type,
              target_type,
              target_id,
              use_case_slug,
              before_state,
              after_state,
              reason,
              request_id,
              approval_chain
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
        ).format(_governance_table("audit_log")),
        (
            actor,
            role,
            event_type,
            target_type,
            target_id,
            use_case_slug,
            Jsonb(before_state) if before_state is not None else None,
            Jsonb(after_state) if after_state is not None else None,
            reason,
            request_id,
            Jsonb(approval_chain or []),
        ),
    )


def _fetch_issue(conn: Any, issue_id: str) -> dict[str, Any] | None:
    return conn.execute(
        sql.SQL("select * from {} where issue_id = %s for update").format(_governance_table("issues")),
        (issue_id,),
    ).fetchone()


def _update_issue_status(
    issue_id: str,
    *,
    status: Literal["assigned", "resolved", "ignored"],
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    with connect() as conn:
        before = _fetch_issue(conn, issue_id)
        if before is None:
            return None

        assigned_owner = payload.get("assigned_owner", before.get("assigned_owner"))
        row = conn.execute(
            sql.SQL(
                """
                update {}
                set status = %s,
                    assigned_owner = %s,
                    updated_at = now()
                where issue_id = %s
                returning *
                """
            ).format(_governance_table("issues")),
            (status, assigned_owner, issue_id),
        ).fetchone()

        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type=f"issue_{status}",
            target_type="issue",
            target_id=issue_id,
            use_case_slug=before.get("use_case_slug"),
            before_state=dict(before),
            after_state=dict(row),
            reason=payload.get("reason"),
            request_id=payload.get("request_id"),
        )
        return row


def assign_issue(issue_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not payload.get("assigned_owner"):
        raise GovernanceActionError("assigned_owner is required")
    return _update_issue_status(issue_id, status="assigned", payload=payload)


def resolve_issue(issue_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    return _update_issue_status(issue_id, status="resolved", payload=payload)


def ignore_issue(issue_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not payload.get("reason"):
        raise GovernanceActionError("reason is required to ignore an issue")
    return _update_issue_status(issue_id, status="ignored", payload=payload)


def request_classification_change(attribute_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    after_state = {
        "attribute_id": attribute_id,
        "requested_classification": payload.get("classification"),
        "requested_sensitivity": payload.get("sensitivity"),
        "status": "requested",
    }
    with connect() as conn:
        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type="classification_change_requested",
            target_type="attribute",
            target_id=attribute_id,
            use_case_slug=payload.get("use_case_slug"),
            after_state=after_state,
            reason=payload.get("reason"),
            request_id=payload.get("request_id"),
        )
    return after_state


def approve_classification_change(attribute_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    after_state = {
        "attribute_id": attribute_id,
        "classification": payload.get("classification"),
        "sensitivity": payload.get("sensitivity"),
        "status": "approved",
    }
    with connect() as conn:
        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type="classification_approved",
            target_type="attribute",
            target_id=attribute_id,
            use_case_slug=payload.get("use_case_slug"),
            after_state=after_state,
            reason=payload.get("reason"),
            request_id=payload.get("request_id"),
            approval_chain=payload.get("approval_chain") or [],
        )
    return after_state


def add_exception(attribute_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    expiry_date = payload.get("expiry_date")
    if not expiry_date:
        raise GovernanceActionError("expiry_date is required")
    expiry = datetime.fromisoformat(str(expiry_date).replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if expiry <= now:
        raise GovernanceActionError("expiry_date must be in the future")

    exception_id = str(payload.get("exception_id") or f"{attribute_id}:{expiry.date().isoformat()}")
    owner = str(payload.get("owner") or "")
    reason = str(payload.get("reason") or "")
    if not owner or not reason:
        raise GovernanceActionError("owner and reason are required")

    row_payload = {
        "id": exception_id,
        "target_type": "attribute",
        "target_id": attribute_id,
        "owner": owner,
        "reason": reason,
        "expiry_date": expiry.isoformat(),
        "status": "active",
    }
    with connect() as conn:
        row = conn.execute(
            sql.SQL(
                """
                insert into {} (
                  exception_id,
                  target_type,
                  target_id,
                  owner,
                  reason,
                  expiry_date,
                  status
                )
                values (%s, %s, %s, %s, %s, %s, %s)
                returning *
                """
            ).format(_governance_table("exceptions")),
            (exception_id, "attribute", attribute_id, owner, reason, expiry, "active"),
        ).fetchone()
        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type="exception_granted",
            target_type="attribute",
            target_id=attribute_id,
            use_case_slug=payload.get("use_case_slug"),
            after_state=dict(row or row_payload),
            reason=reason,
            request_id=payload.get("request_id"),
        )
    return row or row_payload


def _set_policy_status(policy_id: str, status: Literal["active", "retired"], payload: dict[str, Any]) -> dict[str, Any] | None:
    version = payload.get("version")
    with connect() as conn:
        before = conn.execute(
            sql.SQL("select * from {} where policy_id = %s and (%s::text is null or version = %s) order by version desc limit 1 for update").format(
                _governance_table("policies")
            ),
            (policy_id, version, version),
        ).fetchone()
        if before is None:
            return None
        row = conn.execute(
            sql.SQL(
                """
                update {}
                set status = %s,
                    updated_at = now()
                where policy_id = %s and version = %s
                returning *
                """
            ).format(_governance_table("policies")),
            (status, policy_id, before["version"]),
        ).fetchone()
        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type=f"policy_{'published' if status == 'active' else 'retired'}",
            target_type="policy",
            target_id=f"{policy_id}:{before['version']}",
            before_state=dict(before),
            after_state=dict(row),
            reason=payload.get("reason"),
            request_id=payload.get("request_id"),
        )
        return row


def publish_policy(policy_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    return _set_policy_status(policy_id, "active", payload)


def retire_policy(policy_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not payload.get("reason"):
        raise GovernanceActionError("reason is required to retire a policy")
    return _set_policy_status(policy_id, "retired", payload)
