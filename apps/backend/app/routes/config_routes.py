from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import load_enabled_use_cases, load_use_cases, update_use_case_enabled

router = APIRouter(prefix="/api/v1/config", tags=["config"])


class UseCaseTogglePayload(BaseModel):
    enabled: bool


@router.get("/use-cases")
def get_use_cases() -> dict[str, object]:
    return {
        "status": "ok",
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
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
