from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.config import load_use_cases


class UseCaseTemplatePreviewService:
    def __init__(self, package_root: Path) -> None:
        self.package_root = package_root

    def _yaml(self, relative_path: str) -> dict[str, Any]:
        path = self.package_root / relative_path
        if not path.is_file():
            return {}
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return payload if isinstance(payload, dict) else {}

    def _feature_enabled(self, package_yaml: dict[str, Any], name: str) -> bool:
        features = package_yaml.get("features", {})
        if not isinstance(features, dict):
            return False
        value = features.get(name)
        if isinstance(value, bool):
            return value
        if isinstance(value, dict):
            return bool(value.get("enabled", True))
        return bool(value)

    def build(self) -> dict[str, Any]:
        package_yaml = self._yaml("package.yaml")
        manifest_yaml = self._yaml("manifest/usecase.yaml")
        business_contract = self._yaml("contracts/business.yaml")
        data_contract = self._yaml("contracts/data.yaml")
        dashboard_contract = self._yaml("contracts/dashboard.yaml")
        api_contract = self._yaml("contracts/api.yaml")
        governance_contract = self._yaml("contracts/governance.yaml")
        domain_model = self._yaml("demo-data/generator/domain_model.yaml")

        metadata = package_yaml.get("metadata", {}) if isinstance(package_yaml, dict) else {}
        existing_use_cases = load_use_cases(include_disabled=True)
        slug = metadata.get("slug")
        api_prefix = manifest_yaml.get("api_prefix")
        dashboard_slug = manifest_yaml.get("superset_dashboard_id")
        registration = package_yaml.get("registration", {}) if isinstance(package_yaml.get("registration"), dict) else {}
        materialization_mode = str(registration.get("mode") or "staged_only")
        full_runtime_supported = materialization_mode == "full_runtime"

        conflicts: list[str] = []
        warnings: list[str] = []
        if slug in existing_use_cases:
            conflicts.append(f"Slug already exists in use_cases.yaml: {slug}")
        if api_prefix and any(
            isinstance(config, dict) and config.get("api_prefix") == api_prefix
            for config in existing_use_cases.values()
        ):
            conflicts.append(f"API prefix already exists: {api_prefix}")
        if dashboard_slug and any(
            isinstance(config, dict) and config.get("superset_dashboard_id") == dashboard_slug
            for config in existing_use_cases.values()
        ):
            conflicts.append(f"Superset dashboard id already exists: {dashboard_slug}")

        if not full_runtime_supported:
            warnings.append(
                "This package can be uploaded, validated, and activated for imported-package visibility, but the platform does not yet support full runtime materialization for it."
            )
        if self._feature_enabled(package_yaml, "dbt"):
            warnings.append("dbt assets are staged for materialization; they are not executed automatically by this importer.")
        if self._feature_enabled(package_yaml, "backend"):
            warnings.append("backend assets are stored as package assets; live FastAPI route generation is not automated in v1.")
        if self._feature_enabled(package_yaml, "portal"):
            warnings.append("portal pages/components are stored as package assets; live Next.js route materialization is not automated in v1.")
        if self._feature_enabled(package_yaml, "dashboards"):
            warnings.append("dashboard specs are stored and previewed, but Superset import/materialization is not automated in v1.")

        dbt_assets = sorted(path.relative_to(self.package_root / "dbt").as_posix() for path in (self.package_root / "dbt").rglob("*") if path.is_file()) if (self.package_root / "dbt").exists() else []
        backend_assets = sorted(path.relative_to(self.package_root / "backend").as_posix() for path in (self.package_root / "backend").rglob("*") if path.is_file()) if (self.package_root / "backend").exists() else []
        portal_assets = sorted(path.relative_to(self.package_root / "portal").as_posix() for path in (self.package_root / "portal").rglob("*") if path.is_file()) if (self.package_root / "portal").exists() else []
        dashboard_assets = sorted(path.relative_to(self.package_root / "dashboards").as_posix() for path in (self.package_root / "dashboards").rglob("*") if path.is_file()) if (self.package_root / "dashboards").exists() else []
        governance_assets = sorted(path.relative_to(self.package_root / "governance").as_posix() for path in (self.package_root / "governance").rglob("*") if path.is_file()) if (self.package_root / "governance").exists() else []

        entities = domain_model.get("entities", []) if isinstance(domain_model.get("entities"), list) else []
        demo_entities = [
            {
                "id": entity.get("id"),
                "type": entity.get("type"),
                "output_seed": entity.get("output_seed"),
            }
            for entity in entities
            if isinstance(entity, dict)
        ]

        return {
            "package_id": package_yaml.get("package_id"),
            "slug": slug,
            "version": metadata.get("version"),
            "name": metadata.get("name") or manifest_yaml.get("name"),
            "domain": metadata.get("domain") or business_contract.get("domain"),
            "owner": metadata.get("owner") or governance_contract.get("owner"),
            "business_summary": {
                "problem": business_contract.get("business_problem") or business_contract.get("summary"),
                "personas": business_contract.get("personas", []),
                "kpis": business_contract.get("kpis", []),
                "decisions": business_contract.get("decisions_supported", []),
            },
            "route_to_be_added": manifest_yaml.get("route") or f"/use-cases/{slug}" if slug else None,
            "api_prefix": api_prefix,
            "dbt_models": dbt_assets,
            "backend_assets": backend_assets,
            "portal_assets": portal_assets,
            "dashboard_assets": dashboard_assets,
            "governance_assets": governance_assets,
            "demo_entities": demo_entities,
            "synthetic_seed_files": sorted(
                path.relative_to(self.package_root / "demo-data").as_posix()
                for path in (self.package_root / "demo-data").rglob("*")
                if path.is_file()
            )
            if (self.package_root / "demo-data").exists()
            else [],
            "lifecycle_capabilities": sorted(
                path.stem for path in (self.package_root / "lifecycle").glob("*.yaml")
            )
            if (self.package_root / "lifecycle").exists()
            else [],
            "data_assets": data_contract,
            "api_assets": api_contract,
            "dashboard_contract": dashboard_contract,
            "governance_contract": governance_contract,
            "conflicts": conflicts,
            "warnings": warnings,
            "install_impact": {
                "materialization_mode": materialization_mode,
                "full_runtime_supported": full_runtime_supported,
                "notes": warnings,
            },
        }
