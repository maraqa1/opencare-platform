from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.use_case_package_compiler import UseCasePackageCompiler
from tests.use_case_template_test_helpers import build_valid_package_tree


class UseCasePackageCompilerTests(unittest.TestCase):
    def test_valid_native_bi_package_compiles(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            report = UseCasePackageCompiler(root).compile()
            self.assertEqual(report["status"], "compiled")
            self.assertTrue(report["runtime_definition"]["tabs"])

    def test_phi_drilldown_without_masking_fails_compile(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            route_spec = root / "backend/routes/patient-outcomes.router.spec.yaml"
            route_spec.write_text(route_spec.read_text(encoding="utf-8").replace("    phi_handling: masked_patient_id_only\n", ""), encoding="utf-8")
            report = UseCasePackageCompiler(root).compile()
            self.assertEqual(report["status"], "compile_failed")
            self.assertTrue(any("lacks PHI masking rule" in error for error in report["blocking_errors"]))
