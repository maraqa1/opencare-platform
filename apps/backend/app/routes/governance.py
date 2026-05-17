from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.config import settings
from app.governance import actions
from app.governance.actions import GovernanceActionError
from app.governance import exports
from app.governance.exports import GovernanceExportError
from app.governance.read_service import GovernanceNotFound, GovernanceReadService

router = APIRouter(prefix="/api/v1/governance", tags=["governance"])


class GovernanceActionPayload(BaseModel):
    actor: str | None = None
    role: str | None = None
    reason: str | None = None
    request_id: str | None = None
    assigned_owner: str | None = None
    use_case_slug: str | None = None
    classification: str | None = None
    sensitivity: str | None = None
    owner: str | None = None
    expiry_date: str | None = None
    exception_id: str | None = None
    version: str | None = None
    approval_chain: list[dict[str, Any]] | None = None

    def clean(self) -> dict[str, Any]:
        if hasattr(self, "model_dump"):
            return self.model_dump(exclude_none=True)
        return self.dict(exclude_none=True)


def get_governance_read_service() -> GovernanceReadService:
    return GovernanceReadService(
        use_cases_dir=Path(settings.governance_use_cases_dir),
        policies_dir=Path(settings.governance_policies_dir),
    )


def not_found(exc: GovernanceNotFound) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


def require_operator(x_opencare_role: str | None = Header(default=None)) -> None:
    if x_opencare_role not in {"operator", "admin"}:
        raise HTTPException(status_code=403, detail="Operator role is required")


def action_not_found(item: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{item} not found")


def action_payload(payload: GovernanceActionPayload) -> dict[str, Any]:
    return payload.clean()


class GovernanceExportPayload(BaseModel):
    pack_id: str
    actor: str | None = None
    role: str | None = None
    request_id: str | None = None
    export_id: str | None = None

    def clean(self) -> dict[str, Any]:
        if hasattr(self, "model_dump"):
            return self.model_dump(exclude_none=True)
        return self.dict(exclude_none=True)


@router.get("/use-cases")
def list_use_cases() -> list[dict[str, object]]:
    return [record.dict() for record in get_governance_read_service().list_use_cases()]


@router.get("/use-cases/{slug}")
def get_use_case(slug: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_use_case(slug).dict()
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/use-cases/{slug}/metrics")
def list_metrics(slug: str) -> list[dict[str, object]]:
    try:
        return [record.dict() for record in get_governance_read_service().list_metrics(slug)]
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/use-cases/{slug}/metrics/{metric_id}")
def get_metric(slug: str, metric_id: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_metric(slug, metric_id).dict()
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/use-cases/{slug}/tables")
def list_tables(slug: str) -> list[dict[str, object]]:
    try:
        return [record.dict() for record in get_governance_read_service().list_tables(slug)]
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/use-cases/{slug}/tables/{table_id}")
def get_table(slug: str, table_id: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_table(slug, table_id).dict()
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/attributes/{attribute_id}")
def get_attribute(attribute_id: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_attribute(attribute_id)
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/use-cases/{slug}/lineage")
def get_lineage(slug: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_lineage(slug)
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/issues")
def list_issues() -> list[dict[str, object]]:
    return get_governance_read_service().list_issues()


@router.get("/issues/{issue_id}")
def get_issue(issue_id: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_issue(issue_id)
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/evidence/packs")
def list_evidence_packs() -> list[dict[str, object]]:
    return [record.dict() for record in get_governance_read_service().list_evidence_packs()]


@router.post("/evidence/exports")
def request_evidence_export(payload: GovernanceExportPayload) -> dict[str, object]:
    try:
        return {
            "item": exports.request_export(
                payload.pack_id,
                payload.clean(),
                service=get_governance_read_service(),
            )
        }
    except GovernanceExportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/evidence/exports")
def list_evidence_exports() -> dict[str, object]:
    return {"items": exports.list_exports()}


@router.get("/evidence/exports/{export_id}")
def get_evidence_export(export_id: str) -> dict[str, object]:
    row = exports.get_export(export_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Evidence export not found")
    return {"item": row}


@router.get("/evidence/exports/{export_id}/download")
def download_evidence_export(export_id: str) -> Response:
    try:
        filename, content = exports.download_export(export_id, service=get_governance_read_service())
    except GovernanceExportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(
        content,
        media_type="application/json",
        headers={"content-disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/policies")
def list_policies() -> list[dict[str, object]]:
    return [record.dict() for record in get_governance_read_service().list_policies()]


@router.get("/policies/{policy_id}")
def get_policy(policy_id: str) -> dict[str, object]:
    try:
        return get_governance_read_service().get_policy(policy_id).dict()
    except GovernanceNotFound as exc:
        raise not_found(exc) from exc


@router.get("/audit/events")
def list_audit_events() -> list[dict[str, object]]:
    return get_governance_read_service().list_audit_events()


@router.post("/admin/issues/{issue_id}/assign")
def assign_issue(issue_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    try:
        row = actions.assign_issue(issue_id, action_payload(payload))
    except GovernanceActionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if row is None:
        raise action_not_found("Issue")
    return {"item": row}


@router.post("/admin/issues/{issue_id}/resolve")
def resolve_issue(issue_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    row = actions.resolve_issue(issue_id, action_payload(payload))
    if row is None:
        raise action_not_found("Issue")
    return {"item": row}


@router.post("/admin/issues/{issue_id}/ignore")
def ignore_issue(issue_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    try:
        row = actions.ignore_issue(issue_id, action_payload(payload))
    except GovernanceActionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if row is None:
        raise action_not_found("Issue")
    return {"item": row}


@router.post("/admin/attributes/{attribute_id}/classify")
def classify_attribute(attribute_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    return {"item": actions.request_classification_change(attribute_id, action_payload(payload))}


@router.post("/admin/attributes/{attribute_id}/approve")
def approve_attribute(attribute_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    return {"item": actions.approve_classification_change(attribute_id, action_payload(payload))}


@router.post("/admin/attributes/{attribute_id}/exception")
def add_attribute_exception(attribute_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    try:
        return {"item": actions.add_exception(attribute_id, action_payload(payload))}
    except GovernanceActionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/admin/policies/{policy_id}/publish")
def publish_policy(policy_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    row = actions.publish_policy(policy_id, action_payload(payload))
    if row is None:
        raise action_not_found("Policy")
    return {"item": row}


@router.post("/admin/policies/{policy_id}/retire")
def retire_policy(policy_id: str, payload: GovernanceActionPayload, _: None = Depends(require_operator)) -> dict[str, object]:
    try:
        row = actions.retire_policy(policy_id, action_payload(payload))
    except GovernanceActionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if row is None:
        raise action_not_found("Policy")
    return {"item": row}
