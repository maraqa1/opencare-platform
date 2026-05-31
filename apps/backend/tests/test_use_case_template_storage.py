from __future__ import annotations

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.use_case_template_storage import UseCaseTemplateStorage
from use_case_template_test_helpers import build_valid_package_tree


class UseCaseTemplateStorageTests(unittest.TestCase):
    def test_load_registry_restores_last_good_snapshot_after_corruption(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "pkg-1",
                    "package_id": "pkg-1",
                    "slug": "patient-outcomes",
                    "version": "1.0.0",
                    "status": "uploaded",
                }
            )
            storage.registry_path.write_text(
                "packages:\n"
                "  broken-entry:\n"
                "    status: uploaded\n"
                "    actions:\n"
                "      - missing-colon value\n",
                encoding="utf-8",
            )

            registry = storage.load_registry()

            self.assertIn("pkg-1", registry["packages"])
            self.assertEqual(registry["packages"]["pkg-1"]["slug"], "patient-outcomes")

            backup_files = list(storage.root.glob("registry.yaml.corrupt.*.bak"))
            self.assertEqual(len(backup_files), 1)
            self.assertTrue(backup_files[0].is_file())

            with storage.registry_path.open("r", encoding="utf-8") as handle:
                repaired = yaml.safe_load(handle)
            self.assertIn("pkg-1", repaired["packages"])
            self.assertTrue(storage.registry_snapshot_path.is_file())

    def test_stale_registry_lock_is_recovered(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.registry_lock_path.write_text("stale", encoding="utf-8")
            old_timestamp = time.time() - (storage._STALE_LOCK_MAX_AGE_SECONDS + 5)
            os.utime(storage.registry_lock_path, (old_timestamp, old_timestamp))

            saved = storage.upsert_package(
                {
                    "id": "pkg-2",
                    "package_id": "pkg-2",
                    "slug": "revenue-cycle",
                    "version": "1.0.0",
                    "status": "uploaded",
                }
            )

            self.assertEqual(saved["id"], "pkg-2")
            self.assertFalse(storage.registry_lock_path.exists())

    def test_load_registry_falls_back_to_snapshot_on_lock_timeout(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "pkg-3",
                    "package_id": "pkg-3",
                    "slug": "patient-outcomes",
                    "version": "1.0.0",
                    "status": "uploaded",
                }
            )

            with patch.object(storage, "_registry_guard", side_effect=TimeoutError("busy")):
                registry = storage.load_registry()

            self.assertIn("pkg-3", registry["packages"])
            self.assertEqual(registry["packages"]["pkg-3"]["slug"], "patient-outcomes")

    def test_list_active_packages_requires_product_promotion(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "pkg-pending",
                    "package_id": "pkg-pending",
                    "slug": "patient-outcomes",
                    "version": "1.0.0",
                    "status": "active",
                    "enabled": True,
                    "materialization_status": "materialized",
                    "activation_status": "active",
                    "live_verification_status": "previewable",
                    "product_promotion_status": "pending_live_verification",
                }
            )
            storage.upsert_package(
                {
                    "id": "pkg-promoted",
                    "package_id": "pkg-promoted",
                    "slug": "patient-outcomes",
                    "version": "1.0.1",
                    "status": "degraded",
                    "enabled": True,
                    "materialization_status": "materialized",
                    "activation_status": "active",
                    "live_verification_status": "degraded",
                    "product_promotion_status": "promoted",
                    "last_action": "verify-live",
                }
            )
            storage.set_active_pointer("patient-outcomes", "pkg-promoted", "1.0.1")

            active_packages = storage.list_active_packages()

            self.assertEqual(len(active_packages), 1)
            self.assertEqual(active_packages[0]["id"], "pkg-promoted")

    def test_legacy_promoted_package_survives_runtime_access_audit_events(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "pkg-legacy",
                    "package_id": "pkg-legacy",
                    "slug": "patient-outcomes",
                    "version": "1.0.0",
                    "status": "degraded",
                    "enabled": True,
                    "materialization_status": "materialized",
                    "activation_status": "active",
                    "live_verification_status": "degraded",
                    "product_promotion_status": None,
                    "last_action": "patient-level drilldown access",
                    "actions": [
                        {"action": "upload"},
                        {"action": "compile"},
                        {"action": "materialize"},
                        {"action": "activate"},
                        {"action": "verify-live"},
                        {"action": "patient-level drilldown access"},
                    ],
                }
            )
            storage.set_active_pointer("patient-outcomes", "pkg-legacy", "1.0.0")

            active_packages = storage.list_active_packages()

            self.assertEqual(len(active_packages), 1)
            self.assertEqual(active_packages[0]["id"], "pkg-legacy")

    def test_record_action_can_append_audit_event_without_mutating_package_state(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "pkg-audit",
                    "package_id": "pkg-audit",
                    "slug": "patient-outcomes",
                    "version": "1.0.0",
                    "status": "degraded",
                    "enabled": True,
                    "materialization_status": "materialized",
                    "activation_status": "active",
                    "live_verification_status": "degraded",
                    "product_promotion_status": "promoted",
                    "last_action": "verify-live",
                    "last_action_at": "2026-05-31T15:38:53Z",
                }
            )

            storage.record_action(
                package_id="pkg-audit",
                slug="patient-outcomes",
                version="1.0.0",
                actor="portal-user",
                action="restricted PHI attribute access",
                status="degraded",
                validation_result="warning",
                log="Runtime endpoint /overview accessed.",
                update_package_state=False,
            )

            record = storage.get_package("pkg-audit")

            assert record is not None
            self.assertEqual(record["status"], "degraded")
            self.assertEqual(record["last_action"], "verify-live")
            self.assertEqual(record["product_promotion_status"], "promoted")
            self.assertEqual(record["actions"][-1]["action"], "restricted PHI attribute access")

    def test_list_packages_recovers_from_staged_package_when_registry_is_empty(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            staged_root = storage.staged_dir("golden-example", "1.0.0")
            staged_root.mkdir(parents=True, exist_ok=True)
            build_valid_package_tree(staged_root, slug="patient-outcomes")

            storage.record_action(
                package_id="golden-example",
                slug="patient-outcomes",
                version="1.0.0",
                actor="portal-admin",
                action="upload",
                status="validated",
                validation_result="warning",
                log="Package uploaded.",
            )
            storage.record_action(
                package_id="golden-example",
                slug="patient-outcomes",
                version="1.0.0",
                actor="portal-admin",
                action="compile",
                status="compiled",
                validation_result="warning",
                log="Package compiled.",
            )

            storage.save_registry({"packages": {}, "active_versions": {}})

            packages = storage.list_packages()
            record = storage.get_package("golden-example")

            self.assertEqual(len(packages), 1)
            self.assertEqual(packages[0]["slug"], "patient-outcomes")
            self.assertEqual(packages[0]["compile_status"], "compiled")
            self.assertIsNotNone(record)
            self.assertEqual(record["id"], "golden-example@1.0.0")

    def test_list_active_packages_recovers_promoted_package_when_registry_is_empty(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            staged_root = storage.staged_dir("golden-example", "1.0.0")
            staged_root.mkdir(parents=True, exist_ok=True)
            build_valid_package_tree(staged_root, slug="patient-outcomes")

            for action, status in (
                ("upload", "validated"),
                ("compile", "compiled"),
                ("materialize", "materialized"),
                ("activate", "active"),
                ("verify-live", "degraded"),
            ):
                storage.record_action(
                    package_id="golden-example",
                    slug="patient-outcomes",
                    version="1.0.0",
                    actor="portal-admin",
                    action=action,
                    status=status,
                    validation_result="warning",
                    log=f"{action} completed.",
                )

            storage.save_registry({"packages": {}, "active_versions": {}})

            active_packages = storage.list_active_packages()

            self.assertEqual(len(active_packages), 1)
            self.assertEqual(active_packages[0]["slug"], "patient-outcomes")
            self.assertEqual(active_packages[0]["product_promotion_status"], "promoted")

    def test_mark_uninstalled_removes_staged_and_uploaded_assets_from_recovery(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            staged_root = storage.staged_dir("golden-example", "1.0.0")
            staged_root.mkdir(parents=True, exist_ok=True)
            build_valid_package_tree(staged_root, slug="patient-outcomes")
            storage.save_original_zip("golden-example", "1.0.0", b"zip-bytes")

            storage.record_action(
                package_id="golden-example",
                slug="patient-outcomes",
                version="1.0.0",
                actor="portal-admin",
                action="upload",
                status="validated",
                validation_result="warning",
                log="Package uploaded.",
            )

            storage.mark_uninstalled("golden-example", "1.0.0", preserve_audit=True)
            storage.save_registry({"packages": {}, "active_versions": {}})

            packages = storage.list_packages()

            self.assertEqual(packages, [])
            self.assertFalse(storage.staged_dir("golden-example", "1.0.0").exists())
            self.assertFalse(storage.upload_dir("golden-example", "1.0.0").exists())

    def test_recovered_active_package_prefers_latest_lifecycle_version_over_recent_audit_activity(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            for version in ("1.6.0", "1.7.0"):
                staged_root = storage.staged_dir("golden-example", version)
                staged_root.mkdir(parents=True, exist_ok=True)
                build_valid_package_tree(staged_root, slug="patient-outcomes")

            old_events = [
                {"action": "upload", "status": "validated", "timestamp": "2026-05-31T10:00:00Z"},
                {"action": "compile", "status": "compiled", "timestamp": "2026-05-31T10:05:00Z"},
                {"action": "materialize", "status": "materialized", "timestamp": "2026-05-31T10:10:00Z"},
                {"action": "activate", "status": "active", "timestamp": "2026-05-31T10:15:00Z"},
                {"action": "verify-live", "status": "degraded", "timestamp": "2026-05-31T10:20:00Z"},
                {"action": "patient-level drilldown access", "status": "degraded", "timestamp": "2026-05-31T12:00:00Z"},
            ]
            new_events = [
                {"action": "upload", "status": "validated", "timestamp": "2026-05-31T11:00:00Z"},
                {"action": "compile", "status": "compiled", "timestamp": "2026-05-31T11:05:00Z"},
                {"action": "materialize", "status": "materialized", "timestamp": "2026-05-31T11:10:00Z"},
                {"action": "activate", "status": "active", "timestamp": "2026-05-31T11:15:00Z"},
                {"action": "verify-live", "status": "degraded", "timestamp": "2026-05-31T11:20:00Z"},
            ]

            for event in old_events:
                storage.record_action(
                    package_id="golden-example",
                    slug="patient-outcomes",
                    version="1.6.0",
                    actor="portal-admin",
                    action=event["action"],
                    status=event["status"],
                    validation_result="warning",
                    log=f"{event['action']} completed.",
                    update_package_state=event["action"] != "patient-level drilldown access",
                )
            for event in new_events:
                storage.record_action(
                    package_id="golden-example",
                    slug="patient-outcomes",
                    version="1.7.0",
                    actor="portal-admin",
                    action=event["action"],
                    status=event["status"],
                    validation_result="warning",
                    log=f"{event['action']} completed.",
                )

            storage.save_registry({"packages": {}, "active_versions": {}})

            active_record = storage.get_active_package_by_slug("patient-outcomes")

            self.assertIsNotNone(active_record)
            self.assertEqual(active_record["version"], "1.7.0")

    def test_recovered_active_package_uses_persisted_snapshot_runtime_definition(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(
                {
                    "id": "golden-example@1.7.0",
                    "package_id": "golden-example",
                    "slug": "patient-outcomes",
                    "name": "Patient Outcomes",
                    "version": "1.7.0",
                    "status": "degraded",
                    "enabled": True,
                    "package_validation_status": "warning",
                    "compile_status": "compiled",
                    "materialization_status": "materialized",
                    "activation_status": "active",
                    "live_verification_status": "degraded",
                    "product_promotion_status": "promoted",
                    "runtime_definition": {
                        "identity": {"slug": "patient-outcomes", "name": "Patient Outcomes", "version": "1.7.0"},
                        "workspace_route": "/use-cases/patient-outcomes",
                        "tabs": [{"id": "overview", "route": "/use-cases/patient-outcomes"}],
                        "dashboard_model": {"version": 1, "tabs": [{"id": "overview", "widgets": [{"id": "readmission"}]}]},
                    },
                    "last_action": "verify-live",
                    "last_action_at": "2026-05-31T19:00:00Z",
                    "actions": [{"action": "verify-live", "timestamp": "2026-05-31T19:00:00Z"}],
                }
            )
            storage.set_active_pointer("patient-outcomes", "golden-example@1.7.0", "1.7.0")
            storage.save_registry({"packages": {}, "active_versions": {"patient-outcomes": {"package_key": "golden-example@1.7.0", "version": "1.7.0"}}})

            active_record = storage.get_active_package_by_slug("patient-outcomes")

            self.assertIsNotNone(active_record)
            assert active_record is not None
            self.assertEqual(active_record["version"], "1.7.0")
            self.assertEqual(active_record["runtime_definition"]["workspace_route"], "/use-cases/patient-outcomes")
            self.assertEqual(
                active_record["runtime_definition"]["dashboard_model"]["tabs"][0]["widgets"][0]["id"],
                "readmission",
            )


if __name__ == "__main__":
    unittest.main()
