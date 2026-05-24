from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseRuntimeResolver:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def _resolve_record(self, slug: str) -> dict[str, Any]:
        record = self.storage.get_active_package_by_slug(slug)
        if record is None:
            raise KeyError(slug)
        return record

    def get_workspace_definition(self, slug: str) -> dict[str, Any]:
        record = self._resolve_record(slug)
        if record.get("materialization_status") != "materialized":
            raise ValueError("Use case workspace is not materialized.")
        if record.get("activation_status") not in {"active", "live_verified"}:
            raise ValueError("Use case workspace is not active.")

        runtime_definition = deepcopy(record.get("runtime_definition", {}))
        runtime_definition["state"] = {
            "package_id": record.get("package_id"),
            "version": record.get("version"),
            "materialization_status": record.get("materialization_status"),
            "activation_status": record.get("activation_status"),
            "live_verification_status": record.get("live_verification_status"),
        }
        return runtime_definition

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
        if record.get("materialization_status") != "materialized" and not allow_preview:
            raise ValueError("Use case endpoints are not materialized.")
        if record.get("activation_status") not in {"active", "live_verified"} and not allow_preview:
            raise ValueError("Use case is not active.")

        runtime_definition = record.get("runtime_definition", {})
        bindings = runtime_definition.get("backend_endpoint_bindings", {})
        endpoints = bindings.get("endpoints", [])
        normalized_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        match = next(
            (
                candidate
                for candidate in endpoints
                if isinstance(candidate, dict) and candidate.get("path") == normalized_endpoint
            ),
            None,
        )
        if match is None:
            raise KeyError(f"Endpoint not found: {normalized_endpoint}")

        applied_filters = filters or {}
        allowed_filters = bindings.get("filters", [])
        if isinstance(allowed_filters, list):
            unsupported_filters = sorted(
                key for key in applied_filters.keys() if key not in allowed_filters
            )
            if unsupported_filters:
                raise ValueError(
                    f"Unsupported filters for {normalized_endpoint}: {', '.join(unsupported_filters)}"
                )
        response_patterns = bindings.get("response_patterns", {})
        empty_payload = response_patterns.get("empty", {"data": []})
        data = empty_payload.get("data", [])
        meta = {
            **(empty_payload.get("meta", {}) if isinstance(empty_payload.get("meta"), dict) else {}),
            "empty": True,
            "as_of": utc_now_iso(),
            "use_case_slug": slug,
            "endpoint": normalized_endpoint,
            "filters_applied": applied_filters,
            "materialization_status": record.get("materialization_status"),
            "data_freshness": None,
        }

        phi_handling = match.get("phi_handling")
        if phi_handling:
            self.storage.record_action(
                package_id=record["package_id"],
                slug=record["slug"],
                version=record["version"],
                actor=actor,
                action="patient-level drilldown access" if "drilldown" in normalized_endpoint else "restricted PHI attribute access",
                status=record.get("status", "active"),
                validation_result=record.get("package_validation_status"),
                log=f"Runtime endpoint {normalized_endpoint} accessed with PHI policy {phi_handling}.",
            )

        return {
            "data": data,
            "meta": meta,
            "errors": [],
            "warnings": [],
        }
