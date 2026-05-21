from __future__ import annotations

from fastapi import APIRouter

from app.services.classification_service import get_classification_service

router = APIRouter(prefix="/api/v1/classification", tags=["classification"])


@router.get("/inventory")
def get_classification_inventory() -> dict[str, object]:
    return get_classification_service().inventory()
