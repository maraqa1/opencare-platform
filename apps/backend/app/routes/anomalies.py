from fastapi import APIRouter
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect

router = APIRouter(prefix="/api", tags=["anomalies"])


@router.get("/anomalies/latest")
def latest_anomalies() -> dict[str, object]:
    query = f"""
        with latest_run as (
            select max(generated_at) as generated_at
            from {settings.analytics_schema}.anomaly_bed_occupancy
        )
        select
            coalesce(d.department_code, w.ward_code) as department_code,
            coalesce(d.department_name, w.ward_name) as department_name,
            a.event_date,
            a.severity,
            a.deviation_ratio as score,
            a.occupied_beds,
            a.trailing_mean,
            latest_run.generated_at
        from {settings.analytics_schema}.anomaly_bed_occupancy a
        join latest_run on a.generated_at = latest_run.generated_at
        left join {settings.analytics_schema}.dim_department d
          on d.department_id = a.department_id
        left join {settings.analytics_schema}.dim_ward w
          on w.ward_id = a.department_id
        order by
            case a.severity when 'high' then 0 when 'medium' then 1 else 2 end,
            a.event_date desc,
            d.department_code nulls last,
            a.department_id
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
        "runtime_url": settings.anomaly_runtime_url,
        "generated_at": generated_at.isoformat() + "Z" if generated_at else None,
        "items": [
            {
                "department_code": row["department_code"],
                "department_name": row["department_name"],
                "event_date": row["event_date"].isoformat(),
                "severity": row["severity"],
                "score": float(row["score"]),
                "message": (
                    f"Occupied beds reached {row['occupied_beds']} versus a trailing mean of "
                    f"{float(row['trailing_mean']):.1f}."
                    if row["trailing_mean"] is not None
                    else "Occupancy anomaly detected."
                ),
            }
            for row in rows
        ],
    }
