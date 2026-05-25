from __future__ import annotations

import os
import shutil
import threading
import time
import uuid
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

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
        self.registry_snapshot_path = self.root / "registry.last-good.yaml"
        self.registry_lock_path = self.root / "registry.lock"
        self._registry_thread_lock = threading.RLock()
        self._registry_lock_state = threading.local()
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
            self.save_registry(self._empty_registry())

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

    @staticmethod
    def _empty_registry() -> dict[str, Any]:
        return {"packages": {}, "active_versions": {}}

    def _backup_corrupt_registry(self) -> Path | None:
        if not self.registry_path.exists():
            return None
        timestamp = utc_now_iso().replace(":", "-")
        backup_path = self.registry_path.with_name(f"{self.registry_path.name}.corrupt.{timestamp}.bak")
        shutil.copy2(self.registry_path, backup_path)
        return backup_path

    @contextmanager
    def _registry_guard(self, timeout_seconds: float = 5.0) -> Iterator[None]:
        with self._registry_thread_lock:
            depth = int(getattr(self._registry_lock_state, "depth", 0))
            if depth == 0:
                deadline = time.monotonic() + timeout_seconds
                while True:
                    try:
                        lock_fd = os.open(
                            self.registry_lock_path,
                            os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                        )
                        os.write(lock_fd, str(os.getpid()).encode("ascii", "ignore"))
                        self._registry_lock_state.lock_fd = lock_fd
                        break
                    except FileExistsError:
                        if time.monotonic() >= deadline:
                            raise TimeoutError("Timed out waiting for the use-case registry lock.")
                        time.sleep(0.05)
            self._registry_lock_state.depth = depth + 1
            try:
                yield
            finally:
                new_depth = int(getattr(self._registry_lock_state, "depth", 1)) - 1
                self._registry_lock_state.depth = new_depth
                if new_depth == 0:
                    lock_fd = getattr(self._registry_lock_state, "lock_fd", None)
                    if lock_fd is not None:
                        os.close(lock_fd)
                    self._registry_lock_state.lock_fd = None
                    try:
                        self.registry_lock_path.unlink()
                    except FileNotFoundError:
                        pass

    def _load_registry_file(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return self._empty_registry()
        with path.open("r", encoding="utf-8") as handle:
            payload = yaml.safe_load(handle) or {}
        if not isinstance(payload, dict):
            return self._empty_registry()
        payload.setdefault("packages", {})
        payload.setdefault("active_versions", {})
        return payload

    def _write_yaml_atomic(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_name(f"{path.name}.{uuid.uuid4().hex}.tmp")
        with temp_path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(payload, handle, sort_keys=False, allow_unicode=False)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)

    def load_registry(self) -> dict[str, Any]:
        with self._registry_guard():
            try:
                return self._load_registry_file(self.registry_path)
            except yaml.YAMLError:
                self._backup_corrupt_registry()
                if self.registry_snapshot_path.exists():
                    payload = self._load_registry_file(self.registry_snapshot_path)
                    self._write_yaml_atomic(self.registry_path, payload)
                    return payload
                return self._empty_registry()

    def save_registry(self, payload: dict[str, Any]) -> None:
        normalized = deepcopy(payload)
        normalized.setdefault("packages", {})
        normalized.setdefault("active_versions", {})
        with self._registry_guard():
            self._write_yaml_atomic(self.registry_path, normalized)
            self._write_yaml_atomic(self.registry_snapshot_path, normalized)

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
        with self._registry_guard():
            registry = self._load_registry_file(self.registry_path)
            pointers = registry.setdefault("active_versions", {})
            pointers[slug] = {
                "package_key": package_key,
                "version": version,
                "updated_at": utc_now_iso(),
            }
            self._write_yaml_atomic(self.registry_path, registry)
            self._write_yaml_atomic(self.registry_snapshot_path, registry)

    def clear_active_pointer(self, slug: str) -> None:
        with self._registry_guard():
            registry = self._load_registry_file(self.registry_path)
            pointers = registry.get("active_versions", {})
            if isinstance(pointers, dict) and slug in pointers:
                pointers.pop(slug, None)
                self._write_yaml_atomic(self.registry_path, registry)
                self._write_yaml_atomic(self.registry_snapshot_path, registry)

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
        with self._registry_guard():
            registry = self._load_registry_file(self.registry_path)
            packages = registry.setdefault("packages", {})
            packages[package_key] = deepcopy(record)
            self._write_yaml_atomic(self.registry_path, registry)
            self._write_yaml_atomic(self.registry_snapshot_path, registry)
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

        with self._registry_guard():
            registry = self._load_registry_file(self.registry_path)
            packages = registry.get("packages", {})
            package_key = None
            record = None
            if isinstance(packages, dict):
                direct = packages.get(package_id)
                if isinstance(direct, dict):
                    package_key = package_id
                    record = deepcopy(direct)
                else:
                    matches = [
                        (key, candidate)
                        for key, candidate in packages.items()
                        if isinstance(candidate, dict) and candidate.get("package_id") == package_id
                    ]
                    if matches:
                        matches.sort(key=lambda item: str(item[1].get("uploaded_at", "")), reverse=True)
                        package_key, source = matches[0]
                        record = deepcopy(source)

            if record is not None and isinstance(packages, dict) and package_key is not None:
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
                packages[package_key] = deepcopy(record)
                self._write_yaml_atomic(self.registry_path, registry)
                self._write_yaml_atomic(self.registry_snapshot_path, registry)

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
