from __future__ import annotations

import shutil
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class UseCaseTemplateStorage:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.uploads_root = self.root / "uploads"
        self.staged_root = self.root / "staged"
        self.installed_root = self.root / "installed"
        self.logs_root = self.root / "logs"
        self.registry_path = self.root / "registry.yaml"
        self.ensure_layout()

    def ensure_layout(self) -> None:
        for path in (
            self.root,
            self.uploads_root,
            self.staged_root,
            self.installed_root,
            self.logs_root,
        ):
            path.mkdir(parents=True, exist_ok=True)

        if not self.registry_path.exists():
            self.save_registry({"packages": {}})

    def upload_dir(self, package_id: str, version: str) -> Path:
        return self.uploads_root / package_id / version

    def staged_dir(self, package_id: str, version: str) -> Path:
        return self.staged_root / package_id / version

    def installed_dir(self, package_id: str, version: str) -> Path:
        return self.installed_root / package_id / version

    def log_dir(self, package_id: str, version: str) -> Path:
        return self.logs_root / package_id / version

    def original_zip_path(self, package_id: str, version: str) -> Path:
        return self.upload_dir(package_id, version) / "original.zip"

    def load_registry(self) -> dict[str, Any]:
        if not self.registry_path.exists():
            return {"packages": {}, "active_versions": {}}
        with self.registry_path.open("r", encoding="utf-8") as handle:
            payload = yaml.safe_load(handle) or {}
        if not isinstance(payload, dict):
            return {"packages": {}, "active_versions": {}}
        payload.setdefault("packages", {})
        payload.setdefault("active_versions", {})
        return payload

    def save_registry(self, payload: dict[str, Any]) -> None:
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        with self.registry_path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(payload, handle, sort_keys=False, allow_unicode=False)

    def list_packages(self) -> list[dict[str, Any]]:
        registry = self.load_registry()
        packages = registry.get("packages", {})
        if not isinstance(packages, dict):
            return []
        return [deepcopy(record) for record in packages.values() if isinstance(record, dict)]

    def get_package(self, package_id: str) -> dict[str, Any] | None:
        registry = self.load_registry()
        packages = registry.get("packages", {})
        if not isinstance(packages, dict):
            return None
        record = packages.get(package_id)
        if isinstance(record, dict):
            return deepcopy(record)

        matches = [
            candidate
            for candidate in packages.values()
            if isinstance(candidate, dict) and candidate.get("package_id") == package_id
        ]
        if not matches:
            return None
        matches.sort(key=lambda candidate: str(candidate.get("uploaded_at", "")), reverse=True)
        return deepcopy(matches[0])

    def get_active_pointer(self, slug: str) -> dict[str, Any] | None:
        registry = self.load_registry()
        pointers = registry.get("active_versions", {})
        if not isinstance(pointers, dict):
            return None
        pointer = pointers.get(slug)
        return deepcopy(pointer) if isinstance(pointer, dict) else None

    def set_active_pointer(self, slug: str, package_key: str, version: str) -> None:
        registry = self.load_registry()
        pointers = registry.setdefault("active_versions", {})
        pointers[slug] = {
            "package_key": package_key,
            "version": version,
            "updated_at": utc_now_iso(),
        }
        self.save_registry(registry)

    def clear_active_pointer(self, slug: str) -> None:
        registry = self.load_registry()
        pointers = registry.get("active_versions", {})
        if isinstance(pointers, dict) and slug in pointers:
            pointers.pop(slug, None)
            self.save_registry(registry)

    def get_active_package_by_slug(self, slug: str) -> dict[str, Any] | None:
        pointer = self.get_active_pointer(slug)
        if pointer:
            package_key = pointer.get("package_key")
            if isinstance(package_key, str):
                registry = self.load_registry()
                packages = registry.get("packages", {})
                record = packages.get(package_key) if isinstance(packages, dict) else None
                if isinstance(record, dict):
                    return deepcopy(record)

        candidates = [
            record
            for record in self.list_packages()
            if record.get("slug") == slug and record.get("activation_status") in {"active", "live_verified"}
        ]
        candidates.sort(key=lambda candidate: str(candidate.get("last_action_at", "")), reverse=True)
        return deepcopy(candidates[0]) if candidates else None

    def list_materialized_packages(self) -> list[dict[str, Any]]:
        return [
            record
            for record in self.list_packages()
            if record.get("materialization_status") == "materialized"
        ]

    def upsert_package(self, record: dict[str, Any]) -> dict[str, Any]:
        package_key = str(record.get("id") or record["package_id"])
        record.setdefault("package_validation_status", record.get("validation_summary", {}).get("status", "uploaded"))
        record.setdefault("compile_status", "uploaded")
        record.setdefault("materialization_status", "staged")
        record.setdefault("activation_status", "staged")
        record.setdefault("live_verification_status", "staged")
        record.setdefault("runtime_definition", {})
        record.setdefault("compile_report", {})
        record.setdefault("materialization_report", {})
        record.setdefault("live_verification_report", {})
        record.setdefault("last_error", record.get("error_message", ""))
        registry = self.load_registry()
        packages = registry.setdefault("packages", {})
        packages[package_key] = deepcopy(record)
        self.save_registry(registry)
        return deepcopy(record)

    def save_original_zip(self, package_id: str, version: str, content: bytes) -> Path:
        target_dir = self.upload_dir(package_id, version)
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = self.original_zip_path(package_id, version)
        target_path.write_bytes(content)
        return target_path

    def copy_staged_to_installed(self, package_id: str, version: str) -> Path:
        staged = self.staged_dir(package_id, version)
        target = self.installed_dir(package_id, version)
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(staged, target)
        return target

    def mark_uninstalled(self, package_id: str, version: str) -> None:
        installed = self.installed_dir(package_id, version)
        if installed.exists():
            shutil.rmtree(installed)

    def record_action(
        self,
        *,
        package_id: str,
        slug: str,
        version: str,
        actor: str,
        action: str,
        status: str,
        validation_result: str | None = None,
        log: str | None = None,
        error_message: str | None = None,
    ) -> dict[str, Any]:
        event = {
            "event_id": str(uuid.uuid4()),
            "actor": actor,
            "action": action,
            "package_id": package_id,
            "slug": slug,
            "version": version,
            "status": status,
            "timestamp": utc_now_iso(),
            "validation_result": validation_result,
            "error_message": error_message,
            "log": log or "",
            "previous_state": None,
            "new_state": None,
        }

        log_dir = self.log_dir(package_id, version)
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / f"{event['timestamp'].replace(':', '-')}-{event['event_id']}.yaml"
        with log_path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(event, handle, sort_keys=False, allow_unicode=False)

        record = self.get_package(package_id)
        if record is not None:
            previous_state = {
                "status": record.get("status"),
                "package_validation_status": record.get("package_validation_status"),
                "compile_status": record.get("compile_status"),
                "materialization_status": record.get("materialization_status"),
                "activation_status": record.get("activation_status"),
                "live_verification_status": record.get("live_verification_status"),
                "enabled": record.get("enabled"),
            }
            actions = record.setdefault("actions", [])
            if isinstance(actions, list):
                event["previous_state"] = previous_state
            record["last_action"] = action
            record["last_action_at"] = event["timestamp"]
            record["status"] = status
            if error_message:
                record["error_message"] = error_message
                record["last_error"] = error_message
            event["new_state"] = {
                "status": record.get("status"),
                "package_validation_status": record.get("package_validation_status"),
                "compile_status": record.get("compile_status"),
                "materialization_status": record.get("materialization_status"),
                "activation_status": record.get("activation_status"),
                "live_verification_status": record.get("live_verification_status"),
                "enabled": record.get("enabled"),
            }
            if isinstance(actions, list):
                actions.append(event)
            self.upsert_package(record)

        return event

    def safe_file_tree(self, package_id: str, version: str, state: str = "staged") -> list[dict[str, Any]]:
        base = self.staged_dir(package_id, version) if state == "staged" else self.installed_dir(package_id, version)
        if not base.exists():
            return []

        entries: list[dict[str, Any]] = []
        for path in sorted(base.rglob("*")):
            relative = path.relative_to(base).as_posix()
            entries.append(
                {
                    "path": relative,
                    "type": "directory" if path.is_dir() else "file",
                    "size": None if path.is_dir() else path.stat().st_size,
                }
            )
        return entries
