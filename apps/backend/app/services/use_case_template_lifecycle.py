from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from app.config import settings
from app.services.use_case_native_bi_materializer import UseCaseNativeBIMaterializer
from app.services.use_case_package_compiler import UseCasePackageCompiler
from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseTemplateLifecycleService:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage
        self.materializer = UseCaseNativeBIMaterializer(storage)

    def _require_record(self, package_id: str) -> dict[str, Any]:
        record = self.storage.get_package(package_id)
        if record is None:
            raise KeyError(package_id)
        return record

    def _ensure_materialization_enabled(self) -> None:
        if not settings.use_case_materialization_enabled:
            raise ValueError(
                "The use-case materialization module is disabled. "
                "Preview and package management remain available, but materialize/activate/live actions are unavailable."
            )

    def compile(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        validation_status = record.get("package_validation_status") or record.get("validation_summary", {}).get("status")
        if validation_status not in {"passed", "warning"}:
            raise ValueError("Package must pass validation before compile.")

        compiler = UseCasePackageCompiler(Path(record["staged_path"]))
        compile_report = compiler.compile()
        runtime_definition = compile_report.get("runtime_definition", {})
        materialization_mode = compile_report.get("materialization_mode", "staged_only")

        record["runtime_definition"] = runtime_definition
        record["compile_report"] = compile_report
        record["compile_status"] = compile_report["status"]
        record["package_validation_status"] = validation_status
        record["status"] = compile_report["status"]
        record["materialization_status"] = "staged"
        record["activation_status"] = "previewable"
        record["live_verification_status"] = "previewable"
        record["product_promotion_status"] = "pending"
        record["preview_summary"] = {
            **record.get("preview_summary", {}),
            "install_impact": {
                "materialization_mode": materialization_mode,
                "full_runtime_supported": materialization_mode == "full_runtime",
                "notes": compile_report.get("warnings", []),
            },
        }
        record["last_error"] = "; ".join(compile_report.get("blocking_errors", []))
        record["last_action"] = "compile"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="compile",
            status=record["status"],
            validation_result=validation_status,
            log="Package compiled into canonical runtime definition."
            if compile_report["status"] == "compiled"
            else "Package compile failed.",
            error_message=record["last_error"] or None,
        )
        return deepcopy(record)

    def plan_materialization(self, package_id: str, *, actor: str) -> dict[str, Any]:
        self._ensure_materialization_enabled()
        record = self._require_record(package_id)
        if record.get("compile_status") != "compiled":
            raise ValueError("Package must be compiled before materialization planning.")
        planned = self.materializer.plan(package_id, actor=actor)
        planned["last_action"] = "plan-materialization"
        planned["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(planned)
        return deepcopy(planned)

    def materialize(self, package_id: str, *, actor: str) -> dict[str, Any]:
        self._ensure_materialization_enabled()
        record = self._require_record(package_id)
        if record.get("compile_status") != "compiled":
            raise ValueError("Package must be compiled before materialization.")
        return self.materializer.materialize(package_id, actor=actor)

    def activate(self, package_id: str, *, actor: str) -> dict[str, Any]:
        self._ensure_materialization_enabled()
        record = self._require_record(package_id)
        if record.get("package_validation_status") not in {"passed", "warning"}:
            raise ValueError("Package must pass validation before activation.")
        if record.get("compile_status") != "compiled":
            raise ValueError("Package must compile successfully before activation.")
        if record.get("compile_report", {}).get("materialization_mode") != "full_runtime":
            raise ValueError("Package is previewable only and cannot be activated as a live use case.")
        if record.get("materialization_status") != "materialized":
            raise ValueError("Package must materialize successfully before activation.")
        runtime_definition = record.get("runtime_definition", {})
        if runtime_definition.get("blocking_errors"):
            raise ValueError("Package still has compile blockers and cannot activate.")

        record["enabled"] = True
        record["activation_status"] = "active"
        record["status"] = "active"
        record["product_promotion_status"] = "pending_live_verification"
        record["last_action"] = "activate"
        record["last_action_at"] = utc_now_iso()
        self.storage.set_active_pointer(record["slug"], str(record.get("id") or record["package_id"]), record["version"])
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="activate",
            status="active",
            validation_result=record.get("package_validation_status"),
            log="Package activated after successful compile and materialization.",
        )
        return deepcopy(record)

    def verify_live(self, package_id: str, *, actor: str) -> dict[str, Any]:
        self._ensure_materialization_enabled()
        return self.materializer.verify_live(package_id, actor=actor)

    def exclude(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        record["enabled"] = False
        record["status"] = "excluded"
        record["activation_status"] = "excluded"
        record["product_promotion_status"] = "excluded"
        record["last_action"] = "exclude"
        record["last_action_at"] = utc_now_iso()
        self.storage.clear_active_pointer(record["slug"])
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="exclude",
            status="excluded",
            validation_result=record.get("package_validation_status"),
            log="Package marked excluded from active package registry views.",
        )
        return deepcopy(record)

    def remove_operational(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        record["enabled"] = False
        record["status"] = "operationally_removed"
        record["activation_status"] = "operationally_removed"
        record["product_promotion_status"] = "removed"
        record["last_action"] = "remove-operational"
        record["last_action_at"] = utc_now_iso()
        self.storage.clear_active_pointer(record["slug"])
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="remove-operational",
            status="operationally_removed",
            validation_result=record.get("package_validation_status"),
            log="Operational visibility disabled while preserving staged assets, audit history, and installed metadata.",
        )
        return deepcopy(record)

    def uninstall(self, package_id: str, *, actor: str, confirm: bool, preserve_audit: bool) -> dict[str, Any]:
        if not confirm:
            raise ValueError("Uninstall requires confirm=true")

        record = self._require_record(package_id)
        self.storage.mark_uninstalled(package_id, record["version"], preserve_audit=preserve_audit)
        record["enabled"] = False
        record["activation_status"] = "uninstalled"
        record["status"] = "uninstalled"
        record["product_promotion_status"] = "uninstalled"
        record["last_action"] = "uninstall"
        record["last_action_at"] = utc_now_iso()
        record["installed_path"] = ""
        record["preserve_audit"] = preserve_audit
        self.storage.clear_active_pointer(record["slug"])
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="uninstall",
            status="uninstalled",
            validation_result=record.get("package_validation_status"),
            log="Package uninstalled from managed package storage. Audit history preserved."
            if preserve_audit
            else "Package uninstalled from managed package storage.",
        )
        return deepcopy(record)

    # Backward-compatible aliases.
    def install(self, package_id: str, *, actor: str) -> dict[str, Any]:
        return self.plan_materialization(package_id, actor=actor)

    def apply(self, package_id: str, *, actor: str) -> dict[str, Any]:
        return self.materialize(package_id, actor=actor)

    def include(self, package_id: str, *, actor: str) -> dict[str, Any]:
        return self.activate(package_id, actor=actor)
