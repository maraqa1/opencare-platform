from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg import sql
from psycopg.errors import UndefinedColumn, UndefinedTable

from app.config import settings
from app.db import connect, qualified_table


USE_CASE_ID = "revenue_cycle_management"
ACTIVE_RECOVERY_STATUSES = ("new", "open", "assigned", "in_progress", "appeal_pending", "under_review")
TERMINAL_RECOVERY_STATUSES = ("completed", "resolved", "dismissed", "expired", "closed")


def _serialize(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat() + "Z"
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return value


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize(value) for key, value in dict(row).items()}


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _data_freshness(as_of: datetime | None) -> dict[str, Any]:
    if not as_of:
        return {"seconds": None, "status": "unknown"}
    seconds = max(int((datetime.utcnow() - as_of).total_seconds()), 0)
    if seconds <= 4 * 3600:
        status = "fresh"
    elif seconds <= 24 * 3600:
        status = "stale"
    else:
        status = "delayed"
    return {"seconds": seconds, "status": status}


def _empty_meta(message: str, section: str) -> dict[str, Any]:
    return {
        "use_case": USE_CASE_ID,
        "section": section,
        "empty": True,
        "message": message,
    }


def _safe_empty(section: str, message: str, **payload: Any) -> dict[str, Any]:
    return {
        "as_of": None,
        "data_freshness": {"seconds": None, "status": "unknown"},
        "meta": _empty_meta(message, section),
        **payload,
    }


def _currency_number(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _next_step(status: str, outcome_status: str) -> str:
    if status == "recommended":
        return "Assign owner / start action"
    if status == "assigned":
        return "Start action"
    if status == "in_progress":
        return "Complete action or dismiss with reason"
    if status == "completed" and outcome_status == "pending":
        return "Await outcome measurement"
    if status == "completed" and outcome_status == "measured":
        return "Review measured outcome"
    if status == "dismissed":
        return "Review dismissal reason"
    if status == "expired":
        return "Review missed action and escalation history"
    if status in {"resolved", "closed"}:
        return "Review measured outcome"
    return "Review work item"


def _recovery_outcome_status(status: str, measured_at: object) -> str:
    if status in {"completed", "resolved", "closed"}:
        return "measured" if measured_at else "pending"
    if status in {"dismissed", "expired"}:
        return "not_applicable"
    return "not_applicable"


def cash_command() -> dict[str, Any]:
    forecast_table = qualified_table(settings.analytics_schema, "fct_cash_forecast")
    opportunity_table = qualified_table(settings.analytics_schema, "fct_cash_recovery_opportunity")

    try:
        with connect() as conn:
            summary = conn.execute(
                sql.SQL(
                    """
                    with latest_forecast as (
                        select max(run_timestamp) as as_of
                        from {forecast_table}
                    ),
                    forecast_rollup as (
                        select
                            sum(case when forecast_date <= current_date + interval '7 days' then recoverable_cash else 0 end) as recoverable_cash_7d,
                            sum(case when forecast_date <= current_date + interval '14 days' then recoverable_cash else 0 end) as recoverable_cash_14d,
                            sum(case when forecast_date <= current_date + interval '7 days' then cash_at_risk else 0 end) as cash_at_risk,
                            sum(case when forecast_date <= current_date + interval '7 days' then expected_cash else 0 end) as expected_collections
                        from {forecast_table}, latest_forecast
                        where run_timestamp = latest_forecast.as_of
                    )
                    select
                        latest_forecast.as_of,
                        forecast_rollup.recoverable_cash_7d,
                        forecast_rollup.recoverable_cash_14d,
                        forecast_rollup.cash_at_risk,
                        forecast_rollup.expected_collections
                    from latest_forecast
                    cross join forecast_rollup
                    """
                ).format(
                    forecast_table=forecast_table,
                )
            ).fetchone()

            action_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        opportunity_id,
                        issue_type,
                        claim_id,
                        payer_id,
                        department_id,
                        recoverable_amount,
                        expected_recovery_amount,
                        due_date,
                        priority_score,
                        owner_team,
                        owner_user_id,
                        status,
                        evidence_summary
                    from {opportunity_table}
                    where coalesce(status, 'open') not in %s
                    order by priority_score desc nulls last, expected_recovery_amount desc nulls last, due_date asc nulls last
                    limit 5
                    """
                ).format(opportunity_table=opportunity_table),
                (list(TERMINAL_RECOVERY_STATUSES),),
            ).fetchall()

            expiring_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        opportunity_id,
                        issue_type,
                        claim_id,
                        payer_id,
                        department_id,
                        due_date,
                        expected_recovery_amount,
                        owner_team,
                        owner_user_id,
                        status
                    from {opportunity_table}
                    where due_date is not null
                      and due_date <= current_date + interval '7 days'
                      and coalesce(status, 'open') not in %s
                    order by due_date asc, priority_score desc nulls last
                    limit 5
                    """
                ).format(opportunity_table=opportunity_table),
                (list(TERMINAL_RECOVERY_STATUSES),),
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "cash-command",
            "No revenue cycle data loaded yet",
            recoverable_cash_7d=None,
            recoverable_cash_14d=None,
            cash_at_risk=None,
            expected_collections=None,
            top_actions=[],
            expiring_opportunities=[],
        )

    as_of_dt = summary.get("as_of") if summary else None
    top_actions = []
    for row in action_rows:
        item = _serialize_row(row)
        item["next_step"] = _next_step(str(item.get("status") or "open"), "not_applicable")
        top_actions.append(item)

    expiring = []
    for row in expiring_rows:
        item = _serialize_row(row)
        item["next_step"] = _next_step(str(item.get("status") or "open"), "not_applicable")
        expiring.append(item)

    return {
        "as_of": _serialize(as_of_dt),
        "data_freshness": _data_freshness(as_of_dt),
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "cash-command",
            "empty": False,
            "message": None,
        },
        "recoverable_cash_7d": _currency_number(summary.get("recoverable_cash_7d") if summary else None),
        "recoverable_cash_14d": _currency_number(summary.get("recoverable_cash_14d") if summary else None),
        "cash_at_risk": _currency_number(summary.get("cash_at_risk") if summary else None),
        "expected_collections": _currency_number(summary.get("expected_collections") if summary else None),
        "top_actions": top_actions,
        "expiring_opportunities": expiring,
    }


def recovery_queue() -> dict[str, Any]:
    opportunity_table = qualified_table(settings.analytics_schema, "fct_cash_recovery_opportunity")
    decision_table = qualified_table(settings.decision_schema, "decision_queue")
    outcome_table = qualified_table(settings.decision_schema, "decision_outcomes")
    notification_table = qualified_table(settings.decision_schema, "notification_log")

    try:
        with connect() as conn:
            rows = conn.execute(
                sql.SQL(
                    """
                    select
                        o.opportunity_id,
                        o.issue_type,
                        o.issue_reason,
                        o.claim_id,
                        o.encounter_id,
                        o.payer_id,
                        o.department_id,
                        o.recoverable_amount,
                        o.expected_recovery_amount,
                        o.effort_hours,
                        o.priority_score,
                        o.owner_team,
                        o.owner_user_id,
                        o.due_date,
                        o.status,
                        o.source_system,
                        o.evidence_summary,
                        q.id as decision_id,
                        q.status as decision_status,
                        q.expected_recovery,
                        q.due_at,
                        latest_outcome.measured_at,
                        latest_outcome.actual_recovery,
                        latest_outcome.recovery_variance_pct,
                        latest_outcome.success_flag,
                        notification_summary.sent_count,
                        notification_summary.failed_count,
                        notification_summary.skipped_count
                    from {opportunity_table} o
                    left join lateral (
                        select *
                        from {decision_table} q
                        where q.use_case = %s
                          and (
                            q.source_opportunity_id = o.opportunity_id
                            or (q.claim_id is not null and q.claim_id = o.claim_id)
                          )
                        order by q.updated_at desc, q.id desc
                        limit 1
                    ) q on true
                    left join lateral (
                        select
                            measured_at,
                            actual_recovery,
                            recovery_variance_pct,
                            success_flag
                        from {outcome_table} oo
                        where oo.decision_id = q.id
                        order by oo.measured_at desc nulls last, oo.id desc
                        limit 1
                    ) latest_outcome on true
                    left join lateral (
                        select
                            count(*) filter (where delivery_status = 'sent') as sent_count,
                            count(*) filter (where delivery_status = 'failed') as failed_count,
                            count(*) filter (where delivery_status = 'skipped') as skipped_count
                        from {notification_table} nn
                        where nn.decision_id = q.id
                    ) notification_summary on true
                    order by o.priority_score desc nulls last, o.expected_recovery_amount desc nulls last, o.due_date asc nulls last
                    """
                ).format(
                    opportunity_table=opportunity_table,
                    decision_table=decision_table,
                    outcome_table=outcome_table,
                    notification_table=notification_table,
                ),
                (USE_CASE_ID,),
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "recovery-queue",
            "No revenue cycle data loaded yet",
            items=[],
            total=0,
        )

    serialized_rows = [_serialize_row(row) for row in rows]
    items = []
    for row in serialized_rows:
        status = str(row.get("decision_status") or row.get("status") or "open")
        outcome_status = _recovery_outcome_status(status, row.get("measured_at"))
        items.append(
            {
                **row,
                "owner": row.get("owner_user_id") or row.get("owner_team"),
                "notification_status": {
                    "sent_count": row.get("sent_count", 0) or 0,
                    "failed_count": row.get("failed_count", 0) or 0,
                    "skipped_count": row.get("skipped_count", 0) or 0,
                },
                "outcome_status": outcome_status,
                "next_step": _next_step(status, outcome_status),
            }
        )

    as_of = None
    for item in items:
        due_date = item.get("due_date")
        if isinstance(due_date, str):
            as_of = _now_iso()
            break

    return {
        "as_of": as_of or _now_iso(),
        "data_freshness": {"seconds": 0 if items else None, "status": "fresh" if items else "unknown"},
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "recovery-queue",
            "empty": len(items) == 0,
            "message": "No revenue cycle data loaded yet" if not items else None,
        },
        "total": len(items),
        "items": items,
    }


def payer_control() -> dict[str, Any]:
    contract_table = qualified_table(settings.analytics_schema, "fct_payer_contract_performance")

    try:
        with connect() as conn:
            rows = conn.execute(
                sql.SQL(
                    """
                    with latest_month as (
                        select max(month_key) as month_key
                        from {contract_table}
                    )
                    select
                        payer_id,
                        month_key,
                        gross_billed,
                        contracted_amount,
                        paid_amount,
                        underpayment_amount,
                        contract_rate_pct,
                        actual_collection_rate,
                        payment_sla_days,
                        actual_payment_days,
                        sla_breach_count,
                        contract_breach_flag,
                        renegotiation_flag
                    from {contract_table}, latest_month
                    where {contract_table}.month_key = latest_month.month_key
                    order by underpayment_amount desc nulls last, sla_breach_count desc nulls last
                    """
                ).format(contract_table=contract_table)
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "payer-control",
            "No revenue cycle data loaded yet",
            items=[],
            summary={"total_underpayment": None, "sla_breaches": 0, "breach_flag_count": 0},
        )

    items = [_serialize_row(row) for row in rows]
    month_keys = [row.get("month_key") for row in items if row.get("month_key")]
    summary = {
        "total_underpayment": sum(float(row.get("underpayment_amount") or 0) for row in items),
        "sla_breaches": sum(int(row.get("sla_breach_count") or 0) for row in items),
        "breach_flag_count": sum(1 for row in items if row.get("contract_breach_flag")),
    }
    as_of = None
    if month_keys:
        as_of = f"{max(month_keys)}T00:00:00Z"

    return {
        "as_of": as_of,
        "data_freshness": {"seconds": None, "status": "periodic"},
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "payer-control",
            "empty": len(items) == 0,
            "message": "No revenue cycle data loaded yet" if not items else None,
        },
        "summary": summary,
        "items": items,
    }


def leakage() -> dict[str, Any]:
    leakage_table = qualified_table(settings.analytics_schema, "fct_revenue_leakage")

    try:
        with connect() as conn:
            rows = conn.execute(
                sql.SQL(
                    """
                    select
                        leakage_type,
                        count(*) as item_count,
                        sum(leakage_amount) as leakage_amount,
                        max(detected_date) as last_detected_at
                    from {leakage_table}
                    group by leakage_type
                    order by leakage_amount desc nulls last, item_count desc
                    """
                ).format(leakage_table=leakage_table)
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "revenue-leakage",
            "No revenue cycle data loaded yet",
            breakdown=[],
            totals={
                "unbilled_encounters": 0.0,
                "late_submissions": 0.0,
                "denied_not_appealed": 0.0,
                "underpayments": 0.0,
                "undercoding": 0.0,
                "writeoffs": 0.0,
                "missing_authorization": 0.0,
            },
        )

    breakdown = [_serialize_row(row) for row in rows]
    totals = {
        "unbilled_encounters": 0.0,
        "late_submissions": 0.0,
        "denied_not_appealed": 0.0,
        "underpayments": 0.0,
        "undercoding": 0.0,
        "writeoffs": 0.0,
        "missing_authorization": 0.0,
    }
    last_detected = None
    mapping = {
        "unbilled_encounters": "unbilled_encounters",
        "late_submissions": "late_submissions",
        "denied_not_appealed": "denied_not_appealed",
        "underpayments": "underpayments",
        "undercoding": "undercoding",
        "writeoffs": "writeoffs",
        "missing_authorization": "missing_authorization",
    }
    for row in breakdown:
        leakage_type = str(row.get("leakage_type") or "").lower()
        if leakage_type in mapping:
            totals[mapping[leakage_type]] = float(row.get("leakage_amount") or 0)
        last_detected = max(last_detected, row.get("last_detected_at")) if last_detected and row.get("last_detected_at") else row.get("last_detected_at") or last_detected

    return {
        "as_of": last_detected,
        "data_freshness": {"seconds": None, "status": "periodic"},
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "revenue-leakage",
            "empty": len(breakdown) == 0,
            "message": "No revenue cycle data loaded yet" if not breakdown else None,
        },
        "totals": totals,
        "breakdown": breakdown,
    }


def team_performance() -> dict[str, Any]:
    team_table = qualified_table(settings.analytics_schema, "fct_team_recovery_performance")

    try:
        with connect() as conn:
            rows = conn.execute(
                sql.SQL(
                    """
                    with latest_period as (
                        select max(period_end) as period_end
                        from {team_table}
                    )
                    select
                        owner_team,
                        owner_user_id,
                        period_start,
                        period_end,
                        assigned_count,
                        completed_count,
                        expected_recovery,
                        actual_recovery,
                        recovery_variance_pct,
                        avg_resolution_hours,
                        overdue_count
                    from {team_table}, latest_period
                    where {team_table}.period_end = latest_period.period_end
                    order by actual_recovery desc nulls last, expected_recovery desc nulls last
                    """
                ).format(team_table=team_table)
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "team-performance",
            "No revenue cycle data loaded yet",
            items=[],
            summary={"assigned": 0, "completed": 0, "expected_recovery": None, "actual_recovery": None},
        )

    items = [_serialize_row(row) for row in rows]
    summary = {
        "assigned": sum(int(row.get("assigned_count") or 0) for row in items),
        "completed": sum(int(row.get("completed_count") or 0) for row in items),
        "expected_recovery": sum(float(row.get("expected_recovery") or 0) for row in items),
        "actual_recovery": sum(float(row.get("actual_recovery") or 0) for row in items),
    }
    period_end = max((row.get("period_end") for row in items if row.get("period_end")), default=None)
    return {
        "as_of": f"{period_end}T00:00:00Z" if period_end else None,
        "data_freshness": {"seconds": None, "status": "periodic"},
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "team-performance",
            "empty": len(items) == 0,
            "message": "No revenue cycle data loaded yet" if not items else None,
        },
        "summary": summary,
        "items": items,
    }


def executive_narrative() -> dict[str, Any]:
    cash = cash_command()
    queue = recovery_queue()
    payer = payer_control()
    leak = leakage()
    team = team_performance()

    if cash["meta"]["empty"] and queue["meta"]["empty"] and payer["meta"]["empty"]:
        return {
            "as_of": None,
            "data_freshness": {"seconds": None, "status": "unknown"},
            "meta": _empty_meta("No revenue cycle data loaded yet", "executive-narrative"),
            "headline": "No revenue cycle data loaded yet",
            "key_drivers": [],
            "cash_impact": None,
            "recommended_actions": [],
            "risks": [],
            "next_steps": [],
        }

    top_actions = queue.get("items", [])[:3]
    payer_breaches = payer.get("items", [])[:3]
    leakage_breakdown = leak.get("breakdown", [])[:3]
    headline = (
        f"Recoverable cash over the next 7 days stands at {cash.get('recoverable_cash_7d') or 0:.2f}, "
        f"with {cash.get('cash_at_risk') or 0:.2f} still exposed to revenue leakage and payer delay."
    )
    key_drivers = [
        f"{len(queue.get('items', []))} ranked recovery opportunities are currently in the queue.",
        f"{payer.get('summary', {}).get('breach_flag_count', 0)} payer contracts are flagged for compliance review.",
        f"{sum(float(item.get('leakage_amount') or 0) for item in leakage_breakdown):.2f} of visible leakage is concentrated in the top categories.",
    ]
    recommended_actions = [
        {
            "action": item.get("next_step"),
            "owner": item.get("owner"),
            "expected_recovery": item.get("expected_recovery_amount") or item.get("expected_recovery"),
            "opportunity_id": item.get("opportunity_id"),
        }
        for item in top_actions
    ]
    risks = [
        {
            "risk": f"Payer {item.get('payer_id')} underpayment and SLA exposure",
            "cash_impact": item.get("underpayment_amount"),
        }
        for item in payer_breaches
    ] + [
        {
            "risk": f"Leakage in {item.get('leakage_type')}",
            "cash_impact": item.get("leakage_amount"),
        }
        for item in leakage_breakdown
    ]
    next_steps = [
        f"Assign top recovery queue items to named owners and work the due dates within the current cash window.",
        f"Review payer contract breach evidence before the next renegotiation cycle.",
        f"Compare expected recovery {team.get('summary', {}).get('expected_recovery') or 0:.2f} against actual recovery {team.get('summary', {}).get('actual_recovery') or 0:.2f} to rebalance workload.",
    ]
    as_of = cash.get("as_of") or queue.get("as_of") or payer.get("as_of")

    return {
        "as_of": as_of,
        "data_freshness": cash.get("data_freshness"),
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "executive-narrative",
            "empty": False,
            "message": None,
        },
        "headline": headline,
        "key_drivers": key_drivers,
        "cash_impact": {
            "recoverable_cash_7d": cash.get("recoverable_cash_7d"),
            "recoverable_cash_14d": cash.get("recoverable_cash_14d"),
            "cash_at_risk": cash.get("cash_at_risk"),
            "expected_collections": cash.get("expected_collections"),
        },
        "recommended_actions": recommended_actions,
        "risks": risks,
        "next_steps": next_steps,
    }


def summary() -> dict[str, Any]:
    cash = cash_command()
    queue = recovery_queue()
    payer = payer_control()
    team = team_performance()
    return {
        "as_of": cash.get("as_of") or queue.get("as_of") or payer.get("as_of"),
        "data_freshness": cash.get("data_freshness"),
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "summary",
            "empty": bool(cash["meta"]["empty"] and queue["meta"]["empty"] and payer["meta"]["empty"]),
            "message": "No revenue cycle data loaded yet" if cash["meta"]["empty"] and queue["meta"]["empty"] and payer["meta"]["empty"] else None,
        },
        "recoverable_cash_7d": cash.get("recoverable_cash_7d"),
        "recoverable_cash_14d": cash.get("recoverable_cash_14d"),
        "cash_at_risk": cash.get("cash_at_risk"),
        "expected_collections": cash.get("expected_collections"),
        "queue_items": queue.get("total", 0),
        "contract_breaches": payer.get("summary", {}).get("breach_flag_count", 0),
        "assigned_items": team.get("summary", {}).get("assigned", 0),
        "completed_items": team.get("summary", {}).get("completed", 0),
    }
