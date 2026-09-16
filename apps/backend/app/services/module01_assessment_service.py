from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from psycopg.types.json import Jsonb

from app.config import settings
from app.db import connect


MAX_CAPTURE_BYTES = 2_000_000


class AssessmentError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    secret = settings.module01_assessment_token_secret
    if not secret:
        raise AssessmentError(503, "Customer assessment security is not configured.")
    return hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _capture_size(capture: dict[str, Any]) -> int:
    return len(json.dumps(capture, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def _validate_capture(capture: Any) -> dict[str, Any]:
    if not isinstance(capture, dict):
        raise AssessmentError(422, "Assessment capture must be an object.")
    if _capture_size(capture) > MAX_CAPTURE_BYTES:
        raise AssessmentError(413, "Assessment capture exceeds the 2 MB limit.")
    if capture.get("industryId") is not None and not isinstance(capture.get("industryId"), str):
        raise AssessmentError(422, "Invalid industry profile.")
    if capture.get("answers") is not None and not isinstance(capture.get("answers"), dict):
        raise AssessmentError(422, "Invalid assessment answers.")
    if capture.get("customerContext") is not None and not isinstance(capture.get("customerContext"), dict):
        raise AssessmentError(422, "Invalid customer context.")
    if capture.get("discovery") is not None and not isinstance(capture.get("discovery"), dict):
        raise AssessmentError(422, "Invalid discovery capture.")
    return capture


def ensure_schema() -> None:
    with connect() as conn:
        conn.execute("create schema if not exists module01")
        conn.execute("""
            create table if not exists module01.assessments (
              assessment_id uuid primary key,
              title varchar(240) not null,
              customer_name varchar(240) not null,
              respondent_email varchar(320) not null,
              industry_id varchar(60),
              selected_functions jsonb not null default '[]'::jsonb,
              questionnaire_version varchar(40) not null,
              status varchar(30) not null default 'draft',
              latest_revision integer not null default 0,
              created_by varchar(240) not null,
              created_at timestamptz not null default now(),
              updated_at timestamptz not null default now(),
              submitted_at timestamptz,
              constraint module01_assessment_status check (status in ('draft','in_progress','submitted','reviewed','reopened','revoked'))
            )
        """)
        conn.execute("""
            create table if not exists module01.assessment_revisions (
              assessment_id uuid not null references module01.assessments(assessment_id) on delete cascade,
              revision integer not null,
              operation_id uuid not null,
              capture jsonb not null,
              actor varchar(240) not null,
              created_at timestamptz not null default now(),
              primary key (assessment_id, revision),
              unique (assessment_id, operation_id)
            )
        """)
        conn.execute("""
            create table if not exists module01.assessment_invitations (
              invitation_id uuid primary key,
              assessment_id uuid not null references module01.assessments(assessment_id) on delete cascade,
              recipient_email varchar(320) not null,
              token_hash char(64) not null unique,
              expires_at timestamptz not null,
              accepted_at timestamptz,
              revoked_at timestamptz,
              created_at timestamptz not null default now()
            )
        """)
        conn.execute("""
            create table if not exists module01.assessment_sessions (
              session_id uuid primary key,
              assessment_id uuid not null references module01.assessments(assessment_id) on delete cascade,
              recipient_email varchar(320) not null,
              token_hash char(64) not null unique,
              expires_at timestamptz not null,
              revoked_at timestamptz,
              last_seen_at timestamptz not null default now(),
              created_at timestamptz not null default now()
            )
        """)
        conn.execute("""
            create table if not exists module01.assessment_events (
              event_id bigserial primary key,
              assessment_id uuid not null references module01.assessments(assessment_id) on delete cascade,
              event_type varchar(60) not null,
              actor varchar(240) not null,
              detail jsonb not null default '{}'::jsonb,
              created_at timestamptz not null default now()
            )
        """)
        conn.execute("create index if not exists module01_sessions_assessment on module01.assessment_sessions(assessment_id)")
        conn.execute("create index if not exists module01_events_assessment on module01.assessment_events(assessment_id, created_at desc)")


def require_admin_token(token: str | None) -> None:
    expected = settings.module01_assessment_admin_token
    if not expected or not token or not hmac.compare_digest(token, expected):
        raise AssessmentError(403, "Advisor authorization required.")


def create_assessment(payload: dict[str, Any], actor: str) -> dict[str, Any]:
    ensure_schema()
    title = str(payload.get("title") or "").strip()[:240]
    customer_name = str(payload.get("customerName") or "").strip()[:240]
    email = str(payload.get("respondentEmail") or "").strip().lower()[:320]
    if not title or not customer_name or "@" not in email:
        raise AssessmentError(422, "Title, customer name and a valid respondent email are required.")
    assessment_id, invitation_id = uuid.uuid4(), uuid.uuid4()
    invite_token = _new_token()
    initial_capture = _validate_capture(payload.get("initialCapture") or {})
    operation_id = uuid.uuid4()
    expires_at = _utc_now() + timedelta(days=max(1, min(int(payload.get("invitationDays") or 14), 30)))
    functions = payload.get("selectedFunctions") if isinstance(payload.get("selectedFunctions"), list) else []
    with connect() as conn:
        conn.execute("""
            insert into module01.assessments
              (assessment_id,title,customer_name,respondent_email,industry_id,selected_functions,questionnaire_version,latest_revision,created_by)
            values (%s,%s,%s,%s,%s,%s,%s,1,%s)
        """, (assessment_id, title, customer_name, email, payload.get("industryId"), Jsonb(functions), str(payload.get("questionnaireVersion") or "1.0.0")[:40], actor))
        conn.execute("insert into module01.assessment_revisions (assessment_id,revision,operation_id,capture,actor) values (%s,1,%s,%s,%s)", (assessment_id, operation_id, Jsonb(initial_capture), actor))
        conn.execute("insert into module01.assessment_invitations (invitation_id,assessment_id,recipient_email,token_hash,expires_at) values (%s,%s,%s,%s,%s)", (invitation_id, assessment_id, email, _hash_token(invite_token), expires_at))
        conn.execute("insert into module01.assessment_events (assessment_id,event_type,actor,detail) values (%s,'created',%s,%s)", (assessment_id, actor, Jsonb({"respondentEmail": email})))
    return {"assessmentId": str(assessment_id), "invitationToken": invite_token, "expiresAt": expires_at.isoformat(), "respondentEmail": email}


def create_invitation(assessment_id: str, invitation_days: int, actor: str) -> dict[str, Any]:
    ensure_schema()
    try:
        assessment_uuid = uuid.UUID(assessment_id)
    except ValueError as exc:
        raise AssessmentError(404, "Assessment not found.") from exc
    invite_token, invitation_id = _new_token(), uuid.uuid4()
    expires_at = _utc_now() + timedelta(days=max(1, min(invitation_days, 30)))
    with connect() as conn:
        assessment = conn.execute(
            "select assessment_id,respondent_email,status from module01.assessments where assessment_id=%s for update",
            (assessment_uuid,),
        ).fetchone()
        if not assessment or assessment["status"] == "revoked":
            raise AssessmentError(404, "Assessment not found.")
        conn.execute(
            "insert into module01.assessment_invitations (invitation_id,assessment_id,recipient_email,token_hash,expires_at) values (%s,%s,%s,%s,%s)",
            (invitation_id, assessment_uuid, assessment["respondent_email"], _hash_token(invite_token), expires_at),
        )
        conn.execute(
            "insert into module01.assessment_events (assessment_id,event_type,actor,detail) values (%s,'invitation_reissued',%s,%s)",
            (assessment_uuid, actor, Jsonb({"respondentEmail": assessment["respondent_email"]})),
        )
    return {"assessmentId": assessment_id, "invitationToken": invite_token, "expiresAt": expires_at.isoformat(), "respondentEmail": assessment["respondent_email"]}


def accept_invitation(token: str) -> dict[str, Any]:
    ensure_schema()
    if len(token) < 32 or len(token) > 200:
        raise AssessmentError(401, "Invalid or expired invitation.")
    token_hash = _hash_token(token)
    now, session_token, session_id = _utc_now(), _new_token(), uuid.uuid4()
    with connect() as conn:
        invitation = conn.execute("""
            select invitation_id,assessment_id,recipient_email,expires_at,accepted_at,revoked_at
            from module01.assessment_invitations where token_hash=%s for update
        """, (token_hash,)).fetchone()
        if not invitation or invitation["revoked_at"] or invitation["accepted_at"] or invitation["expires_at"] <= now:
            raise AssessmentError(401, "Invalid or expired invitation.")
        expires_at = now + timedelta(days=30)
        conn.execute("update module01.assessment_invitations set accepted_at=%s where invitation_id=%s", (now, invitation["invitation_id"]))
        conn.execute("insert into module01.assessment_sessions (session_id,assessment_id,recipient_email,token_hash,expires_at) values (%s,%s,%s,%s,%s)", (session_id, invitation["assessment_id"], invitation["recipient_email"], _hash_token(session_token), expires_at))
        conn.execute("update module01.assessments set status='in_progress',updated_at=%s where assessment_id=%s and status='draft'", (now, invitation["assessment_id"]))
        conn.execute("insert into module01.assessment_events (assessment_id,event_type,actor,detail) values (%s,'invitation_accepted',%s,'{}')", (invitation["assessment_id"], invitation["recipient_email"]))
    return {"assessmentId": str(invitation["assessment_id"]), "sessionToken": session_token, "expiresAt": expires_at.isoformat()}


def _session(assessment_id: str, token: str | None) -> dict[str, Any]:
    try:
        assessment_uuid = uuid.UUID(assessment_id)
    except ValueError as exc:
        raise AssessmentError(404, "Assessment not found.") from exc
    if not token:
        raise AssessmentError(401, "Assessment session required.")
    now = _utc_now()
    with connect() as conn:
        session = conn.execute("""
            select session_id,assessment_id,recipient_email,expires_at,revoked_at
            from module01.assessment_sessions where assessment_id=%s and token_hash=%s
        """, (assessment_uuid, _hash_token(token))).fetchone()
        if not session or session["revoked_at"] or session["expires_at"] <= now:
            raise AssessmentError(401, "Assessment session expired or revoked.")
        conn.execute("update module01.assessment_sessions set last_seen_at=%s where session_id=%s", (now, session["session_id"]))
    return session


def get_assessment(assessment_id: str, token: str | None) -> dict[str, Any]:
    session = _session(assessment_id, token)
    with connect() as conn:
        row = conn.execute("""
            select a.*,r.capture,r.created_at as saved_at
            from module01.assessments a join module01.assessment_revisions r
              on r.assessment_id=a.assessment_id and r.revision=a.latest_revision
            where a.assessment_id=%s
        """, (session["assessment_id"],)).fetchone()
    if not row:
        raise AssessmentError(404, "Assessment not found.")
    return {"assessmentId": str(row["assessment_id"]), "title": row["title"], "customerName": row["customer_name"], "status": row["status"], "revision": row["latest_revision"], "savedAt": row["saved_at"].isoformat(), "capture": row["capture"]}


def save_assessment(assessment_id: str, token: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    session = _session(assessment_id, token)
    capture = _validate_capture(payload.get("capture"))
    try:
        expected_revision = int(payload.get("expectedRevision"))
        operation_id = uuid.UUID(str(payload.get("operationId")))
    except (TypeError, ValueError) as exc:
        raise AssessmentError(422, "Expected revision and operation ID are required.") from exc
    now = _utc_now()
    with connect() as conn:
        existing = conn.execute("select revision,created_at from module01.assessment_revisions where assessment_id=%s and operation_id=%s", (session["assessment_id"], operation_id)).fetchone()
        if existing:
            return {"assessmentId": assessment_id, "revision": existing["revision"], "savedAt": existing["created_at"].isoformat(), "idempotentReplay": True}
        assessment = conn.execute("select latest_revision,status from module01.assessments where assessment_id=%s for update", (session["assessment_id"],)).fetchone()
        if not assessment or assessment["status"] in {"submitted", "reviewed", "revoked"}:
            raise AssessmentError(409, "Assessment is not open for editing.")
        if assessment["latest_revision"] != expected_revision:
            raise AssessmentError(409, f"Assessment changed elsewhere. Latest revision is {assessment['latest_revision']}.")
        revision = expected_revision + 1
        conn.execute("insert into module01.assessment_revisions (assessment_id,revision,operation_id,capture,actor,created_at) values (%s,%s,%s,%s,%s,%s)", (session["assessment_id"], revision, operation_id, Jsonb(capture), session["recipient_email"], now))
        conn.execute("update module01.assessments set latest_revision=%s,status='in_progress',updated_at=%s where assessment_id=%s", (revision, now, session["assessment_id"]))
    return {"assessmentId": assessment_id, "revision": revision, "savedAt": now.isoformat(), "idempotentReplay": False}


def submit_assessment(assessment_id: str, token: str | None, expected_revision: int) -> dict[str, Any]:
    session = _session(assessment_id, token)
    now = _utc_now()
    with connect() as conn:
        assessment = conn.execute("select latest_revision,status from module01.assessments where assessment_id=%s for update", (session["assessment_id"],)).fetchone()
        if not assessment:
            raise AssessmentError(404, "Assessment not found.")
        if assessment["status"] == "submitted":
            return {"assessmentId": assessment_id, "revision": assessment["latest_revision"], "status": "submitted", "submittedAt": now.isoformat()}
        if assessment["latest_revision"] != expected_revision:
            raise AssessmentError(409, f"Save the latest changes before submission. Latest revision is {assessment['latest_revision']}.")
        conn.execute("update module01.assessments set status='submitted',submitted_at=%s,updated_at=%s where assessment_id=%s", (now, now, session["assessment_id"]))
        conn.execute("insert into module01.assessment_events (assessment_id,event_type,actor,detail) values (%s,'submitted',%s,%s)", (session["assessment_id"], session["recipient_email"], Jsonb({"revision": expected_revision})))
    return {"assessmentId": assessment_id, "revision": expected_revision, "status": "submitted", "submittedAt": now.isoformat()}
