from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.governance.read_service import GovernanceNotFound, GovernanceReadService

router = APIRouter(prefix="/api/v1/governance", tags=["governance"])


def get_governance_read_service() -> GovernanceReadService:
    return GovernanceReadService(
        use_cases_dir=Path(settings.governance_use_cases_dir),
        policies_dir=Path(settings.governance_policies_dir),
    )


def not_found(exc: GovernanceNotFound) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


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
