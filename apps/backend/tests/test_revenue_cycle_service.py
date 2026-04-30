from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from psycopg.errors import UndefinedTable

from app.routes import revenue_cycle as revenue_cycle_routes
from app.services import revenue_cycle_service


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
        if self.rows is None:
            return []
        return [self.rows]


class RevenueCycleServiceTests(unittest.TestCase):
    def test_cash_command_returns_safe_empty_state_when_tables_are_absent(self):
        class Conn:
            def execute(self, query, params=None):
                raise UndefinedTable()

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.cash_command()

        self.assertTrue(payload["meta"]["empty"])
        self.assertEqual(payload["top_actions"], [])
        self.assertEqual(payload["meta"]["message"], "No revenue cycle data loaded yet")

    def test_recovery_queue_adds_next_step_and_notification_summary(self):
        row = {
            "opportunity_id": "RCM-001",
            "issue_type": "payer_underpayment_review",
            "issue_reason": "Paid below contract",
            "claim_id": "CLAIM-001",
            "encounter_id": "ENC-001",
            "payer_id": "PAYER-A",
            "department_id": "DEP-01",
            "recoverable_amount": 12000.0,
            "expected_recovery_amount": 9000.0,
            "effort_hours": 4.0,
            "priority_score": 2250.0,
            "owner_team": "Revenue Integrity",
            "owner_user_id": "rcm.manager",
            "due_date": None,
            "status": "open",
            "source_system": "erp",
            "evidence_summary": "Variance against contract schedule",
            "decision_id": 17,
            "decision_status": "in_progress",
            "expected_recovery": 9000.0,
            "due_at": None,
            "measured_at": None,
            "actual_recovery": None,
            "recovery_variance_pct": None,
            "success_flag": None,
            "sent_count": 1,
            "failed_count": 0,
            "skipped_count": 0,
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.recovery_queue()

        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["next_step"], "Complete action or dismiss with reason")
        self.assertEqual(payload["items"][0]["notification_status"]["sent_count"], 1)

    def test_executive_narrative_uses_live_payloads(self):
        with (
            patch.object(
                revenue_cycle_service,
                "cash_command",
                return_value={
                    "as_of": "2026-04-30T09:00:00Z",
                    "data_freshness": {"seconds": 60, "status": "fresh"},
                    "meta": {"empty": False},
                    "recoverable_cash_7d": 50000.0,
                    "recoverable_cash_14d": 85000.0,
                    "cash_at_risk": 12000.0,
                    "expected_collections": 91000.0,
                },
            ),
            patch.object(
                revenue_cycle_service,
                "recovery_queue",
                return_value={
                    "as_of": "2026-04-30T09:00:00Z",
                    "meta": {"empty": False},
                    "total": 2,
                    "items": [
                        {
                            "opportunity_id": "RCM-001",
                            "owner": "rcm.manager",
                            "next_step": "Assign owner / start action",
                            "expected_recovery_amount": 9000.0,
                        }
                    ],
                },
            ),
            patch.object(
                revenue_cycle_service,
                "payer_control",
                return_value={
                    "as_of": "2026-04-30T00:00:00Z",
                    "meta": {"empty": False},
                    "summary": {"breach_flag_count": 1},
                    "items": [{"payer_id": "PAYER-A", "underpayment_amount": 3000.0}],
                },
            ),
            patch.object(
                revenue_cycle_service,
                "leakage",
                return_value={
                    "meta": {"empty": False},
                    "breakdown": [{"leakage_type": "underpayments", "leakage_amount": 2000.0}],
                },
            ),
            patch.object(
                revenue_cycle_service,
                "team_performance",
                return_value={"summary": {"expected_recovery": 10000.0, "actual_recovery": 7500.0}},
            ),
        ):
            payload = revenue_cycle_service.executive_narrative()

        self.assertIn("Recoverable cash over the next 7 days", payload["headline"])
        self.assertEqual(payload["cash_impact"]["recoverable_cash_7d"], 50000.0)
        self.assertEqual(payload["recommended_actions"][0]["owner"], "rcm.manager")


class RevenueCycleRouteTests(unittest.TestCase):
    def test_cash_command_route_delegates(self):
        with patch.object(revenue_cycle_routes, "cash_command", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.revenue_cycle_cash_command()

        mocked.assert_called_once_with()
        self.assertEqual(payload, {"ok": True})


if __name__ == "__main__":
    unittest.main()
