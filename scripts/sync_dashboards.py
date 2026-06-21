#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
import uuid
from copy import deepcopy
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib import error, parse, request

import yaml


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT_DIR / "dbt" / "opencare" / "models" / "metadata" / "dashboard_config.yml"


class SafeFormatDict(dict[str, Any]):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


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


def analytics_query_one(sql: str) -> dict[str, Any] | None:
    try:
        import psycopg2

        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            dbname=os.getenv("POSTGRES_DB", "opencare"),
            user=os.getenv("POSTGRES_USER", "opencare"),
            password=os.getenv("POSTGRES_PASSWORD", ""),
            options="-csearch_path=analytics,public",
        )
        try:
            cur = conn.cursor()
            cur.execute(sql)
            row = cur.fetchone()
            if row is None:
                return None
            columns = [column[0] for column in cur.description]
            return dict(zip(columns, row))
        finally:
            conn.close()
    except Exception:
        return None


def human_date(value: Any) -> str:
    if value is None:
        return "Unknown date"
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    if isinstance(value, date):
        return value.strftime("%d %b %Y")
    try:
        return datetime.fromisoformat(str(value)).strftime("%d %b %Y")
    except ValueError:
        return str(value)


def coerce_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def absolute_time_range(start_date: date, end_date: date) -> str:
    return f"{start_date.isoformat()} : {end_date.isoformat()}"


def plural_phrase(count: int, singular: str, plural: str) -> str:
    return singular if count == 1 else plural


def join_phrases(parts: list[str]) -> str:
    clean_parts = [part for part in parts if part]
    if not clean_parts:
        return "ongoing monitoring"
    if len(clean_parts) == 1:
        return clean_parts[0]
    if len(clean_parts) == 2:
        return f"{clean_parts[0]} and {clean_parts[1]}"
    return ", ".join(clean_parts[:-1]) + f", and {clean_parts[-1]}"


def bed_pressure_dashboard_context() -> dict[str, Any]:
    fallback_context = {
        "as_of_date": "Latest available snapshot",
        "network_occupancy_rate_pct": "0.0",
        "network_available_beds": 0,
        "critical_ward_count": 0,
        "warning_ward_count": 0,
        "normal_ward_count": 0,
        "ward_count": 0,
        "peak_ward_occupancy_pct": "0.0",
        "admissions_total": 0,
        "discharges_total": 0,
        "net_flow": 0,
        "capacity_status": "Operational view loading",
        "capacity_status_lower": "operationally stable",
        "bed_reserve_status": "Reserve position loading",
        "net_flow_status": "Flow status loading",
        "critical_phrase": "No critical wards are currently flagged",
        "warning_phrase": "no warning wards are currently flagged",
        "management_focus": "ongoing monitoring",
        "latest_7d_range": "No filter",
        "latest_30d_range": "No filter",
    }
    latest_summary = analytics_query_one(
        """
        select
            date_day,
            network_occupancy_rate_pct,
            network_available_beds,
            critical_ward_count,
            warning_ward_count,
            normal_ward_count,
            admissions_total,
            discharges_total,
            net_flow,
            peak_ward_occupancy_pct,
            ward_count
        from analytics.fct_bed_pressure_latest_summary
        limit 1
        """
    )
    if not latest_summary:
        return fallback_context

    network_occupancy_rate_pct = float(latest_summary.get("network_occupancy_rate_pct") or 0)
    network_available_beds = int(latest_summary.get("network_available_beds") or 0)
    critical_ward_count = int(latest_summary.get("critical_ward_count") or 0)
    warning_ward_count = int(latest_summary.get("warning_ward_count") or 0)
    normal_ward_count = int(latest_summary.get("normal_ward_count") or 0)
    net_flow = int(latest_summary.get("net_flow") or 0)
    latest_date = coerce_date(latest_summary.get("date_day"))
    latest_7d_range = (
        absolute_time_range(latest_date - timedelta(days=6), latest_date)
        if latest_date
        else "No filter"
    )
    latest_30d_range = (
        absolute_time_range(latest_date - timedelta(days=29), latest_date)
        if latest_date
        else "No filter"
    )

    if network_occupancy_rate_pct >= 95:
        capacity_status = "Critical pressure"
        capacity_status_lower = "critical"
    elif network_occupancy_rate_pct >= 85:
        capacity_status = "High pressure"
        capacity_status_lower = "tightening"
    else:
        capacity_status = "Elevated but controlled"
        capacity_status_lower = "manageable"

    if network_available_beds >= 40:
        bed_reserve_status = "Operational reserve available"
    elif network_available_beds >= 20:
        bed_reserve_status = "Reserve tightening"
    else:
        bed_reserve_status = "Reserve constrained"

    if net_flow > 0:
        net_flow_status = "Pressure increasing"
    elif net_flow < 0:
        net_flow_status = "Pressure easing"
    else:
        net_flow_status = "Flow balanced"

    focus_areas: list[str] = []
    if critical_ward_count > 0:
        focus_areas.append("full-capacity wards")
    if net_flow >= 0:
        focus_areas.append("discharge acceleration")
    if warning_ward_count > 0:
        focus_areas.append("preventing warning wards from becoming critical")

    return {
        "as_of_date": human_date(latest_summary.get("date_day")),
        "network_occupancy_rate_pct": f"{network_occupancy_rate_pct:.1f}",
        "network_available_beds": network_available_beds,
        "critical_ward_count": critical_ward_count,
        "warning_ward_count": warning_ward_count,
        "normal_ward_count": normal_ward_count,
        "ward_count": int(latest_summary.get("ward_count") or 0),
        "peak_ward_occupancy_pct": f"{float(latest_summary.get('peak_ward_occupancy_pct') or 0):.1f}",
        "admissions_total": int(latest_summary.get("admissions_total") or 0),
        "discharges_total": int(latest_summary.get("discharges_total") or 0),
        "net_flow": net_flow,
        "capacity_status": capacity_status,
        "capacity_status_lower": capacity_status_lower,
        "bed_reserve_status": bed_reserve_status,
        "net_flow_status": net_flow_status,
        "critical_phrase": (
            f"{critical_ward_count} "
            f"{plural_phrase(critical_ward_count, 'ward is', 'wards are')} at critical pressure"
        ),
        "warning_phrase": (
            f"{warning_ward_count} "
            f"{plural_phrase(warning_ward_count, 'ward is', 'wards are')} approaching escalation thresholds"
        ),
        "management_focus": join_phrases(focus_areas),
        "latest_7d_range": latest_7d_range,
        "latest_30d_range": latest_30d_range,
    }


def dashboard_context(dashboard_key: str) -> dict[str, Any]:
    if dashboard_key == "bed_pressure":
        return bed_pressure_dashboard_context()
    return {}


def render_template_string(template: str, context: dict[str, Any]) -> str:
    return template.format_map(SafeFormatDict(context))


def render_templates(value: Any, context: dict[str, Any]) -> Any:
    if isinstance(value, str):
        return render_template_string(value, context)
    if isinstance(value, list):
        return [render_templates(item, context) for item in value]
    if isinstance(value, dict):
        return {key: render_templates(item, context) for key, item in value.items()}
    return value


def render_dashboard_config(dashboard_key: str, dashboard_config: dict[str, Any]) -> dict[str, Any]:
    context = dashboard_context(dashboard_key)
    rendered = render_templates(deepcopy(dashboard_config), context)
    rendered["context"] = context
    return rendered


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
    expression_type = (
        metric_spec.get("expressionType", metric_spec.get("expression_type"))
        if isinstance(metric_spec, dict)
        else None
    )
    if expression_type == "SQL":
        sql_expression = metric_spec.get("sqlExpression", metric_spec.get("sql_expression"))
        if not sql_expression:
            raise RuntimeError(f"SQL metric '{metric_name}' is missing sqlExpression")
        label = metric_spec.get("label", metric_name.replace("_", " ").title())
        return {
            "expressionType": "SQL",
            "sqlExpression": sql_expression,
            "label": label,
            "hasCustomLabel": True,
            "optionName": f"metric_{metric_name}",
        }

    metric_map = {
        "avg_occupancy_rate": ("occupancy_rate", "AVG", "Average Occupancy Rate"),
        "current_occupancy_rate": ("occupancy_rate", "AVG", "Current Occupancy Rate"),
        "occupancy_rate_pct": ("occupancy_rate_pct", "AVG", "Ward Occupancy Rate"),
        "current_occupancy_pct": ("current_occupancy_pct", "MAX", "Current Occupancy"),
        "network_occupancy_rate_pct": ("network_occupancy_rate_pct", "MAX", "Network Occupancy Rate"),
        "avg_ward_occupancy_pct": ("avg_ward_occupancy_pct", "MAX", "Average Ward Occupancy"),
        "peak_ward_occupancy_pct": ("peak_ward_occupancy_pct", "MAX", "Peak Ward Occupancy"),
        "network_occupied_beds": ("network_occupied_beds", "MAX", "Occupied Beds"),
        "network_staffed_beds": ("network_staffed_beds", "MAX", "Staffed Beds"),
        "network_available_beds": ("network_available_beds", "MAX", "Available Beds"),
        "available_beds": ("available_beds", "MAX", "Beds Available"),
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


def metric_label(metric: dict[str, Any]) -> str:
    return str(metric.get("label", "Metric"))


def is_bubble_chart(viz_type: str) -> bool:
    return viz_type in {"echarts_bubble", "bubble_v2"}


def is_box_plot_chart(viz_type: str) -> bool:
    return viz_type in {"echarts_boxplot", "box_plot"}


def is_treemap_chart(viz_type: str) -> bool:
    return viz_type in {"echarts_treemap", "treemap_v2"}


def bubble_metrics(chart_config: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        adhoc_metric(chart_config["bubble_size"]),
        adhoc_metric(chart_config["bubble_x"]),
        adhoc_metric(chart_config["bubble_y"]),
    ]


def chart_columns(chart_config: dict[str, Any]) -> list[Any]:
    if chart_config.get("query_columns") is not None:
        return list(chart_config.get("query_columns", []))
    if is_bubble_chart(chart_config["viz_type"]):
        columns = [chart_config["bubble_entity"]]
        bubble_series = chart_config.get("bubble_series")
        if bubble_series and bubble_series not in columns:
            columns.append(bubble_series)
        return columns
    if chart_config.get("columns") is not None:
        return list(chart_config.get("columns", []))
    x_axis = chart_config.get("x_axis")
    group_by = chart_config.get("group_by", [])
    return [x_axis] if x_axis else group_by


def chart_metrics(chart_config: dict[str, Any]) -> list[dict[str, Any]]:
    if is_bubble_chart(chart_config["viz_type"]):
        return bubble_metrics(chart_config)
    metric_specs = chart_config.get("metrics", [])
    return [adhoc_metric(metric_spec) for metric_spec in metric_specs]


def chart_params(
    chart_config: dict[str, Any],
    dataset_id: int,
    metrics: list[dict[str, Any]],
    columns: list[Any],
    time_range: str,
) -> dict[str, Any]:
    group_by = chart_config.get("group_by", [])
    params: dict[str, Any] = {
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
    x_axis = chart_config.get("x_axis")
    if x_axis:
        params["x_axis"] = x_axis
    if chart_config.get("columns") is not None:
        params["columns"] = columns
    if metrics and chart_config["viz_type"] in {
        "big_number_total",
        "big_number",
        "pie",
    }:
        params["metric"] = metrics[0]
    if is_treemap_chart(chart_config["viz_type"]) and metrics:
        params["metric"] = metrics[0]
    if is_bubble_chart(chart_config["viz_type"]):
        params.update(
            {
                "entity": chart_config["bubble_entity"],
                "series": chart_config.get("bubble_series"),
                "x": metrics[1],
                "y": metrics[2],
                "size": metrics[0],
            }
        )
    return deep_merge(params, chart_config.get("form_data", {}))


def chart_query(
    chart_config: dict[str, Any],
    metrics: list[dict[str, Any]],
    columns: list[Any],
    time_range: str,
) -> dict[str, Any]:
    group_by = chart_config.get("group_by", [])
    query: dict[str, Any] = {
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
    if chart_config["viz_type"] == "big_number" and not chart_config.get("x_axis"):
        query["is_timeseries"] = True
    if is_bubble_chart(chart_config["viz_type"]):
        query["columns"] = columns
        query["metrics"] = metrics
        bubble_order_metric = chart_config.get("bubble_order_metric")
        if bubble_order_metric:
            order_map = {"size": metrics[0], "x": metrics[1], "y": metrics[2]}
            metric_ref = order_map.get(str(bubble_order_metric), metrics[0])
            query["orderby"] = [[metric_ref, not bool(chart_config.get("sort_desc", True))]]
    if is_box_plot_chart(chart_config["viz_type"]):
        query["columns"] = columns + group_by
        query["series_columns"] = group_by
        query["post_processing"] = [
            {
                "operation": "boxplot",
                "options": {
                    "whisker_type": str(chart_config.get("whisker_type", "tukey")),
                    "groupby": [str(column) for column in group_by],
                    "metrics": [metric_label(metric) for metric in metrics],
                },
            }
        ]
    if is_treemap_chart(chart_config["viz_type"]) and chart_config.get("sort_by_metric", False):
        query["orderby"] = [[metrics[0], False]]
    return deep_merge(query, chart_config.get("query_overrides", {}))


def chart_payload(chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    metrics = chart_metrics(chart_config)
    columns = chart_columns(chart_config)
    time_range = chart_config.get("time_range", "No filter")
    params = chart_params(chart_config, dataset_id, metrics, columns, time_range)
    query_context = {
        "datasource": {"id": dataset_id, "type": "table"},
        "force": False,
        "queries": [chart_query(chart_config, metrics, columns, time_range)],
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
    dataset_names = filter_config.get("target_datasets")
    if not dataset_names:
        dataset_name = filter_config.get("target_dataset")
        dataset_names = [dataset_name] if dataset_name else []
    valid_dataset_names = [dataset_name for dataset_name in dataset_names if dataset_name in dataset_ids]
    if not valid_dataset_names:
        return None

    column_by_dataset = filter_config.get("columns_by_dataset", {})
    chart_scope = filter_config.get("chart_scope")
    scoped_charts = (
        [chart_ref for chart_ref in chart_refs if chart_ref.get("key") in chart_scope]
        if isinstance(chart_scope, list) and chart_scope
        else chart_refs
    )
    chart_ids = [int(chart_ref["id"]) for chart_ref in scoped_charts]
    filter_key = re.sub(r"[^A-Za-z0-9]+", "_", str(filter_config.get("key", "filter"))).upper()
    filter_type = "filter_time" if filter_config.get("control") == "date_range" else "filter_select"
    default_label = filter_config.get("default_label") or ("All wards" if filter_key == "WARD" else "All")

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
            "filterState": {"label": default_label, "value": None},
            "ownState": {},
        }
        control_values = {
            "enableEmptyFilter": False,
            "defaultToFirstItem": False,
            "multiSelect": filter_config.get("control") == "multi_select",
            "searchAllOptions": bool(filter_config.get("searchable", False)),
            "inverseSelection": False,
            "placeholder": filter_config.get("placeholder", default_label),
        }

    targets = [
        {
            "datasetId": dataset_ids[dataset_name],
            "column": {"name": column_by_dataset.get(dataset_name, filter_config["column"])},
        }
        for dataset_name in valid_dataset_names
    ]

    return {
        "id": f"NATIVE_FILTER-{filter_key}",
        "name": filter_config.get("label", filter_config.get("key", "Filter")),
        "filterType": filter_type,
        "targets": targets,
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
    metadata = {
        "default_filters": "{}",
        "expanded_slices": {},
        "timed_refresh_immune_slices": [],
        "native_filter_configuration": native_filters,
    }
    filter_bar_orientation = dashboard_config.get("filter_bar_orientation")
    if filter_bar_orientation:
        metadata["filter_bar_orientation"] = filter_bar_orientation
    return metadata


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
    markdown_components = dashboard_config.get("markdowns", [])
    rows: dict[int, list[dict[str, Any]]] = {}
    for chart_config, chart_ref in zip(enabled_charts, chart_refs):
        layout = chart_config.get("layout", {})
        rows.setdefault(int(layout.get("y", 0)), []).append(
            {"kind": "chart", "config": chart_config, "ref": chart_ref}
        )
    for markdown_config in markdown_components:
        layout = markdown_config.get("layout", {})
        rows.setdefault(int(layout.get("y", 0)), []).append({"kind": "markdown", "config": markdown_config})

    uses_tabbed_layout = bool(dashboard_config.get("layout_mode") == "tabbed")
    position_data: dict[str, Any] = {"DASHBOARD_VERSION_KEY": "v2"}
    if uses_tabbed_layout:
        tabs_id = dashboard_config.get("tabs_id", "TABS-bed-pressure")
        tab_id = dashboard_config.get("tab_id", "TAB-bed-pressure-overview")
        position_data.update(
            {
                "ROOT_ID": {
                    "type": "ROOT",
                    "id": "ROOT_ID",
                    "children": [tabs_id],
                },
                "GRID_ID": {
                    "type": "GRID",
                    "id": "GRID_ID",
                    "children": [],
                    "parents": ["ROOT_ID"],
                },
                "HEADER_ID": {
                    "type": "HEADER",
                    "id": "HEADER_ID",
                    "meta": {"text": dashboard_config["title"]},
                },
                tabs_id: {
                    "type": "TABS",
                    "id": tabs_id,
                    "children": [tab_id],
                    "parents": ["ROOT_ID"],
                    "meta": {},
                },
                tab_id: {
                    "type": "TAB",
                    "id": tab_id,
                    "children": [],
                    "parents": ["ROOT_ID", tabs_id],
                    "meta": {"text": dashboard_config.get("tab_title", "Overview")},
                },
            }
        )
    else:
        position_data.update(
            {
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
        )

    for row_index, row_y in enumerate(sorted(rows), start=1):
        row_id = f"ROW-{row_index}"
        if uses_tabbed_layout:
            tabs_id = dashboard_config.get("tabs_id", "TABS-bed-pressure")
            tab_id = dashboard_config.get("tab_id", "TAB-bed-pressure-overview")
            position_data[tab_id]["children"].append(row_id)
            row_parents = ["ROOT_ID", tabs_id, tab_id]
        else:
            position_data["GRID_ID"]["children"].append(row_id)
            row_parents = ["ROOT_ID", "GRID_ID"]
        position_data[row_id] = {
            "type": "ROW",
            "id": row_id,
            "children": [],
            "parents": row_parents,
            "meta": {"0": "ROOT_ID", "background": "BACKGROUND_TRANSPARENT"},
        }

        for row_item in sorted(rows[row_y], key=lambda item: int(item["config"].get("layout", {}).get("x", 0))):
            layout = row_item["config"].get("layout", {})
            if row_item["kind"] == "chart":
                chart_config = row_item["config"]
                chart_ref = row_item["ref"]
                chart_id = int(chart_ref["id"])
                chart_component_id = f"CHART-{chart_id}"
                chart_parents = row_parents + [row_id]
                position_data[row_id]["children"].append(chart_component_id)
                position_data[chart_component_id] = {
                    "type": "CHART",
                    "id": chart_component_id,
                    "children": [],
                    "parents": chart_parents,
                    "meta": {
                        "chartId": chart_id,
                        "sliceName": chart_config["title"],
                        "uuid": chart_ref["uuid"],
                        "width": int(layout.get("w", 12)),
                        "height": int(layout.get("h", 12)) * 4,
                    },
                }
                continue

            markdown_config = row_item["config"]
            markdown_id = f"MARKDOWN-{markdown_config['key']}"
            markdown_parents = row_parents + [row_id]
            position_data[row_id]["children"].append(markdown_id)
            position_data[markdown_id] = {
                "type": "MARKDOWN",
                "id": markdown_id,
                "children": [],
                "parents": markdown_parents,
                "meta": {
                    "code": markdown_config["code"],
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

                dashboard_config = render_dashboard_config(key, dashboard_config)
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
