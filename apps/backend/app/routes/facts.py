from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["facts"])


@router.get("/facts")
def facts() -> dict[str, object]:
    return {
        "status": "ok",
        "schema": settings.analytics_schema,
        "facts": [
            {
                "name": "fact_bed_occupancy",
                "grain": "department_day",
                "measures": ["occupied_beds", "occupancy_rate"],
            },
            {
                "name": "fact_capacity",
                "grain": "department_day",
                "measures": ["licensed_beds", "staffed_beds"],
            },
        ],
    }
