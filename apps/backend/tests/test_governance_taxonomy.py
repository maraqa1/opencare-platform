from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.governance.taxonomy import (  # noqa: E402
    Classification,
    SignalStatus,
    TrustStatus,
    derive_trust_status,
    most_restrictive_classification,
    normalise_signal,
)


class GovernanceTaxonomyTests(unittest.TestCase):
    def test_unknown_signal_keeps_trust_unknown(self):
        status = derive_trust_status(
            freshness=SignalStatus.PASS,
            quality=SignalStatus.PASS,
            ownership=SignalStatus.UNKNOWN,
            coverage=SignalStatus.PASS,
        )

        self.assertEqual(status, TrustStatus.UNKNOWN)

    def test_failed_signal_degrades_when_evidence_is_known(self):
        status = derive_trust_status(
            freshness=SignalStatus.PASS,
            quality=SignalStatus.FAIL,
            ownership=SignalStatus.PASS,
            coverage=SignalStatus.PASS,
        )

        self.assertEqual(status, TrustStatus.DEGRADED)

    def test_warn_signal_needs_review(self):
        status = derive_trust_status(
            freshness=SignalStatus.PASS,
            quality=SignalStatus.WARN,
            ownership=SignalStatus.PASS,
            coverage=SignalStatus.PASS,
        )

        self.assertEqual(status, TrustStatus.NEEDS_REVIEW)

    def test_all_pass_signals_are_trusted(self):
        status = derive_trust_status(
            freshness=SignalStatus.PASS,
            quality=SignalStatus.PASS,
            ownership=SignalStatus.PASS,
            coverage=SignalStatus.PASS,
        )

        self.assertEqual(status, TrustStatus.TRUSTED)

    def test_most_restrictive_classification_wins(self):
        classification = most_restrictive_classification(
            [Classification.PUBLIC, Classification.CONFIDENTIAL, Classification.INTERNAL]
        )

        self.assertEqual(classification, Classification.CONFIDENTIAL)

    def test_normalise_missing_values_to_unknown(self):
        self.assertEqual(normalise_signal(None), SignalStatus.UNKNOWN)
        self.assertEqual(normalise_signal("not instrumented"), SignalStatus.UNKNOWN)
        self.assertEqual(normalise_signal("fresh"), SignalStatus.PASS)


if __name__ == "__main__":
    unittest.main()

