from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(tags=["reports"])


def _query_latest_report_rows(report_type: str) -> tuple[list[dict[str, object]], str]:
    if report_type == "forecast":
        table = qualified_table(settings.output_schema, settings.forecast_output_table)
        query = sql.SQL(
            """
            with latest_run as (
                select max(run_timestamp) as run_timestamp
                from {table}
            )
            select *
            from {table}
            where run_timestamp = (select run_timestamp from latest_run)
            order by ward_id, forecast_date
            """
        ).format(table=table)
        filename = f"forecast-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    elif report_type == "anomaly":
        table = qualified_table(settings.output_schema, settings.anomaly_output_table)
        query = sql.SQL(
            """
            with latest_run as (
                select max(run_timestamp) as run_timestamp
                from {table}
            )
            select *
            from {table}
            where run_timestamp = (select run_timestamp from latest_run)
            order by severity, ward_id, anomaly_date
            """
        ).format(table=table)
        filename = f"anomaly-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    else:
        raise HTTPException(status_code=404, detail="Unknown report type")

    try:
        with connect() as conn:
            rows = conn.execute(query).fetchall()
    except UndefinedTable:
        rows = []

    return rows, filename


@router.get("/api/reports")
@router.get("/api/v1/reports")
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
                "report_id": "forecast",
                "title": "Forecast Export",
                "format": "csv",
                "path": "/api/v1/reports/export/forecast",
            },
            {
                "report_id": "anomaly",
                "title": "Anomaly Export",
                "format": "csv",
                "path": "/api/v1/reports/export/anomaly",
            },
        ],
    }


@router.get("/api/v1/reports/export/{report_type}")
def export_report(report_type: str) -> StreamingResponse:
    rows, filename = _query_latest_report_rows(report_type)
    if not rows:
        raise HTTPException(status_code=404, detail="Report data unavailable")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                key: value.isoformat() if hasattr(value, "isoformat") else value
                for key, value in row.items()
            }
        )

    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
