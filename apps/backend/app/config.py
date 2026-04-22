from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

import yaml


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
    dictionary_schema: str = os.getenv("DICTIONARY_SCHEMA", "dictionary")
    output_schema: str = os.getenv("OUTPUT_SCHEMA", "output")
    raw_schema: str = os.getenv("RAW_SCHEMA", "raw")
    staging_schema: str = os.getenv("STAGING_SCHEMA", "staging")
    dbt_source_schema: str = os.getenv("DBT_SOURCE_SCHEMA", os.getenv("RAW_SCHEMA", "raw"))
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
    airbyte_url: str = os.getenv("AIRBYTE_URL", "http://airbyte-airbyte-server-svc:8001")
    forecast_output_table: str = os.getenv("FORECAST_OUTPUT_TABLE", "forecast")
    anomaly_output_table: str = os.getenv("ANOMALY_OUTPUT_TABLE", "anomaly")
    forecast_horizon_days: int = int(os.getenv("FORECAST_HORIZON_DAYS", "7"))
    superset_embed_url: str = os.getenv(
        "SUPERSET_EMBED_URL", "http://superset:8088"
    )
    reports_prefix: str = os.getenv("REPORTS_PREFIX", "reports")
    dictionary_version: str = os.getenv("DICTIONARY_VERSION", "2026.04")
    runtime_writes_enabled: bool = _get_bool("RUNTIME_WRITES_ENABLED", True)
    use_cases_config_path: str = os.getenv("USE_CASES_CONFIG_PATH", "")
    dbt_project_dir: str = os.getenv("DBT_PROJECT_DIR", "/app/dbt")
    dbt_manifest_path: str = os.getenv("DBT_MANIFEST_PATH", "/app/dbt/target/manifest.json")
    dbt_models_dir: str = os.getenv("DBT_MODELS_DIR", "/app/dbt/models")
    decision_schema: str = os.getenv("DECISION_SCHEMA", "decision")
    decision_default_email: str = os.getenv("DECISION_DEFAULT_EMAIL", "admin@opendatalake.com")
    escalation_threshold_minutes: int = int(os.getenv("ESCALATION_THRESHOLD_MINUTES", "120"))
    max_escalations: int = int(os.getenv("MAX_ESCALATIONS", "3"))
    escalation_email: str = os.getenv("ESCALATION_EMAIL", os.getenv("DECISION_DEFAULT_EMAIL", "admin@opendatalake.com"))
    smtp_host: str = os.getenv("SMTP_HOST", "mail.privateemail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "admin@opendatalake.com")
    smtp_password: str = os.getenv("SMTP_PASS", "")
    smtp_from: str = os.getenv("SMTP_FROM", "admin@opendatalake.com")
    smtp_use_tls: bool = _get_bool("SMTP_USE_TLS", True)

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


def _candidate_use_case_paths() -> list[Path]:
    candidates: list[Path] = []
    if settings.use_cases_config_path:
        candidates.append(Path(settings.use_cases_config_path))

    resolved_file = Path(__file__).resolve()
    for parent in resolved_file.parents:
        candidates.append(parent / "config" / "use_cases.yaml")

    candidates.append(Path("/app/config/use_cases.yaml"))
    return candidates


@lru_cache(maxsize=1)
def load_use_cases(include_disabled: bool = True) -> dict[str, dict[str, object]]:
    for path in _candidate_use_case_paths():
        if not path.is_file():
            continue

        with path.open("r", encoding="utf-8") as handle:
            payload = yaml.safe_load(handle) or {}

        use_cases = payload.get("use_cases", {})
        if not isinstance(use_cases, dict):
            return {}

        if include_disabled:
            return use_cases

        return {
            key: value
            for key, value in use_cases.items()
            if isinstance(value, dict) and value.get("enabled", False)
        }

    return {}


def load_enabled_use_cases() -> dict[str, dict[str, object]]:
    return load_use_cases(include_disabled=False)


@lru_cache(maxsize=1)
def load_record_spec_map() -> dict[str, dict[str, object]]:
    record_specs: dict[str, dict[str, object]] = {}
    for use_case_key, use_case in load_use_cases(include_disabled=True).items():
        for spec in use_case.get("record_specs", []):
            table = spec.get("table")
            if not isinstance(table, str):
                continue
            record_specs[table] = {
                "use_case": use_case_key,
                "grain": spec.get("grain"),
                "table": table,
            }
    return record_specs
