from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


class UseCasePackageCompiler:
    def __init__(self, package_root: Path) -> None:
        self.package_root = package_root
        self.package_yaml: dict[str, Any] = {}
        self.manifest_yaml: dict[str, Any] = {}
        self.checks: list[dict[str, str]] = []
        self.blocking_errors: list[str] = []
        self.warnings: list[str] = []

    def _add(self, category: str, check: str, status: str, message: str) -> None:
        self.checks.append(
            {
                "category": category,
                "check": check,
                "status": status,
                "message": message,
            }
        )
        if status == "failed":
            self.blocking_errors.append(message)
        elif status == "warning":
            self.warnings.append(message)

    def _yaml(self, relative_path: str) -> dict[str, Any]:
        path = self.package_root / relative_path
        if not path.is_file():
            return {}
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return payload if isinstance(payload, dict) else {}

    def _feature_enabled(self, name: str) -> bool:
        features = self.package_yaml.get("features", {})
        if not isinstance(features, dict):
            return False

        candidates = [name]
        alias_map = {
            "dbt": ["has_dbt"],
            "backend": ["has_backend_api"],
            "portal": ["has_portal_workspace"],
            "dashboards": ["has_superset_dashboard", "has_native_bi_dashboard"],
            "governance": ["has_governance_views"],
            "demo_data": ["has_demo_data"],
        }
        candidates.extend(alias_map.get(name, []))
        for candidate in candidates:
            value = features.get(candidate)
            if isinstance(value, bool):
                return value
            if isinstance(value, dict):
                return bool(value.get("enabled", True))
            if value:
                return True
        return False

    def _read_text(self, relative_path: str) -> str:
        path = self.package_root / relative_path
        if not path.is_file():
            return ""
        return path.read_text(encoding="utf-8")

    def _route_from_manifest(self, slug: str) -> str:
        registration = self.package_yaml.get("registration", {})
        if isinstance(registration, dict) and registration.get("portal_workspace_route"):
            return str(registration["portal_workspace_route"])
        if self.manifest_yaml.get("route"):
            return str(self.manifest_yaml["route"])
        return f"/use-cases/{slug}"

    def _compile_workspace(self, slug: str) -> dict[str, Any]:
        workspace = self._yaml("portal/workspace.yaml")
        routes = self._yaml("portal/routes.yaml")
        navigation = self._yaml("portal/navigation.yaml")
        dashboard_build = self._yaml("dashboards/native-dashboard-build.spec.yaml")
        dashboard_contract = self._yaml("contracts/dashboard.yaml")

        route = self._route_from_manifest(slug)
        tabs: list[dict[str, Any]] = []

        if isinstance(dashboard_build.get("tabs"), list):
            for tab in dashboard_build["tabs"]:
                if not isinstance(tab, dict):
                    continue
                tab_id = str(tab.get("id") or "")
                page_spec = str(tab.get("page_spec") or "")
                components = tab.get("required_components", [])
                if not tab_id:
                    self._add("compile", "workspace_tab_id", "failed", "Dashboard build spec tab is missing id")
                    continue
                if page_spec and not (self.package_root / page_spec).is_file():
                    self._add("compile", f"workspace_tab_{tab_id}_page_spec", "failed", f"Missing page spec for tab {tab_id}: {page_spec}")
                if not isinstance(components, list) or not components:
                    self._add("compile", f"workspace_tab_{tab_id}_components", "failed", f"Tab {tab_id} has no required components")
                tabs.append(
                    {
                        "id": tab_id,
                        "label": str(tab.get("label") or tab_id.replace("-", " ").title()),
                        "route": str(tab.get("route") or f"{route}/{tab_id}"),
                        "page_spec": page_spec,
                        "components": components if isinstance(components, list) else [],
                    }
                )
        elif isinstance(workspace.get("tabs"), list):
            for index, label in enumerate(workspace.get("tabs", [])):
                tab_id = str(label).strip().lower().replace(" ", "-")
                tabs.append(
                    {
                        "id": tab_id or f"tab-{index}",
                        "label": str(label),
                        "route": route if index == 0 else f"{route}/{tab_id}",
                        "page_spec": "",
                        "components": [],
                    }
                )
            self._add("compile", "workspace_tabs_fallback", "warning", "Using portal/workspace.yaml tabs because native dashboard build tabs were not declared")
        else:
            self._add("compile", "workspace_tabs_missing", "failed", "No workspace tabs could be derived from package specs")

        pages: dict[str, Any] = {}
        page_dir = self.package_root / "portal/pages"
        if page_dir.exists():
            for page_file in sorted(page_dir.glob("*.yaml")):
                parsed = self._yaml(str(page_file.relative_to(self.package_root).as_posix()))
                pages[page_file.name] = parsed

        components: dict[str, Any] = {}
        component_dir = self.package_root / "portal/components"
        supported_component_files = {"cards.yaml", "charts.yaml", "tables.yaml", "empty-states.yaml", "tabs.yaml"}
        if component_dir.exists():
            for component_file in sorted(component_dir.glob("*.yaml")):
                parsed = self._yaml(str(component_file.relative_to(self.package_root).as_posix()))
                components[component_file.name] = parsed
                if component_file.name not in supported_component_files:
                    self._add("compile", f"component_file_{component_file.name}", "warning", f"Unsupported optional component file: {component_file.name}")

        for tab in tabs:
            for component_id in tab["components"]:
                component_found = any(component_id in yaml.safe_dump(payload, sort_keys=False) for payload in components.values())
                if not component_found:
                    self._add("compile", f"component_binding_{tab['id']}_{component_id}", "failed", f"Tab {tab['id']} references missing component {component_id}")

        return {
            "route": route,
            "workspace": workspace,
            "routes": routes,
            "navigation": navigation,
            "tabs": tabs,
            "pages": pages,
            "components": components,
        }

    def _compile_endpoints(self, slug: str) -> dict[str, Any]:
        api_contract = self._yaml("contracts/api.yaml")
        route_spec = self._yaml(f"backend/routes/{slug}.router.spec.yaml")
        if not route_spec:
            route_candidates = sorted((self.package_root / "backend/routes").glob("*.router.spec.yaml"))
            if route_candidates:
                route_spec = self._yaml(str(route_candidates[0].relative_to(self.package_root).as_posix()))

        endpoints: list[dict[str, Any]] = []
        for endpoint in route_spec.get("endpoints", []) if isinstance(route_spec.get("endpoints"), list) else []:
            if not isinstance(endpoint, dict):
                continue
            path = str(endpoint.get("path") or "")
            query = str(endpoint.get("query") or "")
            if not path or not query:
                self._add("compile", "endpoint_shape", "failed", "Endpoint spec is missing path or query binding")
                continue
            query_path = self.package_root / query
            if not query_path.is_file():
                self._add("compile", f"endpoint_query_{path}", "failed", f"Endpoint {path} references missing query {query}")
                continue
            sql_text = query_path.read_text(encoding="utf-8").strip().lower()
            if not sql_text.startswith("select"):
                self._add("compile", f"endpoint_query_select_{path}", "failed", f"Endpoint {path} query must be SELECT-only")
            if " raw." in f" {sql_text}" or " staging." in f" {sql_text}":
                self._add("compile", f"endpoint_query_sources_{path}", "failed", f"Endpoint {path} query reads raw.* or staging.*")

            phi_handling = endpoint.get("phi_handling")
            if "patient" in path or "queue" in path or "drilldown" in path:
                if not phi_handling:
                    self._add("compile", f"phi_{path}", "failed", f"Endpoint {path} lacks PHI masking rule")
                if not route_spec.get("role_policy"):
                    self._add("compile", f"audit_{path}", "failed", f"Endpoint {path} lacks role/audit policy")

            endpoints.append(
                {
                    "method": str(endpoint.get("method") or "GET"),
                    "path": path,
                    "query": query,
                    "response_schema": str(endpoint.get("response_schema") or ""),
                    "phi_handling": phi_handling,
                    "native_bi_binding": bool(endpoint.get("native_bi_binding", False)),
                }
            )

        if not endpoints:
            self._add("compile", "endpoints_missing", "failed", "No backend endpoint bindings were compiled")

        return {
            "route_prefix": str(route_spec.get("route_prefix") or api_contract.get("api", {}).get("prefix") or f"/api/v1/use-cases/{slug}"),
            "role_policy": route_spec.get("role_policy", []),
            "endpoints": endpoints,
            "response_patterns": api_contract.get("api", {}).get("response_patterns", {}),
            "filters": api_contract.get("api", {}).get("request_patterns", {}).get("filters", []),
            "allowed_reads": api_contract.get("api", {}).get("semantics", {}).get("allowed_reads", []),
            "forbidden_reads": api_contract.get("api", {}).get("semantics", {}).get("forbidden_reads", []),
        }

    def _compile_governance(self) -> dict[str, Any]:
        governance_contract = self._yaml("contracts/governance.yaml")
        ownership = self._yaml("governance/ownership.yaml")
        classification = self._yaml("governance/classification.yaml")
        lineage = self._yaml("governance/lineage.yaml")
        evidence = self._yaml("governance/evidence-pack.yaml")
        quality_rules = self._yaml("governance/quality-rules.yaml") or self._yaml("governance/dq_rules.yaml")

        patient_level = "patient" in yaml.safe_dump(governance_contract, sort_keys=False).lower()
        if patient_level:
            if not classification:
                self._add("compile", "governance_classification", "failed", "Patient-level use case is missing PHI classification asset")
            if not evidence:
                self._add("compile", "governance_evidence", "failed", "Patient-level use case is missing governance evidence asset")
            if not ownership:
                self._add("compile", "governance_ownership", "failed", "Patient-level use case is missing ownership asset")

        return {
            "contract": governance_contract,
            "ownership": ownership,
            "classification": classification,
            "lineage": lineage,
            "evidence": evidence,
            "quality_rules": quality_rules,
        }

    def compile(self) -> dict[str, Any]:
        self.package_yaml = self._yaml("package.yaml")
        self.manifest_yaml = self._yaml("manifest/usecase.yaml")
        metadata = self.package_yaml.get("metadata", {}) if isinstance(self.package_yaml, dict) else {}
        slug = str(metadata.get("slug") or self.manifest_yaml.get("slug") or "")

        if not slug:
            self._add("compile", "slug", "failed", "Package slug is missing")

        registration = self.package_yaml.get("registration", {})
        materialization_mode = (
            str(registration.get("mode"))
            if isinstance(registration, dict) and registration.get("mode")
            else "full_runtime"
            if self.package_yaml.get("compatibility", {}).get("dashboard_engine") == "opencare_native_bi"
            else "staged_only"
        )

        if materialization_mode != "full_runtime":
            self._add("compile", "registration_mode", "warning", f"Package registration mode is {materialization_mode}; full runtime activation will be blocked")

        workspace = self._compile_workspace(slug)
        endpoints = self._compile_endpoints(slug)
        governance = self._compile_governance()
        dashboard_contract = self._yaml("contracts/dashboard.yaml")
        dashboard_build = self._yaml("dashboards/native-dashboard-build.spec.yaml")
        materialization_contract = self._yaml("validation/dashboard-materialization.contract.yaml")
        business_contract = self._yaml("contracts/business.yaml")

        if self._feature_enabled("dashboards") and not dashboard_build:
            self._add("compile", "native_dashboard_build_spec", "failed", "Native BI package is missing dashboards/native-dashboard-build.spec.yaml")

        runtime_definition = {
            "identity": {
                "package_id": self.package_yaml.get("package_id"),
                "slug": slug,
                "name": metadata.get("name") or self.manifest_yaml.get("name") or slug,
                "version": metadata.get("version"),
                "domain": metadata.get("domain"),
            },
            "personas": business_contract.get("personas", []),
            "kpis": business_contract.get("kpis", []),
            "workspace_route": workspace["route"],
            "tabs": workspace["tabs"],
            "pages": workspace["pages"],
            "components": workspace["components"],
            "filters": endpoints["filters"],
            "charts": dashboard_contract.get("dashboards", {}),
            "tables": dashboard_contract.get("operational", {}).get("episode_table", {}),
            "queues": dashboard_contract.get("operational", {}).get("operational_queues", []),
            "drilldowns": dashboard_contract.get("drilldown_expectations", []),
            "backend_endpoint_bindings": endpoints,
            "governance_bindings": governance,
            "phi_masking_rules": {
                "route_policy": endpoints["role_policy"],
                "table_policy": dashboard_contract.get("phi_controls", {}),
            },
            "audit_requirements": {
                "patient_level": True if "patient" in yaml.safe_dump(governance, sort_keys=False).lower() else False,
                "events": ["patient-level drilldown access", "restricted PHI attribute access"],
            },
            "materialization_requirements": materialization_contract or {
                "required_for_active": materialization_mode == "full_runtime",
                "states": ["staged", "materialized", "failed"],
            },
            "unsupported_features": self.warnings,
            "blocking_errors": self.blocking_errors,
            "warnings": self.warnings,
            "native_dashboard_build_spec": dashboard_build,
        }

        status = "compiled" if not self.blocking_errors else "compile_failed"
        return {
            "status": status,
            "summary": {
                "passed": sum(1 for check in self.checks if check["status"] == "passed"),
                "warnings": sum(1 for check in self.checks if check["status"] == "warning"),
                "failed": sum(1 for check in self.checks if check["status"] == "failed"),
            },
            "checks": self.checks,
            "blocking_errors": self.blocking_errors,
            "warnings": self.warnings,
            "runtime_definition": runtime_definition,
            "materialization_mode": materialization_mode,
        }
