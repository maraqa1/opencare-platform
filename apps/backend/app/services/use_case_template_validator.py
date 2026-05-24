from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

import yaml

from app.config import load_use_cases


class UseCaseTemplateValidationService:
    def __init__(self, package_root: Path) -> None:
        self.package_root = package_root
        self.checks: list[dict[str, str]] = []
        self.blocking_errors: list[str] = []
        self.warnings: list[str] = []
        self.package_yaml: dict[str, Any] = {}
        self.manifest_yaml: dict[str, Any] = {}

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
        alias_map = {
            "dbt": ["has_dbt"],
            "backend": ["has_backend_api"],
            "portal": ["has_portal_workspace"],
            "dashboards": ["has_superset_dashboard", "has_native_bi_dashboard"],
            "governance": ["has_governance_views"],
            "demo_data": ["has_demo_data"],
        }
        for candidate in [name, *alias_map.get(name, [])]:
            value = features.get(candidate)
            if isinstance(value, bool):
                return value
            if isinstance(value, dict):
                return bool(value.get("enabled", True))
            if value:
                return True
        return False

    def _check_exists(self, category: str, relative_path: str, kind: str = "file") -> bool:
        path = self.package_root / relative_path
        exists = path.is_dir() if kind == "directory" else path.is_file()
        self._add(
            category,
            f"{relative_path.replace('/', '_')}_exists",
            "passed" if exists else "failed",
            f"{relative_path} {'found' if exists else 'missing'}",
        )
        return exists

    def _check_sql_safety(self, category: str, check_name: str, sql_path: Path, *, forbid_raw_reads: bool = False) -> None:
        sql_text = sql_path.read_text(encoding="utf-8").strip()
        if not sql_text:
            self._add(category, check_name, "failed", f"{sql_path.name} is empty")
            return

        lowered = sql_text.lower()
        destructive_patterns = [
            "drop schema",
            "drop table",
            "truncate ",
            "delete from ",
            "alter table",
        ]
        if any(pattern in lowered for pattern in destructive_patterns):
            self._add(category, check_name, "failed", f"{sql_path.name} contains destructive SQL")
            return

        if forbid_raw_reads and (re.search(r"\braw\.", lowered) or re.search(r"\bstaging\.", lowered)):
            self._add(category, check_name, "failed", f"{sql_path.name} reads raw.* or staging.* directly")
            return

        self._add(category, check_name, "passed", f"{sql_path.name} passed SQL safety checks")

    def _validate_zip_layout(self) -> None:
        required_paths = [
            ("package", "package.yaml", "file"),
            ("manifest", "manifest/usecase.yaml", "file"),
            ("contracts", "contracts", "directory"),
            ("schemas", "schemas", "directory"),
            ("backend", "backend", "directory"),
            ("portal", "portal", "directory"),
            ("dashboards", "dashboards", "directory"),
            ("governance", "governance", "directory"),
            ("validation", "validation", "directory"),
            ("lifecycle", "lifecycle", "directory"),
            ("checksums", "checksums", "directory"),
        ]

        for category, path, kind in required_paths:
            self._check_exists(category, path, kind)

        if (self.package_root / "demo-data").exists():
            self._add("package", "demo_data_directory_present", "passed", "demo-data directory found")
        else:
            self._add("package", "demo_data_directory_present", "warning", "demo-data directory not present")

    def _validate_package_yaml(self) -> None:
        self.package_yaml = self._yaml("package.yaml")
        if not self.package_yaml:
            self._add("package", "package_yaml_parsed", "failed", "package.yaml could not be parsed")
            return
        self._add("package", "package_yaml_parsed", "passed", "package.yaml parsed successfully")

        expected_fields = [
            ("api_version", self.package_yaml.get("api_version")),
            ("kind", self.package_yaml.get("kind")),
            ("package_id", self.package_yaml.get("package_id")),
            ("compatibility", self.package_yaml.get("compatibility")),
            ("entrypoints", self.package_yaml.get("entrypoints")),
            ("registration", self.package_yaml.get("registration")),
            ("features", self.package_yaml.get("features")),
            ("lifecycle", self.package_yaml.get("lifecycle")),
        ]
        for field_name, value in expected_fields:
            self._add(
                "package",
                f"package_yaml_{field_name}",
                "passed" if value not in (None, "", {}) else "failed",
                f"package.yaml field '{field_name}' {'present' if value not in (None, '', {}) else 'missing'}",
            )

        metadata = self.package_yaml.get("metadata", {})
        self._add(
            "package",
            "package_yaml_metadata",
            "passed" if isinstance(metadata, dict) else "failed",
            "package.yaml metadata block parsed" if isinstance(metadata, dict) else "package.yaml metadata missing",
        )
        if isinstance(metadata, dict):
            for field in ("slug", "name", "version"):
                value = metadata.get(field)
                self._add(
                    "package",
                    f"package_yaml_metadata_{field}",
                    "passed" if value else "failed",
                    f"package.yaml metadata.{field} {'present' if value else 'missing'}",
                )

        kind_ok = self.package_yaml.get("kind") == "UseCasePackage"
        self._add(
            "package",
            "package_yaml_kind_is_use_case_package",
            "passed" if kind_ok else "failed",
            "package.yaml kind is UseCasePackage" if kind_ok else "package.yaml kind must be UseCasePackage",
        )

    def _validate_manifest(self) -> None:
        self.manifest_yaml = self._yaml("manifest/usecase.yaml")
        if not self.manifest_yaml:
            self._add("manifest", "manifest_yaml_parsed", "failed", "manifest/usecase.yaml could not be parsed")
            return
        self._add("manifest", "manifest_yaml_parsed", "passed", "manifest/usecase.yaml parsed successfully")

        package_meta = self.package_yaml.get("metadata", {})
        manifest_slug = self.manifest_yaml.get("slug")
        self._add(
            "manifest",
            "manifest_slug_matches_package",
            "passed" if manifest_slug and manifest_slug == package_meta.get("slug") else "failed",
            "manifest slug matches package slug"
            if manifest_slug and manifest_slug == package_meta.get("slug")
            else "manifest slug does not match package slug",
        )

        for field in ("name", "description", "api_prefix"):
            value = self.manifest_yaml.get(field)
            self._add(
                "manifest",
                f"manifest_{field}",
                "passed" if value else "warning",
                f"manifest {field} {'present' if value else 'missing'}",
            )

    def _validate_contracts(self) -> None:
        required_contracts = [
            "contracts/business.yaml",
            "contracts/data.yaml",
            "contracts/api.yaml",
            "contracts/dashboard.yaml",
            "contracts/governance.yaml",
            "contracts/validation.yaml",
            "contracts/lifecycle.yaml",
        ]
        if self._feature_enabled("demo_data") or (self.package_root / "demo-data").exists():
            required_contracts.append("contracts/demo-data.yaml")

        for path in required_contracts:
            parsed = self._yaml(path)
            self._add(
                "contracts",
                f"{path.replace('/', '_')}_valid",
                "passed" if parsed else "failed",
                f"{path} {'parsed successfully' if parsed else 'missing or invalid'}",
            )

    def _validate_schemas(self) -> None:
        schema_files = list((self.package_root / "schemas").glob("*.y*ml")) + list(
            (self.package_root / "schemas").glob("*.json")
        )
        self._add(
            "schemas",
            "schemas_present",
            "passed" if schema_files else "failed",
            f"{len(schema_files)} schema files found" if schema_files else "No schema files found",
        )

    def _validate_domain_model(self) -> None:
        demo_enabled = self._feature_enabled("demo_data") or (self.package_root / "demo-data").exists()
        if not demo_enabled:
            self._add("domain_model", "domain_model_optional", "warning", "Demo data not declared; skipping domain model checks")
            return

        domain_model = self._yaml("demo-data/generator/domain_model.yaml")
        if not domain_model:
            self._add("domain_model", "domain_model_present", "failed", "demo-data/generator/domain_model.yaml missing or invalid")
            return

        self._add("domain_model", "domain_model_present", "passed", "domain_model.yaml parsed successfully")
        domain_block = domain_model.get("domain", {})
        slug_matches = isinstance(domain_block, dict) and domain_block.get("use_case_slug") == self.package_yaml.get("metadata", {}).get("slug")
        self._add(
            "domain_model",
            "domain_model_slug_matches",
            "passed" if slug_matches else "failed",
            "domain.use_case_slug matches package slug" if slug_matches else "domain.use_case_slug does not match package slug",
        )

        entities = domain_model.get("entities", [])
        if not isinstance(entities, list) or not entities:
            self._add("domain_model", "domain_model_entities", "failed", "domain_model entities missing")
            return

        entity_ids = {entity.get("id") for entity in entities if isinstance(entity, dict)}
        for entity in entities:
            if not isinstance(entity, dict):
                self._add("domain_model", "domain_model_entity_shape", "failed", "Entity definition is not a mapping")
                continue
            missing = [field for field in ("id", "type", "fields") if field not in entity]
            if missing:
                self._add(
                    "domain_model",
                    f"entity_{entity.get('id', 'unknown')}",
                    "failed",
                    f"Entity {entity.get('id', 'unknown')} missing fields: {', '.join(missing)}",
                )
            else:
                self._add(
                    "domain_model",
                    f"entity_{entity['id']}",
                    "passed",
                    f"Entity {entity['id']} has required shape",
                )
            output_seed = entity.get("output_seed")
            if output_seed:
                seed_path = self.package_root / "demo-data" / output_seed
                generator_dir = self.package_root / "demo-data/generator"
                generator_files = list(generator_dir.glob("*.py")) if generator_dir.exists() else []
                if not seed_path.exists() and not generator_files:
                    self._add(
                        "domain_model",
                        f"entity_seed_{entity.get('id', 'unknown')}",
                        "failed",
                        f"Entity {entity.get('id', 'unknown')} declares missing output_seed {output_seed}",
                    )

        relationships = domain_model.get("relationships", [])
        if isinstance(relationships, list):
            for relationship in relationships:
                if not isinstance(relationship, dict):
                    self._add("domain_model", "relationship_shape", "failed", "Relationship definition is not a mapping")
                    continue
                source = relationship.get("source_entity")
                target = relationship.get("target_entity")
                valid = source in entity_ids and target in entity_ids
                self._add(
                    "domain_model",
                    f"relationship_{source}_{target}",
                    "passed" if valid else "failed",
                    f"Relationship {source} -> {target} references valid entities"
                    if valid
                    else f"Relationship {source} -> {target} references invalid entities",
                )

    def _validate_dbt(self) -> None:
        if not self._feature_enabled("dbt"):
            self._add("dbt", "dbt_optional", "warning", "package features do not declare dbt assets")
            return

        sources_exists = (self.package_root / "dbt/sources.yml").is_file() or (self.package_root / "dbt/sources/sources.yml").is_file()
        selectors_exists = (self.package_root / "dbt/selectors.yml").is_file()
        self._add("dbt", "dbt_sources", "passed" if sources_exists else "failed", "dbt sources file found" if sources_exists else "dbt sources file missing")
        self._add("dbt", "dbt_selectors", "passed" if selectors_exists else "failed", "dbt selectors file found" if selectors_exists else "dbt selectors file missing")

        staging_exists = (self.package_root / "dbt/staging").is_dir() or (self.package_root / "dbt/models/staging").is_dir()
        marts_exists = (self.package_root / "dbt/marts").is_dir() or (self.package_root / "dbt/models/marts").is_dir()
        dictionary_exists = (self.package_root / "dbt/dictionary").is_dir() or (self.package_root / "dbt/models/dictionary").is_dir()
        self._add("dbt", "dbt_staging_dir", "passed" if staging_exists else "failed", "dbt staging directory found" if staging_exists else "dbt staging directory missing")
        self._add("dbt", "dbt_marts_dir", "passed" if marts_exists else "failed", "dbt marts directory found" if marts_exists else "dbt marts directory missing")
        self._add("dbt", "dbt_dictionary_dir", "passed" if dictionary_exists else "failed", "dbt dictionary directory found" if dictionary_exists else "dbt dictionary directory missing")

        sql_files = list((self.package_root / "dbt").rglob("*.sql"))
        self._add(
            "dbt",
            "dbt_sql_files_present",
            "passed" if sql_files else "failed",
            f"{len(sql_files)} dbt SQL files found" if sql_files else "No dbt SQL files found",
        )
        for sql_file in sql_files:
            self._check_sql_safety("dbt", f"dbt_sql_{sql_file.name}", sql_file)

    def _validate_backend(self) -> None:
        if not self._feature_enabled("backend"):
            self._add("backend", "backend_optional", "warning", "package features do not declare backend assets")
            return

        route_yaml_exists = (self.package_root / "backend/routes.yaml").is_file()
        route_spec_exists = any((self.package_root / "backend/routes").glob("*.router.spec.yaml")) if (self.package_root / "backend/routes").exists() else False
        self._add("backend", "backend_routes_spec", "passed" if route_yaml_exists or route_spec_exists else "failed", "backend route spec found" if route_yaml_exists or route_spec_exists else "backend route spec missing")
        responses_exists = (self.package_root / "backend/responses").is_dir() or (self.package_root / "backend/schemas").is_dir()
        self._add("backend", "backend_response_specs", "passed" if responses_exists else "failed", "backend response/schema directory found" if responses_exists else "backend response/schema directory missing")
        self._check_exists("backend", "backend/queries", "directory")

        query_files = list((self.package_root / "backend/queries").glob("*.sql"))
        self._add(
            "backend",
            "backend_query_files",
            "passed" if query_files else "failed",
            f"{len(query_files)} backend query files found" if query_files else "No backend query files found",
        )
        for sql_file in query_files:
            self._check_sql_safety("backend", f"backend_query_{sql_file.name}", sql_file, forbid_raw_reads=True)

    def _validate_portal(self) -> None:
        if not self._feature_enabled("portal"):
            self._add("portal", "portal_optional", "warning", "package features do not declare portal assets")
            return

        for path in (
            "portal/routes.yaml",
            "portal/navigation.yaml",
            "portal/workspace.yaml",
        ):
            self._check_exists("portal", path)
        empty_state_found = (self.package_root / "portal/empty-state.yaml").is_file() or (self.package_root / "portal/components/empty-states.yaml").is_file()
        self._add("portal", "portal_empty_state", "passed" if empty_state_found else "failed", "Portal empty-state spec found" if empty_state_found else "Portal empty-state spec missing")
        self._check_exists("portal", "portal/pages", "directory")

    def _validate_dashboards(self) -> None:
        if not self._feature_enabled("dashboards"):
            self._add("dashboards", "dashboards_optional", "warning", "package features do not declare dashboard assets")
            return

        dashboard_manifest_exists = (self.package_root / "dashboards/dashboards.yaml").is_file() or any((self.package_root / "dashboards").glob("*.dashboard.yaml"))
        self._add("dashboards", "dashboard_manifest", "passed" if dashboard_manifest_exists else "failed", "Dashboard manifest found" if dashboard_manifest_exists else "Dashboard manifest missing")
        self._check_exists("dashboards", "dashboards/charts", "directory")
        sql_dir_exists = (self.package_root / "dashboards/sql").is_dir()
        chart_sql_exists = any((self.package_root / "dashboards/charts").glob("*.sql")) if (self.package_root / "dashboards/charts").exists() else False
        self._add("dashboards", "dashboard_sql_dir", "passed" if sql_dir_exists or chart_sql_exists else "failed", "Dashboard SQL assets found" if sql_dir_exists or chart_sql_exists else "Dashboard SQL assets missing")

        chart_specs = list((self.package_root / "dashboards/charts").glob("*.y*ml"))
        chart_sql_files = list((self.package_root / "dashboards/sql").glob("*.sql")) + list((self.package_root / "dashboards/charts").glob("*.sql"))
        self._add(
            "dashboards",
            "dashboard_chart_specs",
            "passed" if chart_specs else "failed",
            f"{len(chart_specs)} chart specs found" if chart_specs else "No chart spec YAML files found",
        )
        self._add(
            "dashboards",
            "dashboard_chart_sql",
            "passed" if chart_sql_files else "failed",
            f"{len(chart_sql_files)} chart SQL files found" if chart_sql_files else "No chart SQL files found",
        )
        for sql_file in chart_sql_files:
            self._check_sql_safety("dashboards", f"dashboard_sql_{sql_file.name}", sql_file, forbid_raw_reads=True)

    def _validate_governance(self) -> None:
        if not self._feature_enabled("governance"):
            self._add("governance", "governance_optional", "warning", "package features do not declare governance assets")
            return

        governance_candidates = [
            ("governance/ownership.yaml", "governance/usecase-governance.yaml"),
            ("governance/freshness_sla.yaml", "governance/usecase-governance.yaml"),
            ("governance/dq_rules.yaml", "governance/quality-rules.yaml"),
            ("governance/lineage.yaml", "governance/lineage.yaml"),
            ("governance/evidence_pack.yaml", "governance/evidence-pack.yaml"),
            ("governance/classification.yaml", "governance/classification.yaml"),
        ]
        for primary, alternate in governance_candidates:
            exists = (self.package_root / primary).is_file() or (self.package_root / alternate).is_file()
            self._add("governance", primary.replace("/", "_"), "passed" if exists else "failed", f"{primary if (self.package_root / primary).is_file() else alternate} {'found' if exists else 'missing'}")

    def _validate_lifecycle(self) -> None:
        for path in (
            "lifecycle/install.yaml",
            "lifecycle/apply.yaml",
            "lifecycle/include.yaml",
            "lifecycle/exclude.yaml",
            "lifecycle/remove-operational.yaml",
            "lifecycle/uninstall.yaml",
            "validation/checks.yaml",
        ):
            self._check_exists("lifecycle", path)

    def _validate_checksums(self) -> None:
        checksum_path = self.package_root / "checksums/manifest.sha256"
        if not checksum_path.is_file():
            checksum_path = self.package_root / "checksums/manifest.sha256.txt"
        if not checksum_path.is_file():
            self._add("checksums", "checksum_manifest_present", "warning", "checksums/manifest.sha256 not present")
            return

        mismatches: list[str] = []
        for line in checksum_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            parts = stripped.split()
            if len(parts) < 2:
                mismatches.append(f"Invalid checksum line: {stripped}")
                continue
            expected_hash = parts[0]
            relative_path = parts[-1].lstrip("./")
            target = self.package_root / relative_path
            if not target.is_file():
                mismatches.append(f"Missing checksum file: {relative_path}")
                continue
            actual_hash = hashlib.sha256(target.read_bytes()).hexdigest()
            if actual_hash != expected_hash:
                mismatches.append(f"Checksum mismatch for {relative_path}")

        self._add(
            "checksums",
            "checksum_manifest_validation",
            "passed" if not mismatches else "failed",
            "Checksum manifest validated" if not mismatches else "; ".join(mismatches),
        )

    def validate(self) -> dict[str, Any]:
        self._validate_zip_layout()
        self._validate_package_yaml()
        self._validate_manifest()
        self._validate_contracts()
        self._validate_schemas()
        self._validate_domain_model()
        self._validate_dbt()
        self._validate_backend()
        self._validate_portal()
        self._validate_dashboards()
        self._validate_governance()
        self._validate_lifecycle()
        self._validate_checksums()

        passed = sum(1 for check in self.checks if check["status"] == "passed")
        warnings = sum(1 for check in self.checks if check["status"] == "warning")
        failed = sum(1 for check in self.checks if check["status"] == "failed")
        status = "failed" if failed else ("warning" if warnings else "passed")

        metadata = self.package_yaml.get("metadata", {}) if isinstance(self.package_yaml, dict) else {}

        return {
            "package_id": self.package_yaml.get("package_id", "unknown"),
            "slug": metadata.get("slug", "unknown"),
            "version": metadata.get("version", "unknown"),
            "status": status,
            "summary": {
                "passed": passed,
                "warnings": warnings,
                "failed": failed,
            },
            "checks": self.checks,
            "blocking_errors": self.blocking_errors,
            "warnings": self.warnings,
        }
