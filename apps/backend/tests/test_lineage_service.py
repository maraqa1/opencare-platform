from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.classification_service import classify_column, normalise_column_metadata


class ColumnClassificationTests(unittest.TestCase):
    def test_preserves_explicit_column_classification(self):
        column = normalise_column_metadata(
            "custom_field",
            {"meta": {"classification": "restricted"}},
            {"classification": "operational"},
        )

        self.assertEqual(column["meta"]["classification"], "restricted")
        self.assertEqual(column["meta"]["classification_source"], "explicit")
        self.assertTrue(column["classification"]["enforcement_eligible"])

    def test_maps_high_pii_to_phi_without_enforcement(self):
        column = normalise_column_metadata(
            "medical_record_number",
            {"meta": {"contains_pii": True, "pii_level": "HIGH"}},
            {"classification": "patient_identifiable"},
        )

        self.assertEqual(column["meta"]["classification"], "phi")
        self.assertEqual(column["meta"]["classification_source"], "pii_rule")
        self.assertFalse(column["classification"]["enforcement_eligible"])
        self.assertIn("none", column["classification"]["policy_actions"])

    def test_classifies_known_identifier_patterns(self):
        claim = normalise_column_metadata("claim_id", {}, {"classification": "operational"})
        ward = normalise_column_metadata("ward_code", {}, {"classification": "operational"})

        self.assertEqual(claim["meta"]["classification"], "sensitive")
        self.assertEqual(claim["meta"]["classification_source"], "field_name_rule")
        self.assertEqual(ward["meta"]["classification"], "internal")
        self.assertEqual(ward["meta"]["classification_source"], "field_name_rule")

    def test_inherits_asset_classification_when_no_rule_matches(self):
        financial = normalise_column_metadata("expected_cash", {}, {"classification": "financial"})
        reference = normalise_column_metadata("ward_name", {}, {"classification": "reference"})

        self.assertEqual(financial["meta"]["classification"], "sensitive")
        self.assertEqual(financial["meta"]["classification_source"], "asset_inherited")
        self.assertEqual(reference["meta"]["classification"], "internal")
        self.assertEqual(reference["meta"]["classification_source"], "asset_inherited")

    def test_unknown_default_is_low_confidence_and_not_reviewed(self):
        classification = classify_column("unmapped_value", {}, {}, "unknown_asset")

        self.assertEqual(classification["sensitivity"], "unknown")
        self.assertEqual(classification["confidence_tier"], "low")
        self.assertEqual(classification["review_state"], "not_reviewed")
        self.assertFalse(classification["enforcement_eligible"])


if __name__ == "__main__":
    unittest.main()
