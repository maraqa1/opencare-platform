from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseTemplateLifecycleService:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def _require_record(self, package_id: str) -> dict[str, Any]:
        record = self.storage.get_package(package_id)
        if record is None:
            raise KeyError(package_id)
        return record

    def install(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        validation = record.get("validation_summary", {})
        validation_status = validation.get("status")
        if validation_status == "failed":
            raise ValueError("Validation failed; install is blocked.")
        if validation_status not in {"passed", "warning"}:
            raise ValueError("Package must be validated before install.")

        installed_path = self.storage.copy_staged_to_installed(package_id, record["version"])
        record["installed_path"] = str(installed_path)
        record["status"] = "installed"
        record["last_action"] = "install"
        record["last_action_at"] = utc_now_iso()
        record.setdefault("materialization", {})["mode"] = "staged_only"
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="install",
            status="installed",
            validation_result=validation_status,
            log="Package installed into managed package storage. Runtime materialization remains staged-only in v1.",
        )
        return deepcopy(record)

    def apply(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        validation = record.get("validation_summary", {})
        if validation.get("status") == "failed":
            raise ValueError("Validation failed; apply is blocked.")
        if not record.get("installed_path"):
            raise ValueError("Package must be installed before apply.")

        installed_path = self.storage.copy_staged_to_installed(package_id, record["version"])
        record["installed_path"] = str(installed_path)
        record["status"] = "applied"
        record["last_action"] = "apply"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="apply",
            status="applied",
            validation_result=validation.get("status"),
            log="Staged assets reapplied to managed package storage. Dynamic platform materialization is still pending.",
        )
        return deepcopy(record)

    def include(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        if not record.get("installed_path"):
            raise ValueError("Package must be installed before it can be included.")
        record["enabled"] = True
        record["status"] = "included"
        record["last_action"] = "include"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="include",
            status="included",
            validation_result=record.get("validation_summary", {}).get("status"),
            log="Package marked included in package registry. Live route/dashboard materialization still depends on future scaffolding/import hooks.",
        )
        return deepcopy(record)

    def exclude(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        if not record.get("installed_path"):
            raise ValueError("Package must be installed before it can be excluded.")
        record["enabled"] = False
        record["status"] = "excluded"
        record["last_action"] = "exclude"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="exclude",
            status="excluded",
            validation_result=record.get("validation_summary", {}).get("status"),
            log="Package marked excluded from active package registry views.",
        )
        return deepcopy(record)

    def remove_operational(self, package_id: str, *, actor: str) -> dict[str, Any]:
        record = self._require_record(package_id)
        if not record.get("installed_path"):
            raise ValueError("Package must be installed before it can be removed operationally.")
        record["enabled"] = False
        record["status"] = "operationally_removed"
        record["last_action"] = "remove-operational"
        record["last_action_at"] = utc_now_iso()
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="remove-operational",
            status="operationally_removed",
            validation_result=record.get("validation_summary", {}).get("status"),
            log="Operational visibility disabled while preserving staged assets, audit history, and installed metadata.",
        )
        return deepcopy(record)

    def uninstall(self, package_id: str, *, actor: str, confirm: bool, preserve_audit: bool) -> dict[str, Any]:
        if not confirm:
            raise ValueError("Uninstall requires confirm=true")

        record = self._require_record(package_id)
        self.storage.mark_uninstalled(package_id, record["version"])
        record["enabled"] = False
        record["status"] = "uninstalled"
        record["last_action"] = "uninstall"
        record["last_action_at"] = utc_now_iso()
        record["installed_path"] = ""
        record["preserve_audit"] = preserve_audit
        self.storage.upsert_package(record)
        self.storage.record_action(
            package_id=package_id,
            slug=record["slug"],
            version=record["version"],
            actor=actor,
            action="uninstall",
            status="uninstalled",
            validation_result=record.get("validation_summary", {}).get("status"),
            log="Package uninstalled from managed package storage. Audit history preserved."
            if preserve_audit
            else "Package uninstalled from managed package storage.",
        )
        return deepcopy(record)
