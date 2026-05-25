from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.use_case_template_storage import UseCaseTemplateStorage


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


if __name__ == "__main__":
    unittest.main()
