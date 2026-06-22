from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
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


def _percentage(value: float | None, digits: int = 1) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def _month_label(value: object) -> str:
    if isinstance(value, datetime):
        return value.strftime("%b")
    if isinstance(value, date):
        return value.strftime("%b")
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%b")
        except ValueError:
            return value
    return ""


def _risk_band_for_collection_rate(rate_pct: float | None) -> str:
    if rate_pct is None:
        return "unknown"
    if rate_pct >= 95:
        return "green"
    if rate_pct >= 90:
        return "blue"
    if rate_pct >= 86:
        return "amber"
    return "red"


def _risk_band_for_payment_days(days: float | None) -> str:
    if days is None:
        return "unknown"
    if days <= 20:
        return "green"
    if days <= 30:
        return "blue"
    if days <= 38:
        return "amber"
    return "red"


def _risk_band_for_aging_bucket(bucket_label: str) -> str:
    mapping = {
        "0-30": "green",
        "31-60": "blue",
        "61-90": "amber",
        "91-120": "orange",
        "91-180": "orange",
        "120+": "red",
        "180+": "red",
    }
    return mapping.get(bucket_label, "blue")


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


def _parse_date(value: object) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                return None
    return None


def _first_of_month(value: date) -> date:
    return value.replace(day=1)


def _shift_months(value: date, months: int) -> date:
    month_index = (value.year * 12 + (value.month - 1)) + months
    year, month_zero = divmod(month_index, 12)
    return date(year, month_zero + 1, 1)


def _month_span(start: date, end: date) -> list[date]:
    months: list[date] = []
    current = _first_of_month(start)
    last = _first_of_month(end)
    while current <= last:
        months.append(current)
        current = _shift_months(current, 1)
    return months


def _lower_text(value: object) -> str:
    return str(value or "").strip().lower()


def _parse_multi_value(value: object) -> set[str] | None:
    if value is None:
        return None
    parts = [_lower_text(part) for part in str(value).split(",")]
    normalized = {part for part in parts if part}
    return normalized or None


def _as_number(value: object) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _format_period_label(start: date | None, end: date | None, rolling_default: bool) -> str:
    if not start or not end:
        return "No claim data in scope"
    label = f"{start.strftime('%b %Y')} - {end.strftime('%b %Y')}"
    if rolling_default:
        return f"{label} - Rolling 12 months"
    return label


def _bucket_for_aging(days_value: float | None) -> str:
    days = days_value or 0
    if days <= 30:
        return "0-30"
    if days <= 60:
        return "31-60"
    if days <= 90:
        return "61-90"
    if days <= 180:
        return "91-180"
    return "180+"


def _kpi_status_for_collection_rate(rate_pct: float | None) -> str:
    if rate_pct is None:
        return "unknown"
    if rate_pct >= 80:
        return "healthy"
    if rate_pct >= 70:
        return "watch"
    return "critical"


def _kpi_status_for_ar_days(days_value: float | None, target: float = 40) -> str:
    if days_value is None:
        return "unknown"
    if days_value <= target:
        return "healthy"
    if days_value <= target + 30:
        return "watch"
    return "critical"


def _kpi_status_for_denial_rate(rate_pct: float | None) -> str:
    if rate_pct is None:
        return "unknown"
    if rate_pct <= 5:
        return "healthy"
    if rate_pct <= 8:
        return "watch"
    return "critical"


def _kpi_status_for_revenue_at_risk(risk_value: float, net_patient_revenue: float) -> str:
    if net_patient_revenue <= 0:
        return "unknown"
    ratio_pct = (risk_value / net_patient_revenue) * 100
    if ratio_pct < 10:
        return "healthy"
    if ratio_pct <= 25:
        return "watch"
    return "critical"


def _severity_rank(status: str) -> int:
    order = {"critical": 3, "watch": 2, "healthy": 1, "unknown": 0}
    return order.get(status, 0)


def _headline_severity(ar_days: float | None, denial_rate_pct: float | None, collection_rate_pct: float | None) -> str:
    statuses = [
        _kpi_status_for_ar_days(ar_days),
        _kpi_status_for_denial_rate(denial_rate_pct),
        _kpi_status_for_collection_rate(collection_rate_pct),
    ]
    if "critical" in statuses:
        return "critical"
    if "watch" in statuses:
        return "watch"
    if "healthy" in statuses:
        return "healthy"
    return "unknown"


def _status_note(status: str) -> str:
    if status == "critical":
        return "Immediate CFO attention required"
    if status == "watch":
        return "Watch list - pressure building"
    if status == "healthy":
        return "Within benchmark"
    return "Metric not configured"


def _due_bucket(due_date_value: date | None) -> str:
    if not due_date_value:
        return "No due date"
    delta_days = (due_date_value - date.today()).days
    if delta_days < 0:
        return "Overdue"
    if delta_days == 0:
        return "Today"
    if delta_days <= 7:
        return "This week"
    if delta_days <= 14:
        return "Next 14 days"
    return "Later"


def _action_priority_label(expected_recovery: float, due_bucket: str) -> str:
    if due_bucket in {"Overdue", "Today"} or expected_recovery >= 50_000:
        return "Critical"
    if due_bucket in {"This week", "Next 14 days"} or expected_recovery >= 15_000:
        return "Watch"
    return "Healthy"


def _action_label(issue_type: str) -> str:
    mapping = {
        "denial_appeal_priority": "Start appeal recovery",
        "payer_underpayment_review": "Start underpayment recovery",
        "late_submission_risk": "Escalate timely filing review",
        "coding_backlog_escalation": "Escalate coding review",
        "recover_cash_this_week": "Work balance this week",
    }
    return mapping.get(issue_type, "Start recovery")


def _risk_band_from_status(status: str) -> str:
    mapping = {
        "healthy": "green",
        "watch": "amber",
        "critical": "red",
        "unknown": "blue",
    }
    return mapping.get(status, "blue")


def _build_cash_command_payload(
    revenue_rows: list[dict[str, Any]],
    aging_rows: list[dict[str, Any]],
    denial_rows: list[dict[str, Any]],
    opportunity_rows: list[dict[str, Any]],
    leakage_rows: list[dict[str, Any]],
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw_filters = filters or {}
    payer_filter = _parse_multi_value(raw_filters.get("payer"))
    department_filter = _parse_multi_value(raw_filters.get("department"))
    claim_status_filter = _parse_multi_value(raw_filters.get("claim_status"))
    unsupported_filters = [
        key
        for key in ("facility", "specialty", "patient_type")
        if raw_filters.get(key)
    ]

    all_claim_dates = [_parse_date(row.get("claim_date")) for row in revenue_rows]
    valid_claim_dates = [value for value in all_claim_dates if value]
    latest_claim_date = max(valid_claim_dates) if valid_claim_dates else None

    requested_end = _parse_date(raw_filters.get("date_to"))
    requested_start = _parse_date(raw_filters.get("date_from"))
    rolling_default = requested_start is None and requested_end is None

    if latest_claim_date:
        period_end = requested_end or latest_claim_date
        period_start = requested_start or _shift_months(_first_of_month(period_end), -11)
    else:
        period_end = requested_end
        period_start = requested_start

    def _revenue_in_scope(row: dict[str, Any]) -> bool:
        claim_date = _parse_date(row.get("claim_date"))
        if period_start and (claim_date is None or claim_date < period_start):
            return False
        if period_end and (claim_date is None or claim_date > period_end):
            return False
        if payer_filter and _lower_text(row.get("payer_id")) not in payer_filter:
            return False
        if department_filter and _lower_text(row.get("department_id")) not in department_filter:
            return False
        if claim_status_filter and _lower_text(row.get("claim_status")) not in claim_status_filter:
            return False
        return True

    scoped_revenue = [row for row in revenue_rows if _revenue_in_scope(row)]
    allowed_claim_ids = {str(row.get("claim_id")) for row in scoped_revenue if row.get("claim_id")}

    scoped_aging = [row for row in aging_rows if str(row.get("claim_id")) in allowed_claim_ids]
    scoped_denials = [row for row in denial_rows if str(row.get("claim_id")) in allowed_claim_ids]
    scoped_opportunities = [row for row in opportunity_rows if str(row.get("claim_id")) in allowed_claim_ids]
    scoped_leakage = [row for row in leakage_rows if str(row.get("claim_id")) in allowed_claim_ids]

    as_of_candidates = [
        row.get("as_of_timestamp")
        for row in scoped_revenue
        if row.get("as_of_timestamp")
    ]
    as_of_datetime = None
    if as_of_candidates:
        parsed_candidates = [
            value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            for value in as_of_candidates
        ]
        as_of_datetime = max(parsed_candidates)

    base_meta = {
        "use_case": USE_CASE_ID,
        "section": "cash-command",
        "empty": len(scoped_revenue) == 0,
        "message": None,
    }

    if not scoped_revenue:
        base_meta["message"] = "No cash command data found for the selected filters."
        return {
            "as_of": _serialize(as_of_datetime),
            "currency": "SAR",
            "period": {
                "date_from": _serialize(period_start),
                "date_to": _serialize(period_end),
                "label": _format_period_label(period_start, period_end, rolling_default),
            },
            "data_freshness": _data_freshness(as_of_datetime),
            "meta": base_meta,
            "headline": {"severity": "unknown", "message": base_meta["message"], "metrics": []},
            "kpis": [],
            "journey": {"stages": []},
            "risk_concentration": [],
            "charts": {
                "cash_vs_charges": [],
                "ar_aging_buckets": [],
                "denial_recovery_pipeline": [],
                "payer_performance": [],
                "leakage_by_payer": [],
                "cash_gap_to_charges": 0.0,
                "ar_total": 0.0,
                "ar_over_90": 0.0,
            },
            "actions": {"grouped": [], "deadlines_at_risk": []},
            "data_quality": {
                "trust_label": "Financial truth: ERP postings",
                "sources_loaded": 0,
                "total_sources": 5,
                "generated_at": _serialize(as_of_datetime),
                "filters_applied": {
                    "date_from": _serialize(period_start),
                    "date_to": _serialize(period_end),
                    "payer": sorted(payer_filter) if payer_filter else [],
                    "department": sorted(department_filter) if department_filter else [],
                    "claim_status": sorted(claim_status_filter) if claim_status_filter else [],
                },
                "unsupported_filters": unsupported_filters,
                "source_tables": [],
                "missing_metrics": [],
                "warnings": [],
                "limitations": [],
            },
            "recoverable_cash_7d": 0.0,
            "recoverable_cash_14d": 0.0,
            "cash_at_risk": 0.0,
            "expected_collections": 0.0,
            "top_actions": [],
            "expiring_opportunities": [],
            "dashboard": None,
        }

    fallback_start = min(valid_claim_dates) if valid_claim_dates else date.today()
    fallback_end = max(valid_claim_dates) if valid_claim_dates else fallback_start
    months_in_scope = _month_span(period_start or fallback_start, period_end or fallback_end)
    month_count = max(len(months_in_scope), 1)
    claim_count = len(scoped_revenue)
    encounter_count = len({str(row.get("encounter_id") or row.get("claim_id")) for row in scoped_revenue})
    gross_charges = sum(_as_number(row.get("gross_billed_amount")) for row in scoped_revenue)
    net_patient_revenue = sum(_as_number(row.get("expected_cash_amount") or row.get("contracted_amount")) for row in scoped_revenue)
    cash_collected = sum(_as_number(row.get("posted_cash_amount")) for row in scoped_revenue)
    collection_rate = (cash_collected / net_patient_revenue * 100) if net_patient_revenue else None

    ar_total = sum(_as_number(row.get("outstanding_amount")) for row in scoped_aging)
    ar_over_90_rows = [row for row in scoped_aging if _as_number(row.get("aging_bucket_days")) > 90]
    ar_over_90_value = sum(_as_number(row.get("outstanding_amount")) for row in ar_over_90_rows)
    monthly_collection_average = cash_collected / month_count if month_count else 0
    ar_days = (ar_total / monthly_collection_average * 30) if monthly_collection_average else None

    denied_claim_value = sum(_as_number(row.get("denied_amount")) for row in scoped_denials)
    denied_claim_count = len(scoped_denials)
    denial_rate = (denied_claim_count / claim_count * 100) if claim_count else None

    dnfb_rows = [row for row in scoped_revenue if _lower_text(row.get("claim_status")) == "open"]
    dnfb_value = sum(_as_number(row.get("expected_cash_amount") or row.get("contracted_amount")) for row in dnfb_rows)
    dnfb_count = len(dnfb_rows)
    dnfb_open_days = [
        max(((period_end or latest_claim_date or date.today()) - claim_date).days, 0)
        for claim_date in [_parse_date(row.get("claim_date")) for row in dnfb_rows]
        if claim_date
    ]
    dnfb_average_days = _average([float(value) for value in dnfb_open_days])

    underpayment_rows = [row for row in scoped_leakage if _lower_text(row.get("leakage_type")) == "underpayments"]
    underpayment_value = sum(_as_number(row.get("leakage_amount")) for row in underpayment_rows)
    underpayment_count = len(underpayment_rows)

    late_submission_rows = [row for row in scoped_leakage if _lower_text(row.get("leakage_type")) == "late_submissions"]
    late_submission_value = sum(_as_number(row.get("leakage_amount")) for row in late_submission_rows)
    late_submission_count = len(late_submission_rows)

    revenue_at_risk = denied_claim_value + ar_over_90_value + dnfb_value + underpayment_value
    risk_ratio_pct = (revenue_at_risk / net_patient_revenue * 100) if net_patient_revenue else None

    current_window_cash = cash_collected
    if period_start and period_end:
        previous_end = period_start - timedelta(days=1)
        previous_start = _shift_months(_first_of_month(previous_end), -(month_count - 1))
        previous_rows = [
            row
            for row in revenue_rows
            if (
                (claim_date := _parse_date(row.get("claim_date"))) is not None
                and previous_start <= claim_date <= previous_end
                and (not payer_filter or _lower_text(row.get("payer_id")) in payer_filter)
                and (not department_filter or _lower_text(row.get("department_id")) in department_filter)
                and (not claim_status_filter or _lower_text(row.get("claim_status")) in claim_status_filter)
            )
        ]
        previous_cash = sum(_as_number(row.get("posted_cash_amount")) for row in previous_rows)
        previous_denial_count = sum(
            1
            for row in denial_rows
            if str(row.get("claim_id")) in {str(item.get("claim_id")) for item in previous_rows if item.get("claim_id")}
        )
        previous_denial_rate = (previous_denial_count / len(previous_rows) * 100) if previous_rows else None
        cash_growth_pct = ((current_window_cash - previous_cash) / previous_cash * 100) if previous_cash else None
        denial_delta_pp = (denial_rate - previous_denial_rate) if denial_rate is not None and previous_denial_rate is not None else None
    else:
        cash_growth_pct = None
        denial_delta_pp = None

    collection_status = _kpi_status_for_collection_rate(collection_rate)
    ar_status = _kpi_status_for_ar_days(ar_days)
    denial_status = _kpi_status_for_denial_rate(denial_rate)
    risk_status = _kpi_status_for_revenue_at_risk(revenue_at_risk, net_patient_revenue)
    headline_severity = _headline_severity(ar_days, denial_rate, collection_rate)

    headline_message = (
        "CFO Position: "
        + (
            "Cash conversion is under pressure."
            if headline_severity == "critical"
            else "Performance is drifting toward threshold."
            if headline_severity == "watch"
            else "Revenue conversion is within benchmark."
        )
        + f" AR Days are {round(ar_days or 0)} against a target of <=40, denial rate is {round(denial_rate or 0, 1)}%, "
        + f"and SAR {revenue_at_risk:,.0f} is exposed through aged receivables, denials, DNFB, and underpayments."
    )

    kpis = [
        {
            "key": "net_patient_revenue",
            "label": "Net Patient Revenue",
            "value": net_patient_revenue,
            "unit": "currency",
            "status": "healthy",
            "target_label": "Contract value baseline",
            "interpretation": "Booked contracted cash value for the filtered claim cohort.",
        },
        {
            "key": "cash_collected",
            "label": "Cash Collected",
            "value": cash_collected,
            "unit": "currency",
            "status": collection_status,
            "target_label": "Posted against the same claim cohort",
            "interpretation": "Posted cash is measured on the same cohort as the journey to avoid period-definition drift.",
        },
        {
            "key": "collection_rate",
            "label": "Collection Rate",
            "value": collection_rate,
            "unit": "percent",
            "status": collection_status,
            "target_label": "Healthy >= 80%",
            "interpretation": _status_note(collection_status),
        },
        {
            "key": "ar_days",
            "label": "AR Days",
            "value": ar_days,
            "unit": "days",
            "status": ar_status,
            "target_label": "Target <= 40 days",
            "interpretation": _status_note(ar_status),
        },
        {
            "key": "denial_rate",
            "label": "Denial Rate",
            "value": denial_rate,
            "unit": "percent",
            "status": denial_status,
            "target_label": "Healthy <= 5%",
            "interpretation": _status_note(denial_status),
        },
        {
            "key": "revenue_at_risk",
            "label": "Revenue at Risk",
            "value": revenue_at_risk,
            "unit": "currency",
            "status": risk_status,
            "target_label": "Healthy < 10% of NPR",
            "interpretation": "Composite exposure from denials, aged AR >90, DNFB proxy, and underpayments.",
        },
    ]

    created_claim_rows = [row for row in scoped_revenue if _lower_text(row.get("claim_status")) != "open"]
    submitted_claim_rows = [
        row
        for row in scoped_revenue
        if _lower_text(row.get("claim_status")) in {"submitted", "paid", "denied", "appealed", "writeoff"}
    ]
    paid_claim_rows = [row for row in scoped_revenue if _as_number(row.get("posted_cash_amount")) > 0]
    open_recovery_actions = len(scoped_opportunities)

    journey_stages = [
        {
            "stage_number": 1,
            "key": "care_delivered",
            "title": "Care Delivered",
            "status": "healthy",
            "why_it_matters": "Charge opportunity starts with the claimable encounter volume in scope.",
            "metrics": [
                {"label": "Encounters", "value": encounter_count, "unit": "count"},
                {"label": "Gross charges", "value": gross_charges, "unit": "currency"},
                {"label": "Expected cash", "value": net_patient_revenue, "unit": "currency"},
            ],
        },
        {
            "stage_number": 2,
            "key": "discharge_coding",
            "title": "Discharge & Coding",
            "status": _kpi_status_for_revenue_at_risk(dnfb_value, net_patient_revenue),
            "why_it_matters": "DNFB is proxied by open claims because discharge-to-bill timestamps are not modeled separately.",
            "metrics": [
                {"label": "Open claims", "value": dnfb_count, "unit": "count"},
                {"label": "DNFB proxy value", "value": dnfb_value, "unit": "currency"},
                {"label": "Open age", "value": dnfb_average_days, "unit": "days"},
            ],
        },
        {
            "stage_number": 3,
            "key": "claim_created",
            "title": "Claim Created",
            "status": "healthy" if created_claim_rows else "unknown",
            "why_it_matters": "Claim creation is inferred from active claims because a separate creation event is not modeled.",
            "metrics": [
                {"label": "Created claims", "value": len(created_claim_rows), "unit": "count"},
                {"label": "Created value", "value": sum(_as_number(row.get("expected_cash_amount")) for row in created_claim_rows), "unit": "currency"},
                {"label": "Coverage", "value": (len(created_claim_rows) / claim_count * 100) if claim_count else None, "unit": "percent"},
            ],
        },
        {
            "stage_number": 4,
            "key": "claim_submitted",
            "title": "Claim Submitted",
            "status": "watch" if late_submission_count else "healthy",
            "why_it_matters": "Late submission leakage shows where billing speed is suppressing cash conversion.",
            "metrics": [
                {"label": "Submitted claims", "value": len(submitted_claim_rows), "unit": "count"},
                {"label": "Late submissions", "value": late_submission_count, "unit": "count"},
                {"label": "Late submission value", "value": late_submission_value, "unit": "currency"},
            ],
        },
        {
            "stage_number": 5,
            "key": "payer_adjudication",
            "title": "Payer Adjudication",
            "status": denial_status,
            "why_it_matters": "Denial pressure is the cleanest leading signal of preventable revenue drag.",
            "metrics": [
                {"label": "Denied claims", "value": denied_claim_count, "unit": "count"},
                {"label": "Denial rate", "value": denial_rate, "unit": "percent"},
                {"label": "Denied value", "value": denied_claim_value, "unit": "currency"},
            ],
        },
        {
            "stage_number": 6,
            "key": "ar_recovery",
            "title": "AR & Recovery",
            "status": risk_status if _severity_rank(risk_status) >= _severity_rank(ar_status) else ar_status,
            "why_it_matters": "Aged receivables and open recovery work determine how much cash stays trapped in the ledger.",
            "metrics": [
                {"label": "Total AR", "value": ar_total, "unit": "currency"},
                {"label": "AR >90", "value": ar_over_90_value, "unit": "currency"},
                {"label": "Open recovery actions", "value": open_recovery_actions, "unit": "count"},
            ],
        },
        {
            "stage_number": 7,
            "key": "cash_collected",
            "title": "Cash Collected",
            "status": collection_status,
            "why_it_matters": "Posted cash and conversion rate use the exact same cohort shown in the KPI cards above.",
            "metrics": [
                {"label": "Cash collected", "value": cash_collected, "unit": "currency"},
                {"label": "Collection rate", "value": collection_rate, "unit": "percent"},
                {"label": "Paid claims", "value": len(paid_claim_rows), "unit": "count"},
            ],
        },
    ]

    concentration_components = [
        {
            "key": "ar_over_90",
            "label": "Aged receivables >90d",
            "amount": ar_over_90_value,
            "claims": len(ar_over_90_rows),
            "status": _kpi_status_for_revenue_at_risk(ar_over_90_value, net_patient_revenue),
            "note": "Older receivables are the heaviest drag on AR Days.",
        },
        {
            "key": "denials",
            "label": "Denied claim value",
            "amount": denied_claim_value,
            "claims": denied_claim_count,
            "status": denial_status,
            "note": "Denied balances need appeal or write-off governance.",
        },
        {
            "key": "dnfb",
            "label": "DNFB proxy",
            "amount": dnfb_value,
            "claims": dnfb_count,
            "status": _kpi_status_for_revenue_at_risk(dnfb_value, net_patient_revenue),
            "note": "Open claims are acting as the discharge-to-bill backlog proxy.",
        },
        {
            "key": "underpayments",
            "label": "Underpayments",
            "amount": underpayment_value,
            "claims": underpayment_count,
            "status": _kpi_status_for_revenue_at_risk(underpayment_value, net_patient_revenue),
            "note": "Paid below contract value and still recoverable.",
        },
    ]
    concentration_components = sorted(concentration_components, key=lambda item: item["amount"], reverse=True)
    for component in concentration_components:
        component["share_pct"] = (component["amount"] / revenue_at_risk * 100) if revenue_at_risk else None

    monthly_rollup: dict[str, dict[str, Any]] = {}
    for month_key in months_in_scope:
        label = month_key.strftime("%b")
        monthly_rollup[label] = {
            "month": label,
            "charges": 0.0,
            "cash_collected": 0.0,
            "expected_collections": 0.0,
            "denied_value": 0.0,
            "expected_recovery": 0.0,
        }
    for row in scoped_revenue:
        claim_date = _parse_date(row.get("claim_date"))
        if not claim_date:
            continue
        label = _first_of_month(claim_date).strftime("%b")
        if label not in monthly_rollup:
            continue
        monthly_rollup[label]["charges"] += _as_number(row.get("gross_billed_amount"))
        monthly_rollup[label]["cash_collected"] += _as_number(row.get("posted_cash_amount"))
        monthly_rollup[label]["expected_collections"] += _as_number(row.get("expected_cash_amount"))
    for row in scoped_denials:
        denial_date = _parse_date(row.get("denial_date"))
        if not denial_date:
            continue
        label = _first_of_month(denial_date).strftime("%b")
        if label in monthly_rollup:
            monthly_rollup[label]["denied_value"] += _as_number(row.get("denied_amount"))
    for row in scoped_opportunities:
        due_date = _parse_date(row.get("due_date"))
        if not due_date:
            continue
        label = _first_of_month(due_date).strftime("%b")
        if label in monthly_rollup:
            monthly_rollup[label]["expected_recovery"] += _as_number(row.get("expected_recovery_amount"))

    ar_aging_totals: dict[str, float] = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "91-180": 0.0, "180+": 0.0}
    for row in scoped_aging:
        bucket = _bucket_for_aging(_as_number(row.get("aging_bucket_days")))
        ar_aging_totals[bucket] += _as_number(row.get("outstanding_amount"))

    payer_rollup: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "expected_cash": 0.0,
            "cash_collected": 0.0,
            "claim_count": 0.0,
            "denied_claims": 0.0,
            "ar_exposure": 0.0,
            "days_total": 0.0,
            "days_count": 0.0,
        }
    )
    for row in scoped_revenue:
        payer_id = str(row.get("payer_id") or "Unknown")
        payer_rollup[payer_id]["expected_cash"] += _as_number(row.get("expected_cash_amount"))
        payer_rollup[payer_id]["cash_collected"] += _as_number(row.get("posted_cash_amount"))
        payer_rollup[payer_id]["claim_count"] += 1
        if _as_number(row.get("posted_cash_amount")) > 0:
            payer_rollup[payer_id]["days_total"] += _as_number(row.get("ar_days"))
            payer_rollup[payer_id]["days_count"] += 1
    for row in scoped_denials:
        payer_rollup[str(row.get("payer_id") or "Unknown")]["denied_claims"] += 1
    for row in scoped_aging:
        payer_rollup[str(row.get("payer_id") or "Unknown")]["ar_exposure"] += _as_number(row.get("outstanding_amount"))

    payer_performance = []
    for payer_id, totals in payer_rollup.items():
        payer_expected = totals["expected_cash"]
        payer_collection_rate = (totals["cash_collected"] / payer_expected * 100) if payer_expected else None
        payer_denial_rate = (totals["denied_claims"] / totals["claim_count"] * 100) if totals["claim_count"] else None
        payer_days = (totals["days_total"] / totals["days_count"]) if totals["days_count"] else None
        risk_score = (
            (max((100 - (payer_collection_rate or 0)), 0) * 0.35)
            + ((payer_denial_rate or 0) * 4.0)
            + ((payer_days or 0) * 0.6)
            + ((totals["ar_exposure"] / payer_expected * 100) if payer_expected else 0) * 0.25
        )
        payer_status = _headline_severity(payer_days, payer_denial_rate, payer_collection_rate)
        payer_performance.append(
            {
                "payer": payer_id,
                "collection_rate_pct": payer_collection_rate,
                "denial_rate_pct": payer_denial_rate,
                "avg_days_to_pay": payer_days,
                "ar_exposure": totals["ar_exposure"],
                "risk_score": risk_score,
                "status": payer_status,
            }
        )
    payer_performance.sort(key=lambda item: item["risk_score"], reverse=True)

    leakage_by_payer_rollup: dict[str, float] = defaultdict(float)
    for row in scoped_leakage:
        leakage_by_payer_rollup[str(row.get("payer_id") or "Unknown")] += _as_number(row.get("leakage_amount"))
    leakage_total = sum(leakage_by_payer_rollup.values())
    leakage_by_payer = [
        {
            "payer": payer_id,
            "leakage_amount": amount,
            "share_pct": (amount / leakage_total * 100) if leakage_total else None,
        }
        for payer_id, amount in sorted(leakage_by_payer_rollup.items(), key=lambda item: item[1], reverse=True)
    ]

    serialized_opportunities = []
    for row in scoped_opportunities:
        item = _serialize_row(row)
        item["next_step"] = _next_step(str(item.get("status") or "open"), "not_applicable")
        serialized_opportunities.append(item)
    serialized_opportunities.sort(
        key=lambda item: (
            -_as_number(item.get("priority_score")),
            -_as_number(item.get("expected_recovery_amount")),
            _parse_date(item.get("due_date")) or date.max,
        )
    )

    grouped_actions: dict[tuple[str, str, str, str, str], dict[str, Any]] = {}
    for item in serialized_opportunities:
        due_date = _parse_date(item.get("due_date"))
        bucket = _due_bucket(due_date)
        key = (
            str(item.get("issue_type") or "unknown"),
            str(item.get("payer_id") or "Unknown"),
            str(item.get("department_id") or "Unknown"),
            str(item.get("owner_team") or item.get("owner_user_id") or "Unassigned"),
            bucket,
        )
        existing = grouped_actions.get(key)
        if not existing:
            grouped_actions[key] = {
                "priority": None,
                "issue_type": key[0],
                "payer_id": key[1],
                "department_id": key[2],
                "owner": key[3],
                "due_bucket": bucket,
                "claims": 0,
                "recoverable_amount": 0.0,
                "expected_recovery": 0.0,
                "earliest_due_date": _serialize(due_date),
                "action": _action_label(key[0]),
            }
            existing = grouped_actions[key]
        existing["claims"] += 1
        existing["recoverable_amount"] += _as_number(item.get("recoverable_amount"))
        existing["expected_recovery"] += _as_number(item.get("expected_recovery_amount"))
        earliest_due = _parse_date(existing.get("earliest_due_date"))
        if due_date and (earliest_due is None or due_date < earliest_due):
            existing["earliest_due_date"] = _serialize(due_date)

    grouped_action_rows = list(grouped_actions.values())
    for row in grouped_action_rows:
        row["priority"] = _action_priority_label(float(row["expected_recovery"]), str(row["due_bucket"]))
    grouped_action_rows.sort(
        key=lambda row: (
            -_severity_rank(_lower_text(row["priority"])),
            -float(row["expected_recovery"]),
            _parse_date(row.get("earliest_due_date")) or date.max,
        )
    )

    deadlines_at_risk = [
        item
        for item in serialized_opportunities
        if _due_bucket(_parse_date(item.get("due_date"))) in {"Overdue", "Today", "This week", "Next 14 days"}
    ]
    deadlines_at_risk.sort(
        key=lambda item: (
            -_as_number(item.get("expected_recovery_amount")),
            _parse_date(item.get("due_date")) or date.max,
        )
    )

    warnings = []
    if unsupported_filters:
        warnings.append(
            "Unsupported filters were ignored: "
            + ", ".join(unsupported_filters)
            + ". These dimensions are not exposed on the current revenue-cycle marts."
        )
    warnings.append(
        "Claim created and claim submitted are inferred from claim status because separate workflow timestamps are not modeled."
    )
    warnings.append(
        "Cash collected uses posted cash attached to the filtered claim cohort to preserve payer and department consistency."
    )

    source_tables = [
        {
            "table": f"{settings.analytics_schema}.fct_revenue_cycle",
            "role": "Gross charges, contracted value, posted cash, and claim states.",
            "loaded": True,
        },
        {
            "table": f"{settings.analytics_schema}.fct_claim_aging",
            "role": "Current AR snapshot and aging buckets.",
            "loaded": True,
        },
        {
            "table": f"{settings.analytics_schema}.fct_denials",
            "role": "Denied claim counts, value, and appeal status.",
            "loaded": True,
        },
        {
            "table": f"{settings.analytics_schema}.fct_cash_recovery_opportunity",
            "role": "Recovery owners, due dates, and recoverable balances.",
            "loaded": True,
        },
        {
            "table": f"{settings.analytics_schema}.fct_revenue_leakage",
            "role": "Underpayments, late submissions, and leakage categorization.",
            "loaded": True,
        },
    ]

    payload = {
        "as_of": _serialize(as_of_datetime),
        "currency": "SAR",
        "period": {
            "date_from": _serialize(period_start),
            "date_to": _serialize(period_end),
            "label": _format_period_label(period_start, period_end, rolling_default),
        },
        "data_freshness": _data_freshness(as_of_datetime),
        "meta": base_meta,
        "headline": {
            "severity": headline_severity,
            "message": headline_message,
            "metrics": [
                {"label": "AR Days", "value": ar_days, "unit": "days"},
                {"label": "Denial Rate", "value": denial_rate, "unit": "percent"},
                {"label": "Collection Rate", "value": collection_rate, "unit": "percent"},
                {"label": "Revenue at Risk", "value": revenue_at_risk, "unit": "currency"},
            ],
        },
        "kpis": kpis,
        "journey": {"stages": journey_stages},
        "risk_concentration": concentration_components,
        "charts": {
            "cash_vs_charges": list(monthly_rollup.values()),
            "ar_aging_buckets": [
                {
                    "bucket": bucket,
                    "value": amount,
                    "risk_band": _risk_band_for_aging_bucket(bucket),
                }
                for bucket, amount in ar_aging_totals.items()
            ],
            "denial_recovery_pipeline": [
                {
                    "month": row["month"],
                    "denied_value": row["denied_value"],
                    "expected_recovery": row["expected_recovery"],
                }
                for row in monthly_rollup.values()
            ],
            "payer_performance": payer_performance,
            "leakage_by_payer": leakage_by_payer,
            "cash_gap_to_charges": gross_charges - cash_collected,
            "ar_total": ar_total,
            "ar_over_90": ar_over_90_value,
        },
        "actions": {
            "grouped": grouped_action_rows[:8],
            "deadlines_at_risk": deadlines_at_risk[:5],
        },
        "data_quality": {
            "trust_label": "Financial truth: ERP postings",
            "sources_loaded": sum(1 for item in source_tables if item["loaded"]),
            "total_sources": len(source_tables),
            "generated_at": _serialize(as_of_datetime),
            "filters_applied": {
                "date_from": _serialize(period_start),
                "date_to": _serialize(period_end),
                "payer": sorted(payer_filter) if payer_filter else [],
                "department": sorted(department_filter) if department_filter else [],
                "claim_status": sorted(claim_status_filter) if claim_status_filter else [],
            },
            "unsupported_filters": unsupported_filters,
            "source_tables": source_tables,
            "missing_metrics": [
                {
                    "label": "Coding completion rate",
                    "reason": "Discharge-to-bill workflow timestamps are not modeled on the current marts.",
                },
                {
                    "label": "Clean claim rate",
                    "reason": "A distinct claim-created versus claim-submitted event split is not available yet.",
                },
            ],
            "warnings": warnings,
            "limitations": [
                "Facility, specialty, and patient type filters are accepted but ignored because those dimensions are not present on the live marts.",
                "DNFB is proxied with open-claim contractual value rather than a discharge-specific queue table.",
                "Cash collected is measured on the filtered claim cohort instead of a standalone posting-period ledger slice so KPI cards and journey totals stay reconciled.",
            ],
        },
        "recoverable_cash_7d": sum(
            _as_number(item.get("expected_recovery_amount"))
            for item in serialized_opportunities
            if (due_date := _parse_date(item.get("due_date"))) and due_date <= date.today() + timedelta(days=7)
        ),
        "recoverable_cash_14d": sum(
            _as_number(item.get("expected_recovery_amount"))
            for item in serialized_opportunities
            if (due_date := _parse_date(item.get("due_date"))) and due_date <= date.today() + timedelta(days=14)
        ),
        "cash_at_risk": revenue_at_risk,
        "expected_collections": net_patient_revenue,
        "top_actions": serialized_opportunities[:5],
        "expiring_opportunities": deadlines_at_risk[:5],
        "dashboard": {
            "subtitle": _format_period_label(period_start, period_end, rolling_default),
            "status": {
                "label": "AR Days",
                "value": round(ar_days or 0),
                "target": "<=40",
                "band": _risk_band_from_status(ar_status),
            },
            "kpis": {
                "total_cash_collected": cash_collected,
                "total_cash_collected_delta_pct": _percentage(cash_growth_pct),
                "denial_rate_pct": _percentage(denial_rate),
                "denial_rate_delta_pp": _percentage(denial_delta_pp),
                "leakage_recovered": None,
                "leakage_recovered_pct_gross": _percentage(risk_ratio_pct),
                "claims_in_pipeline": claim_count,
                "claims_require_action": open_recovery_actions,
            },
            "cash_vs_charge_series": [
                {
                    "month": row["month"],
                    "charges": row["charges"],
                    "collections": row["cash_collected"],
                    "expected_collections": row["expected_collections"],
                }
                for row in monthly_rollup.values()
            ],
            "ar_aging_buckets": [
                {
                    "bucket": bucket,
                    "value": amount,
                    "risk_band": _risk_band_for_aging_bucket(bucket),
                }
                for bucket, amount in ar_aging_totals.items()
            ],
        },
    }
    return payload


def cash_command(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    revenue_table = qualified_table(settings.analytics_schema, "fct_revenue_cycle")
    aging_table = qualified_table(settings.analytics_schema, "fct_claim_aging")
    denials_table = qualified_table(settings.analytics_schema, "fct_denials")
    opportunity_table = qualified_table(settings.analytics_schema, "fct_cash_recovery_opportunity")
    leakage_table = qualified_table(settings.analytics_schema, "fct_revenue_leakage")

    try:
        with connect() as conn:
            revenue_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        claim_id,
                        encounter_id,
                        payer_id,
                        department_id,
                        claim_date,
                        claim_status,
                        gross_billed_amount,
                        contracted_amount,
                        expected_cash_amount,
                        posted_cash_amount,
                        ar_days,
                        as_of_timestamp
                    from {revenue_table}
                    """
                ).format(
                    revenue_table=revenue_table,
                )
            ).fetchall()

            aging_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        claim_id,
                        payer_id,
                        department_id,
                        snapshot_date,
                        aging_bucket_days,
                        outstanding_amount,
                        ar_days,
                        claim_status
                    from {aging_table}
                    """
                ).format(aging_table=aging_table)
            ).fetchall()

            denial_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        claim_id,
                        payer_id,
                        department_id,
                        denial_date,
                        denial_reason,
                        appeal_status,
                        denied_amount,
                        appeal_due_date,
                        claim_status
                    from {denials_table}
                    """
                ).format(denials_table=denials_table)
            ).fetchall()

            opportunity_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        opportunity_id,
                        claim_id,
                        payer_id,
                        department_id,
                        issue_type,
                        issue_reason,
                        detected_date,
                        due_date,
                        recoverable_amount,
                        expected_recovery_amount,
                        effort_hours,
                        priority_score,
                        owner_team,
                        owner_user_id,
                        status,
                        source_system,
                        evidence_summary
                    from {opportunity_table}
                    """
                ).format(opportunity_table=opportunity_table)
            ).fetchall()

            leakage_rows = conn.execute(
                sql.SQL(
                    """
                    select
                        claim_id,
                        payer_id,
                        department_id,
                        detected_date,
                        leakage_type,
                        leakage_reason,
                        leakage_amount,
                        owner_team,
                        owner_user_id,
                        status
                    from {leakage_table}
                    """
                ).format(leakage_table=leakage_table)
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
            dashboard=None,
        )
    return _build_cash_command_payload(
        [_serialize_row(row) for row in revenue_rows],
        [_serialize_row(row) for row in aging_rows],
        [_serialize_row(row) for row in denial_rows],
        [_serialize_row(row) for row in opportunity_rows],
        [_serialize_row(row) for row in leakage_rows],
        filters,
    )


def recovery_queue() -> dict[str, Any]:
    opportunity_table = qualified_table(settings.analytics_schema, "fct_cash_recovery_opportunity")
    denials_table = qualified_table(settings.analytics_schema, "fct_denials")
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

            pipeline_rows = conn.execute(
                sql.SQL(
                    """
                    with latest_month as (
                        select max(date_trunc('month', denial_date)::date) as month_key
                        from {denials_table}
                    ),
                    months as (
                        select generate_series(
                            (select month_key from latest_month) - interval '5 months',
                            (select month_key from latest_month),
                            interval '1 month'
                        )::date as month_key
                    ),
                    categories as (
                        select unnest(array['Clinical', 'Coding', 'Eligibility', 'Other']) as category
                    ),
                    denial_rollup as (
                        select
                            date_trunc('month', denial_date)::date as month_key,
                            case
                                when denial_reason = 'clinical_documentation_gap' then 'Clinical'
                                when denial_reason = 'coding_query' then 'Coding'
                                when denial_reason = 'authorization_missing' then 'Eligibility'
                                else 'Other'
                            end as category,
                            count(*)::integer as total_count
                        from {denials_table}
                        group by 1, 2
                    )
                    select
                        months.month_key,
                        categories.category,
                        coalesce(denial_rollup.total_count, 0)::integer as total_count
                    from months
                    cross join categories
                    left join denial_rollup
                        on denial_rollup.month_key = months.month_key
                       and denial_rollup.category = categories.category
                    order by months.month_key asc, categories.category asc
                    """
                ).format(denials_table=denials_table)
            ).fetchall()

            high_value_denials = conn.execute(
                sql.SQL(
                    """
                    select
                        count(*)::integer as claim_count,
                        sum(denied_amount)::numeric(14, 2) as amount_at_risk,
                        (
                            select array_agg(payer_id order by payer_total desc, payer_id)
                            from (
                                select
                                    payer_id,
                                    sum(denied_amount)::numeric(14, 2) as payer_total
                                from {denials_table}
                                where appeal_status in ('not_started', 'in_review')
                                group by payer_id
                                order by payer_total desc, payer_id
                                limit 2
                            ) ranked_payers
                        ) as top_payers
                    from {denials_table}
                    where appeal_status in ('not_started', 'in_review')
                    """
                ).format(denials_table=denials_table)
            ).fetchone()

            timely_filing = conn.execute(
                sql.SQL(
                    """
                    select
                        count(*)::integer as claim_count,
                        sum(expected_recovery_amount)::numeric(14, 2) as exposure_amount,
                        min(due_date) as nearest_due_date
                    from {opportunity_table}
                    where issue_type = 'late_submission_risk'
                    """
                ).format(opportunity_table=opportunity_table)
            ).fetchone()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "recovery-queue",
            "No revenue cycle data loaded yet",
            items=[],
            total=0,
            dashboard=None,
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

    pipeline_by_month: dict[str, dict[str, Any]] = {}
    for row in pipeline_rows:
        month_label = _month_label(row.get("month_key"))
        month_entry = pipeline_by_month.setdefault(
            month_label,
            {"month": month_label, "Clinical": 0, "Coding": 0, "Eligibility": 0, "Other": 0},
        )
        month_entry[str(row.get("category"))] = int(row.get("total_count") or 0)

    top_payers = high_value_denials.get("top_payers") if high_value_denials else []
    if not isinstance(top_payers, list):
        top_payers = list(top_payers or [])

    timely_due = timely_filing.get("nearest_due_date") if timely_filing else None
    days_until_due = max((timely_due - date.today()).days, 0) if isinstance(timely_due, date) else 14

    dashboard = {
        "denial_pipeline": list(pipeline_by_month.values()),
        "action_cards": [
            {
                "label": "High-value denials",
                "amount": float(high_value_denials.get("amount_at_risk") or 0) if high_value_denials else 0.0,
                "subtext": f"{int(high_value_denials.get('claim_count') or 0)} claims - {', '.join(top_payers) if top_payers else 'Payer mix pending'} - coding errors",
                "button_label": "Review",
                "href": "/use-cases/revenue-cycle-management/recovery-queue",
            },
            {
                "label": "Approaching timely filing",
                "amount": float(timely_filing.get("exposure_amount") or 0) if timely_filing else 0.0,
                "subtext": (
                    f"{int(timely_filing.get('claim_count') or 0)} claims - "
                    f"Deadline within {days_until_due} days"
                ),
                "button_label": "Act",
                "href": "/use-cases/revenue-cycle-management/leakage",
            },
        ],
    }

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
        "dashboard": dashboard,
    }


def payer_control() -> dict[str, Any]:
    contract_table = qualified_table(settings.analytics_schema, "fct_payer_contract_performance")
    leakage_table = qualified_table(settings.analytics_schema, "fct_revenue_leakage")

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
                        p.payer_id,
                        p.month_key,
                        p.gross_billed,
                        p.contracted_amount,
                        p.paid_amount,
                        p.underpayment_amount,
                        p.contract_rate_pct,
                        p.actual_collection_rate,
                        p.payment_sla_days,
                        p.actual_payment_days,
                        p.sla_breach_count,
                        p.contract_breach_flag,
                        p.renegotiation_flag
                    from {contract_table} p
                    cross join latest_month
                    where p.month_key = latest_month.month_key
                    order by p.underpayment_amount desc nulls last, p.sla_breach_count desc nulls last
                    """
                ).format(contract_table=contract_table)
            ).fetchall()

            leakage_rows = conn.execute(
                sql.SQL(
                    """
                    with payer_rollup as (
                        select
                            payer_id,
                            sum(leakage_amount)::numeric(14, 2) as leakage_amount
                        from {leakage_table}
                        group by 1
                    ),
                    ranked as (
                        select
                            payer_id,
                            leakage_amount,
                            row_number() over (order by leakage_amount desc nulls last) as rn,
                            sum(leakage_amount) over () as total_leakage
                        from payer_rollup
                    )
                    select
                        case when rn <= 4 then payer_id else 'Other' end as payer_group,
                        sum(leakage_amount)::numeric(14, 2) as leakage_amount,
                        max(total_leakage)::numeric(14, 2) as total_leakage
                    from ranked
                    group by 1
                    order by sum(leakage_amount) desc nulls last
                    """
                ).format(leakage_table=leakage_table)
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _safe_empty(
            "payer-control",
            "No revenue cycle data loaded yet",
            items=[],
            summary={"total_underpayment": None, "sla_breaches": 0, "breach_flag_count": 0},
            dashboard=None,
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

    dashboard = {
        "payer_performance": [
            {
                "payer": row.get("payer_id"),
                "collection_rate_pct": round(float(row.get("actual_collection_rate") or 0) * 100, 1),
                "avg_days_to_pay": int(row.get("actual_payment_days") or 0),
                "collection_rate_band": _risk_band_for_collection_rate(round(float(row.get("actual_collection_rate") or 0) * 100, 1)),
                "days_to_pay_band": _risk_band_for_payment_days(float(row.get("actual_payment_days") or 0)),
            }
            for row in items
        ],
        "leakage_by_payer": [
            {
                "label": row.get("payer_group"),
                "value_pct": round((float(row.get("leakage_amount") or 0) / float(row.get("total_leakage") or 1)) * 100, 1),
                "leakage_amount": float(row.get("leakage_amount") or 0),
            }
            for row in [_serialize_row(row) for row in leakage_rows]
            if float(row.get("leakage_amount") or 0) > 0
        ],
    }

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
        "dashboard": dashboard,
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
                        t.owner_team,
                        t.owner_user_id,
                        t.period_start,
                        t.period_end,
                        t.assigned_count,
                        t.completed_count,
                        t.expected_recovery,
                        t.actual_recovery,
                        t.recovery_variance_pct,
                        t.avg_resolution_hours,
                        t.overdue_count
                    from {team_table} t
                    cross join latest_period
                    where t.period_end = latest_period.period_end
                    order by t.actual_recovery desc nulls last, t.expected_recovery desc nulls last
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
