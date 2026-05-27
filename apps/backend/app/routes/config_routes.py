from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pathlib import Path

from app.config import load_enabled_use_cases, load_use_cases, settings, update_use_case_enabled
from app.services.use_case_template_storage import UseCaseTemplateStorage

router = APIRouter(prefix="/api/v1/config", tags=["config"])
template_storage = UseCaseTemplateStorage(Path(settings.use_case_template_storage_root))


class UseCaseTogglePayload(BaseModel):
    enabled: bool


@router.get("/use-cases")
def get_use_cases() -> dict[str, object]:
    active_imported = [
        {
            "id": record.get("id"),
            "package_id": record.get("package_id"),
            "slug": record.get("slug"),
            "name": record.get("name"),
            "version": record.get("version"),
            "domain": record.get("domain"),
            "status": record.get("status"),
            "enabled": record.get("enabled"),
            "materialization_status": record.get("materialization_status"),
            "activation_status": record.get("activation_status"),
            "live_verification_status": record.get("live_verification_status"),
            "preview_summary": record.get("preview_summary"),
            "last_action_at": record.get("last_action_at"),
        }
        for record in template_storage.list_active_packages()
    ]
    return {
        "status": "ok",
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
        "active_imported_use_cases": active_imported,
    }


@router.put("/use-cases/{use_case_id}")
def set_use_case_enabled(use_case_id: str, payload: UseCaseTogglePayload) -> dict[str, object]:
    try:
        updated_use_case = update_use_case_enabled(use_case_id, payload.enabled)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown use case: {use_case_id}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "ok",
        "use_case_id": use_case_id,
        "use_case": updated_use_case,
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
    }
