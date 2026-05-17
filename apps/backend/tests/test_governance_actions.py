from __future__ import annotations

import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.governance import actions  # noqa: E402
from app.governance.actions import GovernanceActionError  # noqa: E402


class Result:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        if isinstance(self.rows, list):
            return self.rows[0] if self.rows else None
        return self.rows


class GovernanceActionTests(unittest.TestCase):
    def test_assign_issue_updates_issue_and_writes_audit(self):
        class Conn:
            def __init__(self):
                self.audit_events = []
                self.status = "open"

            def execute(self, query, params=None):
                query_text = str(query)
                if "select * from" in query_text and "issues" in query_text:
                    return Result({"issue_id": "ISS-1", "status": self.status, "use_case_slug": "bed-pressure"})
                if "update" in query_text and "issues" in query_text:
                    self.status = params[0]
                    return Result({"issue_id": "ISS-1", "status": self.status, "assigned_owner": params[1]})
                if "insert into" in query_text and "audit_log" in query_text:
                    self.audit_events.append(params)
                    return Result(None)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(actions, "connect", fake_connect):
            row = actions.assign_issue(
                "ISS-1",
                {
                    "assigned_owner": "Capacity Planning Lead",
                    "actor": "alice",
                    "role": "operator",
                    "reason": "Triage",
                },
            )

        self.assertEqual(row["status"], "assigned")
        self.assertEqual(len(conn.audit_events), 1)
        self.assertEqual(conn.audit_events[0][2], "issue_assigned")

    def test_ignore_issue_requires_reason(self):
        with self.assertRaises(GovernanceActionError):
            actions.ignore_issue("ISS-1", {"actor": "alice"})

    def test_audit_failure_propagates_to_abort_action_transaction(self):
        class Conn:
            def execute(self, query, params=None):
                query_text = str(query)
                if "select * from" in query_text and "issues" in query_text:
                    return Result({"issue_id": "ISS-1", "status": "open", "use_case_slug": "bed-pressure"})
                if "update" in query_text and "issues" in query_text:
                    return Result({"issue_id": "ISS-1", "status": params[0]})
                if "insert into" in query_text and "audit_log" in query_text:
                    raise RuntimeError("audit unavailable")
                return Result(None)

        @contextmanager
        def fake_connect():
            yield Conn()

        with patch.object(actions, "connect", fake_connect):
            with self.assertRaises(RuntimeError):
                actions.resolve_issue("ISS-1", {"actor": "alice", "role": "operator"})

    def test_exception_cannot_be_permanent_or_expired(self):
        with self.assertRaises(GovernanceActionError):
            actions.add_exception("attr-1", {"owner": "Data Owner", "reason": "Missing expiry"})

        with self.assertRaises(GovernanceActionError):
            actions.add_exception("attr-1", {"owner": "Data Owner", "reason": "Expired", "expiry_date": "2000-01-01T00:00:00Z"})

    def test_classification_request_writes_audit_only(self):
        class Conn:
            def __init__(self):
                self.audit_events = []

            def execute(self, query, params=None):
                if "audit_log" in str(query):
                    self.audit_events.append(params)
                return Result(None)

        conn = Conn()

        @contextmanager
        def fake_connect():
            yield conn

        with patch.object(actions, "connect", fake_connect):
            row = actions.request_classification_change(
                "attr-1",
                {
                    "classification": "restricted",
                    "sensitivity": "high",
                    "actor": "alice",
                    "role": "operator",
                    "reason": "Policy match",
                },
            )

        self.assertEqual(row["status"], "requested")
        self.assertEqual(conn.audit_events[0][2], "classification_change_requested")


if __name__ == "__main__":
    unittest.main()
