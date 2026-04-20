from decimal import Decimal

from fastapi import APIRouter, Query
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(tags=["anomalies"])


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _latest_anomaly_rows(severity: str | None = None) -> list[dict[str, object]]:
    anomaly_table = qualified_table(settings.output_schema, settings.anomaly_output_table)
    dim_department_table = qualified_table(settings.analytics_schema, "dim_department")
    dim_ward_table = qualified_table(settings.analytics_schema, "dim_ward")
    query = sql.SQL(
        """
        with latest_run as (
            select max(run_timestamp) as run_timestamp
            from {anomaly_table}
        )
        select
            a.ward_id,
            coalesce(d.department_code, w.ward_code) as department_code,
            coalesce(d.department_name, w.ward_name) as department_name,
            a.anomaly_date,
            a.anomaly_type,
            a.severity,
            a.z_score as score,
            a.occupancy_rate,
            a.threshold_breached,
            latest_run.run_timestamp
        from {anomaly_table} a
        join latest_run on a.run_timestamp = latest_run.run_timestamp
        left join {dim_department_table} d
          on d.department_id = a.ward_id
        left join {dim_ward_table} w
          on w.ward_id = a.ward_id
        where (%(severity)s is null or a.severity = %(severity)s)
        order by
            case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
            a.anomaly_date desc,
            d.department_code nulls last,
            a.ward_id
        """
    ).format(
        anomaly_table=anomaly_table,
        dim_department_table=dim_department_table,
        dim_ward_table=dim_ward_table,
    )

    try:
        with connect() as conn:
            return conn.execute(query, {"severity": severity}).fetchall()
    except UndefinedTable:
        return []


@router.get("/api/anomalies/latest")
@router.get("/api/v1/anomalies")
def latest_anomalies(severity: str | None = Query(default=None)) -> dict[str, object]:
    rows = _latest_anomaly_rows(severity=severity)
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
                "ward_id": row["ward_id"],
                "department_code": row["department_code"],
                "department_name": row["department_name"],
                "event_date": row["anomaly_date"].isoformat(),
                "anomaly_type": row["anomaly_type"],
                "severity": row["severity"],
                "z_score": _to_float(row["score"]),
                "threshold_breached": row["threshold_breached"],
                "occupancy_rate": _to_float(row["occupancy_rate"]),
                "message": f"{row['anomaly_type'].replace('_', ' ').title()} triggered: {row['threshold_breached']}.",
            }
            for row in rows
        ],
    }


@router.get("/api/v1/anomalies/summary")
def anomalies_summary() -> dict[str, object]:
    rows = _latest_anomaly_rows()
    summary = {"critical": 0, "warning": 0, "info": 0}
    generated_at = None
    for row in rows:
        severity = row["severity"]
        if severity in summary:
            summary[severity] += 1
        generated_at = row["run_timestamp"]

    return {
        "status": "ok",
        "generated_at": generated_at.isoformat() + "Z" if generated_at else None,
        "summary": summary,
        "total": sum(summary.values()),
    }
