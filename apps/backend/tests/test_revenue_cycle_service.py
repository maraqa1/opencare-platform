from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
from datetime import date
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

    def test_journey_returns_all_seven_stages_and_correct_risk_formula(self):
        revenue_row = {
            "gross_charges": 58400000.0,
            "encounter_count": 12420,
            "net_patient_revenue": 500000.0,
            "claim_count": 1012,
            "claim_value": 420000.0,
            "submitted_claim_count": 980,
            "submitted_claim_value": 300000.0,
            "cash_collected": 375000.0,
            "underpayment_value": 5000.0,
        }
        leakage_row = {
            "dnfb_value": 20000.0,
            "dnfb_cases": 48,
            "avg_dnfb_days": 8.2,
            "dnfb_cases_over_5_days": 12,
        }
        aging_row = {
            "total_ar": 100000.0,
            "ar_over_90_value": 30000.0,
        }
        denials_row = {
            "denied_claim_value": 30000.0,
            "denied_claim_count": 32,
        }

        class Conn:
            def __init__(self):
                self.rows = [revenue_row, leakage_row, aging_row, denials_row]
                self.calls = 0

            def execute(self, query, params=None):
                row = self.rows[self.calls]
                self.calls += 1
                return Result(row)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.journey()

        self.assertEqual(payload["currency"], "SAR")
        self.assertEqual(len(payload["stages"]), 7)

        stages = {stage["stage_id"]: stage for stage in payload["stages"]}
        self.assertEqual(stages["care_delivered"]["status"], "Unavailable")
        self.assertEqual(stages["discharge_coding"]["status"], "Critical")
        self.assertEqual(stages["payer_adjudication"]["status"], "Critical")
        self.assertEqual(stages["ar_recovery"]["status"], "Critical")
        self.assertEqual(stages["cash_collected"]["status"], "Watch")

        collection_rate_metric = next(
            metric for metric in stages["cash_collected"]["metrics"] if metric["label"] == "Collection Rate"
        )
        self.assertTrue(collection_rate_metric["available"])
        self.assertAlmostEqual(collection_rate_metric["value"], 75.0, places=2)

        risk_metric = next(
            metric for metric in stages["ar_recovery"]["metrics"] if metric["label"] == "Revenue at Risk"
        )
        self.assertTrue(risk_metric["available"])
        self.assertEqual(risk_metric["value"], 85000.0)

    def test_journey_status_logic_returns_healthy_when_metrics_meet_thresholds(self):
        revenue_row = {
            "gross_charges": 1200000.0,
            "encounter_count": 2400,
            "net_patient_revenue": 500000.0,
            "claim_count": 600,
            "claim_value": 430000.0,
            "submitted_claim_count": 590,
            "submitted_claim_value": 200000.0,
            "cash_collected": 425000.0,
            "underpayment_value": 1500.0,
        }
        leakage_row = {
            "dnfb_value": 3000.0,
            "dnfb_cases": 8,
            "avg_dnfb_days": 2.5,
            "dnfb_cases_over_5_days": 1,
        }
        aging_row = {
            "total_ar": 100000.0,
            "ar_over_90_value": 10000.0,
        }
        denials_row = {
            "denied_claim_value": 5000.0,
            "denied_claim_count": 5,
        }

        class Conn:
            def __init__(self):
                self.rows = [revenue_row, leakage_row, aging_row, denials_row]
                self.calls = 0

            def execute(self, query, params=None):
                row = self.rows[self.calls]
                self.calls += 1
                return Result(row)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.journey()

        stages = {stage["stage_id"]: stage for stage in payload["stages"]}
        self.assertEqual(stages["discharge_coding"]["status"], "Healthy")
        self.assertEqual(stages["payer_adjudication"]["status"], "Healthy")
        self.assertEqual(stages["ar_recovery"]["status"], "Healthy")
        self.assertEqual(stages["cash_collected"]["status"], "Healthy")

    def test_journey_handles_divide_by_zero_without_crashing(self):
        revenue_row = {
            "gross_charges": 0.0,
            "encounter_count": 0,
            "net_patient_revenue": 0.0,
            "claim_count": 0,
            "claim_value": 0.0,
            "submitted_claim_count": 0,
            "submitted_claim_value": 0.0,
            "cash_collected": 0.0,
            "underpayment_value": 0.0,
        }
        leakage_row = {
            "dnfb_value": 0.0,
            "dnfb_cases": 0,
            "avg_dnfb_days": 2.0,
            "dnfb_cases_over_5_days": 0,
        }
        aging_row = {
            "total_ar": 0.0,
            "ar_over_90_value": 0.0,
        }
        denials_row = {
            "denied_claim_value": 0.0,
            "denied_claim_count": 0,
        }

        class Conn:
            def __init__(self):
                self.rows = [revenue_row, leakage_row, aging_row, denials_row]
                self.calls = 0

            def execute(self, query, params=None):
                row = self.rows[self.calls]
                self.calls += 1
                return Result(row)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.journey()

        stages = {stage["stage_id"]: stage for stage in payload["stages"]}
        denial_rate_metric = next(
            metric for metric in stages["payer_adjudication"]["metrics"] if metric["label"] == "Denial Rate"
        )
        collection_rate_metric = next(
            metric for metric in stages["cash_collected"]["metrics"] if metric["label"] == "Collection Rate"
        )

        self.assertFalse(denial_rate_metric["available"])
        self.assertFalse(collection_rate_metric["available"])
        self.assertEqual(stages["payer_adjudication"]["status"], "Unavailable")
        self.assertEqual(stages["ar_recovery"]["status"], "Unavailable")
        self.assertEqual(stages["cash_collected"]["status"], "Unavailable")

    def test_journey_returns_unavailable_metrics_when_tables_are_absent(self):
        class Conn:
            def execute(self, query, params=None):
                raise UndefinedTable()

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            payload = revenue_cycle_service.journey()

        self.assertEqual(len(payload["stages"]), 7)
        self.assertGreaterEqual(len(payload["data_quality"]["warnings"]), 4)
        self.assertIn("collection_rate", payload["data_quality"]["missing_metrics"])
        first_metric = payload["stages"][0]["metrics"][0]
        self.assertFalse(first_metric["available"])
        self.assertEqual(first_metric["formatted_value"], "Data unavailable")

    def test_journey_accepts_supported_filters(self):
        captured_params: list[list[object]] = []

        zero_row = {
            "gross_charges": 0.0,
            "encounter_count": 0,
            "net_patient_revenue": 1.0,
            "claim_count": 0,
            "claim_value": 0.0,
            "submitted_claim_count": 0,
            "submitted_claim_value": 1.0,
            "cash_collected": 1.0,
            "underpayment_value": 0.0,
        }
        zero_leakage_row = {
            "dnfb_value": 0.0,
            "dnfb_cases": 0,
            "avg_dnfb_days": 0.0,
            "dnfb_cases_over_5_days": 0,
        }
        zero_aging_row = {
            "total_ar": 1.0,
            "ar_over_90_value": 0.0,
        }
        zero_denial_row = {
            "denied_claim_value": 0.0,
            "denied_claim_count": 0,
        }

        class Conn:
            def __init__(self):
                self.rows = [zero_row, zero_leakage_row, zero_aging_row, zero_denial_row]
                self.calls = 0

            def execute(self, query, params=None):
                captured_params.append(list(params or []))
                row = self.rows[self.calls]
                self.calls += 1
                return Result(row)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(revenue_cycle_service, "connect", fake_connect):
            revenue_cycle_service.journey(
                date_from=date(2026, 1, 1),
                date_to=date(2026, 1, 31),
                payer="PAYER-A",
                department="WARD-01",
                claim_status="submitted",
            )

        self.assertEqual(
            captured_params[0],
            [date(2026, 1, 1), date(2026, 1, 31), "PAYER-A", "WARD-01", "submitted"],
        )
        self.assertEqual(
            captured_params[1],
            [date(2026, 1, 1), date(2026, 1, 31), "PAYER-A", "WARD-01"],
        )
        self.assertEqual(
            captured_params[2],
            [date(2026, 1, 1), date(2026, 1, 31), "PAYER-A", "WARD-01", "submitted"],
        )
        self.assertEqual(
            captured_params[3],
            [date(2026, 1, 1), date(2026, 1, 31), "PAYER-A", "WARD-01", "submitted"],
        )


class RevenueCycleRouteTests(unittest.TestCase):
    def test_cash_command_route_delegates(self):
        with patch.object(revenue_cycle_routes, "cash_command", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.revenue_cycle_cash_command()

        mocked.assert_called_once_with()
        self.assertEqual(payload, {"ok": True})

    def test_journey_route_delegates(self):
        with patch.object(revenue_cycle_routes, "journey", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.revenue_cycle_journey(
                date_from=date(2026, 1, 1),
                date_to=date(2026, 1, 31),
                facility="FAC-01",
                payer="PAYER-A",
                department="WARD-01",
                specialty="CARD",
                patient_type="inpatient",
                claim_status="submitted",
            )

        mocked.assert_called_once_with(
            date_from=date(2026, 1, 1),
            date_to=date(2026, 1, 31),
            facility="FAC-01",
            payer="PAYER-A",
            department="WARD-01",
            specialty="CARD",
            patient_type="inpatient",
            claim_status="submitted",
        )
        self.assertEqual(payload, {"ok": True})


if __name__ == "__main__":
    unittest.main()
