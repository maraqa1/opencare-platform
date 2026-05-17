from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402


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

    def test_phase3_does_not_register_operator_or_export_post_routes(self):
        routes = {
            (method, route.path)
            for route in app.routes
            if hasattr(route, "methods")
            for method in route.methods
        }

        self.assertNotIn(("POST", "/api/v1/governance/admin/issues/{issue_id}/assign"), routes)
        self.assertNotIn(("POST", "/api/v1/governance/evidence/exports"), routes)


if __name__ == "__main__":
    unittest.main()
