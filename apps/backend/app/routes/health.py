from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


@router.get("/readyz")
def readyz() -> dict[str, object]:
    checks = {
        "postgres": bool(settings.postgres_host and settings.postgres_db),
        "redis": bool(settings.redis_host),
        "minio": bool(settings.minio_endpoint and settings.minio_bucket),
        "keycloak": bool(settings.keycloak_url and settings.keycloak_realm),
        "analytics_schema": bool(settings.analytics_schema),
    }
    ready = all(checks.values())
    return {
        "status": "ready" if ready else "degraded",
        "checks": checks,
    }
