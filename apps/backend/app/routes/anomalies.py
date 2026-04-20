from fastapi import APIRouter
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect

router = APIRouter(prefix="/api", tags=["anomalies"])


@router.get("/anomalies/latest")
def latest_anomalies() -> dict[str, object]:
    query = f"""
        with latest_run as (
            select max(run_timestamp) as run_timestamp
            from {settings.output_schema}.{settings.anomaly_output_table}
        )
        select
            coalesce(d.department_code, w.ward_code) as department_code,
            coalesce(d.department_name, w.ward_name) as department_name,
            a.anomaly_date,
            a.anomaly_type,
            a.severity,
            a.z_score as score,
            a.occupancy_rate,
            a.threshold_breached,
            latest_run.run_timestamp
        from {settings.output_schema}.{settings.anomaly_output_table} a
        join latest_run on a.run_timestamp = latest_run.run_timestamp
        left join {settings.analytics_schema}.dim_department d
          on d.department_id = a.ward_id
        left join {settings.analytics_schema}.dim_ward w
          on w.ward_id = a.ward_id
        order by
            case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
            a.anomaly_date desc,
            d.department_code nulls last,
            a.ward_id
    """

    try:
        with connect() as conn:
            rows = conn.execute(query).fetchall()
    except UndefinedTable:
        rows = []

    generated_at = None
    if rows:
        generated_at = rows[0]["run_timestamp"]

    return {
        "status": "ok",
        "source_schema": settings.output_schema,
        "runtime_url": settings.anomaly_runtime_url,
        "generated_at": generated_at.isoformat() + "Z" if generated_at else None,
        "items": [
            {
                "department_code": row["department_code"],
                "department_name": row["department_name"],
                "event_date": row["anomaly_date"].isoformat(),
                "anomaly_type": row["anomaly_type"],
                "severity": row["severity"],
                "score": float(row["score"]) if row["score"] is not None else 0.0,
                "occupancy_rate": float(row["occupancy_rate"]),
                "message": f"{row['anomaly_type'].replace('_', ' ').title()} triggered: {row['threshold_breached']}.",
            }
            for row in rows
        ],
    }
