from fastapi import APIRouter
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(tags=["dictionary"])

METRIC_CATALOG: dict[str, dict[str, str]] = {
    "occupied_beds": {
        "calculation_note": "midnight_census occupied bed count",
        "unit": "beds",
        "category": "occupancy",
    },
    "available_beds": {
        "calculation_note": "greatest(staffed_beds - occupied_beds, 0)",
        "unit": "beds",
        "category": "occupancy",
    },
    "occupancy_rate": {
        "calculation_note": "occupied_beds / staffed_beds * 100",
        "unit": "%",
        "category": "occupancy",
    },
    "pressure_flag": {
        "calculation_note": "occupancy_rate >= 90",
        "unit": "boolean",
        "category": "occupancy",
    },
    "admissions_today": {
        "calculation_note": "count(event_type = 'admission') for latest event_date",
        "unit": "count",
        "category": "occupancy",
    },
    "discharges_today": {
        "calculation_note": "count(event_type = 'discharge') for latest event_date",
        "unit": "count",
        "category": "occupancy",
    },
    "predicted_occupancy": {
        "calculation_note": "runtime forecast output for occupied beds",
        "unit": "beds",
        "category": "forecast",
    },
    "lower_ci_95": {
        "calculation_note": "lower 95 percent confidence bound from forecast runtime",
        "unit": "beds",
        "category": "forecast",
    },
    "upper_ci_95": {
        "calculation_note": "upper 95 percent confidence bound from forecast runtime",
        "unit": "beds",
        "category": "forecast",
    },
    "breach_risk": {
        "calculation_note": "predicted_occupancy / capacity_beds >= 90",
        "unit": "boolean",
        "category": "forecast",
    },
    "z_score": {
        "calculation_note": "standard deviations from expected occupancy baseline",
        "unit": "score",
        "category": "anomaly",
    },
}


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

    items_by_metric: dict[str, dict[str, object]] = {}
    for row in rows:
        metric_id = row["metric_id"]
        catalog_entry = METRIC_CATALOG.get(metric_id, {})
        items_by_metric[metric_id] = {
            "metric_id": metric_id,
            "metric_name": row["metric_name"],
            "metric_description": row["metric_description"],
            "calculation_note": catalog_entry.get("calculation_note", row["metric_description"]),
            "unit": catalog_entry.get("unit", "ratio"),
            "backing_dataset": row["metric_schema"],
            "source_table": row["metric_schema"],
            "category": catalog_entry.get("category", "occupancy"),
            "use_case": "bed_pressure",
            "lineage_model": "fct_bed_occupancy" if row["metric_schema"].split(".")[-1] == "fact_bed_occupancy" else row["metric_schema"].split(".")[-1],
        }

    for metric_id, catalog_entry in METRIC_CATALOG.items():
        if metric_id in items_by_metric:
            continue
        items_by_metric[metric_id] = {
            "metric_id": metric_id,
            "metric_name": metric_id.replace("_", " ").title(),
            "metric_description": catalog_entry["calculation_note"].capitalize(),
            "calculation_note": catalog_entry["calculation_note"],
            "unit": catalog_entry["unit"],
            "backing_dataset": "analytics.fct_bed_occupancy" if catalog_entry["category"] == "occupancy" else (
                "output.forecast" if catalog_entry["category"] == "forecast" else "output.anomaly"
            ),
            "source_table": "analytics.fct_bed_occupancy" if catalog_entry["category"] == "occupancy" else (
                "output.forecast" if catalog_entry["category"] == "forecast" else "output.anomaly"
            ),
            "category": catalog_entry["category"],
            "use_case": "bed_pressure",
            "lineage_model": "fct_bed_occupancy" if catalog_entry["category"] == "occupancy" else (
                "forecast" if catalog_entry["category"] == "forecast" else "anomaly"
            ),
        }

    return {
        "version": settings.dictionary_version,
        "schema": settings.dictionary_schema,
        "items": sorted(items_by_metric.values(), key=lambda item: (str(item["category"]), str(item["metric_name"]))),
    }
