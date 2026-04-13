from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["dictionary"])


@router.get("/dictionary")
def dictionary() -> dict[str, object]:
    return {
        "version": settings.dictionary_version,
        "schema": settings.analytics_schema,
        "items": [
            {
                "code": "occupied_beds",
                "label": "Occupied Beds",
                "description": "Current inpatient beds marked as occupied.",
                "grain": "department_day",
            },
            {
                "code": "licensed_capacity",
                "label": "Licensed Capacity",
                "description": "Configured bed capacity available for service lines.",
                "grain": "department_day",
            },
            {
                "code": "forecast_occupancy",
                "label": "Forecast Occupancy",
                "description": "Short-horizon occupancy forecast derived from analytics marts.",
                "grain": "department_day",
            },
            {
                "code": "occupancy_anomaly_score",
                "label": "Occupancy Anomaly Score",
                "description": "Severity score for unusual occupancy patterns.",
                "grain": "department_day",
            },
        ],
    }
