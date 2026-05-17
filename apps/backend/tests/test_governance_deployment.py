from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


class GovernanceDeploymentTests(unittest.TestCase):
    def test_backend_image_copies_governance_config(self):
        dockerfile = (REPO_ROOT / "apps/backend/Dockerfile").read_text(encoding="utf-8")

        self.assertIn("COPY governance ./governance", dockerfile)


if __name__ == "__main__":
    unittest.main()
