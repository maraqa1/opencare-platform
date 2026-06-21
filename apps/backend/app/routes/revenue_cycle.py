from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

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


@router.get("/journey")
def revenue_cycle_journey(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    facility: str | None = Query(default=None),
    payer: str | None = Query(default=None),
    department: str | None = Query(default=None),
    specialty: str | None = Query(default=None),
    patient_type: str | None = Query(default=None),
    claim_status: str | None = Query(default=None),
) -> dict[str, object]:
    return journey(
        date_from=date_from,
        date_to=date_to,
        facility=facility,
        payer=payer,
        department=department,
        specialty=specialty,
        patient_type=patient_type,
        claim_status=claim_status,
    )


@router.get("/cash-command")
def revenue_cycle_cash_command() -> dict[str, object]:
    return cash_command()


@router.get("/recovery-queue")
def revenue_cycle_recovery_queue() -> dict[str, object]:
    return recovery_queue()


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
