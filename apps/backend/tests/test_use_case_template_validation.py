from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import (
    build_valid_package_tree,
    build_zip_bytes,
    client,
    package_test_context,
)


class UseCaseTemplateValidationTests(unittest.TestCase):
    def test_upload_accepts_minimal_valid_package(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root)
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden.zip", zip_bytes, "application/zip")},
                )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn(payload["validation"]["status"], {"passed", "warning"})

    def test_validation_fails_when_package_yaml_missing(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root)
            (root / "package.yaml").unlink()
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("missing-package-yaml.zip", zip_bytes, "application/zip")},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["validation"]["status"], "failed")

    def test_validation_fails_when_manifest_slug_mismatch(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root, slug="golden-example")
            (root / "manifest/usecase.yaml").write_text(
                "slug: another-slug\nname: Golden Example\ndescription: Test package\napi_prefix: /api/v1/another\n",
                encoding="utf-8",
            )
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("slug-mismatch.zip", zip_bytes, "application/zip")},
                )

        self.assertEqual(response.status_code, 200)
        checks = response.json()["validation"]["checks"]
        matching_check = next(check for check in checks if check["check"] == "manifest_slug_matches_package")
        self.assertEqual(matching_check["status"], "failed")

    def test_validation_fails_when_backend_query_reads_raw_schema(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root, query_sql="select * from raw.example")
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("raw-read.zip", zip_bytes, "application/zip")},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["validation"]["status"], "failed")

