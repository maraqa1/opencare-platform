from __future__ import annotations

import asyncio
import sys
import unittest
from contextlib import contextmanager
from datetime import date as date_cls
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.routes import decisions as decision_routes
from app.services import decision_service


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


class DecisionServiceTests(unittest.TestCase):
    def test_list_decisions_active_only_uses_active_statuses(self):
        class Conn:
            def __init__(self):
                self.calls = []

            def execute(self, query, params=None):
                query_text = str(query)
                self.calls.append((query_text, params))
                if "count(*) as total" in query_text:
                    return Result({"total": 1})
                return Result([{"id": 1, "status": "recommended", "created_at": None}])

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            decision_service.list_decisions(active_only=True)

        self.assertEqual(conn.calls[0][1], [list(decision_service.ACTIVE_STATUSES)])
        self.assertEqual(conn.calls[1][1][0], list(decision_service.ACTIVE_STATUSES))

    def test_generate_decisions_suppresses_recent_completed_duplicates(self):
        candidate = {
            "use_case": "bed_pressure",
            "decision_type": "activate_surge",
            "entity_type": "ward",
            "entity_id": "WARD-08",
            "entity_name": "ICU-01 - Intensive Care Unit",
            "title": "ICU-01: Activate surge capacity",
            "signal_summary": "Occupancy 98%",
            "decision_summary": "Open 4 surge beds",
            "rationale": "High pressure",
            "recommended_actions": [],
            "data_inputs": {},
            "model_version": "test",
            "model_accuracy": 4.2,
            "confidence_level": "HIGH",
            "freshness_seconds": 300,
            "expected_beds_released": 4,
            "expected_occupancy_before": 98.0,
            "expected_occupancy_after": 88.0,
            "expected_risk_reduction": "CRIT -> HIGH",
            "owner_team": "Bed Management Team",
        }

        class Conn:
            def __init__(self):
                self.calls = 0

            def execute(self, query, params=None):
                self.calls += 1
                if self.calls == 1:
                    return Result([])
                if self.calls == 2:
                    return Result({"id": 42, "completed_at": None})
                return Result([])

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with (
            patch.object(decision_service, "ensure_decision_schema"),
            patch.object(decision_service, "connect", fake_connect),
            patch.object(decision_service, "_current_ward_states", return_value=[{"ward_id": "WARD-08"}]),
            patch.object(decision_service, "_evaluate_ward", return_value=[candidate]),
        ):
            result = decision_service.generate_decisions()

        self.assertEqual(result["generated"], 0)
        self.assertEqual(result["suppressed_cooldown"], 1)

    def test_transition_execute_all_logs_full_lifecycle(self):
        initial_row = {
            "id": 9,
            "status": "recommended",
            "assignee_user": None,
            "assignee_email": None,
            "owner_team": "Bed Management Team",
            "priority": "urgent",
            "recommended_actions": [
                {"action": "Notify manager", "order": 1, "completed": False},
                {"action": "Open surge beds", "order": 2, "completed": False},
            ],
        }

        class Conn:
            def __init__(self):
                self.row = dict(initial_row)
                self.log_actions: list[str] = []

            def execute(self, query, params=None):
                query_text = str(query)
                if "for update" in query_text or "select * from decision.decision_queue where id = %s" in query_text:
                    return Result(dict(self.row))
                if "set status = %s, assignee_user" in query_text:
                    self.row["status"] = params[0]
                    self.row["assignee_user"] = params[1]
                    self.row["assignee_email"] = params[2]
                    return Result(None)
                if "set status = %s, updated_at = now() where id = %s" in query_text:
                    self.row["status"] = params[0]
                    return Result(None)
                if "set status = %s, completed_at = now()" in query_text:
                    self.row["status"] = params[0]
                    return Result(None)
                if "insert into decision.decision_log" in query_text:
                    self.log_actions.append(params[3])
                    return Result(None)
                if "insert into decision.notification_log" in query_text:
                    return Result(None)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with (
            patch.object(decision_service, "ensure_decision_schema"),
            patch.object(decision_service, "connect", fake_connect),
            patch.object(decision_service, "send_decision_email", return_value=("skipped", None)),
        ):
            updated = decision_service.transition_decision(9, "execute_all", {})

        self.assertEqual(updated["status"], "completed")
        self.assertEqual(conn.log_actions, ["assign", "started", "complete"])

    def test_measure_outcomes_records_status_method_and_beds_released(self):
        decision_row = {
            "id": 5,
            "status": "completed",
            "entity_id": "WARD-08",
            "expected_beds_released": 2,
            "expected_occupancy_before": 96.0,
            "expected_occupancy_after": 88.0,
            "expected_risk_reduction": "CRIT -> HIGH",
            "completed_at": None,
        }

        class Conn:
            def __init__(self):
                self.insert_params = None

            def execute(self, query, params=None):
                query_text = str(query)
                if "from decision.decision_queue q" in query_text:
                    return Result([decision_row])
                if "from " in query_text and "fct_bed_occupancy" in query_text:
                    return Result({"occupied_beds": 18, "occupancy_rate": 90.0})
                if "beds_released" in query_text and "stg_bed_events" in query_text:
                    return Result({"beds_released": 3})
                if "insert into decision.decision_outcomes" in query_text:
                    self.insert_params = params
                    return Result(None)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            result = decision_service.measure_outcomes()

        self.assertEqual(result["measured"], 1)
        self.assertIsNotNone(conn.insert_params)
        self.assertEqual(conn.insert_params[4], 3)
        self.assertEqual(conn.insert_params[10], decision_service.MEASURED_STATUS)
        self.assertEqual(conn.insert_params[11], decision_service.LATEST_WARD_SNAPSHOT_METHOD)

    def test_accuracy_evaluation_uses_stricter_threshold_and_direction(self):
        with patch.object(decision_service.settings, "decision_accuracy_threshold_pp", 5.0):
            accurate, note = decision_service._evaluate_prediction_accuracy(100.0, 92.0, 97.5)
            self.assertFalse(accurate)
            self.assertIn("threshold 5.0pp", note)

            accurate, note = decision_service._evaluate_prediction_accuracy(100.0, 95.0, 96.0)
            self.assertTrue(accurate)
            self.assertIn("Predicted direction down", note)

    def test_daily_log_includes_created_decisions_and_computes_next_step(self):
        row = {
            "decision_id": 12,
            "use_case": "bed_pressure",
            "entity_id": "WARD-08",
            "entity_name": "ICU-01 - Intensive Care Unit",
            "decision_type": "activate_surge",
            "decision_summary": "Open overflow beds",
            "signal_summary": "Occupancy at 100%",
            "rationale": "Pressure rising",
            "priority": "high",
            "priority_score": 75.0,
            "urgency_score": 80.0,
            "impact_score": 60.0,
            "confidence_level": "HIGH",
            "confidence_detail": "Strong signal",
            "status": "recommended",
            "owner_team": "Bed Management Team",
            "assignee_user": None,
            "assignee_email": None,
            "created_at": None,
            "assigned_at": None,
            "completed_at": None,
            "dismissed_at": None,
            "dismissed_reason": None,
            "last_updated_at": None,
            "expires_at": None,
            "escalation_count": 0,
            "started_at": None,
            "expired_at": None,
            "last_log_event": "created",
            "last_log_at": None,
            "audit_event_count": 1,
            "sent_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "measured_at": None,
            "predicted_occupancy_after": 75.0,
            "actual_occupancy_after": None,
            "predicted_risk_after": "HIGH",
            "actual_risk_after": None,
            "actual_beds_released": None,
            "prediction_accurate": None,
            "accuracy_notes": None,
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            payload = decision_service.daily_decision_log(selected_date=date_cls(2026, 4, 25))

        self.assertEqual(payload["summary"]["total"], 1)
        self.assertEqual(payload["summary"]["recommended"], 1)
        self.assertEqual(payload["decisions"][0]["next_step"], "Assign owner / start action")
        self.assertEqual(payload["decisions"][0]["outcome_status"], "not_applicable")

    def test_daily_log_marks_completed_without_outcome_as_pending(self):
        row = {
            "decision_id": 21,
            "use_case": "bed_pressure",
            "entity_id": "WARD-01",
            "entity_name": "WARD-01 - Ward",
            "decision_type": "expedite_discharge",
            "decision_summary": "Discharge patients",
            "signal_summary": "High occupancy",
            "rationale": "Pressure control",
            "priority": "high",
            "priority_score": 70.0,
            "urgency_score": 65.0,
            "impact_score": 85.0,
            "confidence_level": "HIGH",
            "confidence_detail": "Strong",
            "status": "completed",
            "owner_team": "Beds",
            "assignee_user": "bed_manager",
            "assignee_email": None,
            "created_at": None,
            "assigned_at": None,
            "completed_at": None,
            "dismissed_at": None,
            "dismissed_reason": None,
            "last_updated_at": None,
            "expires_at": None,
            "escalation_count": 0,
            "started_at": None,
            "expired_at": None,
            "last_log_event": "complete",
            "last_log_at": None,
            "audit_event_count": 1,
            "sent_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "measured_at": None,
            "predicted_occupancy_after": 88.0,
            "actual_occupancy_after": None,
            "predicted_risk_after": "HIGH",
            "actual_risk_after": None,
            "actual_beds_released": None,
            "prediction_accurate": None,
            "accuracy_notes": None,
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            payload = decision_service.daily_decision_log(selected_date=date_cls(2026, 4, 25))

        self.assertEqual(payload["summary"]["completed"], 1)
        self.assertEqual(payload["summary"]["pending_outcomes"], 1)
        self.assertEqual(payload["decisions"][0]["outcome_status"], "pending")
        self.assertEqual(payload["decisions"][0]["next_step"], "Await outcome measurement")

    def test_daily_log_query_includes_completed_and_measured_touchpoints(self):
        class Conn:
            def __init__(self):
                self.query_text = ""

            def execute(self, query, params=None):
                self.query_text = str(query)
                return Result([])

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            decision_service.daily_decision_log(selected_date=date_cls(2026, 4, 25))

        self.assertIn("q.completed_at >=", conn.query_text)
        self.assertIn("latest_outcome.measured_at >=", conn.query_text)
        self.assertIn("audit_summary.event_count", conn.query_text)

    def test_daily_log_marks_completed_with_outcome_as_measured(self):
        row = {
            "decision_id": 22,
            "use_case": "bed_pressure",
            "entity_id": "WARD-01",
            "entity_name": "WARD-01 - Ward",
            "decision_type": "expedite_discharge",
            "decision_summary": "Discharge patients",
            "signal_summary": "High occupancy",
            "rationale": "Pressure control",
            "priority": "high",
            "priority_score": 70.0,
            "urgency_score": 65.0,
            "impact_score": 85.0,
            "confidence_level": "HIGH",
            "confidence_detail": "Strong",
            "status": "completed",
            "owner_team": "Beds",
            "assignee_user": "bed_manager",
            "assignee_email": None,
            "created_at": None,
            "assigned_at": None,
            "completed_at": None,
            "dismissed_at": None,
            "dismissed_reason": None,
            "last_updated_at": None,
            "expires_at": None,
            "escalation_count": 0,
            "started_at": None,
            "expired_at": None,
            "last_log_event": "complete",
            "last_log_at": None,
            "audit_event_count": 1,
            "sent_count": 1,
            "failed_count": 0,
            "skipped_count": 0,
            "measured_at": "2026-04-25T10:00:00Z",
            "predicted_occupancy_after": 88.0,
            "actual_occupancy_after": 90.0,
            "predicted_risk_after": "HIGH",
            "actual_risk_after": "HIGH",
            "actual_beds_released": 1,
            "prediction_accurate": True,
            "accuracy_notes": "Measured",
        }

        class Conn:
            def execute(self, query, params=None):
                return Result([row])

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(decision_service, "ensure_decision_schema"), patch.object(decision_service, "connect", fake_connect):
            payload = decision_service.daily_decision_log(selected_date=date_cls(2026, 4, 25))

        self.assertEqual(payload["summary"]["measured_outcomes"], 1)
        self.assertEqual(payload["decisions"][0]["outcome_status"], "measured")
        self.assertEqual(payload["decisions"][0]["next_step"], "Review measured outcome")


class DecisionRoutesTests(unittest.TestCase):
    def test_resolved_route_defaults_to_measured_rows(self):
        with patch.object(decision_routes, "list_resolved_decisions", return_value=[]) as mocked:
            payload = decision_routes.decisions_resolved()

        mocked.assert_called_once_with(use_case=None, limit=10, days=7, include_unmeasured=False)
        self.assertEqual(payload, {"items": []})

    def test_resolved_route_can_include_pending_measurements(self):
        with patch.object(decision_routes, "list_resolved_decisions", return_value=[]) as mocked:
            decision_routes.decisions_resolved(use_case="bed_pressure", include_unmeasured=True, days=3, limit=5)

        mocked.assert_called_once_with(use_case="bed_pressure", limit=5, days=3, include_unmeasured=True)

    def test_daily_log_route_defaults_and_summary_counts(self):
        payload = {
            "date": "2026-04-25",
            "use_case": "bed_pressure",
            "generated_at": "2026-04-25T12:00:00Z",
            "summary": {
                "total": 2,
                "recommended": 1,
                "assigned": 0,
                "in_progress": 0,
                "completed": 1,
                "dismissed": 0,
                "expired": 0,
                "measured_outcomes": 1,
                "pending_outcomes": 0,
            },
            "decisions": [],
        }
        with patch.object(decision_routes, "daily_decision_log", return_value=payload) as mocked:
            response = decision_routes.decisions_daily_log()

        mocked.assert_called_once_with(selected_date=None, use_case="bed_pressure", include_terminal=True)
        self.assertEqual(response["summary"]["total"], 2)

    def test_daily_log_csv_export_returns_headers_and_filename(self):
        payload = {
            "date": "2026-04-25",
            "use_case": "bed_pressure",
            "generated_at": "2026-04-25T12:00:00Z",
            "summary": {},
            "decisions": [
                {
                    key: ""
                    for key in decision_service.DAILY_LOG_FIELD_ORDER
                }
            ],
        }
        payload["decisions"][0]["decision_id"] = 7
        payload["decisions"][0]["use_case"] = "bed_pressure"

        async def collect(streaming_response):
            chunks = []
            async for chunk in streaming_response.body_iterator:
                chunks.append(chunk)
            return b"".join(
                part if isinstance(part, bytes) else part.encode("utf-8")
                for part in chunks
            ).decode("utf-8")

        with patch.object(decision_routes, "daily_decision_log", return_value=payload):
            response = decision_routes.decisions_daily_log(format="csv")

        body = asyncio.run(collect(response))
        self.assertIn("decision_id,use_case,entity_id", body)
        self.assertIn('attachment; filename="opencare_daily_decision_log_2026-04-25.csv"', response.headers["Content-Disposition"])


if __name__ == "__main__":
    unittest.main()
