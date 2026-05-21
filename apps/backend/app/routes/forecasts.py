from decimal import Decimal

from fastapi import APIRouter, Query
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(tags=["forecasts"])


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _latest_forecast_rows(ward_id: str | None = None, days: int | None = None) -> list[dict[str, object]]:
    forecast_table = qualified_table(settings.output_schema, settings.forecast_output_table)
    dim_department_table = qualified_table(settings.analytics_schema, "dim_department")
    dim_ward_table = qualified_table(settings.analytics_schema, "dim_ward")
    query = sql.SQL(
        """
        with latest_run as (
            select max(run_timestamp) as run_timestamp
            from {forecast_table}
        )
        select
            f.ward_id,
            coalesce(d.department_code, w.ward_code) as department_code,
            coalesce(d.department_name, w.ward_name) as department_name,
            f.forecast_date,
            f.predicted_occupancy,
            f.lower_ci_95,
            f.upper_ci_95,
            f.capacity_beds,
            f.model_used,
            case
                when f.capacity_beds is null or f.capacity_beds = 0 then null
                else round(f.predicted_occupancy::numeric / f.capacity_beds::numeric, 4)
            end as occupancy_rate,
            case
                when f.capacity_beds is null or f.capacity_beds = 0 then false
                when f.predicted_occupancy::numeric / f.capacity_beds::numeric >= 0.9 then true
                else false
            end as breach_risk,
            latest_run.run_timestamp
        from {forecast_table} f
        join latest_run on f.run_timestamp = latest_run.run_timestamp
        left join {dim_department_table} d
          on d.department_id = f.ward_id
        left join {dim_ward_table} w
          on w.ward_id = f.ward_id
        where (cast(%(ward_id)s as text) is null or f.ward_id = cast(%(ward_id)s as text))
          and (cast(%(days)s as integer) is null or f.forecast_date < (
            select min(f2.forecast_date) + make_interval(days => %(days)s)
            from {forecast_table} f2
            join latest_run lr2 on f2.run_timestamp = lr2.run_timestamp
            where (cast(%(ward_id)s as text) is null or f2.ward_id = cast(%(ward_id)s as text))
          ))
        order by d.department_code nulls last, f.ward_id, f.forecast_date
        """
    ).format(
        forecast_table=forecast_table,
        dim_department_table=dim_department_table,
        dim_ward_table=dim_ward_table,
    )

    try:
        with connect() as conn:
            return conn.execute(query, {"ward_id": ward_id, "days": days}).fetchall()
    except UndefinedTable:
        return []


@router.get("/api/forecasts/latest")
@router.get("/api/v1/forecast")
def latest_forecast(
    ward_id: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=30),
) -> dict[str, object]:
    rows = _latest_forecast_rows(ward_id=ward_id, days=days)
    generated_at = None
    if rows:
        generated_at = rows[0]["run_timestamp"]

    return {
        "status": "ok",
        "source_schema": settings.output_schema,
        "runtime_url": settings.forecast_runtime_url,
        "generated_at": generated_at.isoformat() + "Z" if generated_at else None,
        "horizon_days": days or settings.forecast_horizon_days,
        "items": [
            {
                "ward_id": row["ward_id"],
                "department_code": row["department_code"],
                "department_name": row["department_name"],
                "forecast_date": row["forecast_date"].isoformat(),
                "predicted_occupied_beds": int(round(_to_float(row["predicted_occupancy"]) or 0)),
                "predicted_occupancy": _to_float(row["predicted_occupancy"]),
                "lower_ci_95": _to_float(row["lower_ci_95"]),
                "upper_ci_95": _to_float(row["upper_ci_95"]),
                "capacity_beds": row["capacity_beds"],
                "model_used": row["model_used"],
                "occupancy_rate": _to_float(row["occupancy_rate"]),
                "breach_risk": bool(row["breach_risk"]),
            }
            for row in rows
        ],
    }
