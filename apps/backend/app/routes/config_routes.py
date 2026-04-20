from fastapi import APIRouter

from app.config import load_enabled_use_cases, load_use_cases

router = APIRouter(prefix="/api/v1/config", tags=["config"])


@router.get("/use-cases")
def get_use_cases() -> dict[str, object]:
    return {
        "status": "ok",
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
    }
