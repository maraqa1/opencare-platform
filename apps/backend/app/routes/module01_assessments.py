from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.module01_assessment_service import (
    AssessmentError,
    accept_invitation,
    create_assessment,
    create_invitation,
    get_assessment,
    require_admin_token,
    save_assessment,
    submit_assessment,
)


router = APIRouter(prefix="/api/v1/module01", tags=["module01-assessments"])


class CreateAssessment(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    customerName: str = Field(min_length=1, max_length=240)
    respondentEmail: str = Field(min_length=3, max_length=320)
    industryId: str | None = Field(default=None, max_length=60)
    selectedFunctions: list[str] = Field(default_factory=list, max_length=20)
    questionnaireVersion: str = Field(default="1.0.0", max_length=40)
    invitationDays: int = Field(default=14, ge=1, le=30)
    initialCapture: dict[str, Any] = Field(default_factory=dict)


class AcceptInvitation(BaseModel):
    token: str = Field(min_length=32, max_length=200)


class ReissueInvitation(BaseModel):
    invitationDays: int = Field(default=14, ge=1, le=30)


class SaveAssessment(BaseModel):
    expectedRevision: int = Field(ge=1)
    operationId: str = Field(min_length=32, max_length=64)
    capture: dict[str, Any]


class SubmitAssessment(BaseModel):
    expectedRevision: int = Field(ge=1)


def _handle(action):
    try:
        return action()
    except AssessmentError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def _bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization[7:].strip()


@router.post("/admin/assessments")
def create(payload: CreateAssessment, request: Request, x_module01_admin_token: str | None = Header(default=None)):
    return _handle(lambda: (require_admin_token(x_module01_admin_token), create_assessment(payload.model_dump(), request.headers.get("x-opencare-actor", "portal-advisor")))[1])


@router.post("/admin/assessments/{assessment_id}/invitations")
def reissue(assessment_id: str, payload: ReissueInvitation, request: Request, x_module01_admin_token: str | None = Header(default=None)):
    return _handle(lambda: (require_admin_token(x_module01_admin_token), create_invitation(assessment_id, payload.invitationDays, request.headers.get("x-opencare-actor", "portal-advisor")))[1])


@router.post("/invitations/accept")
def accept(payload: AcceptInvitation):
    return _handle(lambda: accept_invitation(payload.token))


@router.get("/assessments/{assessment_id}")
def read(assessment_id: str, authorization: str | None = Header(default=None)):
    return _handle(lambda: get_assessment(assessment_id, _bearer(authorization)))


@router.put("/assessments/{assessment_id}")
def save(assessment_id: str, payload: SaveAssessment, authorization: str | None = Header(default=None)):
    return _handle(lambda: save_assessment(assessment_id, _bearer(authorization), payload.model_dump()))


@router.post("/assessments/{assessment_id}/submit")
def submit(assessment_id: str, payload: SubmitAssessment, authorization: str | None = Header(default=None)):
    return _handle(lambda: submit_assessment(assessment_id, _bearer(authorization), payload.expectedRevision))
