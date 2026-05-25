from __future__ import annotations

import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.use_case_native_bi_materializer import UseCaseNativeBIMaterializer
from app.services.use_case_package_compiler import UseCasePackageCompiler
from app.services.use_case_template_storage import UseCaseTemplateStorage
from tests.use_case_template_test_helpers import build_valid_package_tree


def add_native_bi_v16_contract(root: Path, *, component_type: str = "kpi_card") -> None:
    (root / "native-bi").mkdir(parents=True, exist_ok=True)
    (root / "tests").mkdir(parents=True, exist_ok=True)
    (root / "package.yaml").write_text(
        (root / "package.yaml").read_text(encoding="utf-8") + "\npackage_standard: '1.6'\n",
        encoding="utf-8",
    )
    (root / "native-bi/components.yaml").write_text(
        "\n".join(
            [
                "schema_version: '1.6'",
                "kind: NativeBIComponents",
                "components:",
                "  - id: kpi_readmission",
                f"    component_type: {component_type}",
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
                "    governance_contract:",
                "      classification: confidential",
                "      phi_mode: aggregate_only",
                "    materialization_profile:",
                "      renderer: opencare_native_bi",
                "      mandatory: true",
                "      blocks_activation: true",
                "  - id: episode_queue",
                "    component_type: queue_table",
                "    data_binding:",
                "      ref: patient_outcomes_drilldown",
                "    display_contract:",
                "      title: Episode Queue",
                "      subtitle: Patient-level operational queue",
                "      empty_message: No rows.",
                "    governance_contract:",
                "      classification: restricted",
                "      phi_mode: masked_patient_id_only",
                "    materialization_profile:",
                "      renderer: opencare_native_bi",
                "      mandatory: true",
                "      blocks_activation: true",
                "    interaction_contract:",
                "      row_click_behavior: row_drilldown",
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
                "  - id: patient_outcomes_drilldown",
                "    type: backend_api",
                "    endpoint: /api/v1/use-cases/patient-outcomes/drilldown",
                "    method: GET",
                "    expected_fields:",
                "      - masked_patient_id",
                "      - consultant_id",
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
                "            - component_id: episode_queue",
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
                f"    - {component_type}",
                "    - queue_table",
                "  interactions:",
                "    - row_drilldown",
                "  governance_modes:",
                "    - aggregate_only",
                "    - masked_patient_id_only",
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
                "  - component_id: episode_queue",
                "    governance_contract:",
                "      classification: restricted",
                "      phi_mode: masked_patient_id_only",
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
                "  - id: queue_drilldown",
                "    component_ids:",
                "      - episode_queue",
                "    row_click_behavior: row_drilldown",
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
                "  - id: drilldown_endpoint",
                "    endpoint: /api/v1/use-cases/patient-outcomes/drilldown",
                "component_render_checks:",
                "  - id: overview_component",
                "    page: overview",
                "    component_id: kpi_readmission",
                "phi_masking_checks:",
                "  - id: drilldown_masking",
                "    endpoint: /api/v1/use-cases/patient-outcomes/drilldown",
                "governance_link_checks:",
                "  - id: governance_link",
                "    endpoint: /api/v1/use-cases/patient-outcomes/governance",
            ]
        ),
        encoding="utf-8",
    )


class UseCaseNativeBIMaterializerTests(unittest.TestCase):
    def _compiled_record(self, root: Path, storage: UseCaseTemplateStorage) -> dict[str, object]:
        report = UseCasePackageCompiler(root).compile()
        self.assertEqual(report["status"], "compiled")
        runtime_definition = report["runtime_definition"]
        archive_bytes = b"package-archive"
        original_zip = storage.save_original_zip("opencare.usecase.patient-outcomes@1.6.0", "1.6.0", archive_bytes)
        return {
            "id": "pkg-1",
            "package_id": "opencare.usecase.patient-outcomes@1.6.0",
            "slug": "patient-outcomes",
            "version": "1.6.0",
            "status": "compiled",
            "package_validation_status": "warning",
            "compile_status": "compiled",
            "compile_report": report,
            "preview_summary": {"install_impact": {"materialization_mode": "full_runtime"}},
            "runtime_definition": runtime_definition,
            "original_zip_path": str(original_zip),
            "archive_sha256": hashlib.sha256(archive_bytes).hexdigest(),
        }

    def test_materialization_receipt_tracks_component_gates(self):
        with tempfile.TemporaryDirectory(prefix="materializer-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            add_native_bi_v16_contract(root)
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(self._compiled_record(root, storage))

            materializer = UseCaseNativeBIMaterializer(storage)
            record = materializer.materialize("pkg-1", actor="test")

            receipt = record["materialization_report"]["receipt"]
            self.assertEqual(receipt["status"], "materialized")
            self.assertTrue(receipt["checksum_verified"])
            self.assertEqual(receipt["capability_matrix"]["renderer"]["required"], "opencare_native_bi")
            self.assertFalse(receipt["blocked_reasons"])
            component_receipt = receipt["component_receipt"]["components"]
            self.assertEqual(len(component_receipt), 2)
            kpi_component = next(item for item in component_receipt if item["component_id"] == "kpi_readmission")
            self.assertEqual(kpi_component["gates"]["data_bound"]["status"], "passed")
            queue_component = next(item for item in component_receipt if item["component_id"] == "episode_queue")
            self.assertEqual(queue_component["gates"]["data_bound"]["status"], "passed")
            self.assertEqual(queue_component["gates"]["governance_enforced"]["status"], "passed")

    def test_materialize_blocks_unsupported_component_type(self):
        with tempfile.TemporaryDirectory(prefix="materializer-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            add_native_bi_v16_contract(root, component_type="heatmap")
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(self._compiled_record(root, storage))

            materializer = UseCaseNativeBIMaterializer(storage)
            record = materializer.materialize("pkg-1", actor="test")

            self.assertEqual(record["materialization_status"], "materialization_failed")
            self.assertIn("unsupported_component_type:heatmap", record["last_error"])
            blocked_codes = [reason["code"] for reason in record["materialization_report"]["receipt"]["blocked_reasons"]]
            self.assertIn("unsupported_component_type", blocked_codes)

    def test_materialize_blocks_checksum_mismatch(self):
        with tempfile.TemporaryDirectory(prefix="materializer-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            add_native_bi_v16_contract(root)
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            record = self._compiled_record(root, storage)
            original_zip = storage.save_original_zip("opencare.usecase.patient-outcomes@1.6.0", "1.6.0", b"original-zip")
            original_zip.write_bytes(b"tampered-zip")
            record["original_zip_path"] = str(original_zip)
            record["archive_sha256"] = "deadbeef"
            storage.upsert_package(record)

            materializer = UseCaseNativeBIMaterializer(storage)
            result = materializer.materialize("pkg-1", actor="test")

            self.assertEqual(result["materialization_status"], "materialization_failed")
            blocked_codes = [reason["code"] for reason in result["materialization_report"]["receipt"]["blocked_reasons"]]
            self.assertIn("checksum_mismatch", blocked_codes)

    def test_verify_live_includes_receipt_and_remains_honest(self):
        with tempfile.TemporaryDirectory(prefix="materializer-") as temp_dir:
            root = Path(temp_dir) / "pkg"
            build_valid_package_tree(root, slug="patient-outcomes")
            add_native_bi_v16_contract(root)
            storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
            storage.upsert_package(self._compiled_record(root, storage))

            materializer = UseCaseNativeBIMaterializer(storage)
            record = materializer.materialize("pkg-1", actor="test")
            record["activation_status"] = "active"
            record["status"] = "active"
            storage.upsert_package(record)

            verified = materializer.verify_live("pkg-1", actor="test")

            self.assertEqual(verified["live_verification_status"], "degraded")
            self.assertTrue(verified["live_verification_report"]["checks"]["components_resolved"])
            self.assertTrue(verified["live_verification_report"]["checks"]["governance_enforced"])
            self.assertTrue(verified["live_verification_report"]["checks"]["checksum_verified"])
            self.assertIn("receipt", verified["live_verification_report"])


if __name__ == "__main__":
    unittest.main()
