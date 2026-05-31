from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
from psycopg.errors import UndefinedColumn, UndefinedTable

from app.db import connect
from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseRuntimeResolver:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def _resolve_record(self, slug: str) -> dict[str, Any]:
        record = self.storage.get_active_package_by_slug(slug)
        if record is None:
            raise KeyError(slug)
        return record

    def _ensure_runtime_active(
        self,
        record: dict[str, Any],
        *,
        allow_preview: bool = False,
    ) -> None:
        if record.get("materialization_status") != "materialized" and not allow_preview:
            raise ValueError("Use case workspace is not materialized.")
        if record.get("activation_status") not in {"active", "live_verified"} and not allow_preview:
            raise ValueError("Use case workspace is not active.")

    def get_workspace_definition(self, slug: str) -> dict[str, Any]:
        record = self._resolve_record(slug)
        self._ensure_runtime_active(record)

        runtime_definition = deepcopy(record.get("runtime_definition", {}))
        runtime_definition["state"] = {
            "package_id": record.get("package_id"),
            "version": record.get("version"),
            "materialization_status": record.get("materialization_status"),
            "activation_status": record.get("activation_status"),
            "live_verification_status": record.get("live_verification_status"),
        }
        runtime_definition["smoke_tests"] = deepcopy(record.get("runtime_definition", {}).get("smoke_tests", {}))
        return runtime_definition

    @staticmethod
    def _freshness_meta() -> dict[str, Any]:
        return {
            "sla_status": "pass",
            "last_loaded_at": utc_now_iso(),
            "max_expected_age_hours": 24,
        }

    @staticmethod
    def _serialize(value: object) -> object:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, datetime):
            return value.isoformat() + "Z"
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, UUID):
            return str(value)
        return value

    def _serialize_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {key: self._serialize(value) for key, value in dict(row).items()}

    @staticmethod
    def _binding_error(
        code: str,
        message: str,
        *,
        realized: bool = False,
        detail: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "code": code,
            "message": message,
            "binding_realized": realized,
        }
        if detail:
            payload["detail"] = detail
        return payload

    @staticmethod
    def _package_root(record: dict[str, Any]) -> Path | None:
        for key in ("installed_path", "staged_path"):
            value = str(record.get(key) or "").strip()
            if value:
                path = Path(value)
                if path.is_dir():
                    return path
        return None

    @staticmethod
    def _query_parameter_names(sql_text: str) -> set[str]:
        import re

        named_percent = {match.group(1) for match in re.finditer(r"%\(([A-Za-z_][A-Za-z0-9_]*)\)s", sql_text)}
        named_colon = {match.group(1) for match in re.finditer(r"(?<!:):([A-Za-z_][A-Za-z0-9_]*)", sql_text)}
        return named_percent | named_colon

    def _prepare_query(
        self,
        record: dict[str, Any],
        match: dict[str, Any],
        filters: dict[str, Any],
    ) -> tuple[str | None, dict[str, Any], dict[str, Any] | None]:
        query_ref = str(match.get("query") or "").strip()
        if not query_ref:
            return None, {}, self._binding_error(
                "binding_not_realized",
                "Endpoint binding was compiled without a query reference.",
            )

        package_root = self._package_root(record)
        if package_root is None:
            return None, {}, self._binding_error(
                "binding_not_realized",
                "Package runtime assets are unavailable on disk.",
            )

        query_path = package_root / query_ref
        if not query_path.is_file():
            return None, {}, self._binding_error(
                "binding_not_realized",
                f"Compiled endpoint query is missing: {query_ref}",
            )

        sql_text = query_path.read_text(encoding="utf-8").strip()
        if not sql_text:
            return None, {}, self._binding_error(
                "binding_not_realized",
                f"Compiled endpoint query is empty: {query_ref}",
            )
        if "{{" in sql_text or "{%" in sql_text:
            return None, {}, self._binding_error(
                "binding_not_realized",
                f"Compiled endpoint query still contains unresolved template syntax: {query_ref}",
            )

        parameter_names = self._query_parameter_names(sql_text)
        missing = sorted(name for name in parameter_names if name not in filters)
        if missing:
            return None, {}, self._binding_error(
                "binding_not_realized",
                "Endpoint query requires runtime parameters that were not supplied.",
                detail=", ".join(missing),
            )

        params = {key: value for key, value in filters.items() if key in parameter_names}
        return sql_text, params, None

    def _execute_query_binding(
        self,
        record: dict[str, Any],
        match: dict[str, Any],
        filters: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        sql_text, params, prepare_error = self._prepare_query(record, match, filters)
        if prepare_error:
            return [], prepare_error

        assert sql_text is not None
        try:
            with connect() as conn:
                if params:
                    rows = conn.execute(sql_text, params).fetchall()
                else:
                    rows = conn.execute(sql_text).fetchall()
        except (UndefinedTable, UndefinedColumn) as exc:
            return [], self._binding_error(
                "binding_not_realized",
                "Endpoint query references data assets that are not materialized yet.",
                detail=str(exc),
            )
        except psycopg.Error as exc:
            return [], self._binding_error(
                "runtime_query_failed",
                "Endpoint query failed during runtime execution.",
                realized=True,
                detail=str(exc),
            )

        return [self._serialize_row(row) for row in rows], None

    @staticmethod
    def _normalize_endpoint(endpoint: str) -> str:
        return endpoint if endpoint.startswith("/") else f"/{endpoint}"

    @staticmethod
    def _relative_endpoint(endpoint: str, route_prefix: str | None) -> str:
        normalized_endpoint = UseCaseRuntimeResolver._normalize_endpoint(endpoint)
        normalized_prefix = (route_prefix or "").rstrip("/")
        if normalized_prefix and normalized_endpoint.startswith(normalized_prefix):
            relative = normalized_endpoint[len(normalized_prefix):] or "/"
            return relative if relative.startswith("/") else f"/{relative}"
        return normalized_endpoint

    @staticmethod
    def _route_segment(route: str | None) -> str:
        if not route:
            return ""
        segments = [segment for segment in route.split("/") if segment]
        return segments[-1] if segments else ""

    def _endpoint_binding(self, runtime_definition: dict[str, Any], endpoint: str) -> dict[str, Any]:
        bindings = runtime_definition.get("backend_endpoint_bindings", {})
        endpoints = bindings.get("endpoints", [])
        normalized_endpoint = self._normalize_endpoint(endpoint)
        route_prefix = str(bindings.get("route_prefix") or "").rstrip("/")
        relative_endpoint = self._relative_endpoint(normalized_endpoint, route_prefix)
        match = next(
            (
                candidate
                for candidate in endpoints
                if isinstance(candidate, dict)
                and self._normalize_endpoint(str(candidate.get("path") or "")) in {normalized_endpoint, relative_endpoint}
            ),
            None,
        )
        if match is None:
            raise KeyError(f"Endpoint not found: {normalized_endpoint}")
        return match

    def _build_endpoint_response(
        self,
        record: dict[str, Any],
        runtime_definition: dict[str, Any],
        slug: str,
        endpoint: str,
        filters: dict[str, Any] | None,
        actor: str,
        *,
        log_phi: bool = True,
    ) -> dict[str, Any]:
        bindings = runtime_definition.get("backend_endpoint_bindings", {})
        allowed_filters = bindings.get("filters", [])
        normalized_endpoint = self._normalize_endpoint(endpoint)
        match = self._endpoint_binding(runtime_definition, normalized_endpoint)
        applied_filters = filters or {}
        if isinstance(allowed_filters, list):
            unsupported_filters = sorted(key for key in applied_filters.keys() if key not in allowed_filters)
            if unsupported_filters:
                raise ValueError(
                    f"Unsupported filters for {normalized_endpoint}: {', '.join(unsupported_filters)}"
                )

        rows, binding_error = self._execute_query_binding(record, match, applied_filters)
        meta_payload = {
            "empty": len(rows) == 0,
            "data_freshness": self._freshness_meta(),
            "binding_realized": binding_error is None,
        }
        meta = {
            **meta_payload,
            "empty": bool(meta_payload.get("empty", False)),
            "as_of": utc_now_iso(),
            "use_case_slug": slug,
            "endpoint": normalized_endpoint,
            "filters_applied": applied_filters,
            "materialization_status": record.get("materialization_status"),
            "activation_status": record.get("activation_status"),
            "live_verification_status": record.get("live_verification_status"),
            "data_freshness": meta_payload.get("data_freshness"),
        }

        phi_handling = match.get("phi_handling")
        if phi_handling and log_phi:
            self.storage.record_action(
                package_id=record["package_id"],
                slug=record["slug"],
                version=record["version"],
                actor=actor,
                action="patient-level drilldown access"
                if "drilldown" in normalized_endpoint
                else "restricted PHI attribute access",
                status=record.get("status", "active"),
                validation_result=record.get("package_validation_status"),
                log=f"Runtime endpoint {normalized_endpoint} accessed with PHI policy {phi_handling}.",
                update_package_state=False,
            )

        return {
            "data": rows,
            "meta": meta,
            "errors": [binding_error] if binding_error else [],
            "warnings": [],
        }

    def _find_tab_definition(
        self,
        runtime_definition: dict[str, Any],
        tab_id: str,
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        tabs = runtime_definition.get("tabs", [])
        dashboard_tabs = runtime_definition.get("dashboard_model", {}).get("tabs", [])
        normalized_tab_id = tab_id or "overview"

        def _matches(item: dict[str, Any], index: int) -> bool:
            item_id = item.get("id") or ("overview" if index == 0 else "")
            route_segment = self._route_segment(item.get("route"))
            if index == 0 and normalized_tab_id == "overview":
                return True
            return normalized_tab_id in {item_id, route_segment}

        tab = next(
            (item for index, item in enumerate(tabs) if isinstance(item, dict) and _matches(item, index)),
            None,
        )
        if tab is None:
            raise KeyError(f"Tab not found: {normalized_tab_id}")

        dashboard_tab = next(
            (
                item
                for index, item in enumerate(dashboard_tabs)
                if isinstance(item, dict) and _matches(item, index)
            ),
            None,
        )
        return tab, dashboard_tab

    @staticmethod
    def _widget_state_from_response(response: dict[str, Any]) -> str:
        meta = response.get("meta", {})
        errors = response.get("errors", [])
        data = response.get("data")
        if meta.get("empty"):
            return "empty"
        if errors:
            return "degraded"
        if isinstance(data, list) and len(data) == 0:
            return "empty"
        if isinstance(data, dict) and len(data) == 0:
            return "empty"
        return "rendered"

    def resolve_endpoint(
        self,
        slug: str,
        endpoint: str,
        *,
        filters: dict[str, Any] | None = None,
        actor: str = "anonymous",
        allow_preview: bool = False,
    ) -> dict[str, Any]:
        record = self._resolve_record(slug)
        self._ensure_runtime_active(record, allow_preview=allow_preview)
        runtime_definition = record.get("runtime_definition", {})
        return self._build_endpoint_response(
            record,
            runtime_definition,
            slug,
            endpoint,
            filters,
            actor,
        )

    def get_tab_payload(
        self,
        slug: str,
        tab_id: str,
        *,
        filters: dict[str, Any] | None = None,
        actor: str = "anonymous",
        allow_preview: bool = False,
        log_phi: bool = True,
    ) -> dict[str, Any]:
        record = self._resolve_record(slug)
        self._ensure_runtime_active(record, allow_preview=allow_preview)
        runtime_definition = deepcopy(record.get("runtime_definition", {}))
        tab, dashboard_tab = self._find_tab_definition(runtime_definition, tab_id)
        component_specs = tab.get("component_specs", [])
        widget_models = {
            widget.get("component_id"): widget
            for widget in (dashboard_tab or {}).get("widgets", [])
            if isinstance(widget, dict) and widget.get("component_id")
        }
        endpoint_payloads: dict[str, dict[str, Any]] = {}
        widgets: list[dict[str, Any]] = []

        for component in component_specs:
            if not isinstance(component, dict):
                continue
            component_id = component.get("id")
            endpoint = component.get("source_endpoint") or component.get("endpoint")
            normalized_endpoint = self._normalize_endpoint(endpoint) if endpoint else ""
            widget_model = widget_models.get(component_id, {})

            state = "rendered"
            payload = {
                "data": [],
                "meta": {
                    "empty": False,
                    "as_of": utc_now_iso(),
                    "use_case_slug": slug,
                    "materialization_status": record.get("materialization_status"),
                    "activation_status": record.get("activation_status"),
                    "live_verification_status": record.get("live_verification_status"),
                },
                "errors": [],
                "warnings": [],
            }

            if normalized_endpoint:
                if normalized_endpoint not in endpoint_payloads:
                    endpoint_payloads[normalized_endpoint] = self._build_endpoint_response(
                        record,
                        runtime_definition,
                        slug,
                        normalized_endpoint,
                        filters,
                        actor,
                        log_phi=log_phi,
                    )
                payload = deepcopy(endpoint_payloads[normalized_endpoint])
                state = self._widget_state_from_response(payload)

            widgets.append(
                {
                    "component_id": component_id,
                    "component_type": component.get("component_type"),
                    "widget_kind": widget_model.get("widget_kind"),
                    "endpoint": normalized_endpoint or None,
                    "state": state,
                    "payload": payload,
                }
            )

        return {
            "tab": {
                "id": tab.get("id") or "overview",
                "label": tab.get("label") or "Overview",
                "route": tab.get("route"),
            },
            "widgets": widgets,
            "meta": {
                "as_of": utc_now_iso(),
                "use_case_slug": slug,
                "materialization_status": record.get("materialization_status"),
                "activation_status": record.get("activation_status"),
                "live_verification_status": record.get("live_verification_status"),
                "widget_count": len(widgets),
            },
        }
