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
            "Trust Center",
        ]
        for text in forbidden:
            with self.subTest(text=text):
                self.assertNotIn(text, combined)

    def test_evidence_export_button_posts_through_json_bridge(self):
        panels = (PORTAL_ROOT / "components/governance-v2/GovernancePanels.tsx").read_text(encoding="utf-8")
        bridge = (PORTAL_ROOT / "app/api/portal/governance/evidence/exports/route.ts").read_text(encoding="utf-8")

        self.assertIn('action="/api/portal/governance/evidence/exports"', panels)
        self.assertIn("/api/v1/governance/evidence/exports", bridge)
        self.assertIn('"content-type": "application/json"', bridge)

    def test_table_detail_has_clickable_attribute_classification_panel(self):
        panels = (PORTAL_ROOT / "components/governance-v2/GovernancePanels.tsx").read_text(encoding="utf-8")
        table_page = (PORTAL_ROOT / "app/governance/use-cases/[slug]/tables/[id]/page.tsx").read_text(encoding="utf-8")
        metric_page = (PORTAL_ROOT / "app/governance/use-cases/[slug]/metrics/[id]/page.tsx").read_text(encoding="utf-8")

        self.assertIn("AttributeDetailPanel", panels)
        self.assertIn("encodeURIComponent(attribute.id)", panels)
        self.assertIn("encodeURIComponent(table.id)", panels)
        self.assertIn("Review attributes", panels)
        self.assertIn("Policy version", panels)
        self.assertIn("Matched rule", panels)
        self.assertIn("Source system", panels)
        self.assertIn("Owner / steward", panels)
        self.assertIn("Open lineage", panels)
        self.assertIn("Not configured for viewer mode", panels)
        self.assertIn("AttributeDetailPanel", table_page)
        self.assertIn("selectedAttributeId", table_page)
        self.assertIn("encodeURIComponent(metric.source_table_id)", metric_page)

    def test_v1_3_wireframe_zones_are_represented_in_viewer_pages(self):
        panels = (PORTAL_ROOT / "components/governance-v2/GovernancePanels.tsx").read_text(encoding="utf-8")
        overview = (PORTAL_ROOT / "app/governance/page.tsx").read_text(encoding="utf-8")
        use_case = (PORTAL_ROOT / "app/governance/use-cases/[slug]/page.tsx").read_text(encoding="utf-8")
        metric = (PORTAL_ROOT / "app/governance/use-cases/[slug]/metrics/[id]/page.tsx").read_text(encoding="utf-8")
        table = (PORTAL_ROOT / "app/governance/use-cases/[slug]/tables/[id]/page.tsx").read_text(encoding="utf-8")
        lineage = (PORTAL_ROOT / "app/governance/use-cases/[slug]/lineage/page.tsx").read_text(encoding="utf-8")
        issues = (PORTAL_ROOT / "app/governance/issues/page.tsx").read_text(encoding="utf-8")
        evidence = (PORTAL_ROOT / "app/governance/evidence/page.tsx").read_text(encoding="utf-8")
        policies = (PORTAL_ROOT / "app/governance/policies/page.tsx").read_text(encoding="utf-8")

        self.assertIn("SummaryStrip", panels)
        self.assertIn("Data Governance Overview", overview)
        self.assertIn("Governed Use Cases", overview)
        self.assertIn("Governance Evidence", overview)
        self.assertIn("Lineage Preview", use_case)
        self.assertIn("MetricEvidenceGrid", metric)
        self.assertIn("Data Quality Checks", table)
        self.assertIn("Ownership and Governance", table)
        self.assertIn("Selected Table", lineage)
        self.assertIn("IssueWorklist", issues)
        self.assertIn("EvidenceCoverage", evidence)
        self.assertIn("PolicyRegistryWorkspace", policies)


if __name__ == "__main__":
    unittest.main()
