from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance.config_loader import load_governance_use_cases  # noqa: E402
from app.governance.validation import (  # noqa: E402
    cleanup_recommendation,
    divergence_report,
    legacy_governance_use_case_ids,
    new_governance_use_case_ids,
    validation_matrix,
)


class GovernancePhase5CValidationTests(unittest.TestCase):
    def test_legacy_registry_ids_are_detected_for_shadow_mode(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "registry.ts"
            path.write_text('const useCases = [{ id: "bed-pressure" }, { id: "legacy-only" }];', encoding="utf-8")

            self.assertEqual(legacy_governance_use_case_ids(path), {"bed-pressure", "legacy-only"})

    def test_divergence_report_blocks_cleanup_when_legacy_items_are_missing(self):
        report = divergence_report({"bed-pressure", "legacy-only"}, {"bed-pressure"})
        recommendation = cleanup_recommendation(report)

        self.assertEqual(report["missing_from_new_governance"], ["legacy-only"])
        self.assertFalse(recommendation["can_remove_legacy_governance_registry"])

    def test_current_yaml_is_visible_to_shadow_mode(self):
        use_cases = load_governance_use_cases(REPO_ROOT / "governance/use-cases")

        self.assertEqual(new_governance_use_case_ids(use_cases), {"bed-pressure"})

    def test_phase5c_validation_matrix_has_no_failures_for_implemented_scope(self):
        matrix = validation_matrix(REPO_ROOT)
        failures = [item for item in matrix if item.status == "fail"]

        self.assertEqual(failures, [])
        self.assertEqual(len(matrix), 20)


if __name__ == "__main__":
    unittest.main()
