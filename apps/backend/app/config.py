from __future__ import annotations

import os
import ssl
import json
from copy import deepcopy
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from urllib import error, request

import yaml


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _default_use_case_template_storage_root() -> str:
    configured = os.getenv("USE_CASE_TEMPLATE_STORAGE_ROOT")
    if configured:
        return configured

    if os.name != "nt":
        return "/var/opencare/use-case-packages"

    resolved_file = Path(__file__).resolve()
    return str(resolved_file.parents[3] / "data" / "use-case-packages")


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
    decision_cooldown_hours: int = int(os.getenv("DECISION_COOLDOWN_HOURS", "6"))
    decision_measurement_window_hours: int = int(os.getenv("DECISION_MEASUREMENT_WINDOW_HOURS", "24"))
    decision_accuracy_threshold_pp: float = float(os.getenv("DECISION_ACCURACY_THRESHOLD_PP", "5"))
    escalation_threshold_minutes: int = int(os.getenv("ESCALATION_THRESHOLD_MINUTES", "120"))
    max_escalations: int = int(os.getenv("MAX_ESCALATIONS", "3"))
    escalation_email: str = os.getenv("ESCALATION_EMAIL", os.getenv("DECISION_DEFAULT_EMAIL", "admin@opendatalake.com"))
    smtp_host: str = os.getenv("SMTP_HOST", "mail.privateemail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "admin@opendatalake.com")
    smtp_password: str = os.getenv("SMTP_PASS", "")
    smtp_from: str = os.getenv("SMTP_FROM", "admin@opendatalake.com")
    smtp_use_tls: bool = _get_bool("SMTP_USE_TLS", True)
    use_case_template_storage_root: str = _default_use_case_template_storage_root()
    use_case_template_admin_header: str = os.getenv(
        "USE_CASE_TEMPLATE_ADMIN_HEADER", "x-opencare-admin-context"
    )
    use_case_materialization_enabled: bool = _get_bool(
        "USE_CASE_MATERIALIZATION_ENABLED", True
    )

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
USE_CASE_OVERRIDE_CONFIGMAP = os.getenv("USE_CASE_OVERRIDE_CONFIGMAP", "opencare-use-case-overrides")
USE_CASE_OVERRIDE_CONFIGMAP_KEY = os.getenv("USE_CASE_OVERRIDE_CONFIGMAP_KEY", "overrides.yaml")
SERVICE_ACCOUNT_DIR = Path("/var/run/secrets/kubernetes.io/serviceaccount")


def _candidate_use_case_paths() -> list[Path]:
    candidates: list[Path] = []
    if settings.use_cases_config_path:
        candidates.append(Path(settings.use_cases_config_path))

    resolved_file = Path(__file__).resolve()
    for parent in resolved_file.parents:
        candidates.append(parent / "config" / "use_cases.yaml")

    candidates.append(Path("/app/config/use_cases.yaml"))
    return candidates


def clear_use_case_caches() -> None:
    load_use_cases.cache_clear()
    load_record_spec_map.cache_clear()


def load_use_case_manifest() -> dict[str, object]:
    path = resolve_use_cases_config_path()
    if path is None:
        return {}

    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}

    return payload if isinstance(payload, dict) else {}


def resolve_use_cases_config_path() -> Path | None:
    for path in _candidate_use_case_paths():
        if path.is_file():
            return path
    return None


def _service_account_file(name: str) -> Path:
    return SERVICE_ACCOUNT_DIR / name


def _in_cluster_namespace() -> str | None:
    namespace_path = _service_account_file("namespace")
    if not namespace_path.is_file():
        return None
    return namespace_path.read_text(encoding="utf-8").strip() or None


def _build_kubernetes_request(path: str, method: str = "GET", body: bytes | None = None) -> request.Request | None:
    token_path = _service_account_file("token")
    ca_path = _service_account_file("ca.crt")
    namespace = _in_cluster_namespace()
    host = os.getenv("KUBERNETES_SERVICE_HOST")
    port = os.getenv("KUBERNETES_SERVICE_PORT", "443")

    if not token_path.is_file() or namespace is None or not host or not ca_path.is_file():
        return None

    token = token_path.read_text(encoding="utf-8").strip()
    url = f"https://{host}:{port}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/merge-patch+json"
    return request.Request(url, data=body, headers=headers, method=method)


def _open_kubernetes_request(req: request.Request):
    ca_path = _service_account_file("ca.crt")
    context = ssl.create_default_context(cafile=str(ca_path))
    return request.urlopen(req, context=context, timeout=5)


def load_use_case_overrides() -> dict[str, dict[str, object]]:
    namespace = _in_cluster_namespace()
    if namespace is None:
        return {}

    api_path = (
        f"/api/v1/namespaces/{namespace}/configmaps/{USE_CASE_OVERRIDE_CONFIGMAP}"
    )
    req = _build_kubernetes_request(api_path)
    if req is None:
        return {}

    try:
        with _open_kubernetes_request(req) as response:
            payload = yaml.safe_load(response.read().decode("utf-8")) or {}
    except error.HTTPError as exc:
        if exc.code in {401, 403, 404}:
            return {}
        return {}
    except OSError:
        return {}

    raw_data = payload.get("data", {}).get(USE_CASE_OVERRIDE_CONFIGMAP_KEY, "")
    overrides_payload = yaml.safe_load(raw_data) or {}
    use_cases = overrides_payload.get("use_cases", {})
    return use_cases if isinstance(use_cases, dict) else {}


def write_use_case_overrides(overrides: dict[str, dict[str, object]]) -> None:
    namespace = _in_cluster_namespace()
    if namespace is None:
        raise FileNotFoundError("Kubernetes namespace context is unavailable for use-case overrides.")

    api_path = (
        f"/api/v1/namespaces/{namespace}/configmaps/{USE_CASE_OVERRIDE_CONFIGMAP}"
    )
    req = _build_kubernetes_request(
        api_path,
        method="PATCH",
        body=json.dumps(
            {
                "data": {
                    USE_CASE_OVERRIDE_CONFIGMAP_KEY: yaml.safe_dump(
                        {"use_cases": overrides},
                        sort_keys=False,
                        allow_unicode=False,
                    )
                }
            },
            sort_keys=False,
            ensure_ascii=True,
        ).encode("utf-8"),
    )
    if req is None:
        raise FileNotFoundError("Kubernetes request context is unavailable for use-case overrides.")

    try:
        with _open_kubernetes_request(req):
            return None
    except error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8").strip()
        except Exception:
            detail = ""
        message = "Unable to persist the use-case override."
        if detail:
            message = f"{message} {detail}"
        raise RuntimeError(message) from exc
    except OSError as exc:
        raise RuntimeError("Unable to reach the Kubernetes API to persist the use-case override.") from exc


def merge_use_case_config(
    base_use_cases: dict[str, dict[str, object]],
    overrides: dict[str, dict[str, object]],
) -> dict[str, dict[str, object]]:
    merged = deepcopy(base_use_cases)
    for use_case_id, override in overrides.items():
        if not isinstance(override, dict):
            continue
        target = merged.get(use_case_id)
        if isinstance(target, dict):
            target.update(override)
    return merged


@lru_cache(maxsize=1)
def load_use_cases(include_disabled: bool = True) -> dict[str, dict[str, object]]:
    payload = load_use_case_manifest()
    use_cases = payload.get("use_cases", {})
    if not isinstance(use_cases, dict):
        return {}

    merged_use_cases = merge_use_case_config(use_cases, load_use_case_overrides())
    if include_disabled:
        return merged_use_cases

    return {
        key: value
        for key, value in merged_use_cases.items()
        if isinstance(value, dict) and value.get("enabled", False)
    }


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


def update_use_case_enabled(use_case_id: str, enabled: bool) -> dict[str, object]:
    payload = load_use_case_manifest()
    use_cases = payload.get("use_cases", {})
    if not isinstance(use_cases, dict) or use_case_id not in use_cases:
        raise KeyError(use_case_id)

    overrides = load_use_case_overrides()
    use_case_override = overrides.get(use_case_id, {})
    if not isinstance(use_case_override, dict):
        use_case_override = {}

    use_case_override["enabled"] = enabled
    overrides[use_case_id] = use_case_override
    write_use_case_overrides(overrides)
    clear_use_case_caches()
    refreshed = load_use_cases(include_disabled=True).get(use_case_id, {})
    return refreshed if isinstance(refreshed, dict) else {}
