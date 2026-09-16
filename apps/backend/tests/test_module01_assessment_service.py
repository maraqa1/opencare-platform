from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from types import SimpleNamespace
import uuid

import pytest

from app.services import module01_assessment_service as service


class Result:
    def __init__(self, row=None): self.row = row
    def fetchone(self): return self.row


class MemoryDatabase:
    def __init__(self):
        self.assessments = {}; self.revisions = {}; self.invitations = {}; self.sessions = {}; self.events = []

    @contextmanager
    def connect(self): yield Connection(self)


class Connection:
    def __init__(self, db): self.db = db
    def execute(self, query, params=None):
        q = " ".join(query.lower().split()); p = params or ()
        if q.startswith(("create schema", "create table", "create index")): return Result()
        if "insert into module01.assessments" in q:
            aid,title,name,email,industry,functions,version,actor=p; self.db.assessments[aid]={"assessment_id":aid,"title":title,"customer_name":name,"respondent_email":email,"industry_id":industry,"selected_functions":functions.obj,"questionnaire_version":version,"status":"draft","latest_revision":1,"created_by":actor,"submitted_at":None}; return Result()
        if "insert into module01.assessment_revisions" in q:
            if len(p)==4:
                aid,op,capture,actor=p; rev=1; created=datetime.now(timezone.utc)
            elif len(p)==5:
                aid,rev,op,capture,actor=p; created=datetime.now(timezone.utc)
            else:
                aid,rev,op,capture,actor,created=p
            self.db.revisions[(aid,rev)]={"assessment_id":aid,"revision":rev,"operation_id":op,"capture":capture.obj,"actor":actor,"created_at":created}; return Result()
        if "insert into module01.assessment_invitations" in q:
            iid,aid,email,token_hash,expires=p; self.db.invitations[token_hash]={"invitation_id":iid,"assessment_id":aid,"recipient_email":email,"token_hash":token_hash,"expires_at":expires,"accepted_at":None,"revoked_at":None}; return Result()
        if "select assessment_id,respondent_email,status from module01.assessments" in q: return Result(self.db.assessments.get(p[0]))
        if "from module01.assessment_invitations" in q: return Result(self.db.invitations.get(p[0]))
        if "update module01.assessment_invitations" in q: self.db.invitations[next(k for k,v in self.db.invitations.items() if v["invitation_id"]==p[1])]["accepted_at"]=p[0]; return Result()
        if "insert into module01.assessment_sessions" in q:
            sid,aid,email,token_hash,expires=p; self.db.sessions[token_hash]={"session_id":sid,"assessment_id":aid,"recipient_email":email,"expires_at":expires,"revoked_at":None}; return Result()
        if "update module01.assessments set status='in_progress'" in q: self.db.assessments[p[1]]["status"]="in_progress"; return Result()
        if "insert into module01.assessment_events" in q: self.db.events.append(p); return Result()
        if "from module01.assessment_sessions" in q:
            session=self.db.sessions.get(p[1])
            return Result(session if session and session["assessment_id"]==p[0] else None)
        if "update module01.assessment_sessions" in q: return Result()
        if "from module01.assessments a join" in q:
            a=self.db.assessments[p[0]].copy(); r=self.db.revisions[(p[0],a["latest_revision"])]; a.update(capture=r["capture"],saved_at=r["created_at"]); return Result(a)
        if "where assessment_id=%s and operation_id=%s" in q:
            return Result(next((r for r in self.db.revisions.values() if r["assessment_id"]==p[0] and r["operation_id"]==p[1]),None))
        if "select latest_revision,status" in q: return Result(self.db.assessments.get(p[0]))
        if "update module01.assessments set latest_revision" in q:
            rev,_,aid=p; self.db.assessments[aid].update(latest_revision=rev,status="in_progress"); return Result()
        if "update module01.assessments set status='submitted'" in q:
            submitted,_,aid=p; self.db.assessments[aid].update(status="submitted",submitted_at=submitted); return Result()
        raise AssertionError(q)


@pytest.fixture()
def memory(monkeypatch):
    db=MemoryDatabase()
    monkeypatch.setattr(service,"connect",db.connect)
    monkeypatch.setattr(service,"settings",SimpleNamespace(module01_assessment_admin_token="admin-test",module01_assessment_token_secret="secret-test"))
    return db


def test_invitation_autosave_conflict_idempotency_and_submission(memory):
    created=service.create_assessment({"title":"Diagnostic","customerName":"Fictional Health","respondentEmail":"person@example.test","industryId":"healthcare","initialCapture":{"industryId":"healthcare","answers":{}}},"advisor")
    accepted=service.accept_invitation(created["invitationToken"])
    assessment=service.get_assessment(created["assessmentId"],accepted["sessionToken"])
    assert assessment["revision"]==1 and assessment["capture"]["industryId"]=="healthcare"
    operation=str(uuid.uuid4())
    saved=service.save_assessment(created["assessmentId"],accepted["sessionToken"],{"expectedRevision":1,"operationId":operation,"capture":{"industryId":"healthcare","answers":{"q001":{"score":2}}}})
    assert saved["revision"]==2 and saved["idempotentReplay"] is False
    replay=service.save_assessment(created["assessmentId"],accepted["sessionToken"],{"expectedRevision":1,"operationId":operation,"capture":{"industryId":"healthcare"}})
    assert replay["revision"]==2 and replay["idempotentReplay"] is True
    with pytest.raises(service.AssessmentError,match="changed elsewhere") as conflict: service.save_assessment(created["assessmentId"],accepted["sessionToken"],{"expectedRevision":1,"operationId":str(uuid.uuid4()),"capture":{}})
    assert conflict.value.status_code==409
    submitted=service.submit_assessment(created["assessmentId"],accepted["sessionToken"],2)
    assert submitted["status"]=="submitted"
    with pytest.raises(service.AssessmentError,match="not open"): service.save_assessment(created["assessmentId"],accepted["sessionToken"],{"expectedRevision":2,"operationId":str(uuid.uuid4()),"capture":{}})


def test_invitation_is_one_time_and_access_is_assessment_scoped(memory):
    one=service.create_assessment({"title":"One","customerName":"One","respondentEmail":"one@example.test","initialCapture":{}},"advisor")
    two=service.create_assessment({"title":"Two","customerName":"Two","respondentEmail":"two@example.test","initialCapture":{}},"advisor")
    session=service.accept_invitation(one["invitationToken"])
    with pytest.raises(service.AssessmentError) as reused: service.accept_invitation(one["invitationToken"])
    assert reused.value.status_code==401
    with pytest.raises(service.AssessmentError) as cross_access: service.get_assessment(two["assessmentId"],session["sessionToken"])
    assert cross_access.value.status_code==401


def test_advisor_can_reissue_an_invitation_for_the_same_assessment(memory):
    created=service.create_assessment({"title":"One","customerName":"One","respondentEmail":"one@example.test","initialCapture":{}},"advisor")
    replacement=service.create_invitation(created["assessmentId"],7,"advisor")
    assert replacement["assessmentId"]==created["assessmentId"]
    assert replacement["respondentEmail"]=="one@example.test"
    assert replacement["invitationToken"]!=created["invitationToken"]
    assert service.accept_invitation(replacement["invitationToken"])["assessmentId"]==created["assessmentId"]


def test_fail_closed_without_secrets(monkeypatch):
    monkeypatch.setattr(service,"settings",SimpleNamespace(module01_assessment_admin_token="",module01_assessment_token_secret=""))
    with pytest.raises(service.AssessmentError) as admin: service.require_admin_token("anything")
    assert admin.value.status_code==403
    with pytest.raises(service.AssessmentError) as token: service._hash_token("anything")
    assert token.value.status_code==503


def test_rejects_oversized_and_invalid_capture(memory):
    with pytest.raises(service.AssessmentError) as invalid: service._validate_capture({"answers":[]})
    assert invalid.value.status_code==422
    with pytest.raises(service.AssessmentError) as large: service._validate_capture({"value":"x"*service.MAX_CAPTURE_BYTES})
    assert large.value.status_code==413
