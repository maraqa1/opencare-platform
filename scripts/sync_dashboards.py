#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
import uuid
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
        self.api_opener = request.build_opener()

    def authenticate(self) -> None:
        api_payload = {
            "username": self.username,
            "password": self.password,
            "provider": "db",
            "refresh": True,
        }
        api_response = self._request(
            "POST",
            "/api/v1/security/login",
            payload=api_payload,
            use_auth=False,
        )
        self.access_token = api_response.get("access_token")

        login_page = self._open_raw("GET", "/login/", use_auth=False)
        try:
            csrf_token = extract_csrf_token(login_page)
        except RuntimeError:
            # Demo environments may disable CSRF entirely. In that case the
            # bearer token from the API login is sufficient for write calls.
            self.csrf_token = None
            return
        form_payload = parse.urlencode(
            {
                "username": self.username,
                "password": self.password,
                "csrf_token": csrf_token,
            }
        ).encode("utf-8")
        self._open_raw(
            "POST",
            "/login/",
            payload=form_payload,
            use_auth=False,
            content_type="application/x-www-form-urlencoded",
            referer=f"{self.base_url}/login/",
        )
        welcome_page = self._open_raw("GET", "/superset/welcome/", use_auth=False)
        try:
            self.csrf_token = extract_app_csrf_token(welcome_page)
        except RuntimeError:
            self.csrf_token = None

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
        opener = self.api_opener if use_auth and self.access_token else self.opener
        with opener.open(http_request, timeout=30) as response:
            return response.read().decode("utf-8")


def extract_csrf_token(html: str) -> str:
    match = re.search(r'name="csrf_token"[^>]*value="([^"]+)"', html)
    if not match:
        raise RuntimeError("Superset login page did not include a csrf_token field")
    return match.group(1)


def extract_app_csrf_token(html: str) -> str:
    patterns = (
        r'"csrfToken":"([^"]+)"',
        r'"csrf_token":"([^"]+)"',
        r"'csrfToken':'([^']+)'",
        r"'csrf_token':'([^']+)'",
    )
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return match.group(1)
    if 'name="csrf_token"' in html:
        return extract_csrf_token(html)
    raise RuntimeError("Superset welcome page did not expose an application csrf token")


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
        "recoverable_amount_sum": ("recoverable_amount", "SUM", "Recoverable Amount"),
        "expected_recovery_amount_sum": ("expected_recovery_amount", "SUM", "Expected Recovery Amount"),
        "priority_score_avg": ("priority_score", "AVG", "Average Priority Score"),
        "leakage_amount_sum": ("leakage_amount", "SUM", "Leakage Amount"),
        "outstanding_amount_sum": ("outstanding_amount", "SUM", "Outstanding Amount"),
        "sla_breach_count_sum": ("sla_breach_count", "SUM", "SLA Breach Count"),
        "underpayment_amount_sum": ("underpayment_amount", "SUM", "Underpayment Amount"),
        "actual_recovery_sum": ("actual_recovery", "SUM", "Actual Recovery"),
        "expected_recovery_sum": ("expected_recovery", "SUM", "Expected Recovery"),
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
    metrics = [adhoc_metric(metric_name) for metric_name in chart_config.get("metrics", [])]
    group_by = chart_config.get("group_by", [])
    params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": chart_config["viz_type"],
        "groupby": group_by,
        "metrics": metrics,
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
    payload = dataset_payload(dataset_name, database_id)
    if existing:
        # Superset accepts the database field when a dataset is created, but not
        # on every update path. Existing datasets are safe to reuse by id.
        return int(existing["id"])

    try:
        created = client.post("/api/v1/dataset/", payload)
    except RuntimeError as exc:
        if "already exists" not in str(exc).lower():
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
        "json_metadata": json.dumps(
            {
                "default_filters": "{}",
                "expanded_slices": {},
                "timed_refresh_immune_slices": [],
            }
        ),
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
                    chart_refs.append(chart_ref)

                dashboard_ref = ensure_dashboard_orm(dashboard_config, chart_refs)
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
