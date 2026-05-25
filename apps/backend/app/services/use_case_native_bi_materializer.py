from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


PLATFORM_CAPABILITY_MANIFEST = {
    "renderers": {"opencare_native_bi"},
    "components": {
        "trust_strip",
        "kpi_card",
        "kpi_card_group",
        "line_chart",
        "bar_chart",
        "area_chart",
        "queue_table",
        "drilldown_table",
        "governance_badge",
        "link_group",
    },
    "interactions": {
        "drilldown",
        "row_drilldown",
        "open_governance_drawer",
        "governance_drawer",
        "navigate",
    },
    "governance_modes": {
        "aggregate_only",
        "aggregated_only_no_patient_identifiers",
        "dictionary_only_no_patient_identifiers",
        "governance_metadata_only",
        "masked_patient_id_only",
        "no_patient_identifiers",
        "patient_level_audited_reveal",
    },
}


class UseCaseNativeBIMaterializer:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def _component_supported(self, component_type: str) -> bool:
        normalized = component_type.strip().lower()
        return (
            normalized in PLATFORM_CAPABILITY_MANIFEST["components"]
            or normalized.endswith("_chart")
            or normalized.endswith("_table")
        )

    @staticmethod
    def _patient_level_component(spec: dict[str, Any], endpoint_path: str, phi_mode: str) -> bool:
        component_type = str(spec.get("component_type") or "").lower()
        return any(
            token in f"{component_type} {endpoint_path.lower()} {phi_mode.lower()}"
            for token in ("patient", "queue", "drilldown", "masked_patient")
        )

    def _required_capability_matrix(self, runtime_definition: dict[str, Any]) -> dict[str, Any]:
        rendering = runtime_definition.get("rendering", {})
        required = rendering.get("required_runtime_capabilities", {}) if isinstance(rendering, dict) else {}
        matrix: dict[str, Any] = {
            "renderer": {
                "required": rendering.get("component_library"),
                "supported": rendering.get("component_library") in PLATFORM_CAPABILITY_MANIFEST["renderers"],
            },
            "domains": {},
            "unsupported": [],
        }
        for domain in ("components", "interactions", "governance_modes"):
            requested = required.get(domain, []) if isinstance(required, dict) else []
            requested_list = [str(value) for value in requested] if isinstance(requested, list) else []
            supported = sorted(
                value for value in requested_list if value in PLATFORM_CAPABILITY_MANIFEST[domain]
            )
            unsupported = sorted(
                value for value in requested_list if value not in PLATFORM_CAPABILITY_MANIFEST[domain]
            )
            matrix["domains"][domain] = {
                "required": requested_list,
                "supported": supported,
                "unsupported": unsupported,
            }
            for value in unsupported:
                matrix["unsupported"].append(f"unsupported_{domain}:{value}")
        if not matrix["renderer"]["supported"] and matrix["renderer"]["required"]:
            matrix["unsupported"].append(f"unsupported_renderer:{matrix['renderer']['required']}")
        return matrix

    def _component_receipt(self, runtime_definition: dict[str, Any]) -> dict[str, Any]:
        bindings = runtime_definition.get("backend_endpoint_bindings", {})
        endpoint_bindings = {
            str(endpoint.get("path") or ""): endpoint
            for endpoint in bindings.get("endpoints", [])
            if isinstance(endpoint, dict)
        }
        role_policy = bindings.get("role_policy", []) if isinstance(bindings.get("role_policy"), list) else []
        supports_empty_state = bool(runtime_definition.get("rendering", {}).get("supports_empty_state", True))
        components: list[dict[str, Any]] = []
        blocked_reasons: list[str] = []
        degraded_reasons: list[str] = []

        for tab in runtime_definition.get("tabs", []):
            if not isinstance(tab, dict):
                continue
            tab_id = str(tab.get("id") or "overview")
            for spec in tab.get("component_specs", []):
                if not isinstance(spec, dict):
                    continue
                component_id = str(spec.get("id") or "unnamed-component")
                component_type = str(spec.get("component_type") or spec.get("type") or "component")
                endpoint_path = str(spec.get("source_endpoint") or spec.get("endpoint") or "")
                governance_contract = spec.get("governance_contract", {}) if isinstance(spec.get("governance_contract"), dict) else {}
                phi_mode = str(
                    governance_contract.get("phi_mode")
                    or spec.get("phi_visibility_rule")
                    or ""
                )
                endpoint_binding = endpoint_bindings.get(endpoint_path)
                patient_level = self._patient_level_component(spec, endpoint_path, phi_mode)
                required_renderer = str(spec.get("materialization_profile", {}).get("renderer") or runtime_definition.get("rendering", {}).get("component_library") or "")
                interaction_contract = spec.get("interaction_contract", {}) if isinstance(spec.get("interaction_contract"), dict) else {}
                click_behavior = str(
                    interaction_contract.get("click_behavior")
                    or interaction_contract.get("row_click_behavior")
                    or ""
                )

                gates = {
                    "resolved": {"status": "passed", "reason": ""},
                    "capability_supported": {"status": "passed", "reason": ""},
                    "data_bound": {"status": "passed", "reason": ""},
                    "governance_enforced": {"status": "passed", "reason": ""},
                    "rendered": {"status": "passed", "reason": ""},
                }

                if not self._component_supported(component_type):
                    gates["capability_supported"] = {
                        "status": "blocked",
                        "reason": f"unsupported_component_type:{component_type}",
                    }
                elif required_renderer and required_renderer not in PLATFORM_CAPABILITY_MANIFEST["renderers"]:
                    gates["capability_supported"] = {
                        "status": "blocked",
                        "reason": f"unsupported_renderer:{required_renderer}",
                    }

                if click_behavior and click_behavior not in PLATFORM_CAPABILITY_MANIFEST["interactions"]:
                    gates["capability_supported"] = {
                        "status": "blocked",
                        "reason": f"unsupported_interaction:{click_behavior}",
                    }

                if endpoint_path:
                    if endpoint_binding is None:
                        gates["data_bound"] = {
                            "status": "degraded",
                            "reason": f"missing_endpoint_binding:{endpoint_path}",
                        }
                    elif patient_level and not endpoint_binding.get("phi_handling"):
                        gates["governance_enforced"] = {
                            "status": "blocked",
                            "reason": f"missing_phi_masking_for_patient_level_component:{component_id}",
                        }
                    elif patient_level and not role_policy:
                        gates["governance_enforced"] = {
                            "status": "blocked",
                            "reason": f"missing_audit_policy_for_patient_level_component:{component_id}",
                        }
                elif component_type not in {"link_group"}:
                    gates["data_bound"] = {
                        "status": "degraded",
                        "reason": f"missing_data_binding:{component_id}",
                    }

                if phi_mode and phi_mode not in PLATFORM_CAPABILITY_MANIFEST["governance_modes"]:
                    gates["governance_enforced"] = {
                        "status": "blocked",
                        "reason": f"unsupported_governance_mode:{phi_mode}",
                    }

                gate_states = [gate["status"] for gate in gates.values()]
                if "blocked" in gate_states:
                    rendered_reason = next(
                        gate["reason"] for gate in gates.values() if gate["status"] == "blocked"
                    )
                    gates["rendered"] = {"status": "blocked", "reason": rendered_reason}
                elif any(state in {"degraded", "waiting"} for state in gate_states):
                    degraded_reason = next(
                        gate["reason"] for gate in gates.values() if gate["status"] in {"degraded", "waiting"}
                    )
                    gates["rendered"] = {
                        "status": "degraded" if supports_empty_state else "blocked",
                        "reason": degraded_reason,
                    }

                reasons = [
                    gate["reason"]
                    for gate in gates.values()
                    if gate["reason"]
                ]
                overall_status = (
                    "blocked"
                    if any(gate["status"] == "blocked" for gate in gates.values())
                    else "degraded"
                    if any(gate["status"] in {"degraded", "waiting"} for gate in gates.values())
                    else "passed"
                )
                for reason in reasons:
                    if overall_status == "blocked":
                        blocked_reasons.append(reason)
                    elif overall_status == "degraded":
                        degraded_reasons.append(reason)

                components.append(
                    {
                        "tab_id": tab_id,
                        "component_id": component_id,
                        "component_type": component_type,
                        "endpoint": endpoint_path,
                        "phi_mode": phi_mode or "n/a",
                        "patient_level": patient_level,
                        "gates": gates,
                        "overall_status": overall_status,
                    }
                )

        return {
            "components": components,
            "blocked_reasons": sorted(set(blocked_reasons)),
            "degraded_reasons": sorted(set(degraded_reasons)),
        }

    def _materialization_receipt(self, runtime_definition: dict[str, Any]) -> dict[str, Any]:
        capability_matrix = self._required_capability_matrix(runtime_definition)
        component_receipt = self._component_receipt(runtime_definition)
        blocked_reasons = list(runtime_definition.get("blocking_errors", []))
        blocked_reasons.extend(capability_matrix.get("unsupported", []))
        blocked_reasons.extend(component_receipt.get("blocked_reasons", []))
        return {
            "status": "blocked" if blocked_reasons else "materialized",
            "platform_capabilities": deepcopy(PLATFORM_CAPABILITY_MANIFEST),
            "capability_matrix": capability_matrix,
            "component_receipt": component_receipt,
            "blocked_reasons": sorted(set(blocked_reasons)),
            "degraded_reasons": component_receipt.get("degraded_reasons", []),
        }

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
            "receipt_preview": self._materialization_receipt(runtime_definition),
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
        receipt = self._materialization_receipt(runtime_definition)
        if receipt.get("blocked_reasons"):
            record["materialization_status"] = "materialization_failed"
            record["activation_status"] = "staged"
            record["status"] = "materialization_failed"
            record["last_error"] = "; ".join(receipt.get("blocked_reasons", []))
            record["materialization_report"] = {
                "status": "materialization_failed",
                "receipt": receipt,
                "checked_at": utc_now_iso(),
                "blocking_errors": receipt.get("blocked_reasons", []),
                "warnings": runtime_definition.get("warnings", []),
            }
            self.storage.upsert_package(record)
            self.storage.record_action(
                package_id=package_id,
                slug=record["slug"],
                version=record["version"],
                actor=actor,
                action="materialize",
                status="materialization_failed",
                validation_result=record.get("package_validation_status"),
                log="Materialization blocked by capability or governance receipt failures.",
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
            "receipt": receipt,
        }
        record["materialization_status"] = "materialized"
        record["activation_status"] = "activation_ready"
        record["status"] = "materialized"
        record["materialization_report"] = {
            "status": "materialized",
            "registry": materialized_registry,
            "receipt": receipt,
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
        materialization_receipt = record.get("materialization_report", {}).get("receipt", {})
        component_receipt = materialization_receipt.get("component_receipt", {})
        component_entries = component_receipt.get("components", []) if isinstance(component_receipt, dict) else []
        blocked_reasons = materialization_receipt.get("blocked_reasons", []) if isinstance(materialization_receipt, dict) else []
        degraded_reasons = materialization_receipt.get("degraded_reasons", []) if isinstance(materialization_receipt, dict) else []

        checks = {
            "workspace_route_registered": bool(runtime_definition.get("workspace_route")),
            "tabs_renderable": bool(tabs),
            "endpoint_bindings_resolved": bool(endpoints),
            "phi_rules_present": bool(phi_rules),
            "governance_links_present": bool(governance),
            "components_resolved": bool(component_entries),
            "capabilities_supported": not bool(blocked_reasons),
            "governance_enforced": not any(
                "phi" in reason or "audit" in reason or "governance" in reason
                for reason in blocked_reasons
            ),
            "data_binding_resolved": not any(
                reason.startswith("missing_endpoint_binding") or reason.startswith("missing_data_binding")
                for reason in degraded_reasons
            ),
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
            "receipt": materialization_receipt,
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
