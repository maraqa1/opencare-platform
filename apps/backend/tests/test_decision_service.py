from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
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


if __name__ == "__main__":
    unittest.main()
