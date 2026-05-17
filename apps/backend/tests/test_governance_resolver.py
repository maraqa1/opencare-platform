from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.governance.resolver import GovernanceResolver  # noqa: E402
from app.governance.taxonomy import SignalStatus, TrustStatus  # noqa: E402


class GovernanceResolverTests(unittest.TestCase):
    def test_missing_evidence_is_explicit(self):
        resolver = GovernanceResolver()

        source = resolver.evidence_or_missing(
            "bed-pressure:freshness",
            "dbt_source_freshness",
            "dbt source freshness artifact is not loaded.",
        )

        self.assertEqual(source.state, "no_evidence_loaded")
        self.assertEqual(source.source_type, "dbt_source_freshness")
        self.assertIn("not loaded", source.detail or "")

    def test_empty_use_case_record_does_not_fake_trust(self):
        resolver = GovernanceResolver()

        record = resolver.empty_use_case_record("bed-pressure", "Bed Pressure")

        self.assertEqual(record.trust_status, TrustStatus.UNKNOWN)
        self.assertTrue(record.signals)
        self.assertTrue(all(signal.status == SignalStatus.UNKNOWN for signal in record.signals))
        self.assertTrue(all(signal.evidence.state == "no_evidence_loaded" for signal in record.signals))


if __name__ == "__main__":
    unittest.main()

