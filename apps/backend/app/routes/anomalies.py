from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["anomalies"])


@router.get("/anomalies/latest")
def latest_anomalies() -> dict[str, object]:
    return {
        "status": "ok",
        "source_schema": settings.analytics_schema,
        "runtime_url": settings.anomaly_runtime_url,
        "generated_at": "2026-04-13T00:00:00Z",
        "items": [
            {
                "department_code": "ED",
                "department_name": "Emergency",
                "event_date": "2026-04-12",
                "severity": "high",
                "score": 0.97,
                "message": "Occupancy exceeded trailing 14-day baseline by 18%.",
            },
            {
                "department_code": "ICU",
                "department_name": "Intensive Care",
                "event_date": "2026-04-12",
                "severity": "medium",
                "score": 0.74,
                "message": "Capacity pressure increased with sustained high utilization.",
            },
        ],
    }
