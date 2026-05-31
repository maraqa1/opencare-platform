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
    _STALE_LOCK_MAX_AGE_SECONDS = 30.0
    _STATEFUL_ACTIONS = {
        "upload",
        "validate",
        "compile",
        "plan-materialization",
        "materialize",
        "activate",
        "verify-live",
        "exclude",
        "remove-operational",
        "uninstall",
    }

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
                        try:
                            lock_age = time.time() - self.registry_lock_path.stat().st_mtime
                        except FileNotFoundError:
                            continue
                        if lock_age > self._STALE_LOCK_MAX_AGE_SECONDS:
                            try:
                                self.registry_lock_path.unlink()
                            except FileNotFoundError:
                                pass
                            continue
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
            packages = {}
        records = [deepcopy(record) for record in packages.values() if isinstance(record, dict)]
        known_keys = {
            str(record.get("id") or record.get("package_id"))
            for record in records
            if isinstance(record, dict)
        }
        for recovered in self._recover_packages_from_disk():
            recovered_key = str(recovered.get("id") or recovered.get("package_id"))
            if recovered_key not in known_keys:
                records.append(recovered)
        return records

    @staticmethod
    def is_product_promoted(record: dict[str, Any]) -> bool:
        promotion_status = str(record.get("product_promotion_status") or "").strip().lower()
        if promotion_status:
            return promotion_status == "promoted"

        # Legacy fallback: treat packages that completed live verification as promoted
        # so existing records remain visible until they are rewritten with the new field.
        actions = record.get("actions", [])
        verify_live_seen = False
        demoted_after_verify = False
        if isinstance(actions, list):
            for event in actions:
                if not isinstance(event, dict):
                    continue
                action = str(event.get("action") or "").strip().lower()
                if action == "verify-live":
                    verify_live_seen = True
                elif verify_live_seen and action in {"exclude", "remove-operational", "uninstall"}:
                    demoted_after_verify = True
                    break

        return (
            record.get("enabled") is True
            and record.get("materialization_status") == "materialized"
            and record.get("activation_status") in {"active", "live_verified"}
            and record.get("live_verification_status") in {"degraded", "live_verified"}
            and verify_live_seen
            and not demoted_after_verify
        )

    def get_package(self, package_id: str) -> dict[str, Any] | None:
        registry = self.load_registry()
        packages = registry.get("packages", {})
        if not isinstance(packages, dict):
            return self._recover_package_by_ref(package_id)
        record = packages.get(package_id)
        if isinstance(record, dict):
            return deepcopy(record)

        matches = [
            candidate
            for candidate in packages.values()
            if isinstance(candidate, dict) and candidate.get("package_id") == package_id
        ]
        if not matches:
            return self._recover_package_by_ref(package_id)
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

    def _recover_packages_from_disk(self) -> list[dict[str, Any]]:
        recovered: list[dict[str, Any]] = []
        seen_keys: set[str] = set()
        roots = (self.staged_root, self.installed_root)
        for root in roots:
            if not root.exists():
                continue
            for package_dir in root.iterdir():
                if not package_dir.is_dir():
                    continue
                for version_dir in package_dir.iterdir():
                    if not version_dir.is_dir():
                        continue
                    record = self._recover_package_record(package_dir.name, version_dir.name)
                    if not record:
                        continue
                    package_key = str(record.get("id") or record.get("package_id"))
                    if package_key in seen_keys:
                        continue
                    recovered.append(record)
                    seen_keys.add(package_key)
        recovered.sort(key=lambda candidate: str(candidate.get("uploaded_at", "")), reverse=True)
        return recovered

    def _recover_package_by_ref(self, package_id: str) -> dict[str, Any] | None:
        exact_key = package_id.strip()
        for record in self._recover_packages_from_disk():
            record_key = str(record.get("id") or record.get("package_id"))
            if record_key == exact_key or str(record.get("package_id")) == exact_key:
                return deepcopy(record)
        return None

    def _recover_package_record(self, package_id: str, version: str) -> dict[str, Any] | None:
        staged_dir = self.staged_dir(package_id, version)
        installed_dir = self.installed_dir(package_id, version)
        package_root = staged_dir if staged_dir.exists() else installed_dir
        package_yaml_path = package_root / "package.yaml"
        if not package_yaml_path.exists():
            return None

        payload = yaml.safe_load(package_yaml_path.read_text(encoding="utf-8")) or {}
        if not isinstance(payload, dict):
            return None
        metadata = payload.get("metadata", {}) if isinstance(payload.get("metadata"), dict) else {}
        slug = str(metadata.get("slug") or payload.get("package_id") or package_id)
        record_id = f"{package_id}@{version}"
        log_dir = self.log_dir(package_id, version)
        actions: list[dict[str, Any]] = []
        if log_dir.exists():
            for log_path in sorted(log_dir.glob("*.yaml")):
                try:
                    event = yaml.safe_load(log_path.read_text(encoding="utf-8")) or {}
                except yaml.YAMLError:
                    continue
                if isinstance(event, dict):
                    actions.append(event)

        lifecycle_events = [
            event
            for event in actions
            if str(event.get("action") or "").strip().lower() in self._STATEFUL_ACTIONS
        ]

        compile_status = "parsed"
        materialization_status = "staged"
        activation_status = "previewable"
        live_verification_status = "previewable"
        package_validation_status = "uploaded"
        enabled = False
        product_promotion_status = "pending"
        status = "uploaded"

        for event in lifecycle_events:
            action = str(event.get("action") or "").strip().lower()
            event_status = str(event.get("status") or status).strip().lower() or status
            status = event_status
            validation_result = str(event.get("validation_result") or "").strip().lower()
            if validation_result:
                package_validation_status = validation_result
            if action == "upload":
                compile_status = "parsed"
                materialization_status = "staged"
                activation_status = "previewable"
                live_verification_status = "previewable"
                enabled = False
            elif action == "compile":
                compile_status = "compiled"
            elif action == "materialize":
                materialization_status = "materialized"
            elif action == "activate":
                activation_status = "active"
                enabled = True
            elif action == "verify-live":
                live_verification_status = event_status
                product_promotion_status = "promoted"
            elif action == "exclude":
                activation_status = "excluded"
                product_promotion_status = "excluded"
                enabled = False
            elif action == "remove-operational":
                product_promotion_status = "excluded"
            elif action == "uninstall":
                activation_status = "uninstalled"
                product_promotion_status = "uninstalled"
                enabled = False

        uploaded_at = actions[0].get("timestamp") if actions else utc_now_iso()
        last_lifecycle_event = lifecycle_events[-1] if lifecycle_events else {}
        last_event = actions[-1] if actions else {}
        record: dict[str, Any] = {
            "id": record_id,
            "package_id": package_id,
            "slug": slug,
            "name": metadata.get("name") or slug,
            "version": version,
            "domain": metadata.get("domain"),
            "owner": metadata.get("owner"),
            "uploaded_by": actions[0].get("actor") if actions else "unknown",
            "uploaded_at": uploaded_at,
            "status": status,
            "enabled": enabled,
            "package_validation_status": package_validation_status,
            "compile_status": compile_status,
            "materialization_status": materialization_status,
            "activation_status": activation_status,
            "live_verification_status": live_verification_status,
            "product_promotion_status": product_promotion_status,
            "original_zip_path": str(self.original_zip_path(package_id, version)),
            "staged_path": str(staged_dir),
            "installed_path": str(installed_dir),
            "package_yaml": payload,
            "preview_summary": {
                "package_id": package_id,
                "slug": slug,
                "version": version,
                "name": metadata.get("name") or slug,
                "domain": metadata.get("domain"),
                "owner": metadata.get("owner"),
            },
            "last_action": last_lifecycle_event.get("action") if lifecycle_events else "recovered",
            "last_action_at": last_lifecycle_event.get("timestamp") if lifecycle_events else uploaded_at,
            "error_message": str(last_event.get("error_message") or ""),
            "last_error": str(last_event.get("error_message") or ""),
            "actions": actions,
        }
        return record

    def list_materialized_packages(self) -> list[dict[str, Any]]:
        return [
            record
            for record in self.list_packages()
            if record.get("materialization_status") == "materialized"
        ]

    def list_active_packages(self) -> list[dict[str, Any]]:
        registry = self.load_registry()
        packages = registry.get("packages", {})
        active_versions = registry.get("active_versions", {})
        if not isinstance(packages, dict):
            packages = {}
        package_records: dict[str, dict[str, Any]] = {
            str(package_key): deepcopy(record)
            for package_key, record in packages.items()
            if isinstance(record, dict)
        }
        for recovered in self._recover_packages_from_disk():
            recovered_key = str(recovered.get("id") or recovered.get("package_id"))
            package_records.setdefault(recovered_key, deepcopy(recovered))
        active_records: list[dict[str, Any]] = []
        seen_keys: set[str] = set()

        if isinstance(active_versions, dict):
            for pointer in active_versions.values():
                if not isinstance(pointer, dict):
                    continue
                package_key = pointer.get("package_key")
                if not isinstance(package_key, str):
                    continue
                record = package_records.get(package_key)
                if isinstance(record, dict) and self.is_product_promoted(record):
                    active_records.append(deepcopy(record))
                    seen_keys.add(package_key)

        for package_key, record in package_records.items():
            if package_key in seen_keys or not isinstance(record, dict):
                continue
            if self.is_product_promoted(record):
                active_records.append(deepcopy(record))

        active_records.sort(key=lambda candidate: str(candidate.get("last_action_at", "")), reverse=True)
        return active_records

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
        if not record.get("product_promotion_status"):
            record["product_promotion_status"] = "pending"
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

    def mark_uninstalled(self, package_id: str, version: str, *, preserve_audit: bool) -> None:
        paths_to_remove = [
            self.installed_dir(package_id, version),
            self.staged_dir(package_id, version),
            self.upload_dir(package_id, version),
        ]
        if not preserve_audit:
            paths_to_remove.append(self.log_dir(package_id, version))

        for target in paths_to_remove:
            if target.exists():
                shutil.rmtree(target)

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
        update_package_state: bool = True,
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
                    "product_promotion_status": record.get("product_promotion_status"),
                    "enabled": record.get("enabled"),
                }
                actions = record.setdefault("actions", [])
                if isinstance(actions, list):
                    event["previous_state"] = previous_state
                if update_package_state:
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
                    "product_promotion_status": record.get("product_promotion_status"),
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
