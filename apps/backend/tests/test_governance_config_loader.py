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

from app.governance.config_loader import (  # noqa: E402
    GovernanceConfigError,
    load_governance_use_case,
    load_governance_use_cases,
)


class GovernanceConfigLoaderTests(unittest.TestCase):
    def test_loads_valid_use_case_with_checksum(self):
        path = REPO_ROOT / "governance/use-cases/bed-pressure.yaml"

        config = load_governance_use_case(path)

        self.assertEqual(config.schema_version, "1.0")
        self.assertEqual(config.slug, "bed-pressure")
        self.assertEqual(config.ownership.owner, "Clinical Operations Analytics")
        self.assertEqual(config.source_systems[0].id, "emr")
        self.assertTrue(config.checksum)
        self.assertEqual(config.governed_tables[0].schema_name, "analytics")
        self.assertEqual(config.governed_tables[0].purpose, "Daily ward occupancy fact used by bed pressure reporting.")
        self.assertEqual(config.consumers[0].type, "portal")
        self.assertEqual(config.freshness.sla, "2 hours")
        self.assertEqual(config.evidence.expected_dbt_models, ["fct_bed_occupancy"])

    def test_invalid_yaml_is_hard_fail(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "broken.yaml"
            path.write_text(
                textwrap.dedent(
                    """
                    slug: broken
                    name: Broken
                    """
                ),
                encoding="utf-8",
            )

            with self.assertRaises(GovernanceConfigError):
                load_governance_use_case(path)

    def test_unexpected_fields_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "bad-defaults.yaml"
            content = (REPO_ROOT / "governance/use-cases/bed-pressure.yaml").read_text(encoding="utf-8")
            path.write_text(f"{content}\ntrust_status: trusted\n", encoding="utf-8")

            with self.assertRaises(GovernanceConfigError):
                load_governance_use_case(path)

    def test_duplicate_slugs_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            content = (REPO_ROOT / "governance/use-cases/bed-pressure.yaml").read_text(encoding="utf-8")
            (root / "one.yaml").write_text(content, encoding="utf-8")
            (root / "two.yaml").write_text(content, encoding="utf-8")

            with self.assertRaises(GovernanceConfigError):
                load_governance_use_cases(root)


if __name__ == "__main__":
    unittest.main()
