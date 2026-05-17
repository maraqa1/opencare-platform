from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PORTAL_ROOT = REPO_ROOT / "apps/portal"


class GovernancePortalPhase4Tests(unittest.TestCase):
    def test_all_viewer_routes_exist(self):
        expected_pages = [
            "app/governance/page.tsx",
            "app/governance/loading.tsx",
            "app/governance/use-cases/[slug]/page.tsx",
            "app/governance/use-cases/[slug]/metrics/[id]/page.tsx",
            "app/governance/use-cases/[slug]/tables/[id]/page.tsx",
            "app/governance/use-cases/[slug]/lineage/page.tsx",
            "app/governance/issues/page.tsx",
            "app/governance/evidence/page.tsx",
            "app/governance/policies/page.tsx",
        ]

        for page in expected_pages:
            with self.subTest(page=page):
                self.assertTrue((PORTAL_ROOT / page).exists())

    def test_phase4_uses_governance_api_and_not_static_registry(self):
        api_client = (PORTAL_ROOT / "lib/governance/api.ts").read_text(encoding="utf-8")
        overview = (PORTAL_ROOT / "app/governance/page.tsx").read_text(encoding="utf-8")

        self.assertIn("/api/v1/governance/use-cases", api_client)
        self.assertIn("/api/v1/governance/evidence/packs", api_client)
        self.assertNotIn("governance-registry", overview)

    def test_viewer_pages_do_not_render_operator_actions(self):
        phase4_files = [
            *PORTAL_ROOT.glob("app/governance/**/*.tsx"),
            PORTAL_ROOT / "components/governance-v2/GovernancePanels.tsx",
        ]
        combined = "\n".join(path.read_text(encoding="utf-8") for path in phase4_files)

        forbidden = [
            "Assign issue",
            "Resolve issue",
            "Ignore issue",
            "Change Classification",
            "Add Exception",
            "/api/v1/governance/admin",
            "/api/v1/governance/evidence/exports",
            "Trust Center",
        ]
        for text in forbidden:
            with self.subTest(text=text):
                self.assertNotIn(text, combined)


if __name__ == "__main__":
    unittest.main()
