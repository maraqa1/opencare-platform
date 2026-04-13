from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["forecasts"])


@router.get("/forecasts/latest")
def latest_forecast() -> dict[str, object]:
    return {
        "status": "ok",
        "source_schema": settings.analytics_schema,
        "runtime_url": settings.forecast_runtime_url,
        "generated_at": "2026-04-13T00:00:00Z",
        "horizon_days": 7,
        "items": [
            {
                "department_code": "MED",
                "department_name": "Medicine",
                "forecast_date": "2026-04-14",
                "predicted_occupied_beds": 118,
                "capacity_beds": 130,
                "occupancy_rate": 0.908,
            },
            {
                "department_code": "SURG",
                "department_name": "Surgery",
                "forecast_date": "2026-04-14",
                "predicted_occupied_beds": 71,
                "capacity_beds": 84,
                "occupancy_rate": 0.845,
            },
        ],
    }
