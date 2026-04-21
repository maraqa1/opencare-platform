#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any
from http.cookiejar import CookieJar
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
        self.cookie_jar = CookieJar()
        self.opener = request.build_opener(request.HTTPCookieProcessor(self.cookie_jar))

    def authenticate(self) -> None:
        payload = {
            "username": self.username,
            "password": self.password,
            "provider": "db",
            "refresh": True,
        }
        response = self._request(
            "POST",
            "/api/v1/security/login",
            payload=payload,
            use_auth=False,
        )
        self.access_token = response["access_token"]
        csrf_response = self.get("/api/v1/security/csrf_token/")
        self.csrf_token = csrf_response.get("result")

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
            headers["Referer"] = self.base_url

        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        http_request = request.Request(
            url=f"{self.base_url}{path}",
            method=method,
            data=body,
            headers=headers,
        )

        try:
            with self.opener.open(http_request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"{method} {path} failed with {exc.code}: {detail}") from exc


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


def ensure_database(client: SupersetClient) -> int:
    database_name = os.getenv("SUPERSET_DATABASE_NAME", "OpenCare Analytics")
    query = parse.quote(json.dumps({"filters": [{"col": "database_name", "opr": "eq", "value": database_name}]}))
    result = client.get(f"/api/v1/database/?q={query}")
    existing = find_existing(result, "database_name", database_name)

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

    created = client.post("/api/v1/database/", payload)
    result_payload = created.get("result", created)
    return int(result_payload["id"])


def dataset_payload(dataset_name: str, database_id: int) -> dict[str, Any]:
    schema_name, table_name = dataset_name.split(".", 1)
    return {
        "database": database_id,
        "schema": schema_name,
        "table_name": table_name,
    }


def adhoc_metric(metric_name: str) -> dict[str, Any]:
    metric_map = {
        "avg_occupancy_rate": ("occupancy_rate", "AVG", "Average Occupancy Rate"),
        "current_occupancy_rate": ("occupancy_rate", "AVG", "Current Occupancy Rate"),
        "admissions_total": ("occupied_beds", "SUM", "Occupied Beds"),
        "discharges_total": ("available_beds", "SUM", "Available Beds"),
        "staffing_pressure_index": ("staffing_pressure_index", "AVG", "Staffing Pressure Index"),
    }
    column_name, aggregate, label = metric_map.get(metric_name, (metric_name, "AVG", metric_name.replace("_", " ").title()))
    return {
        "expressionType": "SIMPLE",
        "column": {
            "column_name": column_name,
            "type": "NUMERIC",
        },
        "aggregate": aggregate,
        "label": label,
        "optionName": f"metric_{metric_name}",
    }


def chart_payload(chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": chart_config["viz_type"],
        "groupby": chart_config.get("group_by", []),
        "metrics": [adhoc_metric(metric_name) for metric_name in chart_config.get("metrics", [])],
        "granularity_sqla": chart_config.get("time_column"),
        "row_limit": chart_config.get("row_limit", 500),
        "adhoc_filters": [],
        "orderby": [],
        "time_range": "Last 30 days",
    }
    return {
        "slice_name": chart_config["title"],
        "viz_type": chart_config["viz_type"],
        "datasource_id": dataset_id,
        "datasource_type": "table",
        "params": json.dumps(params),
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
    payload = dataset_payload(dataset_name, database_id)
    if existing:
        # Superset accepts the database field when a dataset is created, but not
        # on every update path. Existing datasets are safe to reuse by id.
        return int(existing["id"])

    created = client.post("/api/v1/dataset/", payload)
    created_id = response_id(created)
    if created_id is not None:
        return created_id

    result = client.get(f"/api/v1/dataset/?q={query}")
    existing = find_existing(result, "table_name", table_name)
    if existing:
        return int(existing["id"])
    raise RuntimeError(f"Superset created dataset {dataset_name} but did not return an id")


def get_chart_uuid(client: SupersetClient, chart_id: int) -> str:
    chart = client.get(f"/api/v1/chart/{chart_id}")
    result_payload = chart.get("result", chart)
    chart_uuid = result_payload.get("uuid")
    if not chart_uuid:
        raise RuntimeError(f"Superset chart {chart_id} did not return a uuid")
    return str(chart_uuid)


def ensure_chart(client: SupersetClient, chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    query = parse.quote(json.dumps({"filters": [{"col": "slice_name", "opr": "eq", "value": chart_config["title"]}]}))
    result = client.get(f"/api/v1/chart/?q={query}")
    existing = find_existing(result, "slice_name", chart_config["title"])
    payload = chart_payload(chart_config, dataset_id)
    if existing:
        client.put(f"/api/v1/chart/{existing['id']}", payload)
        chart_id = int(existing["id"])
        return {"id": chart_id, "uuid": get_chart_uuid(client, chart_id), "title": chart_config["title"]}

    created = client.post("/api/v1/chart/", payload)
    created_id = response_id(created)
    if created_id is not None:
        return {"id": created_id, "uuid": get_chart_uuid(client, created_id), "title": chart_config["title"]}

    result = client.get(f"/api/v1/chart/?q={query}")
    existing = find_existing(result, "slice_name", chart_config["title"])
    if existing:
        chart_id = int(existing["id"])
        return {"id": chart_id, "uuid": get_chart_uuid(client, chart_id), "title": chart_config["title"]}
    raise RuntimeError(f"Superset created chart {chart_config['title']} but did not return an id")


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


def ensure_dashboard(
    client: SupersetClient,
    dashboard_config: dict[str, Any],
    chart_refs: list[dict[str, Any]],
) -> None:
    slug = dashboard_config["dashboard_id"]
    query = parse.quote(json.dumps({"filters": [{"col": "slug", "opr": "eq", "value": slug}]}))
    result = client.get(f"/api/v1/dashboard/?q={query}")
    existing = find_existing(result, "slug", slug)

    payload = {
        "dashboard_title": dashboard_config["title"],
        "slug": slug,
        "published": True,
        "position_json": json.dumps(dashboard_position_data(dashboard_config, chart_refs)),
        "json_metadata": json.dumps(
            {
                "default_filters": "{}",
                "expanded_slices": {},
                "timed_refresh_immune_slices": [],
            }
        ),
    }

    if existing:
        client.put(f"/api/v1/dashboard/{existing['id']}", payload)
    else:
        client.post("/api/v1/dashboard/", payload)


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
            chart_ref = ensure_chart(client, chart, dataset_id)
            chart_refs.append(chart_ref)
            print(f"  [ok] chart {chart['title']} -> {chart_ref['id']}")

        ensure_dashboard(client, dashboard_config, chart_refs)
        print(f"[ok] dashboard {dashboard_config['title']}")


def main(argv: list[str]) -> int:
    config_path = Path(argv[1]).resolve() if len(argv) > 1 else DEFAULT_CONFIG_PATH
    sync_dashboards(config_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
