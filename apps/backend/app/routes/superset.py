from fastapi import APIRouter

from app.config import load_enabled_use_cases, settings

router = APIRouter(prefix="/api/v1/superset", tags=["superset"])


def _dashboard_embed_path(dashboard_id: str) -> str:
    dashboard_key = dashboard_id.strip().strip("/")
    if dashboard_key.isdigit():
        base_path = f"{settings.superset_embed_url.rstrip('/')}/dashboard/{dashboard_key}/"
    else:
        base_path = f"{settings.superset_embed_url.rstrip('/')}/dashboard/p/{dashboard_key}/"
    return f"{base_path}?standalone=1"


@router.get("/embed-token")
def get_embed_token(dashboard_id: str) -> dict[str, object]:
    embed_path = _dashboard_embed_path(dashboard_id)
    return {
        "status": "ok",
        "dashboard_id": dashboard_id,
        "token": "",
        "superset_url": settings.superset_embed_url,
        "embed_url": embed_path,
    }


@router.get("/dashboards")
def list_dashboards() -> dict[str, object]:
    dashboards = []
    for key, use_case in load_enabled_use_cases().items():
        dashboard_id = use_case.get("superset_dashboard_id")
        if not dashboard_id:
            continue
        dashboards.append(
            {
                "use_case": key,
                "dashboard_id": dashboard_id,
                "title": use_case.get("name"),
                "embed_url": _dashboard_embed_path(str(dashboard_id)),
            }
        )

    return {"status": "ok", "items": dashboards}
