from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, HTTPException

from app.services.revenue_cycle_service import (
    board_pack,
    cash_command,
    decision_queue,
    decision_workspace,
    executive_narrative,
    journey,
    leakage,
    promote_recovery_item,
    payer_control,
    recovery_queue,
    summary,
    team_performance,
    transition_rcm_decision,
)

router = APIRouter(prefix="/api/v1/revenue-cycle", tags=["revenue-cycle"])
rcm_router = APIRouter(prefix="/api/v1/rcm", tags=["revenue-cycle"])


@router.get("/cash-command")
def revenue_cycle_cash_command(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
) -> dict[str, object]:
    return cash_command(
        {
            "date_from": date_from,
            "date_to": date_to,
            "facility": facility,
            "payer": payer,
            "department": department,
            "specialty": specialty,
            "patient_type": patient_type,
            "claim_status": claim_status,
        }
    )


@router.get("/journey")
def revenue_cycle_journey(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
) -> dict[str, object]:
    return journey(
        {
            "date_from": date_from,
            "date_to": date_to,
            "facility": facility,
            "payer": payer,
            "department": department,
            "specialty": specialty,
            "patient_type": patient_type,
            "claim_status": claim_status,
        }
    )


def _recovery_queue_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    owner: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_value: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    group_by: Optional[str] = None,
    view: Optional[str] = None,
) -> dict[str, Optional[str]]:
    return {
        "date_from": date_from,
        "date_to": date_to,
        "period": period,
        "facility": facility,
        "payer": payer,
        "department": department,
        "specialty": specialty,
        "patient_type": patient_type,
        "claim_status": claim_status,
        "issue_type": issue_type,
        "owner": owner,
        "status": status,
        "priority": priority,
        "due_window": due_window,
        "min_value": min_value,
        "search": search,
        "sort_by": sort_by,
        "group_by": group_by,
        "view": view,
    }


def _decision_queue_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    decision_type: Optional[str] = None,
    decision_status: Optional[str] = None,
    approval_role: Optional[str] = None,
    owner: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_expected_recovery: Optional[str] = None,
    confidence_min: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
) -> dict[str, Optional[str]]:
    return {
        "date_from": date_from,
        "date_to": date_to,
        "period": period,
        "facility": facility,
        "payer": payer,
        "department": department,
        "specialty": specialty,
        "patient_type": patient_type,
        "claim_status": claim_status,
        "decision_type": decision_type,
        "decision_status": decision_status,
        "approval_role": approval_role,
        "owner": owner,
        "priority": priority,
        "due_window": due_window,
        "min_expected_recovery": min_expected_recovery,
        "confidence_min": confidence_min,
        "search": search,
        "sort_by": sort_by,
    }


@router.get("/recovery-queue")
def revenue_cycle_recovery_queue(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    owner: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_value: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    group_by: Optional[str] = None,
    view: Optional[str] = None,
) -> dict[str, object]:
    return recovery_queue(
        _recovery_queue_filters(
            date_from=date_from,
            date_to=date_to,
            period=period,
            facility=facility,
            payer=payer,
            department=department,
            specialty=specialty,
            patient_type=patient_type,
            claim_status=claim_status,
            issue_type=issue_type,
            owner=owner,
            status=status,
            priority=priority,
            due_window=due_window,
            min_value=min_value,
            search=search,
            sort_by=sort_by,
            group_by=group_by,
            view=view,
        )
    )


@rcm_router.get("/recovery-queue")
def rcm_recovery_queue(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    owner: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_value: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    group_by: Optional[str] = None,
    view: Optional[str] = None,
) -> dict[str, object]:
    return recovery_queue(
        _recovery_queue_filters(
            date_from=date_from,
            date_to=date_to,
            period=period,
            facility=facility,
            payer=payer,
            department=department,
            specialty=specialty,
            patient_type=patient_type,
            claim_status=claim_status,
            issue_type=issue_type,
            owner=owner,
            status=status,
            priority=priority,
            due_window=due_window,
            min_value=min_value,
            search=search,
            sort_by=sort_by,
            group_by=group_by,
            view=view,
        )
    )


@rcm_router.get("/board-pack")
def rcm_board_pack(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    issue_type: Optional[str] = None,
    owner: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_value: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    group_by: Optional[str] = None,
    view: Optional[str] = None,
) -> dict[str, object]:
    return board_pack(
        _recovery_queue_filters(
            date_from=date_from,
            date_to=date_to,
            period=period,
            facility=facility,
            payer=payer,
            department=department,
            specialty=specialty,
            patient_type=patient_type,
            claim_status=claim_status,
            issue_type=issue_type,
            owner=owner,
            status=status,
            priority=priority,
            due_window=due_window,
            min_value=min_value,
            search=search,
            sort_by=sort_by,
            group_by=group_by,
            view=view,
        )
    )


@rcm_router.get("/decision-queue")
def rcm_decision_queue(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    period: Optional[str] = None,
    facility: Optional[str] = None,
    payer: Optional[str] = None,
    department: Optional[str] = None,
    specialty: Optional[str] = None,
    patient_type: Optional[str] = None,
    claim_status: Optional[str] = None,
    decision_type: Optional[str] = None,
    decision_status: Optional[str] = None,
    approval_role: Optional[str] = None,
    owner: Optional[str] = None,
    priority: Optional[str] = None,
    due_window: Optional[str] = None,
    min_expected_recovery: Optional[str] = None,
    confidence_min: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
) -> dict[str, object]:
    return decision_queue(
        _decision_queue_filters(
            date_from=date_from,
            date_to=date_to,
            period=period,
            facility=facility,
            payer=payer,
            department=department,
            specialty=specialty,
            patient_type=patient_type,
            claim_status=claim_status,
            decision_type=decision_type,
            decision_status=decision_status,
            approval_role=approval_role,
            owner=owner,
            priority=priority,
            due_window=due_window,
            min_expected_recovery=min_expected_recovery,
            confidence_min=confidence_min,
            search=search,
            sort_by=sort_by,
        )
    )


@rcm_router.get("/decisions/{decision_id}")
def rcm_decision_workspace(decision_id: int) -> dict[str, object]:
    payload = decision_workspace(decision_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Decision not found")
    return payload


@rcm_router.post("/recovery-items/{source_item_id}/promote")
def rcm_promote_recovery_item(
    source_item_id: str,
    payload: Optional[dict[str, object]] = Body(default=None),
) -> dict[str, object]:
    try:
        return promote_recovery_item(
            source_item_id,
            performed_by=str((payload or {}).get("performed_by") or "portal_user"),
            performed_by_role=str((payload or {}).get("performed_by_role") or "rcm_supervisor"),
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _rcm_decision_mutation(
    decision_id: int,
    action: str,
    payload: Optional[dict[str, object]],
) -> dict[str, object]:
    try:
        updated = transition_rcm_decision(
            decision_id,
            action,
            payload or {},
            performed_by=str((payload or {}).get("performed_by") or "portal_user"),
            performed_by_role=str((payload or {}).get("performed_by_role") or "rcm_supervisor"),
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if not updated:
        raise HTTPException(status_code=404, detail="Decision not found")
    return updated


@rcm_router.post("/decisions/{decision_id}/approve")
def rcm_decision_approve(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "approve", payload)


@rcm_router.post("/decisions/{decision_id}/reject")
def rcm_decision_reject(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "reject", payload)


@rcm_router.post("/decisions/{decision_id}/revise")
def rcm_decision_revise(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "revise", payload)


@rcm_router.post("/decisions/{decision_id}/dispatch")
def rcm_decision_dispatch(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "dispatch", payload)


@rcm_router.post("/decisions/{decision_id}/escalate")
def rcm_decision_escalate(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "escalate", payload)


@rcm_router.post("/decisions/{decision_id}/note")
def rcm_decision_note(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "note", payload)


@rcm_router.post("/decisions/{decision_id}/assign")
def rcm_decision_assign(decision_id: int, payload: Optional[dict[str, object]] = Body(default=None)) -> dict[str, object]:
    return _rcm_decision_mutation(decision_id, "assign", payload)


@router.get("/payer-control")
def revenue_cycle_payer_control() -> dict[str, object]:
    return payer_control()


@router.get("/leakage")
def revenue_cycle_leakage() -> dict[str, object]:
    return leakage()


@router.get("/team-performance")
def revenue_cycle_team_performance() -> dict[str, object]:
    return team_performance()


@router.get("/executive-narrative")
def revenue_cycle_executive_narrative() -> dict[str, object]:
    return executive_narrative()


@router.get("/summary")
def revenue_cycle_summary() -> dict[str, object]:
    return summary()
