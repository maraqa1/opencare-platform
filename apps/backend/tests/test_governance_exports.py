from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance import exports  # noqa: E402
from app.governance.exports import GovernanceExportError  # noqa: E402
from app.governance.read_service import GovernanceReadService  # noqa: E402


class Result:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        if isinstance(self.rows, list):
            return self.rows[0] if self.rows else None
        return self.rows

    def fetchall(self):
        if isinstance(self.rows, list):
            return self.rows
        return [] if self.rows is None else [self.rows]


class GovernanceExportTests(unittest.TestCase):
    def setUp(self):
        self.service = GovernanceReadService(
            use_cases_dir=REPO_ROOT / "governance/use-cases",
            policies_dir=REPO_ROOT / "governance/policies",
        )

    def test_builds_required_export_packs_from_current_resolver_state(self):
        for pack_id in exports.PACK_BUILDERS:
            with self.subTest(pack_id=pack_id):
                payload = exports.build_export_payload(pack_id, self.service)
                self.assertEqual(payload["pack_id"], pack_id)
                self.assertIn("generated_at", payload)

    def test_unknown_pack_is_rejected(self):
        with self.assertRaises(GovernanceExportError):
            exports.build_export_payload("missing-pack", self.service)

    def test_classification_register_exports_attribute_policy_traceability(self):
        payload = exports.build_export_payload("classification-register", self.service)
        patient_id = next(attribute for attribute in payload["attributes"] if attribute["name"] == "patient_id")

        self.assertEqual(patient_id["classification"], "restricted")
        self.assertEqual(patient_id["policy_id"], "healthcare-default")
        self.assertEqual(patient_id["policy_version"], "1.0.0")
        self.assertEqual(patient_id["matched_rule"], "patient-identifiers")

    def test_request_export_records_status_and_audit_events(self):
        class Conn:
            def __init__(self):
                self.calls = []
                self.audit_events = []

            def execute(self, query, params=None):
                query_text = str(query)
                self.calls.append((query_text, params))
                if "audit_log" in query_text:
                    self.audit_events.append(params)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(exports, "connect", fake_connect):
            result = exports.request_export(
                "asset-inventory",
                {"export_id": "EXP-1", "actor": "alice", "role": "viewer"},
                service=self.service,
            )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["export_id"], "EXP-1")
        self.assertEqual([event[2] for event in conn.audit_events], ["evidence_export_requested", "evidence_export_generated"])

    def test_request_export_failure_records_failed_status_and_audit(self):
        class Conn:
            def __init__(self):
                self.audit_events = []
                self.status_updates = []

            def execute(self, query, params=None):
                query_text = str(query)
                if "audit_log" in query_text:
                    self.audit_events.append(params)
                if "set status" in query_text:
                    self.status_updates.append(params[0])
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(exports, "connect", fake_connect):
            with self.assertRaises(GovernanceExportError):
                exports.request_export("missing-pack", {"export_id": "EXP-FAIL"}, service=self.service)

        self.assertIn("failed", conn.status_updates)
        self.assertEqual(conn.audit_events[-1][2], "evidence_export_failed")

    def test_download_regenerates_current_pack_and_audits_download(self):
        class Conn:
            def __init__(self):
                self.audit_events = []

            def execute(self, query, params=None):
                query_text = str(query)
                if "select * from" in query_text and "evidence_exports" in query_text:
                    return Result({"export_id": "EXP-1", "pack_id": "asset-inventory", "status": "completed"})
                if "audit_log" in query_text:
                    self.audit_events.append(params)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(exports, "connect", fake_connect):
            filename, content = exports.download_export("EXP-1", {"actor": "alice"}, service=self.service)

        self.assertEqual(filename, "asset-inventory.json")
        self.assertIn("bed-pressure", content)
        self.assertEqual(conn.audit_events[0][2], "evidence_export_downloaded")


if __name__ == "__main__":
    unittest.main()
