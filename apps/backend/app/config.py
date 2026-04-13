from __future__ import annotations

import os
from dataclasses import asdict, dataclass


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "opencare-backend")
    environment: str = os.getenv("APP_ENV", "development")
    host: str = os.getenv("APP_HOST", "0.0.0.0")
    port: int = int(os.getenv("APP_PORT", "8000"))
    analytics_schema: str = os.getenv("ANALYTICS_SCHEMA", "analytics")
    raw_schema: str = os.getenv("RAW_SCHEMA", "raw")
    postgres_host: str = os.getenv("POSTGRES_HOST", "postgres")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_db: str = os.getenv("POSTGRES_DB", "opencare")
    postgres_user: str = os.getenv("POSTGRES_USER", "opencare")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "")
    minio_endpoint: str = os.getenv("MINIO_ENDPOINT", "minio:9000")
    minio_bucket: str = os.getenv("MINIO_BUCKET", "reports")
    redis_host: str = os.getenv("REDIS_HOST", "redis")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    keycloak_url: str = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
    keycloak_realm: str = os.getenv("KEYCLOAK_REALM", "opencare")
    forecast_runtime_url: str = os.getenv(
        "FORECAST_RUNTIME_URL", "http://bed-forecast:8000"
    )
    anomaly_runtime_url: str = os.getenv(
        "ANOMALY_RUNTIME_URL", "http://anomaly:8000"
    )
    superset_embed_url: str = os.getenv(
        "SUPERSET_EMBED_URL", "http://superset:8088"
    )
    reports_prefix: str = os.getenv("REPORTS_PREFIX", "reports")
    dictionary_version: str = os.getenv("DICTIONARY_VERSION", "2026.04")
    runtime_writes_enabled: bool = _get_bool("RUNTIME_WRITES_ENABLED", True)

    def postgres_dsn(self) -> str:
        credentials = self.postgres_user
        if self.postgres_password:
            credentials = f"{credentials}:{self.postgres_password}"
        return (
            f"postgresql://{credentials}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    def public_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["postgres_dsn"] = self.postgres_dsn()
        payload["postgres_password"] = "***" if self.postgres_password else ""
        return payload


settings = Settings()
