from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance.read_service import GovernanceNotFound, GovernanceReadService  # noqa: E402
from app.governance.taxonomy import SignalStatus, TrustStatus  # noqa: E402


class GovernanceReadServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = GovernanceReadService(
            use_cases_dir=REPO_ROOT / "governance/use-cases",
            policies_dir=REPO_ROOT / "governance/policies",
        )

    def test_use_case_response_uses_yaml_and_keeps_unknown_signals(self):
        record = self.service.get_use_case("bed-pressure")

        self.assertEqual(record.slug, "bed-pressure")
        self.assertEqual(record.owner, "Clinical Operations Analytics")
        self.assertEqual(record.trust_status, TrustStatus.UNKNOWN)
        self.assertTrue(any(signal.status == SignalStatus.PASS for signal in record.signals))
        self.assertTrue(any(signal.status == SignalStatus.UNKNOWN for signal in record.signals))

    def test_metric_response_declares_missing_quality_evidence(self):
        metric = self.service.get_metric("bed-pressure", "current-occupancy-rate")

        self.assertEqual(metric.source_table_id, "analytics.fct_bed_occupancy")
        self.assertEqual(metric.trust_status, TrustStatus.UNKNOWN)
        self.assertEqual(metric.evidence[0].state, "loaded")
        self.assertEqual(metric.evidence[1].state, "no_evidence_loaded")

    def test_table_response_does_not_fake_attributes_or_quality(self):
        table = self.service.get_table("bed-pressure", "analytics.fct_bed_occupancy")

        self.assertEqual(table.name, "analytics.fct_bed_occupancy")
        self.assertEqual(table.attributes, [])
        self.assertEqual(table.trust_status, TrustStatus.UNKNOWN)
        self.assertTrue(any(source.source_type == "dbt_catalog" for source in table.evidence))

    def test_lineage_response_marks_dbt_edges_as_missing(self):
        lineage = self.service.get_lineage("bed-pressure")

        self.assertTrue(any(node["id"] == "analytics.fct_bed_occupancy" for node in lineage["nodes"]))
        self.assertEqual(lineage["edges"], [])
        self.assertEqual(lineage["evidence"][1].state, "no_evidence_loaded")

    def test_policy_response_is_policy_yaml_backed(self):
        policy = self.service.get_policy("healthcare-default")

        self.assertEqual(policy.policy_id, "healthcare-default")
        self.assertEqual(policy.evidence.state, "loaded")
        self.assertEqual(policy.rules[0]["rule_id"], "patient-identifiers")

    def test_missing_records_raise_not_found(self):
        with self.assertRaises(GovernanceNotFound):
            self.service.get_metric("bed-pressure", "missing")


if __name__ == "__main__":
    unittest.main()
