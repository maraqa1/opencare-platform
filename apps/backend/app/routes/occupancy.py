from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Query
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(prefix="/api/v1/occupancy", tags=["occupancy"])


def _number(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


@router.get("/current")
def current_occupancy() -> dict[str, object]:
    fact_table = qualified_table(settings.analytics_schema, "fct_bed_occupancy")
    dim_ward_table = qualified_table(settings.analytics_schema, "dim_ward")
    staging_events_table = qualified_table(settings.staging_schema, "stg_bed_events")

    query = sql.SQL(
        """
        with latest_day as (
            select max(date_day) as date_day
            from {fact_table}
        ),
        week_average as (
            select
                ward_id,
                round(avg(occupancy_rate) * 100, 2) as avg_7d_occupancy
            from {fact_table}
            where date_day >= (select date_day - interval '6 days' from latest_day)
            group by ward_id
        ),
        flow_today as (
            select
                ward_id,
                count(*) filter (where event_type = 'admission') as admissions_today,
                count(*) filter (where event_type = 'discharge') as discharges_today
            from {staging_events_table}
            where event_date = (select date_day from latest_day)
            group by ward_id
        )
        select
            f.ward_id,
            w.ward_code,
            w.ward_name,
            f.date_day,
            f.occupied_beds,
            f.staffed_beds,
            round(f.occupancy_rate * 100, 2) as occupancy_rate,
            coalesce(w7.avg_7d_occupancy, round(f.occupancy_rate * 100, 2)) as avg_7d_occupancy,
            coalesce(flow.admissions_today, 0) as admissions_today,
            coalesce(flow.discharges_today, 0) as discharges_today
        from {fact_table} f
        join latest_day on f.date_day = latest_day.date_day
        join {dim_ward_table} w on w.ward_id = f.ward_id
        left join week_average w7 on w7.ward_id = f.ward_id
        left join flow_today flow on flow.ward_id = f.ward_id
        order by f.occupancy_rate desc, w.ward_code
        """
    ).format(
        fact_table=fact_table,
        dim_ward_table=dim_ward_table,
        staging_events_table=staging_events_table,
    )

    try:
        with connect() as conn:
            rows = conn.execute(query).fetchall()
    except UndefinedTable:
        rows = []

    items = []
    summary = {"critical": 0, "warning": 0, "normal": 0}
    snapshot_date = None

    for row in rows:
        occupancy_rate = _number(row["occupancy_rate"]) or 0.0
        if occupancy_rate >= 90:
            status = "critical"
        elif occupancy_rate >= 75:
            status = "warning"
        else:
            status = "normal"
        summary[status] += 1
        snapshot_date = row["date_day"]
        items.append(
            {
                "ward_id": row["ward_id"],
                "ward_code": row["ward_code"],
                "ward_name": row["ward_name"],
                "snapshot_date": row["date_day"].isoformat(),
                "occupied_beds": row["occupied_beds"],
                "staffed_beds": row["staffed_beds"],
                "occupancy_rate": occupancy_rate,
                "avg_7d_occupancy": _number(row["avg_7d_occupancy"]),
                "admissions_today": row["admissions_today"],
                "discharges_today": row["discharges_today"],
                "status": status,
            }
        )

    return {
        "status": "ok",
        "snapshot_date": snapshot_date.isoformat() if snapshot_date else None,
        "summary": summary,
        "items": items,
    }


@router.get("/historical")
def historical_occupancy(
    ward_id: str | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=90),
) -> dict[str, object]:
    fact_table = qualified_table(settings.analytics_schema, "fct_bed_occupancy")
    dim_ward_table = qualified_table(settings.analytics_schema, "dim_ward")
    query = sql.SQL(
        """
        with latest_day as (
            select max(date_day) as date_day
            from {fact_table}
        )
        select
            f.date_day,
            f.ward_id,
            w.ward_code,
            w.ward_name,
            f.occupied_beds,
            f.staffed_beds,
            round(f.occupancy_rate * 100, 2) as occupancy_rate
        from {fact_table} f
        join {dim_ward_table} w on w.ward_id = f.ward_id
        where f.date_day >= (select date_day - make_interval(days => %(days)s - 1) from latest_day)
          and (%(ward_id)s is null or f.ward_id = %(ward_id)s)
        order by f.date_day, w.ward_code
        """
    ).format(fact_table=fact_table, dim_ward_table=dim_ward_table)

    try:
        with connect() as conn:
            rows = conn.execute(query, {"ward_id": ward_id, "days": days}).fetchall()
    except UndefinedTable:
        rows = []

    return {
        "status": "ok",
        "days": days,
        "items": [
            {
                "date_day": row["date_day"].isoformat(),
                "ward_id": row["ward_id"],
                "ward_code": row["ward_code"],
                "ward_name": row["ward_name"],
                "occupied_beds": row["occupied_beds"],
                "staffed_beds": row["staffed_beds"],
                "occupancy_rate": _number(row["occupancy_rate"]),
            }
            for row in rows
        ],
    }
