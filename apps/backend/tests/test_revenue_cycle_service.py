from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
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
    def test_cash_command_payload_reconciles_kpis_and_journey(self):
        today = date.today()
        revenue_rows = [
            {
                "claim_id": "CLAIM-001",
                "encounter_id": "ENC-001",
                "payer_id": "PAYER-A",
                "department_id": "DEP-01",
                "claim_date": "2026-04-10",
                "claim_status": "paid",
                "gross_billed_amount": 100000.0,
                "contracted_amount": 90000.0,
                "expected_cash_amount": 90000.0,
                "posted_cash_amount": 81000.0,
                "ar_days": 24.0,
                "as_of_timestamp": "2026-05-01T08:00:00",
            },
            {
                "claim_id": "CLAIM-002",
                "encounter_id": "ENC-002",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "claim_date": "2026-05-12",
                "claim_status": "denied",
                "gross_billed_amount": 60000.0,
                "contracted_amount": 50000.0,
                "expected_cash_amount": 50000.0,
                "posted_cash_amount": 0.0,
                "ar_days": 35.0,
                "as_of_timestamp": "2026-05-01T08:00:00",
            },
            {
                "claim_id": "CLAIM-003",
                "encounter_id": "ENC-003",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "claim_date": "2026-05-18",
                "claim_status": "open",
                "gross_billed_amount": 40000.0,
                "contracted_amount": 30000.0,
                "expected_cash_amount": 30000.0,
                "posted_cash_amount": 0.0,
                "ar_days": 12.0,
                "as_of_timestamp": "2026-05-01T08:00:00",
            },
        ]
        aging_rows = [
            {
                "claim_id": "CLAIM-001",
                "payer_id": "PAYER-A",
                "department_id": "DEP-01",
                "snapshot_date": "2026-05-01",
                "aging_bucket_days": 20,
                "outstanding_amount": 5000.0,
                "ar_days": 20.0,
                "claim_status": "paid",
            },
            {
                "claim_id": "CLAIM-002",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "snapshot_date": "2026-05-01",
                "aging_bucket_days": 120,
                "outstanding_amount": 50000.0,
                "ar_days": 120.0,
                "claim_status": "denied",
            },
            {
                "claim_id": "CLAIM-003",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "snapshot_date": "2026-05-01",
                "aging_bucket_days": 15,
                "outstanding_amount": 30000.0,
                "ar_days": 15.0,
                "claim_status": "open",
            },
        ]
        denial_rows = [
            {
                "claim_id": "CLAIM-002",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "denial_date": "2026-05-20",
                "denial_reason": "coding_query",
                "appeal_status": "not_started",
                "denied_amount": 50000.0,
                "appeal_due_date": "2026-06-03",
                "claim_status": "denied",
            }
        ]
        opportunity_rows = [
            {
                "opportunity_id": "OPP-001",
                "claim_id": "CLAIM-002",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "issue_type": "denial_appeal_priority",
                "issue_reason": "Appeal required",
                "detected_date": "2026-05-21",
                "due_date": today.isoformat(),
                "recoverable_amount": 50000.0,
                "expected_recovery_amount": 41000.0,
                "effort_hours": 5.0,
                "priority_score": 8200.0,
                "owner_team": "Denials Management",
                "owner_user_id": "denials.lead",
                "status": "assigned",
                "source_system": "erp",
                "evidence_summary": "High-value denial awaiting appeal.",
            },
            {
                "opportunity_id": "OPP-002",
                "claim_id": "CLAIM-003",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "issue_type": "late_submission_risk",
                "issue_reason": "Submission lag",
                "detected_date": "2026-05-22",
                "due_date": (today + timedelta(days=3)).isoformat(),
                "recoverable_amount": 30000.0,
                "expected_recovery_amount": 21000.0,
                "effort_hours": 2.0,
                "priority_score": 6000.0,
                "owner_team": "Revenue Integrity",
                "owner_user_id": "revenue.integrity",
                "status": "open",
                "source_system": "erp",
                "evidence_summary": "Submission passed the internal SLA.",
            },
        ]
        leakage_rows = [
            {
                "claim_id": "CLAIM-002",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "detected_date": "2026-05-20",
                "leakage_type": "underpayments",
                "leakage_reason": "Paid below contract.",
                "leakage_amount": 10000.0,
                "owner_team": "Payer Relations",
                "owner_user_id": "payer.relations",
                "status": "open",
            },
            {
                "claim_id": "CLAIM-003",
                "payer_id": "PAYER-B",
                "department_id": "DEP-02",
                "detected_date": "2026-05-22",
                "leakage_type": "late_submissions",
                "leakage_reason": "Missed internal SLA.",
                "leakage_amount": 7500.0,
                "owner_team": "Revenue Integrity",
                "owner_user_id": "revenue.integrity",
                "status": "open",
            },
        ]

        payload = revenue_cycle_service._build_cash_command_payload(  # type: ignore[attr-defined]
            revenue_rows,
            aging_rows,
            denial_rows,
            opportunity_rows,
            leakage_rows,
            {"date_from": "2026-04-01", "date_to": "2026-05-31"},
        )

        cash_kpi = next(item for item in payload["kpis"] if item["key"] == "cash_collected")
        collection_kpi = next(item for item in payload["kpis"] if item["key"] == "collection_rate")
        denial_kpi = next(item for item in payload["kpis"] if item["key"] == "denial_rate")
        risk_kpi = next(item for item in payload["kpis"] if item["key"] == "revenue_at_risk")
        cash_stage = next(stage for stage in payload["journey"]["stages"] if stage["key"] == "cash_collected")
        denial_stage = next(stage for stage in payload["journey"]["stages"] if stage["key"] == "payer_adjudication")

        self.assertAlmostEqual(cash_kpi["value"], 81000.0)
        self.assertEqual(cash_stage["metrics"][0]["value"], cash_kpi["value"])
        self.assertAlmostEqual(collection_kpi["value"], 47.6470588235, places=3)
        self.assertAlmostEqual(denial_kpi["value"], denial_stage["metrics"][1]["value"], places=6)
        self.assertAlmostEqual(risk_kpi["value"], 140000.0)
        self.assertAlmostEqual(payload["cash_at_risk"], 140000.0)
        self.assertEqual(payload["headline"]["severity"], "critical")
        self.assertEqual(payload["top_actions"][0]["next_step"], "Start action")
        self.assertEqual(payload["recoverable_cash_7d"], 62000.0)

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

    def test_cash_command_payload_accepts_timezone_aware_as_of_timestamp(self):
        revenue_rows = [
            {
                "claim_id": "CLAIM-001",
                "encounter_id": "ENC-001",
                "payer_id": "PAYER-A",
                "department_id": "DEP-01",
                "claim_date": "2026-05-12",
                "claim_status": "paid",
                "gross_billed_amount": 1000.0,
                "contracted_amount": 900.0,
                "expected_cash_amount": 900.0,
                "posted_cash_amount": 850.0,
                "ar_days": 12.0,
                "as_of_timestamp": datetime(2026, 5, 31, 8, 0, tzinfo=timezone.utc),
            }
        ]

        payload = revenue_cycle_service._build_cash_command_payload(  # type: ignore[attr-defined]
            revenue_rows,
            [],
            [],
            [],
            [],
            None,
        )

        self.assertEqual(payload["as_of"], "2026-05-31T08:00:00Z")
        self.assertIn(payload["data_freshness"]["status"], {"fresh", "stale", "delayed"})

    def test_journey_maps_cash_command_payload_to_component_shape(self):
        with patch.object(
            revenue_cycle_service,
            "cash_command",
            return_value={
                "as_of": "2026-05-01T08:00:00Z",
                "data_freshness": {"seconds": 120, "status": "fresh"},
                "meta": {"empty": False},
                "journey": {
                    "stages": [
                        {
                            "stage_number": 5,
                            "key": "payer_adjudication",
                            "title": "Payer Adjudication",
                            "status": "critical",
                            "why_it_matters": "Denial pressure is a leading signal of preventable revenue drag.",
                            "metrics": [
                                {"label": "Denied claims", "value": 42, "unit": "count"},
                                {"label": "Denied value", "value": 125000.0, "unit": "currency"},
                            ],
                        }
                    ]
                },
                "risk_concentration": [
                    {"label": "Denied claim value", "amount": 125000.0, "status": "critical"},
                ],
                "data_quality": {
                    "generated_at": "2026-05-01T08:00:00Z",
                    "warnings": ["Live marts loaded with a 2-minute freshness delay."],
                    "source_tables": [{"table": "analytics.fct_denials"}],
                    "missing_metrics": [{"label": "Clean claim rate"}],
                },
            },
        ):
            payload = revenue_cycle_service.journey({"payer": "PAYER-A"})

        self.assertEqual(payload["generated_at"], "2026-05-01T08:00:00Z")
        self.assertEqual(payload["stages"][0]["stage_id"], "payer_adjudication")
        self.assertEqual(payload["stages"][0]["status"], "Critical")
        self.assertEqual(payload["stages"][0]["metrics"][0]["formatted_value"], "42")
        self.assertEqual(payload["risk_concentration"][0]["formatted_value"], "SAR 125,000")
        self.assertEqual(payload["data_quality"]["source_tables"], ["analytics.fct_denials"])
        self.assertEqual(payload["data_quality"]["missing_metrics"], ["Clean claim rate"])

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
            payload = revenue_cycle_routes.revenue_cycle_cash_command(
                date_from="2026-04-01",
                date_to="2026-05-31",
                payer="PAYER-A",
                department="DEP-01",
                claim_status="denied",
            )

        mocked.assert_called_once_with(
            {
                "date_from": "2026-04-01",
                "date_to": "2026-05-31",
                "facility": None,
                "payer": "PAYER-A",
                "department": "DEP-01",
                "specialty": None,
                "patient_type": None,
                "claim_status": "denied",
            }
        )
        self.assertEqual(payload, {"ok": True})

    def test_recovery_queue_route_delegates_with_filters(self):
        with patch.object(revenue_cycle_routes, "recovery_queue", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.revenue_cycle_recovery_queue(
                payer="PAYER-A",
                issue_type="payer_underpayment_review",
                owner="revenue.integrity",
                priority="high",
                due_window="Due This Week",
                min_value="5000",
                search="CLAIM-001",
                sort_by="expected_recovery",
                group_by="issue_type",
                view="grouped_cards",
            )

        mocked.assert_called_once_with(
            {
                "date_from": None,
                "date_to": None,
                "period": None,
                "facility": None,
                "payer": "PAYER-A",
                "department": None,
                "specialty": None,
                "patient_type": None,
                "claim_status": None,
                "issue_type": "payer_underpayment_review",
                "owner": "revenue.integrity",
                "status": None,
                "priority": "high",
                "due_window": "Due This Week",
                "min_value": "5000",
                "search": "CLAIM-001",
                "sort_by": "expected_recovery",
                "group_by": "issue_type",
                "view": "grouped_cards",
            }
        )
        self.assertEqual(payload, {"ok": True})

    def test_recovery_queue_alias_route_delegates(self):
        with patch.object(revenue_cycle_routes, "recovery_queue", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.rcm_recovery_queue(status="assigned", group_by="owner")

        mocked.assert_called_once_with(
            {
                "date_from": None,
                "date_to": None,
                "period": None,
                "facility": None,
                "payer": None,
                "department": None,
                "specialty": None,
                "patient_type": None,
                "claim_status": None,
                "issue_type": None,
                "owner": None,
                "status": "assigned",
                "priority": None,
                "due_window": None,
                "min_value": None,
                "search": None,
                "sort_by": None,
                "group_by": "owner",
                "view": None,
            }
        )
        self.assertEqual(payload, {"ok": True})

    def test_journey_route_delegates(self):
        with patch.object(revenue_cycle_routes, "journey", return_value={"ok": True}) as mocked:
            payload = revenue_cycle_routes.revenue_cycle_journey(
                date_from="2026-04-01",
                date_to="2026-05-31",
                payer="PAYER-A",
                department="DEP-01",
                claim_status="denied",
            )

        mocked.assert_called_once_with(
            {
                "date_from": "2026-04-01",
                "date_to": "2026-05-31",
                "facility": None,
                "payer": "PAYER-A",
                "department": "DEP-01",
                "specialty": None,
                "patient_type": None,
                "claim_status": "denied",
            }
        )
        self.assertEqual(payload, {"ok": True})


if __name__ == "__main__":
    unittest.main()
