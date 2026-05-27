from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tests.use_case_template_test_helpers import build_valid_package_tree, build_zip_bytes, client, package_test_context


class UseCaseRuntimeResolverTests(unittest.TestCase):
    def test_materialized_package_resolves_workspace_and_kpis(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root, slug="patient-outcomes")
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                upload = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden.zip", zip_bytes, "application/zip")},
                )
                package_id = upload.json()["package"]["id"]

                for action in ("validate", "compile", "materialize", "activate"):
                    response = client().post(
                        f"/api/v1/admin/use-case-templates/{package_id}/{action}",
                        headers={"x-opencare-admin-context": "admin"},
                    )
                    self.assertEqual(response.status_code, 200, response.text)

                workspace = client().get("/api/v1/use-cases/patient-outcomes/workspace")
                self.assertEqual(workspace.status_code, 200)
                self.assertEqual(workspace.json()["workspace"]["state"]["materialization_status"], "materialized")

                kpis = client().get("/api/v1/use-cases/patient-outcomes/kpis")
                self.assertEqual(kpis.status_code, 200)
                self.assertTrue(kpis.json()["meta"]["empty"])

    def test_materialized_package_resolves_tab_payload(self):
        with tempfile.TemporaryDirectory(prefix="package-") as temp_dir:
            root = Path(temp_dir) / "golden-package"
            build_valid_package_tree(root, slug="patient-outcomes")
            zip_bytes = build_zip_bytes(root)

            with package_test_context():
                upload = client().post(
                    "/api/v1/admin/use-case-templates/upload",
                    headers={"x-opencare-admin-context": "admin"},
                    files={"package": ("golden.zip", zip_bytes, "application/zip")},
                )
                package_id = upload.json()["package"]["id"]

                for action in ("validate", "compile", "materialize", "activate"):
                    response = client().post(
                        f"/api/v1/admin/use-case-templates/{package_id}/{action}",
                        headers={"x-opencare-admin-context": "admin"},
                    )
                    self.assertEqual(response.status_code, 200, response.text)

                tab_payload = client().get("/api/v1/use-cases/patient-outcomes/tabs/overview")
                self.assertEqual(tab_payload.status_code, 200)
                body = tab_payload.json()["tab_payload"]
                self.assertEqual(body["tab"]["id"], "overview")
                self.assertGreater(body["meta"]["widget_count"], 0)
                self.assertTrue(any(widget["component_id"] == "readmission_card" for widget in body["widgets"]))
