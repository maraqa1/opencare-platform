from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance.config_loader import load_governance_use_cases  # noqa: E402
from app.governance.policy_loader import load_policies  # noqa: E402
from app.governance.sync import build_seed_payload  # noqa: E402


class GovernanceSyncTests(unittest.TestCase):
    def test_builds_seed_payload_and_divergence_report(self):
        use_cases = load_governance_use_cases(REPO_ROOT / "governance/use-cases")
        policies = load_policies(REPO_ROOT / "governance/policies")

        payload = build_seed_payload(use_cases, policies, legacy_slugs={"bed-pressure", "legacy-only"})

        self.assertEqual(payload.use_cases[0]["slug"], "bed-pressure")
        self.assertEqual(payload.governed_assets[0]["evidence_source"], "governance_use_case_yaml")
        self.assertEqual(payload.policies[0]["policy_id"], "healthcare-default")
        self.assertEqual(payload.policy_rules[0]["policy_id"], "healthcare-default")
        self.assertEqual(payload.divergence_report["missing_from_governance_yaml"], ["legacy-only"])
        self.assertEqual(payload.divergence_report["matched"], ["bed-pressure"])


if __name__ == "__main__":
    unittest.main()
