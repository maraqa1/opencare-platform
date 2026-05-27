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

    def test_with_prefixed_read_only_query_compiles(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            trends_query = root / "backend/queries/trends.sql"
            trends_query.write_text(
                "WITH monthly AS (\n"
                "  SELECT admission_date, readmitted_30d_flag FROM analytics.fct_patient_outcomes\n"
                ")\n"
                "SELECT count(*) AS total_rows FROM monthly\n",
                encoding="utf-8",
            )
            report = UseCasePackageCompiler(root).compile()
            self.assertEqual(report["status"], "compiled")

    def test_component_registry_is_built_from_structured_yaml(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            report = UseCasePackageCompiler(root).compile()
            registry = report["runtime_definition"]["component_registry"]
            self.assertIn("readmission_card", registry)

    def test_v16_native_bi_contracts_are_primary_compile_input(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            (root / "native-bi").mkdir(parents=True, exist_ok=True)
            (root / "tests").mkdir(parents=True, exist_ok=True)
            package_yaml = root / "package.yaml"
            package_yaml.write_text(
                package_yaml.read_text(encoding="utf-8") + "\npackage_standard: '1.6'\n",
                encoding="utf-8",
            )
            (root / "native-bi/components.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIComponents",
                        "components:",
                        "  - id: kpi_readmission",
                        "    type: kpi_card",
                        "    data_binding:",
                        "      ref: patient_outcomes_overview",
                        "    display_contract:",
                        "      title: 30-Day Readmission Rate",
                        "      subtitle: Headline metric",
                        "      format: percentage",
                        "      empty_message: No data.",
                        "    layout_contract:",
                        "      zone: summary",
                        "      section: summary",
                        "      order: 1",
                        "    materialization_profile:",
                        "      renderer: opencare_native_bi",
                        "      mandatory: true",
                        "      blocks_activation: true",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "native-bi/data-bindings.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIDataBindings",
                        "bindings:",
                        "  - id: patient_outcomes_overview",
                        "    type: backend_api",
                        "    endpoint: /api/v1/use-cases/patient-outcomes/overview",
                        "    method: GET",
                        "    expected_fields:",
                        "      - readmission_30d_rate",
                        "    filters:",
                        "      accepts:",
                        "        - date_range",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "native-bi/layout.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIPageLayouts",
                        "pages:",
                        "  - id: overview",
                        "    route: /use-cases/patient-outcomes",
                        "    title: Patient Outcomes Overview",
                        "    layout:",
                        "      sections:",
                        "        - id: summary",
                        "          zone: summary",
                        "          title: Summary",
                        "          components:",
                        "            - component_id: kpi_readmission",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "native-bi/materialization-profile.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIMaterializationProfile",
                        "package_materialization:",
                        "  renderer: opencare_native_bi",
                        "  materialization_mode: strict",
                        "required_runtime_capabilities:",
                        "  components:",
                        "    - kpi_card",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "native-bi/governance-bindings.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIGovernanceBindings",
                        "component_governance_bindings:",
                        "  - component_id: kpi_readmission",
                        "    governance_contract:",
                        "      classification: confidential",
                        "      phi_mode: aggregate_only",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "native-bi/interactions.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: NativeBIInteractions",
                        "interactions:",
                        "  - id: metric_drilldown",
                        "    component_ids:",
                        "      - kpi_readmission",
                        "    click_behavior: drilldown",
                    ]
                ),
                encoding="utf-8",
            )
            (root / "tests/smoke-tests.yaml").write_text(
                "\n".join(
                    [
                        "schema_version: '1.6'",
                        "kind: UseCaseSmokeTests",
                        "route_checks:",
                        "  - id: overview_route",
                        "    route: /use-cases/patient-outcomes",
                        "endpoint_checks:",
                        "  - id: overview_endpoint",
                        "    endpoint: /api/v1/use-cases/patient-outcomes/overview",
                        "component_render_checks:",
                        "  - id: overview_component",
                        "    page: overview",
                        "    component_id: kpi_readmission",
                    ]
                ),
                encoding="utf-8",
            )

            report = UseCasePackageCompiler(root).compile()
            self.assertEqual(report["status"], "compiled")
            runtime_definition = report["runtime_definition"]
            self.assertEqual(runtime_definition["tabs"][0]["id"], "overview")
            self.assertEqual(runtime_definition["tabs"][0]["component_specs"][0]["display_contract"]["title"], "30-Day Readmission Rate")
            self.assertEqual(runtime_definition["tabs"][0]["component_specs"][0]["component_type"], "kpi_card")
            self.assertEqual(runtime_definition["dashboard_model"]["tabs"][0]["widgets"][0]["widget_kind"], "metric")
            self.assertEqual(runtime_definition["dashboard_model"]["tabs"][0]["widgets"][0]["value_field"], None)
            self.assertEqual(runtime_definition["rendering"]["component_library"], "opencare_native_bi")
            self.assertEqual(len(runtime_definition["smoke_tests"]["component_render_checks"]), 1)

    def test_v16_native_bindings_are_emitted_into_backend_registry(self):
        with tempfile.TemporaryDirectory(prefix="compiler-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            report = UseCasePackageCompiler(root).compile()

            self.assertEqual(report["status"], "compiled")
            endpoints = report["runtime_definition"]["backend_endpoint_bindings"]["endpoints"]
            endpoint_by_path = {endpoint["path"]: endpoint for endpoint in endpoints}

            self.assertIn("/queues/high-risk", endpoint_by_path)
            self.assertIn("/drilldown", endpoint_by_path)
            self.assertEqual(endpoint_by_path["/queues/high-risk"]["phi_handling"], "masked_patient_level")
            self.assertTrue(endpoint_by_path["/queues/high-risk"]["native_bi_binding"])
