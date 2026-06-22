from __future__ import annotations

from typing import Optional

from fastapi import APIRouter

from app.services.revenue_cycle_service import (
    cash_command,
    executive_narrative,
    journey,
    leakage,
    payer_control,
    recovery_queue,
    summary,
    team_performance,
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
