from __future__ import annotations

import socket
from urllib.parse import urlparse

from fastapi import APIRouter
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _parse_host_port(endpoint: str, default_port: int) -> tuple[str, int]:
    if "://" in endpoint:
        parsed = urlparse(endpoint)
        return parsed.hostname or "", parsed.port or default_port
    if ":" in endpoint:
        host, port = endpoint.rsplit(":", 1)
        return host, int(port)
    return endpoint, default_port


def _check_socket(endpoint: str, default_port: int) -> bool:
    host, port = _parse_host_port(endpoint, default_port)
    if not host:
        return False
    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


@router.get("/health")
def admin_health() -> dict[str, object]:
    checks = {
        "postgres": False,
        "redis": _check_socket(f"{settings.redis_host}:{settings.redis_port}", settings.redis_port),
        "minio": _check_socket(settings.minio_endpoint, 9000),
        "superset": _check_socket(settings.superset_embed_url, 8088),
    }

    try:
        with connect() as conn:
            checks["postgres"] = conn.execute("select 1 as ok").fetchone()["ok"] == 1
    except Exception:
        checks["postgres"] = False

    return {
        "status": "ok" if all(checks.values()) else "degraded",
        "checks": [
            {"name": "PostgreSQL", "healthy": checks["postgres"], "endpoint": settings.postgres_host},
            {"name": "Redis", "healthy": checks["redis"], "endpoint": settings.redis_host},
            {"name": "MinIO", "healthy": checks["minio"], "endpoint": settings.minio_endpoint},
            {"name": "Superset", "healthy": checks["superset"], "endpoint": settings.superset_embed_url},
        ],
    }


@router.get("/ingestion-status")
def ingestion_status() -> dict[str, object]:
    source_schema = settings.dbt_source_schema
    bed_events = qualified_table(source_schema, "bed_events")
    wards = qualified_table(source_schema, "wards")
    patients = qualified_table(source_schema, "patients")

    query = sql.SQL(
        """
        select
            (select count(*) from {bed_events}) as bed_events_count,
            (select count(*) from {wards}) as wards_count,
            (select count(*) from {patients}) as patients_count,
            (select max(event_timestamp) from {bed_events}) as latest_event_timestamp
        """
    ).format(bed_events=bed_events, wards=wards, patients=patients)

    try:
        with connect() as conn:
            row = conn.execute(query).fetchone()
    except UndefinedTable:
        row = None

    return {
        "status": "ok",
        "airbyte_url": settings.airbyte_url,
        "source_schema": source_schema,
        "latest_event_timestamp": row["latest_event_timestamp"].isoformat() + "Z" if row and row["latest_event_timestamp"] else None,
        "tables": [
            {"name": "bed_events", "row_count": row["bed_events_count"] if row else 0},
            {"name": "wards", "row_count": row["wards_count"] if row else 0},
            {"name": "patients", "row_count": row["patients_count"] if row else 0},
        ],
    }


@router.get("/runtime-status")
def admin_runtime_status() -> dict[str, object]:
    forecast_table = qualified_table(settings.output_schema, settings.forecast_output_table)
    anomaly_table = qualified_table(settings.output_schema, settings.anomaly_output_table)
    query = sql.SQL(
        """
        select
            (select max(run_timestamp) from {forecast_table}) as forecast_last_run,
            (select count(*) from {forecast_table}) as forecast_rows,
            (select max(run_timestamp) from {anomaly_table}) as anomaly_last_run,
            (select count(*) from {anomaly_table}) as anomaly_rows
        """
    ).format(forecast_table=forecast_table, anomaly_table=anomaly_table)

    try:
        with connect() as conn:
            row = conn.execute(query).fetchone()
    except UndefinedTable:
        row = None

    return {
        "status": "ok",
        "runtimes": [
            {
                "name": "forecast",
                "last_run": row["forecast_last_run"].isoformat() + "Z" if row and row["forecast_last_run"] else None,
                "row_count": row["forecast_rows"] if row else 0,
                "reads_from": f"{settings.analytics_schema}.fct_bed_occupancy",
                "writes_to": f"{settings.output_schema}.{settings.forecast_output_table}",
            },
            {
                "name": "anomaly",
                "last_run": row["anomaly_last_run"].isoformat() + "Z" if row and row["anomaly_last_run"] else None,
                "row_count": row["anomaly_rows"] if row else 0,
                "reads_from": f"{settings.analytics_schema}.fct_bed_occupancy",
                "writes_to": f"{settings.output_schema}.{settings.anomaly_output_table}",
            },
        ],
    }
