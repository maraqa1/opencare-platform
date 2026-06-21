#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any
from urllib import error, parse, request

import yaml


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT_DIR / "dbt" / "opencare" / "models" / "metadata" / "dashboard_config.yml"


class SupersetClient:
    def __init__(self, base_url: str, username: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.access_token: str | None = None
        self.csrf_token: str | None = None
        self.user_id: int | None = None
        self.opener = request.build_opener()

    def authenticate(self) -> None:
        api_payload = {
            "username": self.username,
            "password": self.password,
            "provider": "db",
            "refresh": True,
        }
        api_response = self._request_first(
            "POST",
            ["/api/v1/security/login", "/api/v1/security/login/"],
            payload=api_payload,
            use_auth=False,
        )
        self.access_token = api_response.get("access_token")
        if not self.access_token:
            raise RuntimeError("Superset login did not return an access token")

        csrf_response = self._request_first(
            "GET",
            ["/api/v1/security/csrf_token", "/api/v1/security/csrf_token/"],
        )
        self.csrf_token = csrf_response.get("result") if isinstance(csrf_response, dict) else None
        if not self.csrf_token:
            raise RuntimeError("Superset csrf token request did not return a token")

        try:
            me_response = self._request_first(
                "GET",
                ["/api/v1/me", "/api/v1/me/"],
            )
            me_result = me_response.get("result", {}) if isinstance(me_response, dict) else {}
            username = me_result.get("username")
            user_id = me_result.get("id")
            if not username or username != self.username or not isinstance(user_id, int):
                raise RuntimeError(f"Superset auth self-check failed: {me_response}")
            self.user_id = user_id
        except RuntimeError as exc:
            if " failed with 401:" not in str(exc):
                raise
            fallback_user_id = _lookup_user_in_metadata(self.username)
            if fallback_user_id is None:
                raise RuntimeError(
                    f"Superset /me auth check failed and metadata fallback could not resolve user '{self.username}'"
                ) from exc
            self.user_id = fallback_user_id

    def get(self, path: str) -> dict[str, Any]:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", path, payload=payload)

    def put(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", path, payload=payload)

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        use_auth: bool = True,
    ) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if use_auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if method in {"POST", "PUT", "PATCH", "DELETE"} and self.csrf_token:
            headers["X-CSRFToken"] = self.csrf_token
            headers["X-CSRF-Token"] = self.csrf_token
            headers["Referer"] = self.base_url

        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        try:
            response_text = self._open_raw(method, path, payload=body, use_auth=use_auth, headers=headers)
            return json.loads(response_text)
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"{method} {path} failed with {exc.code}: {detail}") from exc

    def _request_first(
        self,
        method: str,
        paths: list[str],
        payload: dict[str, Any] | None = None,
        use_auth: bool = True,
    ) -> dict[str, Any]:
        last_exc: RuntimeError | None = None
        for path in paths:
            try:
                return self._request(method, path, payload=payload, use_auth=use_auth)
            except RuntimeError as exc:
                error_text = str(exc)
                if " failed with 404:" in error_text or " failed with 308:" in error_text:
                    last_exc = exc
                    continue
                raise
        if last_exc is not None:
            raise last_exc
        raise RuntimeError(f"{method} request did not include any candidate paths")

    def _open_raw(
        self,
        method: str,
        path: str,
        payload: bytes | None = None,
        use_auth: bool = True,
        headers: dict[str, str] | None = None,
        content_type: str | None = None,
        referer: str | None = None,
    ) -> str:
        request_headers = dict(headers or {})
        if use_auth and self.access_token:
            request_headers.setdefault("Authorization", f"Bearer {self.access_token}")
            request_headers.setdefault("Referer", self.base_url)
        if content_type:
            request_headers["Content-Type"] = content_type
        if referer:
            request_headers["Referer"] = referer

        http_request = request.Request(
            url=f"{self.base_url}{path}",
            method=method,
            data=payload,
            headers=request_headers,
        )
        with self.opener.open(http_request, timeout=30) as response:
            return response.read().decode("utf-8")


def load_dashboard_config(config_path: Path) -> dict[str, Any]:
    with config_path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def quote_sql_identifier(value: str) -> str:
    parts = value.split(".", 1)
    if len(parts) == 2:
        return f'"{parts[0]}"."{parts[1]}"'
    return f'"{value}"'


def superset_database_uri() -> str:
    configured_uri = os.getenv("SUPERSET_DATABASE_SQLALCHEMY_URI") or os.getenv("SUPERSET_DATABASE_URI")
    if configured_uri and "$(" not in configured_uri:
        return configured_uri.replace("postgresql://", "postgresql+psycopg2://", 1)

    user = parse.quote(os.getenv("POSTGRES_USER", "opencare"), safe="")
    password = parse.quote(os.getenv("POSTGRES_PASSWORD", ""), safe="")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "opencare")
    credentials = user if not password else f"{user}:{password}"
    return (
        f"postgresql+psycopg2://{credentials}@{host}:{port}/{database}"
        "?options=-csearch_path%3Danalytics,public"
    )


def find_database_by_name(client: SupersetClient, database_name: str) -> dict[str, Any] | None:
    result = client.get("/api/v1/database/")
    return find_existing(result, "database_name", database_name)


def _lookup_in_metadata(table: str, where_column: str, value: str, select_column: str = "id") -> int | None:
    try:
        import psycopg2

        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            dbname=os.getenv("POSTGRES_DB", "opencare"),
            user=os.getenv("POSTGRES_USER", "opencare"),
            password=os.getenv("POSTGRES_PASSWORD", ""),
            options=f"-csearch_path={os.getenv('SUPERSET_METADATA_SCHEMA', 'superset_meta')},public",
        )
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT {select_column} FROM {table} WHERE {where_column} = %s", (value,))
            row = cur.fetchone()
            return int(row[0]) if row else None
        finally:
            conn.close()
    except Exception:
        return None


def _lookup_database_in_metadata(database_name: str) -> int | None:
    return _lookup_in_metadata("dbs", "database_name", database_name)


def _lookup_dataset_in_metadata(table_name: str) -> int | None:
    return _lookup_in_metadata("tables", "table_name", table_name)


def _lookup_chart_in_metadata(slice_name: str) -> int | None:
    return _lookup_in_metadata("slices", "slice_name", slice_name)


def _lookup_dashboard_in_metadata(slug: str) -> int | None:
    return _lookup_in_metadata("dashboards", "slug", slug)


def _lookup_user_in_metadata(username: str) -> int | None:
    return _lookup_in_metadata("ab_user", "username", username)


def ensure_database(client: SupersetClient) -> int:
    database_name = os.getenv("SUPERSET_DATABASE_NAME", "OpenCare Analytics")
    existing = find_database_by_name(client, database_name)

    payload = {
        "database_name": database_name,
        "sqlalchemy_uri": superset_database_uri(),
        "configuration_method": "sqlalchemy_form",
        "engine": "postgresql",
        "expose_in_sqllab": True,
        "allow_ctas": False,
        "allow_cvas": False,
        "allow_dml": False,
        "allow_run_async": False,
    }

    if existing:
        client.put(f"/api/v1/database/{existing['id']}", payload)
        return int(existing["id"])

    try:
        created = client.post("/api/v1/database/", payload)
    except RuntimeError as exc:
        if "same name already exists" not in str(exc).lower():
            raise
        existing = find_database_by_name(client, database_name)
        if existing:
            client.put(f"/api/v1/database/{existing['id']}", payload)
            return int(existing["id"])
        db_id = _lookup_database_in_metadata(database_name)
        if db_id is not None:
            print(f"[ok] found database '{database_name}' via metadata (id={db_id})")
            return db_id
        raise
    created_id = response_id(created)
    if created_id is not None:
        return created_id

    existing = find_database_by_name(client, database_name)
    if existing:
        return int(existing["id"])
    db_id = _lookup_database_in_metadata(database_name)
    if db_id is not None:
        print(f"[ok] found database '{database_name}' via metadata (id={db_id})")
        return db_id
    raise RuntimeError(f"Superset created database {database_name} but did not return an id")


def dataset_payload(dataset_name: str, database_id: int, owner_ids: list[int] | None = None) -> dict[str, Any]:
    schema_name, table_name = dataset_name.split(".", 1)
    return {
        "database": database_id,
        "schema": schema_name,
        "table_name": table_name,
        "owners": owner_ids or [],
    }


def deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def adhoc_metric(metric_spec: str | dict[str, Any]) -> dict[str, Any]:
    metric_name = metric_spec["name"] if isinstance(metric_spec, dict) else metric_spec
    metric_map = {
        "avg_occupancy_rate": ("occupancy_rate", "AVG", "Average Occupancy Rate"),
        "current_occupancy_rate": ("occupancy_rate", "AVG", "Current Occupancy Rate"),
        "occupancy_rate_pct": ("occupancy_rate_pct", "AVG", "Ward Occupancy Rate"),
        "network_occupancy_rate_pct": ("network_occupancy_rate_pct", "MAX", "Network Occupancy Rate"),
        "avg_ward_occupancy_pct": ("avg_ward_occupancy_pct", "MAX", "Average Ward Occupancy"),
        "peak_ward_occupancy_pct": ("peak_ward_occupancy_pct", "MAX", "Peak Ward Occupancy"),
        "network_occupied_beds": ("network_occupied_beds", "MAX", "Occupied Beds"),
        "network_staffed_beds": ("network_staffed_beds", "MAX", "Staffed Beds"),
        "network_available_beds": ("network_available_beds", "MAX", "Available Beds"),
        "critical_ward_count": ("critical_ward_count", "MAX", "Critical Wards"),
        "warning_ward_count": ("warning_ward_count", "MAX", "Warning Wards"),
        "normal_ward_count": ("normal_ward_count", "MAX", "Normal Wards"),
        "ward_count": ("ward_count", "MAX", "Ward Count"),
        "ward_row_count": ("ward_id", "COUNT", "Ward Count"),
        "admissions_total": ("admissions_total", "SUM", "Admissions"),
        "discharges_total": ("discharges_total", "SUM", "Discharges"),
        "admissions_today": ("admissions_today", "SUM", "Admissions Today"),
        "discharges_today": ("discharges_today", "SUM", "Discharges Today"),
        "net_flow": ("net_flow", "SUM", "Net Flow"),
        "staffing_pressure_index": ("staffing_pressure_index", "AVG", "Staffing Pressure Index"),
        "recoverable_amount_sum": ("recoverable_amount", "SUM", "Recoverable Amount"),
        "expected_recovery_amount_sum": ("expected_recovery_amount", "SUM", "Expected Recovery Amount"),
        "priority_score_avg": ("priority_score", "AVG", "Average Priority Score"),
        "expected_cash_sum": ("expected_cash", "SUM", "Expected Cash"),
        "cash_at_risk_sum": ("cash_at_risk", "SUM", "Cash At Risk"),
        "recoverable_cash_sum": ("recoverable_cash", "SUM", "Recoverable Cash"),
        "confidence_score_avg": ("confidence_score", "AVG", "Forecast Confidence"),
        "gross_billed_amount_sum": ("gross_billed_amount", "SUM", "Gross Billed Amount"),
        "posted_cash_amount_sum": ("posted_cash_amount", "SUM", "Posted Cash Amount"),
        "expected_cash_amount_sum": ("expected_cash_amount", "SUM", "Expected Cash Amount"),
        "gross_billed_sum": ("gross_billed", "SUM", "Gross Billed"),
        "paid_amount_sum": ("paid_amount", "SUM", "Paid Amount"),
        "contracted_amount_sum": ("contracted_amount", "SUM", "Contracted Amount"),
        "ar_days_avg": ("ar_days", "AVG", "Average A/R Days"),
        "denied_amount_sum": ("denied_amount", "SUM", "Denied Amount"),
        "actual_collection_rate_avg": ("actual_collection_rate", "AVG", "Actual Collection Rate"),
        "contract_rate_pct_avg": ("contract_rate_pct", "AVG", "Contract Rate"),
        "average_payment_days_avg": ("average_payment_days", "AVG", "Average Payment Days"),
        "payment_sla_days_avg": ("payment_sla_days", "AVG", "Payment SLA Days"),
        "leakage_amount_sum": ("leakage_amount", "SUM", "Leakage Amount"),
        "outstanding_amount_sum": ("outstanding_amount", "SUM", "Outstanding Amount"),
        "sla_breach_count_sum": ("sla_breach_count", "SUM", "SLA Breach Count"),
        "underpayment_amount_sum": ("underpayment_amount", "SUM", "Underpayment Amount"),
        "actual_recovery_sum": ("actual_recovery", "SUM", "Actual Recovery"),
        "expected_recovery_sum": ("expected_recovery", "SUM", "Expected Recovery"),
    }
    column_name, aggregate, label = metric_map.get(
        metric_name,
        (metric_name, "AVG", metric_name.replace("_", " ").title()),
    )
    if isinstance(metric_spec, dict):
        column_name = metric_spec.get("column", column_name)
        aggregate = metric_spec.get("aggregate", aggregate)
        label = metric_spec.get("label", label)
    column_type = (
        metric_spec.get("column_type", "NUMERIC")
        if isinstance(metric_spec, dict)
        else ("VARCHAR" if aggregate == "COUNT" and column_name.endswith("_id") else "NUMERIC")
    )
    return {
        "expressionType": "SIMPLE",
        "column": {
            "column_name": column_name,
            "type": column_type,
        },
        "aggregate": aggregate,
        "label": label,
        "optionName": f"metric_{metric_name}",
    }


def chart_payload(chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    metric_specs = chart_config.get("metrics", [])
    metrics = [adhoc_metric(metric_spec) for metric_spec in metric_specs]
    group_by = chart_config.get("group_by", [])
    x_axis = chart_config.get("x_axis")
    columns = [x_axis] if x_axis else group_by
    time_range = chart_config.get("time_range", "No filter")
    base_params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": chart_config["viz_type"],
        "groupby": group_by,
        "metrics": metrics,
        "granularity_sqla": chart_config.get("time_column"),
        "row_limit": chart_config.get("row_limit", 500),
        "adhoc_filters": [],
        "orderby": [],
        "time_range": time_range,
        "show_legend": True,
    }
    if x_axis:
        base_params["x_axis"] = x_axis
    if metrics and chart_config["viz_type"] in {"big_number_total", "big_number", "pie"}:
        base_params["metric"] = metrics[0]
    params = deep_merge(base_params, chart_config.get("form_data", {}))

    base_query = {
        "time_range": time_range,
        "granularity": chart_config.get("time_column"),
        "granularity_sqla": chart_config.get("time_column"),
        "columns": columns,
        "metrics": metrics,
        "orderby": [],
        "annotation_layers": [],
        "row_limit": chart_config.get("row_limit", 500),
        "series_limit": 0,
        "series_limit_metric": None,
        "order_desc": bool(chart_config.get("sort_desc", True)),
        "url_params": {},
        "custom_params": {},
        "custom_form_data": {},
    }
    if chart_config["viz_type"] == "big_number" and not x_axis:
        base_query["is_timeseries"] = True
    query_context = {
        "datasource": {"id": dataset_id, "type": "table"},
        "force": False,
        "queries": [
            deep_merge(base_query, chart_config.get("query_overrides", {}))
        ],
        "result_format": "json",
        "result_type": "full",
    }
    return {
        "slice_name": chart_config["title"],
        "viz_type": chart_config["viz_type"],
        "datasource_id": dataset_id,
        "datasource_type": "table",
        "params": json.dumps(params),
        "query_context": json.dumps(query_context),
    }


def build_native_filter(
    filter_config: dict[str, Any],
    dataset_ids: dict[str, int],
    chart_refs: list[dict[str, Any]],
) -> dict[str, Any] | None:
    dataset_name = filter_config.get("target_dataset")
    if not dataset_name or dataset_name not in dataset_ids:
        return None

    dataset_id = dataset_ids[dataset_name]
    chart_scope = filter_config.get("chart_scope")
    scoped_charts = (
        [chart_ref for chart_ref in chart_refs if chart_ref.get("key") in chart_scope]
        if isinstance(chart_scope, list) and chart_scope
        else chart_refs
    )
    chart_ids = [int(chart_ref["id"]) for chart_ref in scoped_charts]
    filter_key = re.sub(r"[^A-Za-z0-9]+", "_", str(filter_config.get("key", "filter"))).upper()
    filter_type = "filter_time" if filter_config.get("control") == "date_range" else "filter_select"

    if filter_type == "filter_time":
        default_time_range = filter_config.get("default", "No filter")
        default_mask = {
            "extraFormData": {"time_range": default_time_range},
            "filterState": {"label": default_time_range, "value": default_time_range},
            "ownState": {},
        }
        control_values = {
            "enableEmptyFilter": False,
            "defaultToFirstItem": False,
        }
    else:
        default_mask = {
            "extraFormData": {},
            "filterState": {"label": "All", "value": None},
            "ownState": {},
        }
        control_values = {
            "enableEmptyFilter": False,
            "defaultToFirstItem": False,
            "multiSelect": filter_config.get("control") == "multi_select",
            "searchAllOptions": bool(filter_config.get("searchable", False)),
            "inverseSelection": False,
        }

    return {
        "id": f"NATIVE_FILTER-{filter_key}",
        "name": filter_config.get("label", filter_config.get("key", "Filter")),
        "filterType": filter_type,
        "targets": [
            {
                "datasetId": dataset_id,
                "column": {"name": filter_config["column"]},
            }
        ],
        "defaultDataMask": default_mask,
        "controlValues": control_values,
        "cascadeParentIds": [],
        "scope": {"rootPath": ["ROOT_ID"], "excluded": []},
        "chartsInScope": chart_ids,
        "tabsInScope": [],
        "description": "",
        "type": "NATIVE_FILTER",
        "adhoc_filters": [],
    }


def dashboard_json_metadata(
    dashboard_config: dict[str, Any],
    chart_refs: list[dict[str, Any]],
    dataset_ids: dict[str, int],
) -> dict[str, Any]:
    native_filters = [
        native_filter
        for native_filter in (
            build_native_filter(filter_config, dataset_ids, chart_refs)
            for filter_config in dashboard_config.get("filters", [])
            if filter_config.get("type") == "native_filter"
        )
        if native_filter is not None
    ]
    return {
        "default_filters": "{}",
        "expanded_slices": {},
        "timed_refresh_immune_slices": [],
        "native_filter_configuration": native_filters,
    }


def find_existing(result_payload: dict[str, Any], name_field: str, target_value: str) -> dict[str, Any] | None:
    for item in result_payload.get("result", []):
        if item.get(name_field) == target_value:
            return item
    return None


def response_id(response_payload: dict[str, Any]) -> int | None:
    result_payload = response_payload.get("result", response_payload)
    if isinstance(result_payload, dict) and result_payload.get("id") is not None:
        return int(result_payload["id"])
    if isinstance(result_payload, list) and result_payload and result_payload[0].get("id") is not None:
        return int(result_payload[0]["id"])
    if response_payload.get("id") is not None:
        return int(response_payload["id"])
    return None


def bytes_to_uuid(value: object) -> str:
    if isinstance(value, bytes):
        return str(uuid.UUID(bytes=value))
    return str(value)


def ensure_dataset(client: SupersetClient, dataset_name: str, database_id: int) -> int:
    schema_name, table_name = dataset_name.split(".", 1)
    query = parse.quote(
        json.dumps(
            {
                "filters": [
                    {"col": "table_name", "opr": "eq", "value": table_name},
                    {"col": "schema", "opr": "eq", "value": schema_name},
                ]
            }
        )
    )
    result = client.get(f"/api/v1/dataset/?q={query}")
    existing = find_existing(result, "table_name", table_name)
    owner_ids = [client.user_id] if client.user_id is not None else []
    payload = dataset_payload(dataset_name, database_id, owner_ids=owner_ids)
    if existing:
        dataset_id = ensure_dataset_orm(dataset_name, database_id, client.user_id)
        print(f"  [ok] refreshed dataset '{dataset_name}' via ORM sync (id={dataset_id})")
        return dataset_id

    try:
        created = client.post("/api/v1/dataset/", payload)
    except RuntimeError as exc:
        error_text = str(exc)
        if " failed with 500:" in error_text:
            dataset_id = ensure_dataset_orm(dataset_name, database_id, client.user_id)
            print(f"  [ok] created dataset '{dataset_name}' via ORM fallback (id={dataset_id})")
            return dataset_id
        if "already exists" not in error_text.lower():
            raise
        dataset_id = _lookup_dataset_in_metadata(table_name)
        if dataset_id is not None:
            print(f"  [ok] found dataset '{dataset_name}' via metadata (id={dataset_id})")
            return dataset_id
        raise
    created_id = response_id(created)
    if created_id is not None:
        return created_id

    result = client.get(f"/api/v1/dataset/?q={query}")
    existing = find_existing(result, "table_name", table_name)
    if existing:
        return int(existing["id"])
    dataset_id = _lookup_dataset_in_metadata(table_name)
    if dataset_id is not None:
        print(f"  [ok] found dataset '{dataset_name}' via metadata (id={dataset_id})")
        return dataset_id
    raise RuntimeError(f"Superset created dataset {dataset_name} but did not return an id")


def ensure_dataset_orm(dataset_name: str, database_id: int, owner_id: int | None) -> int:
    try:
        from flask_appbuilder.security.sqla.models import User
        from superset import db
        from superset.connectors.sqla.models import SqlaTable
    except Exception as exc:
        raise RuntimeError("Superset ORM dataset sync must run inside the Superset pod.") from exc

    schema_name, table_name = dataset_name.split(".", 1)
    existing = (
        db.session.query(SqlaTable)
        .filter_by(database_id=database_id, schema=schema_name, table_name=table_name)
        .one_or_none()
    )
    if existing:
        if owner_id is not None and not any(int(owner.id) == owner_id for owner in existing.owners):
            owner = db.session.query(User).filter_by(id=owner_id).one_or_none()
            if owner is not None:
                existing.owners.append(owner)
                db.session.add(existing)
        refresh_dataset_metadata(existing, db.session)
        db.session.flush()
        return int(existing.id)

    dataset = SqlaTable(table_name=table_name, schema=schema_name, database_id=database_id)
    if owner_id is not None:
        owner = db.session.query(User).filter_by(id=owner_id).one_or_none()
        if owner is not None:
            dataset.owners = [owner]
    db.session.add(dataset)
    db.session.flush()
    refresh_dataset_metadata(dataset, db.session)
    db.session.flush()
    return int(dataset.id)


def refresh_dataset_metadata(dataset: Any, session: Any) -> None:
    refresh_methods = (
        "fetch_metadata",
        "fetch_metadata_sync",
        "fetch_metadata_and_metrics",
    )
    for method_name in refresh_methods:
        method = getattr(dataset, method_name, None)
        if not callable(method):
            continue
        result = method()
        if isinstance(result, tuple):
            for item in result:
                if isinstance(item, list):
                    for child in item:
                        session.add(child)
        session.add(dataset)
        return


def ensure_chart_orm(chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    payload = chart_payload(chart_config, dataset_id)
    try:
        from superset import db
        from superset.models.slice import Slice
    except Exception as exc:
        raise RuntimeError("Superset ORM chart sync must run inside the Superset pod.") from exc

    existing = db.session.query(Slice).filter_by(slice_name=chart_config["title"]).one_or_none()
    payload = chart_payload(chart_config, dataset_id)
    if existing:
        existing.viz_type = payload["viz_type"]
        existing.datasource_id = payload["datasource_id"]
        existing.datasource_type = payload["datasource_type"]
        existing.params = payload["params"]
        if "query_context" in payload and hasattr(existing, "query_context"):
            existing.query_context = payload["query_context"]
        db.session.add(existing)
        db.session.flush()
        print(f"  [ok] chart {chart_config['title']} -> {existing.id} (updated)")
        return {"id": int(existing.id), "uuid": bytes_to_uuid(existing.uuid), "title": existing.slice_name}

    chart = Slice(
        slice_name=payload["slice_name"],
        viz_type=payload["viz_type"],
        datasource_id=payload["datasource_id"],
        datasource_type=payload["datasource_type"],
        params=payload["params"],
    )
    if "query_context" in payload and hasattr(chart, "query_context"):
        chart.query_context = payload["query_context"]
    db.session.add(chart)
    db.session.flush()
    print(f"  [ok] chart {chart_config['title']} -> {chart.id} (created)")
    return {"id": int(chart.id), "uuid": bytes_to_uuid(chart.uuid), "title": chart.slice_name}


def dashboard_position_data(dashboard_config: dict[str, Any], chart_refs: list[dict[str, Any]]) -> dict[str, Any]:
    enabled_charts = [chart for chart in dashboard_config.get("charts", []) if chart.get("enabled", True)]
    rows: dict[int, list[tuple[dict[str, Any], dict[str, Any]]]] = {}
    for chart_config, chart_ref in zip(enabled_charts, chart_refs, strict=False):
        layout = chart_config.get("layout", {})
        rows.setdefault(int(layout.get("y", 0)), []).append((chart_config, chart_ref))

    position_data: dict[str, Any] = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {
            "type": "ROOT",
            "id": "ROOT_ID",
            "children": ["GRID_ID"],
        },
        "GRID_ID": {
            "type": "GRID",
            "id": "GRID_ID",
            "children": [],
            "parents": ["ROOT_ID"],
        },
    }

    for row_index, row_y in enumerate(sorted(rows), start=1):
        row_id = f"ROW-{row_index}"
        position_data["GRID_ID"]["children"].append(row_id)
        position_data[row_id] = {
            "type": "ROW",
            "id": row_id,
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        }

        for chart_config, chart_ref in sorted(rows[row_y], key=lambda item: int(item[0].get("layout", {}).get("x", 0))):
            chart_id = int(chart_ref["id"])
            chart_component_id = f"CHART-{chart_id}"
            layout = chart_config.get("layout", {})
            position_data[row_id]["children"].append(chart_component_id)
            position_data[chart_component_id] = {
                "type": "CHART",
                "id": chart_component_id,
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "meta": {
                    "chartId": chart_id,
                    "sliceName": chart_config["title"],
                    "uuid": chart_ref["uuid"],
                    "width": int(layout.get("w", 12)),
                    "height": int(layout.get("h", 12)) * 4,
                },
            }

    return position_data


def ensure_dashboard_orm(
    dashboard_config: dict[str, Any],
    chart_refs: list[dict[str, Any]],
    dataset_ids: dict[str, int],
) -> dict[str, Any]:
    try:
        from superset import db
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice
    except Exception as exc:
        raise RuntimeError("Superset ORM chart sync must run inside the Superset pod.") from exc

    slug = dashboard_config["dashboard_id"]
    existing = db.session.query(Dashboard).filter_by(slug=slug).one_or_none()

    payload = {
        "dashboard_title": dashboard_config["title"],
        "slug": slug,
        "published": True,
        "position_json": json.dumps(dashboard_position_data(dashboard_config, chart_refs)),
        "json_metadata": json.dumps(dashboard_json_metadata(dashboard_config, chart_refs, dataset_ids)),
    }

    chart_ids = [int(chart_ref["id"]) for chart_ref in chart_refs]
    slices = db.session.query(Slice).filter(Slice.id.in_(chart_ids)).all()
    slices_by_id = {int(slice_.id): slice_ for slice_ in slices}
    missing_ids = [chart_id for chart_id in chart_ids if chart_id not in slices_by_id]
    if missing_ids:
        raise RuntimeError(f"Missing chart ids for dashboard {slug}: {', '.join(str(chart_id) for chart_id in missing_ids)}")
    ordered_slices = [slices_by_id[chart_id] for chart_id in chart_ids]

    if existing:
        dashboard = existing
    else:
        dashboard = Dashboard()
        db.session.add(dashboard)

    dashboard.dashboard_title = payload["dashboard_title"]
    dashboard.slug = payload["slug"]
    dashboard.published = payload["published"]
    dashboard.position_json = payload["position_json"]
    dashboard.json_metadata = payload["json_metadata"]
    dashboard.slices = ordered_slices
    db.session.flush()
    action = "updated" if existing else "created"
    print(f"[ok] dashboard {dashboard.dashboard_title} -> {dashboard.id} ({action})")
    print(f"[ok] dashboard chart count -> {len(ordered_slices)}")
    return {"id": int(dashboard.id), "slug": dashboard.slug, "title": dashboard.dashboard_title}


def sync_dashboards(config_path: Path) -> None:
    config = load_dashboard_config(config_path)
    dashboards = config.get("dashboards", {})
    if not dashboards:
        raise RuntimeError(f"No dashboards found in {config_path}")

    client = SupersetClient(
        base_url=os.getenv("SUPERSET_URL", os.getenv("SUPERSET_EMBED_URL", "http://localhost:8088")),
        username=os.getenv("SUPERSET_ADMIN_USER", "admin"),
        password=os.getenv("SUPERSET_ADMIN_PASSWORD", "admin"),
    )
    client.authenticate()
    database_id = ensure_database(client)
    print(f"[ok] database OpenCare Analytics -> {database_id}")
    try:
        from superset.app import create_app
    except Exception as exc:
        raise RuntimeError("Superset ORM chart sync must run inside the Superset pod.") from exc

    app = create_app()
    with app.app_context():
        try:
            from superset import db
        except Exception as exc:
            raise RuntimeError("Superset ORM chart sync must run inside the Superset pod.") from exc

        try:
            for key, dashboard_config in dashboards.items():
                if not dashboard_config.get("enabled", False):
                    print(f"[skip] {key} is disabled")
                    continue

                print(f"[sync] dashboard {key}")
                dataset_ids: dict[str, int] = {}
                for dataset_name in dashboard_config.get("datasets", []):
                    dataset_ids[dataset_name] = ensure_dataset(client, dataset_name, database_id)
                    print(f"  [ok] dataset {dataset_name} -> {dataset_ids[dataset_name]}")

                chart_refs: list[dict[str, Any]] = []
                for chart in dashboard_config.get("charts", []):
                    if not chart.get("enabled", True):
                        print(f"  [skip] chart {chart['key']} is disabled")
                        continue

                    dataset_name = chart["dataset"]
                    dataset_id = dataset_ids[dataset_name]
                    chart_ref = ensure_chart_orm(chart, dataset_id)
                    chart_ref["key"] = chart["key"]
                    chart_refs.append(chart_ref)

                dashboard_ref = ensure_dashboard_orm(dashboard_config, chart_refs, dataset_ids)
                print(
                    f"[ok] dashboard url -> "
                    f"{os.getenv('SUPERSET_EMBED_URL', os.getenv('SUPERSET_URL', 'http://localhost:8088')).rstrip('/')}"
                    f"/superset/dashboard/{dashboard_ref['slug']}/"
                )

            db.session.commit()
        except Exception:
            db.session.rollback()
            raise


def main(argv: list[str]) -> int:
    config_path = Path(argv[1]).resolve() if len(argv) > 1 else DEFAULT_CONFIG_PATH
    sync_dashboards(config_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
