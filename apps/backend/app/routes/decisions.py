from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.decision_service import (
    check_escalations,
    count_decisions,
    decision_log,
    decision_outcome,
    generate_decisions,
    get_decision,
    list_decisions,
    measure_outcomes,
    transition_decision,
)

router = APIRouter(prefix="/api/v1", tags=["decisions"])


class DecisionActionPayload(BaseModel):
    assignee_user: str | None = None
    assignee_email: str | None = None
    owner_team: str | None = None
    notes: str | None = None
    reason: str | None = None
    actions_completed: list[int] | None = None
    performed_by: str | None = None
    performed_by_role: str | None = None


@router.get("/decisions")
def decisions_index(
    status: str | None = Query(default=None),
    use_case: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    return list_decisions(status=status, use_case=use_case, entity_id=entity_id, priority=priority, limit=limit, offset=offset)


@router.get("/decisions/count")
def decisions_count() -> dict[str, Any]:
    return count_decisions()


@router.post("/decisions/generate")
def decisions_generate() -> dict[str, Any]:
    return generate_decisions()


@router.post("/decisions/escalations/check")
def decisions_escalation_check() -> dict[str, Any]:
    return check_escalations()


@router.post("/decisions/outcomes/measure")
def decisions_outcome_measure() -> dict[str, Any]:
    return measure_outcomes()


@router.get("/decisions/{decision_id}")
def decisions_get(decision_id: int) -> dict[str, Any]:
    decision = get_decision(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.post("/decisions/{decision_id}/assign")
def decisions_assign(decision_id: int, payload: DecisionActionPayload) -> dict[str, Any]:
    return _transition(decision_id, "assign", payload)


@router.post("/decisions/{decision_id}/start")
def decisions_start(decision_id: int, payload: DecisionActionPayload | None = None) -> dict[str, Any]:
    return _transition(decision_id, "start", payload or DecisionActionPayload())


@router.post("/decisions/{decision_id}/complete")
def decisions_complete(decision_id: int, payload: DecisionActionPayload) -> dict[str, Any]:
    return _transition(decision_id, "complete", payload)


@router.post("/decisions/{decision_id}/dismiss")
def decisions_dismiss(decision_id: int, payload: DecisionActionPayload) -> dict[str, Any]:
    return _transition(decision_id, "dismiss", payload)


@router.get("/decisions/{decision_id}/log")
def decisions_log(decision_id: int) -> dict[str, Any]:
    return {"items": decision_log(decision_id)}


@router.get("/decisions/{decision_id}/outcome")
def decisions_outcome_get(decision_id: int) -> dict[str, Any]:
    return {"item": decision_outcome(decision_id)}


def _transition(decision_id: int, action: str, payload: DecisionActionPayload) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        payload_data = payload.model_dump(exclude_none=True)
    else:
        payload_data = payload.dict(exclude_none=True)

    try:
        decision = transition_decision(
            decision_id,
            action,
            payload_data,
            performed_by=payload.performed_by or "portal_user",
            performed_by_role=payload.performed_by_role or "bed_manager",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision
