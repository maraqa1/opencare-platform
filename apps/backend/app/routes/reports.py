from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports")
def reports() -> dict[str, object]:
    return {
        "status": "ok",
        "storage": {
            "provider": "minio",
            "endpoint": settings.minio_endpoint,
            "bucket": settings.minio_bucket,
            "prefix": settings.reports_prefix,
        },
        "items": [
            {
                "report_id": "bed-occupancy-daily",
                "title": "Daily Bed Occupancy Summary",
                "format": "pdf",
                "path": f"{settings.reports_prefix}/bed-occupancy-daily.pdf",
            },
            {
                "report_id": "capacity-weekly",
                "title": "Weekly Capacity Trend",
                "format": "csv",
                "path": f"{settings.reports_prefix}/capacity-weekly.csv",
            },
        ],
    }
