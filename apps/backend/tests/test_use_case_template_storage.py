from __future__ import annotations

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
