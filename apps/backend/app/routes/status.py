from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("/runtime")
def runtime_status() -> dict[str, object]:
    return {
        "status": "ok",
        "analytics_schema": settings.analytics_schema,
        "writes_enabled": settings.runtime_writes_enabled,
        "runtimes": [
            {
                "name": "bed-forecast",
                "url": settings.forecast_runtime_url,
                "reads_from": settings.analytics_schema,
                "writes_to": f"{settings.output_schema}.{settings.forecast_output_table}",
            },
            {
                "name": "anomaly",
                "url": settings.anomaly_runtime_url,
                "reads_from": settings.analytics_schema,
                "writes_to": f"{settings.output_schema}.{settings.anomaly_output_table}",
            },
        ],
    }


@router.get("/platform")
def platform_status() -> dict[str, object]:
    return {
        "status": "ok",
        "services": [
            {"name": "postgres", "endpoint": settings.postgres_host, "healthy": True},
            {"name": "minio", "endpoint": settings.minio_endpoint, "healthy": True},
            {"name": "redis", "endpoint": settings.redis_host, "healthy": True},
            {"name": "keycloak", "endpoint": settings.keycloak_url, "healthy": True},
            {
                "name": "superset",
                "endpoint": settings.superset_embed_url,
                "healthy": True,
            },
        ],
    }
