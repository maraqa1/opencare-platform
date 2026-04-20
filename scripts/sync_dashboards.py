#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
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
            with request.urlopen(http_request, timeout=30) as response:
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


def dataset_payload(dataset_name: str) -> dict[str, Any]:
    schema_name, table_name = dataset_name.split(".", 1)
    return {
        "database": int(os.getenv("SUPERSET_DATABASE_ID", "1")),
        "schema": schema_name,
        "table_name": table_name,
        "sql": f"select * from {quote_sql_identifier(dataset_name)}",
    }


def chart_payload(chart_config: dict[str, Any], dataset_id: int) -> dict[str, Any]:
    params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": chart_config["viz_type"],
        "groupby": chart_config.get("group_by", []),
        "metrics": chart_config.get("metrics", []),
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


def ensure_dataset(client: SupersetClient, dataset_name: str) -> int:
    schema_name, table_name = dataset_name.split(".", 1)
    query = parse.quote(json.dumps({"filters": [{"col": "table_name", "opr": "eq", "value": table_name}]}))
    result = client.get(f"/api/v1/dataset/?q={query}")
    existing = find_existing(result, "table_name", table_name)
    payload = dataset_payload(dataset_name)
    if existing:
        client.put(f"/api/v1/dataset/{existing['id']}", payload)
        return int(existing["id"])

    created = client.post("/api/v1/dataset/", payload)
    return int(created["id"])


def ensure_chart(client: SupersetClient, chart_config: dict[str, Any], dataset_id: int) -> int:
    query = parse.quote(json.dumps({"filters": [{"col": "slice_name", "opr": "eq", "value": chart_config["title"]}]}))
    result = client.get(f"/api/v1/chart/?q={query}")
    existing = find_existing(result, "slice_name", chart_config["title"])
    payload = chart_payload(chart_config, dataset_id)
    if existing:
        client.put(f"/api/v1/chart/{existing['id']}", payload)
        return int(existing["id"])

    created = client.post("/api/v1/chart/", payload)
    return int(created["id"])


def ensure_dashboard(
    client: SupersetClient,
    dashboard_config: dict[str, Any],
    chart_ids: list[int],
) -> None:
    slug = dashboard_config["dashboard_id"]
    query = parse.quote(json.dumps({"filters": [{"col": "slug", "opr": "eq", "value": slug}]}))
    result = client.get(f"/api/v1/dashboard/?q={query}")
    existing = find_existing(result, "slug", slug)

    position_data = {
        chart_config["key"]: {
            "meta": {
                "chartId": chart_id,
                "sliceName": chart_config["title"],
            },
            "type": "CHART",
        }
        for chart_config, chart_id in zip(dashboard_config.get("charts", []), chart_ids, strict=False)
    }

    payload = {
        "dashboard_title": dashboard_config["title"],
        "slug": slug,
        "published": True,
        "position_json": json.dumps(position_data),
        "json_metadata": json.dumps(
            {
                "native_filter_configuration": dashboard_config.get("filters", []),
            }
        ),
        "charts": chart_ids,
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

    for key, dashboard_config in dashboards.items():
        if not dashboard_config.get("enabled", False):
            print(f"[skip] {key} is disabled")
            continue

        print(f"[sync] dashboard {key}")
        dataset_ids: dict[str, int] = {}
        for dataset_name in dashboard_config.get("datasets", []):
            dataset_ids[dataset_name] = ensure_dataset(client, dataset_name)

        chart_ids: list[int] = []
        for chart in dashboard_config.get("charts", []):
            if not chart.get("enabled", True):
                print(f"  [skip] chart {chart['key']} is disabled")
                continue

            dataset_name = chart["dataset"]
            dataset_id = dataset_ids[dataset_name]
            chart_id = ensure_chart(client, chart, dataset_id)
            chart_ids.append(chart_id)
            print(f"  [ok] chart {chart['title']} -> {chart_id}")

        ensure_dashboard(client, dashboard_config, chart_ids)
        print(f"[ok] dashboard {dashboard_config['title']}")


def main(argv: list[str]) -> int:
    config_path = Path(argv[1]).resolve() if len(argv) > 1 else DEFAULT_CONFIG_PATH
    sync_dashboards(config_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
