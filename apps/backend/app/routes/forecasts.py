from fastapi import APIRouter
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect

router = APIRouter(prefix="/api", tags=["forecasts"])


@router.get("/forecasts/latest")
def latest_forecast() -> dict[str, object]:
    query = f"""
        with latest_run as (
            select max(generated_at) as generated_at
            from {settings.analytics_schema}.forecast_bed_occupancy
        )
        select
            d.department_code,
            d.department_name,
            f.forecast_date,
            f.predicted_occupied_beds,
            f.capacity_beds,
            case
                when f.capacity_beds is null or f.capacity_beds = 0 then null
                else round(f.predicted_occupied_beds::numeric / f.capacity_beds::numeric, 4)
            end as occupancy_rate,
            latest_run.generated_at
        from {settings.analytics_schema}.forecast_bed_occupancy f
        join latest_run on f.generated_at = latest_run.generated_at
        left join {settings.analytics_schema}.dim_department d
          on d.department_id = f.department_id
        order by d.department_code nulls last, f.department_id, f.forecast_date
    """

    try:
        with connect() as conn:
            rows = conn.execute(query).fetchall()
    except UndefinedTable:
        rows = []

    generated_at = None
    if rows:
        generated_at = rows[0]["generated_at"]

    return {
        "status": "ok",
        "source_schema": settings.analytics_schema,
        "runtime_url": settings.forecast_runtime_url,
        "generated_at": generated_at.isoformat() + "Z" if generated_at else None,
        "horizon_days": 7,
        "items": [
            {
                "department_code": row["department_code"],
                "department_name": row["department_name"],
                "forecast_date": row["forecast_date"].isoformat(),
                "predicted_occupied_beds": row["predicted_occupied_beds"],
                "capacity_beds": row["capacity_beds"],
                "occupancy_rate": float(row["occupancy_rate"]) if row["occupancy_rate"] is not None else None,
            }
            for row in rows
        ],
    }
