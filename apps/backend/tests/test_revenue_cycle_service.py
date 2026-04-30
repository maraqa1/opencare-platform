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
    def test_cash_command_returns_ranked_actions_when_tables_exist(self):
        summary_row = {
            "as_of": None,
            "recoverable_cash_7d": 25000.0,
            "recoverable_cash_14d": 40000.0,
            "cash_at_risk": 5000.0,
            "expected_collections": 38000.0,
        }
        action_row = {
            "opportunity_id": "RCM-001",
            "issue_type": "payer_underpayment_review",
            "claim_id": "CLAIM-001",
            "payer_id": "PAYER-A",
            "department_id": "DEP-01",
            "recoverable_amount": 12000.0,
            "expected_recovery_amount": 9000.0,
            "due_date": None,
            "priority_score": 2250.0,
            "owner_team": "Revenue Integrity",
            "owner_user_id": "rcm.manager",
            "status": "assigned",
            "evidence_summary": "Variance against contract schedule",
        }
        expiring_row = {
            "opportunity_id": "RCM-002",
            "issue_type": "late_submission_risk",
            "claim_id": "CLAIM-002",
            "payer_id": "PAYER-B",
            "department_id": "DEP-02",
            "due_date": None,
            "expected_recovery_amount": 3000.0,
            "owner_team": "Revenue Integrity",
            "owner_user_id": "rcm.analyst",
            "status": "open",
        }

        class Conn:
            def __init__(self):
                self.calls = 0

            def execute(self, query, params=None):
                self.calls += 1
                if self.calls == 1:
                    return Result(summary_row)
                if self.calls == 2:
                    self._assert_terminal_status_array(params)
                    return Result([action_row])
                self._assert_terminal_status_array(params)
                return Result([expiring_row])

            @staticmethod
            def _assert_terminal_status_array(params):
                assert params is not None
                assert list(params[0]) == list(revenue_cycle_service.TERMINAL_RECOVERY_STATUSES)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.cash_command()

        self.assertFalse(payload["meta"]["empty"])
        self.assertEqual(payload["recoverable_cash_7d"], 25000.0)
        self.assertEqual(payload["top_actions"][0]["next_step"], "Start action")
        self.assertEqual(payload["expiring_opportunities"][0]["next_step"], "Review work item")

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

    def test_payer_control_returns_latest_month_summary(self):
        row = {
            "payer_id": "PAYER-A",
            "month_key": "2026-04-01",
            "gross_billed": 100000.0,
            "contracted_amount": 90000.0,
            "paid_amount": 87000.0,
            "underpayment_amount": 3000.0,
            "contract_rate_pct": 0.9,
            "actual_collection_rate": 0.87,
            "payment_sla_days": 30,
            "actual_payment_days": 42,
            "sla_breach_count": 2,
            "contract_breach_flag": True,
            "renegotiation_flag": True,
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.payer_control()

        self.assertFalse(payload["meta"]["empty"])
        self.assertEqual(payload["summary"]["breach_flag_count"], 1)
        self.assertEqual(payload["summary"]["sla_breaches"], 2)
        self.assertEqual(payload["summary"]["total_underpayment"], 3000.0)
        self.assertEqual(payload["as_of"], "2026-04-01T00:00:00Z")

    def test_team_performance_returns_latest_period_summary(self):
        row = {
            "owner_team": "Revenue Integrity",
            "owner_user_id": "rcm.manager",
            "period_start": "2026-04-01",
            "period_end": "2026-04-30",
            "assigned_count": 8,
            "completed_count": 5,
            "expected_recovery": 12000.0,
            "actual_recovery": 9000.0,
            "recovery_variance_pct": -0.25,
            "avg_resolution_hours": 36.5,
            "overdue_count": 2,
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.team_performance()

        self.assertFalse(payload["meta"]["empty"])
        self.assertEqual(payload["summary"]["assigned"], 8)
        self.assertEqual(payload["summary"]["completed"], 5)
        self.assertEqual(payload["summary"]["expected_recovery"], 12000.0)
        self.assertEqual(payload["summary"]["actual_recovery"], 9000.0)
        self.assertEqual(payload["as_of"], "2026-04-30T00:00:00Z")

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
