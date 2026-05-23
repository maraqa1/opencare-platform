from __future__ import annotations

import io
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import client, package_test_context


class UseCaseTemplateSecurityTests(unittest.TestCase):
    def test_upload_rejects_path_traversal_zip(self):
        archive_buffer = io.BytesIO()
        with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("root/../evil.txt", "bad")

        with package_test_context():
            response = client().post(
                "/api/v1/admin/use-case-templates/upload",
                headers={"x-opencare-admin-context": "admin"},
                files={"package": ("bad.zip", archive_buffer.getvalue(), "application/zip")},
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Path traversal", response.json()["detail"])

    def test_upload_rejects_multiple_root_folders(self):
        archive_buffer = io.BytesIO()
        with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("first/package.yaml", "api_version: v1")
            archive.writestr("second/manifest/usecase.yaml", "slug: mismatch")

        with package_test_context():
            response = client().post(
                "/api/v1/admin/use-case-templates/upload",
                headers={"x-opencare-admin-context": "admin"},
                files={"package": ("roots.zip", archive_buffer.getvalue(), "application/zip")},
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("exactly one root folder", response.json()["detail"])

    def test_upload_rejects_forbidden_env_file(self):
        archive_buffer = io.BytesIO()
        with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("root/.env", "SECRET=1")

        with package_test_context():
            response = client().post(
                "/api/v1/admin/use-case-templates/upload",
                headers={"x-opencare-admin-context": "admin"},
                files={"package": ("forbidden.zip", archive_buffer.getvalue(), "application/zip")},
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Hidden files or folders", response.json()["detail"])

