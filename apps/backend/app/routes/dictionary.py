from fastapi import APIRouter
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(tags=["dictionary"])


@router.get("/api/dictionary")
@router.get("/api/v1/dictionary")
def dictionary() -> dict[str, object]:
    dictionary_table = qualified_table(settings.dictionary_schema, "dict_metrics")
    query = sql.SQL(
        """
        select
            metric_id,
            metric_name,
            metric_description,
            metric_schema
        from {dictionary_table}
        order by metric_id
        """
    ).format(dictionary_table=dictionary_table)

    try:
        with connect() as conn:
            rows = conn.execute(query).fetchall()
    except UndefinedTable:
        rows = []

    if rows:
        items = []
        for row in rows:
            metric_id = row["metric_id"]
            if metric_id in {"occupied_beds", "available_beds"}:
                unit = "beds"
            elif metric_id == "pressure_flag":
                unit = "boolean"
            else:
                unit = "ratio"

            items.append(
                {
                    "metric_id": metric_id,
                    "metric_name": row["metric_name"],
                    "description": row["metric_description"],
                    "calculation_note": row["metric_description"],
                    "unit": unit,
                    "source_table": row["metric_schema"],
                    "category": "bed_pressure",
                }
            )
    else:
        items = []

    return {
        "version": settings.dictionary_version,
        "schema": settings.dictionary_schema,
        "items": items,
    }
