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

    def _is_read_only_query(self, sql_text: str) -> bool:
        normalized = sql_text.strip().lower()
        if not normalized:
            return False
        if not (normalized.startswith("select") or normalized.startswith("with")):
            return False

        forbidden_tokens = [
            " insert ",
            " update ",
            " delete ",
            " merge ",
            " alter ",
            " drop ",
            " truncate ",
            " create ",
            " grant ",
            " revoke ",
            " execute ",
            " call ",
            " copy ",
        ]
        padded = f" {normalized} "
        return not any(token in padded for token in forbidden_tokens)

    def _package_standard(self) -> str:
        package_standard = self.package_yaml.get("package_standard")
        if isinstance(package_standard, str):
            return package_standard
        visualization_mode = self.package_yaml.get("visualization_mode", {})
        if isinstance(visualization_mode, dict) and isinstance(visualization_mode.get("package_standard"), str):
            return str(visualization_mode["package_standard"])
        return "1.0"

    def _has_native_bi_v16_contract(self) -> bool:
        return (
            (self.package_root / "native-bi/components.yaml").is_file()
            and (self.package_root / "native-bi/layout.yaml").is_file()
            and (self.package_root / "native-bi/data-bindings.yaml").is_file()
        )

    def _route_from_manifest(self, slug: str) -> str:
        registration = self.package_yaml.get("registration", {})
        if isinstance(registration, dict) and registration.get("portal_workspace_route"):
            return str(registration["portal_workspace_route"])
        if self.manifest_yaml.get("route"):
            return str(self.manifest_yaml["route"])
        return f"/use-cases/{slug}"

    def _component_registry(self, components: dict[str, Any]) -> dict[str, dict[str, Any]]:
        registry: dict[str, dict[str, Any]] = {}
        component_sections = {
            "components",
            "component_definitions",
            "card_specs",
            "chart_specs",
            "tables",
        }

        for source_file, payload in components.items():
            if not isinstance(payload, dict):
                continue
            for section_name in component_sections:
                entries = payload.get(section_name)
                if not isinstance(entries, list):
                    continue
                for entry in entries:
                    if not isinstance(entry, dict):
                        continue
                    component_id = str(entry.get("id") or "").strip()
                    if not component_id:
                        continue
                    registry[component_id] = {
                        **entry,
                        "source_file": source_file,
                        "section": section_name,
                    }
        return registry

    def _binding_registry(self, bindings_payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
        registry: dict[str, dict[str, Any]] = {}
        for entry in bindings_payload.get("bindings", []) if isinstance(bindings_payload.get("bindings"), list) else []:
            if not isinstance(entry, dict):
                continue
            binding_id = str(entry.get("id") or "").strip()
            if binding_id:
                registry[binding_id] = entry
        return registry

    def _interaction_map(self, interactions_payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
        mapping: dict[str, dict[str, Any]] = {}
        interactions = interactions_payload.get("interactions", [])
        if not isinstance(interactions, list):
            return mapping
        for interaction in interactions:
            if not isinstance(interaction, dict):
                continue
            for component_id in interaction.get("component_ids", []) if isinstance(interaction.get("component_ids"), list) else []:
                mapping[str(component_id)] = interaction
        return mapping

    def _governance_map(self, governance_payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
        mapping: dict[str, dict[str, Any]] = {}
        bindings = governance_payload.get("component_governance_bindings", [])
        if not isinstance(bindings, list):
            return mapping
        for binding in bindings:
            if not isinstance(binding, dict):
                continue
            component_id = str(binding.get("component_id") or "").strip()
            governance_contract = binding.get("governance_contract")
            if component_id and isinstance(governance_contract, dict):
                mapping[component_id] = governance_contract
        return mapping

    def _component_spec_from_native(
        self,
        entry: dict[str, Any],
        *,
        binding_registry: dict[str, dict[str, Any]],
        interaction_map: dict[str, dict[str, Any]],
        governance_map: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        component_id = str(entry.get("id") or "").strip()
        binding_ref = ""
        data_binding = entry.get("data_binding")
        if isinstance(data_binding, dict):
            binding_ref = str(data_binding.get("ref") or "").strip()
        binding = binding_registry.get(binding_ref, {})
        interaction_contract = entry.get("interaction_contract")
        if not isinstance(interaction_contract, dict):
            interaction_contract = interaction_map.get(component_id, {})
        governance_contract = entry.get("governance_contract")
        if not isinstance(governance_contract, dict):
            governance_contract = governance_map.get(component_id, {})
        layout_contract = entry.get("layout_contract") if isinstance(entry.get("layout_contract"), dict) else {}
        display_contract = entry.get("display_contract") if isinstance(entry.get("display_contract"), dict) else {}
        materialization_profile = entry.get("materialization_profile") if isinstance(entry.get("materialization_profile"), dict) else {}
        source_endpoint = ""
        if isinstance(binding, dict):
            source_endpoint = str(binding.get("endpoint") or "")
        if not source_endpoint:
            source_endpoint = str(entry.get("source_endpoint") or entry.get("endpoint") or "")
        aliases = entry.get("aliases", []) if isinstance(entry.get("aliases"), list) else []
        return {
            **entry,
            "id": component_id,
            "aliases": aliases,
            "source_file": "native-bi/components.yaml",
            "section": "components",
            "source_endpoint": source_endpoint,
            "expected_fields": binding.get("expected_fields", []),
            "filter_dependencies": (
                data_binding.get("filter_dependencies")
                if isinstance(data_binding, dict) and isinstance(data_binding.get("filter_dependencies"), list)
                else binding.get("filters", {}).get("accepts", [])
                if isinstance(binding.get("filters"), dict)
                else []
            ),
            "data_binding_ref": binding_ref,
            "data_binding_resolved": binding,
            "display_contract": display_contract,
            "layout_contract": layout_contract,
            "interaction_contract": interaction_contract,
            "governance_contract": governance_contract,
            "materialization_profile": materialization_profile,
            "smoke_tests": entry.get("smoke_tests", []),
            "phi_visibility_rule": (
                governance_contract.get("phi_mode")
                if isinstance(governance_contract, dict)
                else entry.get("phi_visibility_rule")
            ),
            "empty_state": (
                display_contract.get("empty_message")
                if isinstance(display_contract, dict) and display_contract.get("empty_message")
                else entry.get("empty_state")
            ),
            "purpose": display_contract.get("subtitle") or entry.get("purpose"),
        }

    def _native_component_registry(
        self,
        components_payload: dict[str, Any],
        bindings_payload: dict[str, Any],
        governance_payload: dict[str, Any],
        interactions_payload: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        registry: dict[str, dict[str, Any]] = {}
        binding_registry = self._binding_registry(bindings_payload)
        governance_map = self._governance_map(governance_payload)
        interaction_map = self._interaction_map(interactions_payload)
        components = components_payload.get("components", [])
        if not isinstance(components, list):
            return registry
        for entry in components:
            if not isinstance(entry, dict):
                continue
            component_id = str(entry.get("id") or "").strip()
            if not component_id:
                continue
            spec = self._component_spec_from_native(
                entry,
                binding_registry=binding_registry,
                interaction_map=interaction_map,
                governance_map=governance_map,
            )
            registry[component_id] = spec
            for alias in spec.get("aliases", []):
                alias_text = str(alias).strip()
                if alias_text:
                    registry[alias_text] = spec
        return registry

    def _native_workspace(
        self,
        slug: str,
        route: str,
        *,
        layout_payload: dict[str, Any],
        components_payload: dict[str, Any],
        bindings_payload: dict[str, Any],
        materialization_profile: dict[str, Any],
        governance_payload: dict[str, Any],
        interactions_payload: dict[str, Any],
        smoke_tests_payload: dict[str, Any],
    ) -> dict[str, Any]:
        pages = layout_payload.get("pages", [])
        if not isinstance(pages, list) or not pages:
            self._add("compile", "native_bi_layout_pages", "failed", "native-bi/layout.yaml does not declare any pages")
            pages = []

        component_registry = self._native_component_registry(
            components_payload,
            bindings_payload,
            governance_payload,
            interactions_payload,
        )
        tabs: list[dict[str, Any]] = []
        pages_map: dict[str, Any] = {}

        for page in pages:
            if not isinstance(page, dict):
                continue
            tab_id = str(page.get("id") or "").strip()
            if not tab_id:
                self._add("compile", "native_bi_page_id", "failed", "native-bi/layout.yaml page is missing id")
                continue
            page_route = str(page.get("route") or (route if tab_id == "overview" else f"{route}/{tab_id}"))
            page_layout = page.get("layout", {}) if isinstance(page.get("layout"), dict) else {}
            sections = page_layout.get("sections", []) if isinstance(page_layout.get("sections"), list) else []
            component_ids: list[str] = []
            for section in sections:
                if not isinstance(section, dict):
                    continue
                for component_ref in section.get("components", []) if isinstance(section.get("components"), list) else []:
                    if not isinstance(component_ref, dict):
                        continue
                    component_id = str(component_ref.get("component_id") or "").strip()
                    if component_id:
                        component_ids.append(component_id)
            if not component_ids:
                self._add("compile", f"native_bi_page_{tab_id}_components", "failed", f"native-bi page {tab_id} has no components")
            tab = {
                "id": tab_id,
                "label": str(page.get("title") or tab_id.replace("-", " ").title()),
                "route": page_route,
                "page_spec": f"native-bi/layout.yaml#{tab_id}",
                "components": component_ids,
            }
            for component_id in component_ids:
                if component_id not in component_registry:
                    self._add("compile", f"component_binding_{tab_id}_{component_id}", "failed", f"Tab {tab_id} references missing component {component_id}")
            tab["component_specs"] = [
                component_registry[component_id]
                for component_id in component_ids
                if component_id in component_registry
            ]
            tabs.append(tab)
            pages_map[f"{tab_id}.page.yaml"] = page

        binding_registry = self._binding_registry(bindings_payload)
        data_sources = []
        for binding in binding_registry.values():
            data_sources.append(
                {
                    "name": binding.get("id"),
                    "type": binding.get("type"),
                    "endpoint": binding.get("endpoint"),
                    "method": binding.get("method"),
                    "expected_fields": binding.get("expected_fields", []),
                }
            )

        package_materialization = materialization_profile.get("package_materialization", {}) if isinstance(materialization_profile.get("package_materialization"), dict) else {}
        required_runtime_capabilities = materialization_profile.get("required_runtime_capabilities", {}) if isinstance(materialization_profile.get("required_runtime_capabilities"), dict) else {}

        return {
            "route": route,
            "workspace": {"tabs": [tab.get("label") for tab in tabs]},
            "routes": {"routes": [{"path": tab.get("route")} for tab in tabs]},
            "navigation": {"navigation": [tab.get("label") for tab in tabs]},
            "tabs": tabs,
            "pages": pages_map,
            "components": {"native-bi/components.yaml": components_payload},
            "component_registry": component_registry,
            "data_sources": data_sources,
            "rendering": {
                "component_library": package_materialization.get("renderer"),
                "supports_empty_state": True,
                "supports_populated_state": True,
                "supports_governance_drawers": "governance_drawer" in required_runtime_capabilities.get("components", []) or "governance_drawer" in required_runtime_capabilities.get("interactions", []),
                "materialization_mode": package_materialization.get("materialization_mode"),
                "required_runtime_capabilities": required_runtime_capabilities,
                "component_defaults": materialization_profile.get("component_defaults", {}),
                "activation_blockers": materialization_profile.get("activation_blockers", []),
                "smoke_tests_declared": smoke_tests_payload,
            },
            "layout_rules": layout_payload.get("layout_rules", {}),
        }

    def _legacy_workspace(self, slug: str, route: str) -> dict[str, Any]:
        workspace = self._yaml("portal/workspace.yaml")
        routes = self._yaml("portal/routes.yaml")
        navigation = self._yaml("portal/navigation.yaml")
        dashboard_build = self._yaml("dashboards/native-dashboard-build.spec.yaml")

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

        component_registry = self._component_registry(components)
        for tab in tabs:
            for component_id in tab["components"]:
                component_found = component_id in component_registry or any(
                    component_id in yaml.safe_dump(payload, sort_keys=False)
                    for payload in components.values()
                )
                if not component_found:
                    self._add("compile", f"component_binding_{tab['id']}_{component_id}", "failed", f"Tab {tab['id']} references missing component {component_id}")
            tab["component_specs"] = [
                component_registry[component_id]
                for component_id in tab["components"]
                if component_id in component_registry
            ]

        return {
            "route": route,
            "workspace": workspace,
            "routes": routes,
            "navigation": navigation,
            "tabs": tabs,
            "pages": pages,
            "components": components,
            "component_registry": component_registry,
            "data_sources": dashboard_build.get("data_sources", []) if isinstance(dashboard_build.get("data_sources"), list) else [],
            "rendering": dashboard_build.get("rendering", {}) if isinstance(dashboard_build.get("rendering"), dict) else {},
            "layout_rules": {},
        }

    def _compile_workspace(self, slug: str) -> dict[str, Any]:
        route = self._route_from_manifest(slug)
        if self._has_native_bi_v16_contract():
            native_components = self._yaml("native-bi/components.yaml")
            native_bindings = self._yaml("native-bi/data-bindings.yaml")
            native_layout = self._yaml("native-bi/layout.yaml")
            native_materialization_profile = self._yaml("native-bi/materialization-profile.yaml")
            native_governance = self._yaml("native-bi/governance-bindings.yaml")
            native_interactions = self._yaml("native-bi/interactions.yaml")
            smoke_tests = self._yaml("tests/smoke-tests.yaml")
            return self._native_workspace(
                slug,
                route,
                layout_payload=native_layout,
                components_payload=native_components,
                bindings_payload=native_bindings,
                materialization_profile=native_materialization_profile,
                governance_payload=native_governance,
                interactions_payload=native_interactions,
                smoke_tests_payload=smoke_tests,
            )
        return self._legacy_workspace(slug, route)

    def _compile_endpoints(self, slug: str) -> dict[str, Any]:
        api_contract = self._yaml("contracts/api.yaml")
        route_spec = self._yaml(f"backend/routes/{slug}.router.spec.yaml")
        if not route_spec:
            route_candidates = sorted((self.package_root / "backend/routes").glob("*.router.spec.yaml"))
            if route_candidates:
                route_spec = self._yaml(str(route_candidates[0].relative_to(self.package_root).as_posix()))

        native_bindings_payload = self._yaml("native-bi/data-bindings.yaml")
        binding_registry = self._binding_registry(native_bindings_payload)
        binding_by_endpoint = {
            str(binding.get("endpoint") or ""): binding
            for binding in binding_registry.values()
            if isinstance(binding, dict) and binding.get("endpoint")
        }

        endpoints: list[dict[str, Any]] = []
        discovered_filters: list[str] = []
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
            if not self._is_read_only_query(sql_text):
                self._add("compile", f"endpoint_query_select_{path}", "failed", f"Endpoint {path} query must be SELECT-only")
            if " raw." in f" {sql_text}" or " staging." in f" {sql_text}":
                self._add("compile", f"endpoint_query_sources_{path}", "failed", f"Endpoint {path} query reads raw.* or staging.*")

            phi_handling = endpoint.get("phi_handling")
            if "patient" in path or "queue" in path or "drilldown" in path:
                if not phi_handling:
                    self._add("compile", f"phi_{path}", "failed", f"Endpoint {path} lacks PHI masking rule")
                if not route_spec.get("role_policy"):
                    self._add("compile", f"audit_{path}", "failed", f"Endpoint {path} lacks role/audit policy")

            full_endpoint = f"/api/v1/use-cases/{slug}{path}"
            if isinstance(route_spec.get("route_prefix"), str):
                full_endpoint = f"{str(route_spec.get('route_prefix')).rstrip('/')}{path}"
            native_binding = binding_by_endpoint.get(full_endpoint, {})
            native_filters = native_binding.get("filters", {}) if isinstance(native_binding.get("filters"), dict) else {}
            if isinstance(native_filters.get("accepts"), list):
                for filter_name in native_filters["accepts"]:
                    filter_text = str(filter_name).strip()
                    if filter_text and filter_text not in discovered_filters:
                        discovered_filters.append(filter_text)

            endpoints.append(
                {
                    "method": str(endpoint.get("method") or "GET"),
                    "path": path,
                    "query": query,
                    "response_schema": str(endpoint.get("response_schema") or ""),
                    "phi_handling": phi_handling,
                    "native_bi_binding": bool(endpoint.get("native_bi_binding", False)),
                    "expected_fields": native_binding.get("expected_fields", []),
                    "data_binding": native_binding,
                }
            )

        if not endpoints:
            self._add("compile", "endpoints_missing", "failed", "No backend endpoint bindings were compiled")

        contract_filters = api_contract.get("api", {}).get("request_patterns", {}).get("filters", [])
        combined_filters = [str(item) for item in contract_filters if isinstance(item, str)]
        for item in discovered_filters:
            if item not in combined_filters:
                combined_filters.append(item)

        return {
            "route_prefix": str(route_spec.get("route_prefix") or api_contract.get("api", {}).get("prefix") or f"/api/v1/use-cases/{slug}"),
            "role_policy": route_spec.get("role_policy", []),
            "endpoints": endpoints,
            "response_patterns": api_contract.get("api", {}).get("response_patterns", {}),
            "filters": combined_filters,
            "allowed_reads": api_contract.get("api", {}).get("semantics", {}).get("allowed_reads", []),
            "forbidden_reads": api_contract.get("api", {}).get("semantics", {}).get("forbidden_reads", []),
            "query_safety": route_spec.get("query_safety", {}),
            "binding_registry": binding_registry,
        }

    def _compile_governance(self) -> dict[str, Any]:
        governance_contract = self._yaml("contracts/governance.yaml")
        ownership = self._yaml("governance/ownership.yaml")
        classification = self._yaml("governance/classification.yaml")
        lineage = self._yaml("governance/lineage.yaml")
        evidence = self._yaml("governance/evidence-pack.yaml")
        quality_rules = self._yaml("governance/quality-rules.yaml") or self._yaml("governance/dq_rules.yaml")
        native_governance_bindings = self._yaml("native-bi/governance-bindings.yaml")

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
            "native_governance_bindings": native_governance_bindings,
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
        native_components = self._yaml("native-bi/components.yaml")
        native_layout = self._yaml("native-bi/layout.yaml")
        native_bindings = self._yaml("native-bi/data-bindings.yaml")
        native_materialization_profile = self._yaml("native-bi/materialization-profile.yaml")
        smoke_tests = self._yaml("tests/smoke-tests.yaml")

        if self._feature_enabled("dashboards") and not dashboard_build and not self._has_native_bi_v16_contract():
            self._add("compile", "native_dashboard_build_spec", "failed", "Native BI package is missing dashboards/native-dashboard-build.spec.yaml")

        runtime_definition = {
            "identity": {
                "package_id": self.package_yaml.get("package_id") or metadata.get("package_id"),
                "slug": slug,
                "name": metadata.get("name") or self.manifest_yaml.get("name") or slug,
                "version": metadata.get("version"),
                "domain": metadata.get("domain"),
                "package_standard": self._package_standard(),
            },
            "personas": business_contract.get("personas", []),
            "kpis": business_contract.get("kpis", []),
            "workspace_route": workspace["route"],
            "tabs": workspace["tabs"],
            "pages": workspace["pages"],
            "components": workspace["components"],
            "component_registry": workspace["component_registry"],
            "data_sources": workspace["data_sources"],
            "rendering": workspace["rendering"],
            "layout_rules": workspace.get("layout_rules", {}),
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
            "native_bi_contracts": {
                "components": native_components,
                "data_bindings": native_bindings,
                "layout": native_layout,
                "materialization_profile": native_materialization_profile,
            },
            "smoke_tests": smoke_tests,
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
