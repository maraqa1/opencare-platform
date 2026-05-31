from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import build_valid_package_tree, build_zip_bytes, client, package_test_context
from app.config import settings


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

    def test_package_moves_through_compile_materialize_activate_flow(self):
        with package_test_context():
            package_id = self._upload_package()

            validate_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/validate",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(validate_response.status_code, 200)

            activate_before_materialize = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/activate",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(activate_before_materialize.status_code, 400)

            compile_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/compile",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(compile_response.status_code, 200)
            self.assertEqual(compile_response.json()["package"]["compile_status"], "compiled")

            materialize_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/materialize",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(materialize_response.status_code, 200)
            self.assertEqual(materialize_response.json()["package"]["materialization_status"], "materialized")

            include_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/include",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(include_response.status_code, 200)
            self.assertTrue(include_response.json()["package"]["enabled"])
            self.assertEqual(include_response.json()["package"]["activation_status"], "active")
            self.assertEqual(
                include_response.json()["package"]["product_promotion_status"],
                "pending_live_verification",
            )

            config_before_verify = client().get("/api/v1/config/use-cases")
            self.assertEqual(config_before_verify.status_code, 200)
            self.assertEqual(
                len(config_before_verify.json().get("active_imported_use_cases", [])),
                0,
            )

            verify_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/verify-live",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(verify_response.status_code, 200)
            self.assertIn(verify_response.json()["package"]["live_verification_status"], {"degraded", "live_verified"})
            self.assertEqual(
                verify_response.json()["package"]["product_promotion_status"],
                "promoted",
            )

            config_after_verify = client().get("/api/v1/config/use-cases")
            self.assertEqual(config_after_verify.status_code, 200)
            active_imported = config_after_verify.json().get("active_imported_use_cases", [])
            self.assertEqual(len(active_imported), 1)
            self.assertEqual(active_imported[0]["package_id"], include_response.json()["package"]["package_id"])
            self.assertEqual(active_imported[0]["product_promotion_status"], "promoted")

            exclude_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/exclude",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(exclude_response.status_code, 200)
            self.assertFalse(exclude_response.json()["package"]["enabled"])

            uninstall_fail = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/uninstall",
                headers={"x-opencare-admin-context": "admin"},
                json={"confirm": False, "preserve_audit": True},
            )
            self.assertEqual(uninstall_fail.status_code, 400)

            uninstall_ok = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/uninstall",
                headers={"x-opencare-admin-context": "admin"},
                json={"confirm": True, "preserve_audit": False},
            )
            self.assertEqual(uninstall_ok.status_code, 200)
            self.assertEqual(uninstall_ok.json()["package"]["status"], "uninstalled")

            packages_after_uninstall = client().get(
                "/api/v1/admin/use-case-templates",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(packages_after_uninstall.status_code, 200)
            self.assertEqual(packages_after_uninstall.json()["packages"], [])

    def test_materialization_module_can_be_disabled_without_breaking_preview_flow(self):
        with package_test_context():
            package_id = self._upload_package()

            validate_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/validate",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(validate_response.status_code, 200)

            compile_response = client().post(
                f"/api/v1/admin/use-case-templates/{package_id}/compile",
                headers={"x-opencare-admin-context": "admin"},
            )
            self.assertEqual(compile_response.status_code, 200)

            original = settings.use_case_materialization_enabled
            object.__setattr__(settings, "use_case_materialization_enabled", False)
            try:
                materialize_response = client().post(
                    f"/api/v1/admin/use-case-templates/{package_id}/materialize",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(materialize_response.status_code, 400)
                self.assertIn("materialization module is disabled", materialize_response.json()["detail"])

                activate_response = client().post(
                    f"/api/v1/admin/use-case-templates/{package_id}/activate",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(activate_response.status_code, 400)
                self.assertIn("materialization module is disabled", activate_response.json()["detail"])
            finally:
                object.__setattr__(settings, "use_case_materialization_enabled", original)
