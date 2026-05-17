from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi import HTTPException  # noqa: E402
from app.main import app  # noqa: E402
from app.routes.governance import require_operator  # noqa: E402


class GovernanceRouteRegistrationTests(unittest.TestCase):
    def test_phase3_read_only_routes_are_registered(self):
        paths = {route.path for route in app.routes}

        expected = {
            "/api/v1/governance/use-cases",
            "/api/v1/governance/use-cases/{slug}",
            "/api/v1/governance/use-cases/{slug}/metrics",
            "/api/v1/governance/use-cases/{slug}/metrics/{metric_id}",
            "/api/v1/governance/use-cases/{slug}/tables",
            "/api/v1/governance/use-cases/{slug}/tables/{table_id}",
            "/api/v1/governance/attributes/{attribute_id}",
            "/api/v1/governance/use-cases/{slug}/lineage",
            "/api/v1/governance/issues",
            "/api/v1/governance/issues/{issue_id}",
            "/api/v1/governance/evidence/packs",
            "/api/v1/governance/policies",
            "/api/v1/governance/policies/{policy_id}",
            "/api/v1/governance/audit/events",
        }

        self.assertTrue(expected.issubset(paths))

    def test_phase5a_operator_routes_are_registered_but_exports_are_not(self):
        routes = {
            (method, route.path)
            for route in app.routes
            if hasattr(route, "methods")
            for method in route.methods
        }

        self.assertIn(("POST", "/api/v1/governance/admin/issues/{issue_id}/assign"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/issues/{issue_id}/resolve"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/issues/{issue_id}/ignore"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/attributes/{attribute_id}/classify"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/attributes/{attribute_id}/approve"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/attributes/{attribute_id}/exception"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/policies/{policy_id}/publish"), routes)
        self.assertIn(("POST", "/api/v1/governance/admin/policies/{policy_id}/retire"), routes)
        self.assertIn(("GET", "/api/v1/governance/evidence/exports"), routes)
        self.assertIn(("POST", "/api/v1/governance/evidence/exports"), routes)
        self.assertIn(("GET", "/api/v1/governance/evidence/exports/{export_id}"), routes)
        self.assertIn(("GET", "/api/v1/governance/evidence/exports/{export_id}/download"), routes)

    def test_operator_dependency_rejects_viewer_role(self):
        with self.assertRaises(HTTPException) as context:
            require_operator("viewer")

        self.assertEqual(context.exception.status_code, 403)

    def test_operator_dependency_allows_operator_role(self):
        self.assertIsNone(require_operator("operator"))



if __name__ == "__main__":
    unittest.main()
