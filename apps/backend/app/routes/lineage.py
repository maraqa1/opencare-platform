from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.lineage_service import get_lineage_service

router = APIRouter(prefix="/api/v1/lineage", tags=["lineage"])


@router.get("/models")
def list_models() -> list[dict[str, object]]:
    return get_lineage_service().get_all_models()


@router.get("/models/{model_name}")
def get_model_lineage(model_name: str) -> dict[str, object]:
    payload = get_lineage_service().get_lineage_path(model_name)
    if payload is None:
        raise HTTPException(status_code=404, detail="Lineage model not found")
    return payload


@router.get("/models/{model_name}/upstream")
def get_upstream(model_name: str) -> dict[str, object]:
    return {
        "model": model_name,
        "upstream": get_lineage_service().get_upstream_models(model_name),
    }


@router.get("/models/{model_name}/downstream")
def get_downstream(model_name: str) -> dict[str, object]:
    return {
        "model": model_name,
        "downstream": get_lineage_service().get_downstream_models(model_name),
    }


@router.get("/impact/{source_name}")
def get_impact_analysis(source_name: str) -> dict[str, object]:
    return get_lineage_service().get_impact_analysis(source_name)


@router.get("/freshness")
def get_source_freshness() -> dict[str, object]:
    items = get_lineage_service().get_source_freshness()
    return {
        "status": "ok",
        "items": items,
        "summary": {
            "fresh": sum(1 for item in items if item["status"] == "fresh"),
            "stale": sum(1 for item in items if item["status"] == "stale"),
            "expired": sum(1 for item in items if item["status"] == "expired"),
        },
    }


@router.get("/quality")
def get_quality_summary() -> dict[str, object]:
    return get_lineage_service().get_quality_summary()


@router.get("/quality/{model_name}")
def get_model_quality(model_name: str) -> dict[str, object]:
    return get_lineage_service().get_model_quality(model_name)


@router.get("/compliance")
def get_compliance_summary() -> dict[str, object]:
    return get_lineage_service().get_compliance_summary()


@router.post("/reload")
def reload_manifest() -> dict[str, str]:
    service = get_lineage_service()
    service.reload()
    return {"status": "reloaded"}
