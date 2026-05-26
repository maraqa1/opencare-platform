from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import build_valid_package_tree, build_zip_bytes, client, package_test_context


class UseCaseTemplateApiTests(unittest.TestCase):
    def test_list_preview_validation_and_actions_endpoints(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root)
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                upload_response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden.zip", zip_bytes, "application/zip")},
                )
                self.assertEqual(upload_response.status_code, 200)
                package_id = upload_response.json()["package"]["id"]

                list_response = client().get(
                    "/api/v1/admin/use-case-templates",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(list_response.status_code, 200)
                self.assertGreaterEqual(len(list_response.json()["packages"]), 1)

                preview_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/preview",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(preview_response.status_code, 200)
                self.assertIn("business_summary", preview_response.json()["preview"])

                validation_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/validation",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(validation_response.status_code, 200)
                self.assertIn("summary", validation_response.json()["validation"])

                files_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/files",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(files_response.status_code, 200)
                self.assertTrue(any(file["path"] == "package.yaml" for file in files_response.json()["files"]))

                actions_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/actions",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(actions_response.status_code, 200)
                self.assertEqual(actions_response.json()["actions"][0]["action"], "upload")

                diagnostics_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/diagnostics",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(diagnostics_response.status_code, 200)
                diagnostics = diagnostics_response.json()["diagnostics"]
                self.assertEqual(diagnostics["package"]["id"], package_id)
                self.assertIn("validation_summary", diagnostics)
                self.assertIn("compile_report", diagnostics)
                self.assertIn("materialization_report", diagnostics)
                self.assertIn("live_verification_report", diagnostics)
                self.assertIn("registry", diagnostics)
                self.assertTrue(any(file["path"] == "package.yaml" for file in diagnostics["files"]["staged"]))
                self.assertEqual(diagnostics["actions"][0]["action"], "upload")

                compile_response = client().post(
                    f"/api/v1/admin/use-case-templates/{package_id}/compile",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(compile_response.status_code, 200)

                display_contract_response = client().get(
                    f"/api/v1/admin/use-case-templates/{package_id}/display-contract",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(display_contract_response.status_code, 200)
                self.assertEqual(display_contract_response.headers.get("content-type"), "application/json")
                self.assertIn("attachment;", display_contract_response.headers.get("content-disposition", ""))
                payload = display_contract_response.json()
                self.assertEqual(payload["package"]["id"], package_id)
                self.assertTrue(any(component.get("display_contract") is not None for tab in payload["tabs"] for component in tab["components"]))

    def test_upload_keeps_distinct_versions_of_same_package(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root)
            first_zip = build_zip_bytes(root)
            (root / "package.yaml").write_text(
                (root / "package.yaml").read_text(encoding="utf-8").replace("version: 1.0.0", "version: 1.0.1"),
                encoding="utf-8",
            )
            second_zip = build_zip_bytes(root)

            with package_test_context():
                first_response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden-v1.zip", first_zip, "application/zip")},
                )
                second_response = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden-v101.zip", second_zip, "application/zip")},
                )

                self.assertEqual(first_response.status_code, 200)
                self.assertEqual(second_response.status_code, 200)
                self.assertNotEqual(first_response.json()["package"]["id"], second_response.json()["package"]["id"])

                list_response = client().get(
                    "/api/v1/admin/use-case-templates",
                    headers={"x-opencare-admin-context": "admin"},
                )
                self.assertEqual(list_response.status_code, 200)
                self.assertEqual(len(list_response.json()["packages"]), 2)
