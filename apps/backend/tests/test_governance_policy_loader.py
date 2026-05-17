from __future__ import annotations

import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance.policy_loader import (  # noqa: E402
    ClassificationException,
    GovernancePolicyError,
    load_policies,
    load_policy,
    select_policy_rule,
)
from app.governance.taxonomy import Classification, Sensitivity  # noqa: E402


class GovernancePolicyLoaderTests(unittest.TestCase):
    def test_loads_policy_rules(self):
        policy = load_policy(REPO_ROOT / "governance/policies/healthcare-default.yaml")

        self.assertEqual(policy.policy_id, "healthcare-default")
        self.assertEqual(policy.status, "active")
        self.assertEqual(policy.rules[0].classification, Classification.RESTRICTED)

    def test_invalid_rule_without_match_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "policy.yaml"
            path.write_text(
                textwrap.dedent(
                    """
                    policy_id: broken
                    name: Broken
                    version: "1"
                    status: active
                    owner: Owner
                    standard_or_framework: Test
                    scope: [test]
                    classification_levels: [public]
                    rules:
                      - rule_id: no-match
                        description: Missing match
                        match: {}
                        classification: public
                        sensitivity: low
                    """
                ),
                encoding="utf-8",
            )

            with self.assertRaises(GovernancePolicyError):
                load_policy(path)

    def test_exception_wins_policy_precedence(self):
        policy = load_policy(REPO_ROOT / "governance/policies/healthcare-default.yaml")
        exception = ClassificationException(
            classification=Classification.CONFIDENTIAL,
            sensitivity=Sensitivity.MEDIUM,
            reason="Temporary approved exception",
        )

        selected = select_policy_rule(policy.rules, exception=exception)

        self.assertIs(selected, exception)

    def test_most_restrictive_then_specific_rule_wins(self):
        policy = load_policy(REPO_ROOT / "governance/policies/healthcare-default.yaml")

        selected = select_policy_rule(policy.rules)

        self.assertEqual(getattr(selected, "rule_id", None), "patient-identifiers")

    def test_load_policies_from_directory(self):
        policies = load_policies(REPO_ROOT / "governance/policies")

        self.assertTrue(any(policy.policy_id == "healthcare-default" for policy in policies))


if __name__ == "__main__":
    unittest.main()
