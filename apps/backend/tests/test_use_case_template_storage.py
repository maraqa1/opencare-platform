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
    def test_load_registry_self_heals_corrupt_yaml(self):
        with tempfile.TemporaryDirectory(prefix="use-case-storage-") as temp_dir:
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.registry_path.write_text(
                "packages:\n"
                "  broken-entry:\n"
                "    status: uploaded\n"
                "    actions:\n"
                "      - missing-colon value\n",
                encoding="utf-8",
            )

            registry = storage.load_registry()

            self.assertEqual(registry, {"packages": {}, "active_versions": {}})

            backup_files = list(storage.root.glob("registry.yaml.corrupt.*.bak"))
            self.assertEqual(len(backup_files), 1)
            self.assertTrue(backup_files[0].is_file())

            with storage.registry_path.open("r", encoding="utf-8") as handle:
                repaired = yaml.safe_load(handle)
            self.assertEqual(repaired, {"packages": {}, "active_versions": {}})


if __name__ == "__main__":
    unittest.main()
