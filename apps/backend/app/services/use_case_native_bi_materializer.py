from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseNativeBIMaterializer:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def plan(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self.storage.get_package(package_id)
        if record is None:
            raise KeyError(package_id)
        runtime_definition = record.get("runtime_definition", {})
        if not isinstance(runtime_definition, dict) or not runtime_definition:
            raise ValueError("Package must be compiled before planning materialization.")

        plan = {
            "workspace_route": runtime_definition.get("workspace_route"),
            "tabs": [tab.get("id") for tab in runtime_definition.get("tabs", []) if isinstance(tab, dict)],
            "endpoints": [
                endpoint.get("path")
                for endpoint in runtime_definition.get("backend_endpoint_bindings", {}).get("endpoints", [])
                if isinstance(endpoint, dict)
            ],
            "required_components": sum(
                len(tab.get("components", []))
                for tab in runtime_definition.get("tabs", [])
                if isinstance(tab, dict) and isinstance(tab.get("components"), list)
            ),
            "smoke_tests": {
                "route_checks": len(runtime_definition.get("smoke_tests", {}).get("route_checks", []))
                if isinstance(runtime_definition.get("smoke_tests"), dict)
                else 0,
                "endpoint_checks": len(runtime_definition.get("smoke_tests", {}).get("endpoint_checks", []))
                if isinstance(runtime_definition.get("smoke_tests"), dict)
                else 0,
                "component_render_checks": len(runtime_definition.get("smoke_tests", {}).get("component_render_checks", []))
                if isinstance(runtime_definition.get("smoke_tests"), dict)
                else 0,
            },
            "renderer_capabilities": runtime_definition.get("rendering", {}).get("required_runtime_capabilities", {}),
        }
        record["materialization_status"] = "materialization_planned"
        record["materialization_report"] = {
            "status": "materialization_planned",
            "plan": plan,
            "checked_at": utc_now_iso(),
            "blocking_errors": runtime_definition.get("blocking_errors", []),
            "warnings": runtime_definition.get("warnings", []),
        }
        record["status"] = "materialization_planned"
        record["last_action"] = "plan-materialization"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="plan-materialization",
            status="materialization_planned",
            validation_result=record.get("package_validation_status"),
            log="Materialization plan created from compiled runtime definition.",
        )
        return deepcopy(record)

    def materialize(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self.storage.get_package(package_id)
        if record is None:
            raise KeyError(package_id)
        runtime_definition = record.get("runtime_definition", {})
        if not isinstance(runtime_definition, dict) or not runtime_definition:
            raise ValueError("Package must be compiled before materialization.")
        materialization_mode = record.get("compile_report", {}).get("materialization_mode") or record.get("preview_summary", {}).get("install_impact", {}).get("materialization_mode")
        if materialization_mode != "full_runtime":
            raise ValueError("Package is previewable but not eligible for strict live materialization.")
        if runtime_definition.get("blocking_errors"):
            record["materialization_status"] = "materialization_failed"
            record["activation_status"] = "staged"
            record["status"] = "materialization_failed"
            record["last_error"] = "; ".join(runtime_definition.get("blocking_errors", []))
            self.storage.upsert_package(record)
            self.storage.record_action(
                package_id=package_id,
                slug=record["slug"],
                version=record["version"],
                actor=actor,
                action="materialize",
                status="materialization_failed",
                validation_result=record.get("package_validation_status"),
                log="Materialization blocked by compile errors.",
                error_message=record["last_error"],
            )
            return deepcopy(record)

        materialized_registry = {
            "workspace_route": runtime_definition.get("workspace_route"),
            "tabs": runtime_definition.get("tabs", []),
            "pages": list(runtime_definition.get("pages", {}).keys()),
            "components": list(runtime_definition.get("components", {}).keys()),
            "endpoint_bindings": runtime_definition.get("backend_endpoint_bindings", {}).get("endpoints", []),
            "governance_bindings": list(runtime_definition.get("governance_bindings", {}).keys()),
            "smoke_tests": runtime_definition.get("smoke_tests", {}),
        }
        record["materialization_status"] = "materialized"
        record["activation_status"] = "activation_ready"
        record["status"] = "materialized"
        record["materialization_report"] = {
            "status": "materialized",
            "registry": materialized_registry,
            "checked_at": utc_now_iso(),
            "warnings": runtime_definition.get("warnings", []),
        }
        record["last_action"] = "materialize"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="materialize",
            status="materialized",
            validation_result=record.get("package_validation_status"),
            log="Runtime definition materialized into live workspace and endpoint registry.",
        )
        return deepcopy(record)

    def verify_live(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self.storage.get_package(package_id)
        if record is None:
            raise KeyError(package_id)
        if record.get("activation_status") != "active":
            raise ValueError("Package must be active before live verification.")

        runtime_definition = record.get("runtime_definition", {})
        tabs = runtime_definition.get("tabs", [])
        endpoints = runtime_definition.get("backend_endpoint_bindings", {}).get("endpoints", [])
        phi_rules = runtime_definition.get("phi_masking_rules", {})
        governance = runtime_definition.get("governance_bindings", {})

        checks = {
            "workspace_route_registered": bool(runtime_definition.get("workspace_route")),
            "tabs_renderable": bool(tabs),
            "endpoint_bindings_resolved": bool(endpoints),
            "phi_rules_present": bool(phi_rules),
            "governance_links_present": bool(governance),
            "route_smoke_tests_declared": bool(runtime_definition.get("smoke_tests", {}).get("route_checks", []))
            if isinstance(runtime_definition.get("smoke_tests"), dict)
            else False,
            "endpoint_smoke_tests_declared": bool(runtime_definition.get("smoke_tests", {}).get("endpoint_checks", []))
            if isinstance(runtime_definition.get("smoke_tests"), dict)
            else False,
            "component_render_checks_declared": bool(runtime_definition.get("smoke_tests", {}).get("component_render_checks", []))
            if isinstance(runtime_definition.get("smoke_tests"), dict)
            else False,
            "phi_masking_checks_declared": bool(runtime_definition.get("smoke_tests", {}).get("phi_masking_checks", []))
            if isinstance(runtime_definition.get("smoke_tests"), dict)
            else False,
            "governance_link_checks_declared": bool(runtime_definition.get("smoke_tests", {}).get("governance_link_checks", []))
            if isinstance(runtime_definition.get("smoke_tests"), dict)
            else False,
            "empty_state_renderable": True,
            "populated_state_proven": False,
        }
        passed = all(
            value
            for key, value in checks.items()
            if key not in {"populated_state_proven"}
        )
        if passed:
            record["live_verification_status"] = "degraded"
            record["status"] = "degraded"
            report_status = "degraded"
            log = "Live verification passed for route/component/API readiness, but populated-state proof is still pending."
        else:
            record["live_verification_status"] = "materialization_failed"
            record["status"] = "degraded"
            report_status = "materialization_failed"
            log = "Live verification failed due to missing runtime readiness checks."

        record["live_verification_report"] = {
            "status": report_status,
            "checks": checks,
            "checked_at": utc_now_iso(),
        }
        record["last_action"] = "verify-live"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="verify-live",
            status=record["status"],
            validation_result=record.get("package_validation_status"),
            log=log,
        )
        return deepcopy(record)
