from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import build_valid_package_tree, build_zip_bytes, client, package_test_context


class UseCaseTemplateLifecycleTests(unittest.TestCase):
    def _upload_package(self) -> str:
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root)
            zip_bytes = build_zip_bytes(root)
            response = client().post(
                "/api/v1/admin/use-case-templates/upload",
                headers={"x-opencare-admin-context": "admin"},
                files={"package": ("golden.zip", zip_bytes, "application/zip")},
            )
        self.assertEqual(response.status_code, 200)
        return response.json()["package"]["id"]

    def test_staged_only_package_blocks_install_but_allows_uninstall(self):
        with package_test_context():
            package_id = self._upload_package()

            validate_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/validate",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(validate_response.status_code, 200)

            install_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/install",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(install_response.status_code, 400)

            uninstall_fail = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/uninstall",
                headers={"x-opencare-admin-context": "admin"},
                json={"confirm": False, "preserve_audit": True},
            )
            self.assertEqual(uninstall_fail.status_code, 400)

            uninstall_ok = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/uninstall",
                headers={"x-opencare-admin-context": "admin"},
                json={"confirm": True, "preserve_audit": True},
            )
            self.assertEqual(uninstall_ok.status_code, 200)
            self.assertEqual(uninstall_ok.json()["package"]["status"], "uninstalled")
