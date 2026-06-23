from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg import sql
from psycopg.errors import UndefinedColumn, UndefinedTable
from psycopg.types.json import Jsonb

from app.config import settings
from app.db import connect, qualified_table
from app.services.decision_service import ensure_decision_schema


USE_CASE_ID = "revenue_cycle_management"
ACTIVE_RECOVERY_STATUSES = ("new", "open", "assigned", "in_progress", "appeal_pending", "under_review")
TERMINAL_RECOVERY_STATUSES = ("completed", "resolved", "dismissed", "expired", "closed")


def _serialize(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
        return value.isoformat() + "Z"
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return value


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize(value) for key, value in dict(row).items()}


def _json(value: object) -> object:
    return Jsonb(value)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _data_freshness(as_of: datetime | None) -> dict[str, Any]:
    if not as_of:
        return {"seconds": None, "status": "unknown"}
    seconds = max(int((_utc_now_naive() - _normalize_datetime(as_of)).total_seconds()), 0)
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


def _journey_risk_class(status: object) -> str:
    normalized = _lower_text(status)
    if normalized in {"healthy", "watch", "critical"}:
        return normalized
    return "unavailable"


def _journey_status_label(status: object) -> str:
    normalized = _lower_text(status)
    if normalized == "healthy":
        return "Healthy"
    if normalized == "watch":
        return "Watch"
    if normalized == "critical":
        return "Critical"
    return "Unavailable"


def _format_journey_metric_value(value: object, unit: object) -> str:
    numeric_value = _currency_number(value)
    normalized_unit = _lower_text(unit)
    if numeric_value is None:
        return "Not available"
    if normalized_unit == "currency":
        return f"SAR {numeric_value:,.0f}"
    if normalized_unit == "percent":
        return f"{numeric_value:.1f}%"
    if normalized_unit == "days":
        return f"{numeric_value:.1f} days"
    if normalized_unit == "count":
        return f"{int(round(numeric_value)):,}"
    return f"{numeric_value:,.1f}"


def _build_journey_payload(cash_payload: dict[str, Any]) -> dict[str, Any]:
    journey_stages = cash_payload.get("journey", {}).get("stages", [])
    concentration_rows = cash_payload.get("risk_concentration", [])
    data_quality = cash_payload.get("data_quality", {})

    stages = []
    for stage in journey_stages:
        stage_status = stage.get("status")
        stages.append(
            {
                "stage_id": str(stage.get("key") or stage.get("title") or f"stage-{stage.get('stage_number') or 'x'}"),
                "stage_order": int(stage.get("stage_number") or 0),
                "stage_name": str(stage.get("title") or "Unnamed stage"),
                "stage_note": str(stage.get("why_it_matters") or "No journey narrative available."),
                "risk_class": _journey_risk_class(stage_status),
                "status": _journey_status_label(stage_status),
                "metrics": [
                    {
                        "label": str(metric.get("label") or "Metric"),
                        "value": metric.get("value"),
                        "unit": metric.get("unit"),
                        "formatted_value": _format_journey_metric_value(metric.get("value"), metric.get("unit")),
                        "available": _currency_number(metric.get("value")) is not None,
                    }
                    for metric in stage.get("metrics", [])
                ],
                "risk_note": str(stage.get("why_it_matters") or _status_note(_lower_text(stage_status))),
            }
        )

    return {
        "generated_at": data_quality.get("generated_at") or cash_payload.get("as_of"),
        "data_freshness": cash_payload.get("data_freshness"),
        "meta": cash_payload.get("meta"),
        "stages": stages,
        "risk_concentration": [
            {
                "label": str(row.get("label") or "Risk"),
                "formatted_value": _format_journey_metric_value(row.get("amount"), "currency"),
                "risk_class": _journey_risk_class(row.get("status")),
            }
            for row in concentration_rows
        ],
        "data_quality": {
            "warnings": [str(item) for item in data_quality.get("warnings", [])],
            "source_tables": [
                str(item.get("table"))
                for item in data_quality.get("source_tables", [])
                if item.get("table")
            ],
            "missing_metrics": [
                str(item.get("label"))
                for item in data_quality.get("missing_metrics", [])
                if item.get("label")
            ],
        },
    }


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
        + f" Average payment days are {round(ar_days or 0)} against a target of <=40, rejected claim rate is {round(denial_rate or 0, 1)}%, "
        + f"and SAR {revenue_at_risk:,.0f} is exposed through overdue balances, rejected claims, billing backlog, and underpayments."
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
            "label": "Average Payment Days",
            "value": ar_days,
            "unit": "days",
            "status": ar_status,
            "target_label": "Target <= 40 days",
            "interpretation": _status_note(ar_status),
        },
        {
            "key": "denial_rate",
            "label": "Rejected Claim Rate",
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
            "interpretation": "Composite exposure from rejected claims, balances overdue by 90+ days, billing backlog proxy, and underpayments.",
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
            "why_it_matters": "Billing backlog is proxied by open claims because discharge-to-bill timestamps are not modeled separately.",
            "metrics": [
                {"label": "Open claims", "value": dnfb_count, "unit": "count"},
                {"label": "Billing backlog proxy value", "value": dnfb_value, "unit": "currency"},
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
            "title": "Insurer Review",
            "status": denial_status,
            "why_it_matters": "Rejected-claim pressure is the clearest early sign of preventable revenue drag.",
            "metrics": [
                {"label": "Rejected claims", "value": denied_claim_count, "unit": "count"},
                {"label": "Rejected claim rate", "value": denial_rate, "unit": "percent"},
                {"label": "Rejected claim value", "value": denied_claim_value, "unit": "currency"},
            ],
        },
        {
            "stage_number": 6,
            "key": "ar_recovery",
            "title": "Outstanding Balances & Recovery",
            "status": risk_status if _severity_rank(risk_status) >= _severity_rank(ar_status) else ar_status,
            "why_it_matters": "Older unpaid balances and open recovery work determine how much cash stays trapped in the ledger.",
            "metrics": [
                {"label": "Total unpaid balance", "value": ar_total, "unit": "currency"},
                {"label": "Balance overdue 90+ days", "value": ar_over_90_value, "unit": "currency"},
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
            "label": "Balances overdue 90+ days",
            "amount": ar_over_90_value,
            "claims": len(ar_over_90_rows),
            "status": _kpi_status_for_revenue_at_risk(ar_over_90_value, net_patient_revenue),
            "note": "Older unpaid balances create the biggest drag on average payment days.",
        },
        {
            "key": "denials",
            "label": "Rejected claim value",
            "amount": denied_claim_value,
            "claims": denied_claim_count,
            "status": denial_status,
            "note": "Rejected balances need appeal or write-off governance.",
        },
        {
            "key": "dnfb",
            "label": "Billing backlog proxy",
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
            "role": "Current unpaid-balance snapshot and aging buckets.",
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
                {"label": "Average Payment Days", "value": ar_days, "unit": "days"},
                {"label": "Rejected Claim Rate", "value": denial_rate, "unit": "percent"},
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
                "Billing backlog is proxied with open-claim contractual value rather than a discharge-specific queue table.",
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
                "label": "Average Payment Days",
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


def journey(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    return _build_journey_payload(cash_command(filters))


RECOVERY_QUEUE_CURRENCY = "SAR"
RECOVERY_QUEUE_CRITICAL_SCORE_THRESHOLD = 4500.0
RECOVERY_QUEUE_HIGH_SCORE_THRESHOLD = 3000.0
RECOVERY_QUEUE_MEDIUM_SCORE_THRESHOLD = 1500.0
RECOVERY_QUEUE_HIGH_VALUE_THRESHOLD = 50_000.0
RECOVERY_QUEUE_DUE_PRESSURE_THRESHOLD = 10
RCM_DECISION_ACTIVE_STATUSES = ("recommended", "awaiting_review", "approved", "revised", "dispatched", "in_progress")
RCM_DECISION_VISIBLE_STATUSES = RCM_DECISION_ACTIVE_STATUSES + ("measured",)
RCM_DECISION_TERMINAL_STATUSES = ("rejected", "closed")
RCM_DECISION_MIN_EXPECTED_RECOVERY = 3_000.0
RCM_DECISION_HIGH_VALUE_THRESHOLD = 15_000.0
RCM_DECISION_APPROVAL_THRESHOLD = 20_000.0
RCM_DECISION_MIN_CONFIDENCE = 0.58
RCM_DECISION_HIGH_CONFIDENCE = 0.75
RCM_DECISION_AUTO_DISPATCH_THRESHOLD = 6_000.0


def _decision_display_id(value: object) -> str:
    try:
        return f"DEC-{int(value):04d}"
    except (TypeError, ValueError):
        return str(value or "DEC-0000")


def _decision_status_label(value: object) -> str:
    return _humanize_token(value or "recommended")


def _decision_transition_allowed(current_status: str, action: str) -> bool:
    status = _lower_text(current_status)
    if status in RCM_DECISION_TERMINAL_STATUSES:
        return False
    allowed_transitions = {
        "approve": {"recommended", "awaiting_review", "revised"},
        "reject": set(RCM_DECISION_VISIBLE_STATUSES),
        "revise": {"recommended", "awaiting_review", "approved"},
        "dispatch": {"recommended", "awaiting_review", "approved", "revised"},
        "escalate": set(RCM_DECISION_VISIBLE_STATUSES),
        "note": set(RCM_DECISION_VISIBLE_STATUSES) | set(RCM_DECISION_TERMINAL_STATUSES),
        "assign": set(RCM_DECISION_VISIBLE_STATUSES),
    }
    return status in allowed_transitions.get(action, set())


def _decision_source_type(item: dict[str, Any]) -> str:
    issue_type = _lower_text(item.get("issue_type") or item.get("issue_label"))
    if "denial" in issue_type:
        return "denial"
    if "underpayment" in issue_type:
        return "underpayment_item"
    if "aged" in issue_type or "ar" in issue_type:
        return "aged_ar_item"
    if "documentation" in issue_type:
        return "documentation_hold"
    if "payer" in issue_type:
        return "payer_dispute"
    return "claim"


def _decision_type(item: dict[str, Any]) -> str:
    issue_type = _lower_text(item.get("issue_type") or item.get("issue_label"))
    owner_missing = not (item.get("owner_user_id") or item.get("owner_team") or item.get("owner"))
    expected_recovery = _as_number(item.get("expected_recovery"))
    due_pressure = str(item.get("sla_risk") or "Future")

    if owner_missing:
        return "assign_owner"
    if "denial" in issue_type:
        return "appeal_denial"
    if "late_submission" in issue_type:
        return "resubmit_claim"
    if "underpayment" in issue_type:
        return "payer_contract_review" if expected_recovery >= RCM_DECISION_MIN_EXPECTED_RECOVERY else "assign_owner"
    if "aged" in issue_type or "ar" in issue_type:
        return "manager_review"
    if "documentation" in issue_type:
        return "request_documentation"
    if due_pressure in {"Overdue", "Due Today"}:
        return "manager_review"
    return "assign_owner"


def _decision_recommended_action(decision_type: str) -> str:
    mapping = {
        "assign_owner": "Assign accountable owner",
        "appeal_denial": "Appeal denial",
        "resubmit_claim": "Resubmit claim before filing window closes",
        "escalate_payer": "Escalate payer dispute",
        "writeoff_review": "Review write-off exposure",
        "request_documentation": "Request supporting documentation",
        "manager_review": "Route for manager review",
        "payer_contract_review": "Route contract variance review",
    }
    return mapping.get(decision_type, "Review recovery decision")


def _decision_action_plan(decision_type: str) -> list[dict[str, Any]]:
    plans = {
        "assign_owner": [
            {"order": 1, "action": "Confirm accountable owner", "completed": False},
            {"order": 2, "action": "Route item into recovery workqueue", "completed": False},
        ],
        "appeal_denial": [
            {"order": 1, "action": "Validate denial packet and filing window", "completed": False},
            {"order": 2, "action": "Submit payer appeal", "completed": False},
        ],
        "resubmit_claim": [
            {"order": 1, "action": "Correct claim exception", "completed": False},
            {"order": 2, "action": "Resubmit claim", "completed": False},
        ],
        "request_documentation": [
            {"order": 1, "action": "Request missing documentation", "completed": False},
            {"order": 2, "action": "Re-evaluate claim readiness", "completed": False},
        ],
        "payer_contract_review": [
            {"order": 1, "action": "Validate contract variance", "completed": False},
            {"order": 2, "action": "Escalate to payer relations lead", "completed": False},
        ],
        "manager_review": [
            {"order": 1, "action": "Review evidence and routing", "completed": False},
            {"order": 2, "action": "Approve next intervention", "completed": False},
        ],
    }
    return plans.get(decision_type, [{"order": 1, "action": "Review decision", "completed": False}])


def _decision_recommended_owner(decision_type: str, item: dict[str, Any]) -> str:
    mapping = {
        "assign_owner": item.get("owner_label") or item.get("owner_team") or "Revenue Recovery Team",
        "appeal_denial": "Insurer Relations Team",
        "resubmit_claim": "Claims Submission Team",
        "request_documentation": "Clinical Documentation Team",
        "payer_contract_review": "Insurer Relations Lead",
        "manager_review": "RCM Manager",
        "writeoff_review": "CFO Delegate",
        "escalate_payer": "Insurer Relations Lead",
    }
    return str(mapping.get(decision_type, "Revenue Recovery Team"))


def _decision_recommended_channel(decision_type: str) -> str:
    mapping = {
        "assign_owner": "Revenue Recovery Workqueue",
        "appeal_denial": "Insurer Work Queue",
        "resubmit_claim": "Claims Workqueue",
        "request_documentation": "Clinical Review Queue",
        "payer_contract_review": "Supervisor Review",
        "manager_review": "Supervisor Review",
        "writeoff_review": "Executive Review",
        "escalate_payer": "Insurer Escalation Queue",
    }
    return mapping.get(decision_type, "Revenue Recovery Workqueue")


def _decision_recoverability_probability(decision_type: str) -> float:
    mapping = {
        "assign_owner": 0.64,
        "appeal_denial": 0.74,
        "resubmit_claim": 0.67,
        "request_documentation": 0.69,
        "payer_contract_review": 0.78,
        "manager_review": 0.62,
        "writeoff_review": 0.45,
        "escalate_payer": 0.58,
    }
    return mapping.get(decision_type, 0.60)


def _decision_policy_weight(decision_type: str, due_pressure: str) -> float:
    mapping = {
        "assign_owner": 1.00,
        "appeal_denial": 1.18,
        "resubmit_claim": 1.22,
        "request_documentation": 1.08,
        "payer_contract_review": 1.20,
        "manager_review": 1.25,
        "writeoff_review": 1.35,
        "escalate_payer": 1.15,
    }
    weight = mapping.get(decision_type, 1.00)
    if due_pressure in {"Overdue", "Due Today"}:
        return round(weight + 0.05, 2)
    return weight


def _decision_confidence(item: dict[str, Any], decision_type: str, recoverability_probability: float) -> float:
    confidence = recoverability_probability
    if item.get("source_evidence"):
        confidence += 0.08
    if item.get("root_cause"):
        confidence += 0.03
    if item.get("owner_label") or item.get("owner_team"):
        confidence += 0.04
    if str(item.get("sla_risk") or "") in {"Overdue", "Due Today", "Due This Week"}:
        confidence += 0.04
    if _as_number(item.get("expected_recovery")) >= RCM_DECISION_HIGH_VALUE_THRESHOLD:
        confidence += 0.04
    if _as_number(item.get("effort_hours")) <= 2:
        confidence += 0.03
    if decision_type == "assign_owner":
        confidence -= 0.04
    return round(max(0.45, min(0.95, confidence)), 2)


def _decision_confidence_weight(confidence: float) -> float:
    return round(0.80 + (confidence * 0.50), 2)


def _decision_priority(decision_score: float, due_pressure: str, approval_required: bool) -> str:
    if due_pressure in {"Overdue", "Due Today"} or decision_score >= RECOVERY_QUEUE_CRITICAL_SCORE_THRESHOLD:
        return "Critical"
    if approval_required or decision_score >= RECOVERY_QUEUE_HIGH_SCORE_THRESHOLD:
        return "High"
    if decision_score >= RECOVERY_QUEUE_MEDIUM_SCORE_THRESHOLD:
        return "Medium"
    return "Routine"


def _decision_approval(decision_type: str, item: dict[str, Any]) -> tuple[bool, str | None]:
    expected_recovery = _as_number(item.get("expected_recovery"))
    due_pressure = str(item.get("sla_risk") or "Future")
    owner_missing = not (item.get("owner_user_id") or item.get("owner_team") or item.get("owner"))
    if expected_recovery >= RECOVERY_QUEUE_HIGH_VALUE_THRESHOLD:
        return True, "CFO Delegate"
    if decision_type == "payer_contract_review":
        return True, "Insurer Relations Lead"
    if decision_type in {"manager_review", "writeoff_review"}:
        return True, "RCM Manager"
    if owner_missing:
        return True, "Revenue Integrity Manager"
    if due_pressure in {"Overdue", "Due Today"} and expected_recovery >= RCM_DECISION_MIN_EXPECTED_RECOVERY:
        return True, "Revenue Integrity Manager"
    if expected_recovery >= RCM_DECISION_APPROVAL_THRESHOLD:
        return True, "RCM Manager"
    return False, None


def _decision_risk_of_inaction(decision_type: str, item: dict[str, Any]) -> str:
    due_pressure = str(item.get("sla_risk") or "Future")
    issue_label = item.get("issue_label") or item.get("issue_type") or "recovery item"
    if decision_type == "appeal_denial":
        return "Appeal window may close and denied cash may become unrecoverable."
    if decision_type == "resubmit_claim":
        return "Timely filing exposure may lock the claim out of payer recovery."
    if decision_type == "payer_contract_review":
        return "Contract variance may continue to leak cash if the payer route is not authorised."
    if due_pressure in {"Overdue", "Due Today"}:
        return f"{issue_label} is already under immediate due pressure and may miss its intervention window."
    return f"{issue_label} may continue aging without a governed routing decision."


def _decision_comparable_case_support(decision_type: str, item: dict[str, Any], recoverability_probability: float) -> list[dict[str, Any]]:
    sample_sizes = {
        "assign_owner": 16,
        "appeal_denial": 42,
        "resubmit_claim": 27,
        "request_documentation": 24,
        "payer_contract_review": 31,
        "manager_review": 18,
        "writeoff_review": 12,
        "escalate_payer": 21,
    }
    return [
        {
            "case_group": f"Seeded {str(item.get('issue_label') or item.get('issue_type') or decision_type).replace('_', ' ')} interventions",
            "success_rate": round(recoverability_probability, 2),
            "sample_size": sample_sizes.get(decision_type, 12),
            "source": "seeded_benchmark_until_rcm_outcomes_accumulate",
        }
    ]


def _decision_reason(item: dict[str, Any], decision_type: str, approval_required: bool, confidence: float) -> str:
    reasons: list[str] = []
    if _as_number(item.get("expected_recovery")) >= RCM_DECISION_HIGH_VALUE_THRESHOLD:
        reasons.append("high expected recovery")
    if str(item.get("sla_risk") or "") in {"Overdue", "Due Today", "Due This Week"}:
        reasons.append(f"due pressure is {item.get('sla_risk')}")
    if approval_required:
        reasons.append("approval is required")
    if not (item.get("owner_label") or item.get("owner_team")):
        reasons.append("owner assignment is missing")
    if confidence >= RCM_DECISION_HIGH_CONFIDENCE:
        reasons.append("evidence confidence is high")
    if not reasons:
        reasons.append("the recommendation changes routing or escalation, not just work order")
    return (
        f"{_decision_recommended_action(decision_type)} because "
        + ", ".join(reasons[:-1] + [reasons[-1]])
        + "."
    )


def _decision_candidate_preview(item: dict[str, Any], force: bool = False) -> dict[str, Any] | None:
    status = _lower_text(item.get("status") or item.get("decision_status"))
    if status in TERMINAL_RECOVERY_STATUSES:
        return None

    expected_recovery = _as_number(item.get("expected_recovery"))
    effort_hours = max(_as_number(item.get("effort_hours")), 0.25)
    if expected_recovery <= 0:
        return None

    decision_type = _decision_type(item)
    recoverability_probability = _decision_recoverability_probability(decision_type)
    due_pressure = str(item.get("sla_risk") or "Future")
    policy_weight = _decision_policy_weight(decision_type, due_pressure)
    confidence = _decision_confidence(item, decision_type, recoverability_probability)
    confidence_weight = _decision_confidence_weight(confidence)
    urgency_multiplier = _queue_urgency_multiplier(item.get("days_to_due"))
    approval_required, approval_role = _decision_approval(decision_type, item)
    decision_score = round(
        (expected_recovery * recoverability_probability * urgency_multiplier * policy_weight * confidence_weight)
        / max(effort_hours, 0.25),
        2,
    )
    priority = _decision_priority(decision_score, due_pressure, approval_required)
    comparable_case_support = _decision_comparable_case_support(decision_type, item, recoverability_probability)
    owner_missing = not (item.get("owner_label") or item.get("owner_team"))
    high_value = expected_recovery >= RCM_DECISION_HIGH_VALUE_THRESHOLD
    urgent = due_pressure in {"Overdue", "Due Today", "Due This Week"}

    should_promote = any(
        [
            high_value,
            decision_score >= RECOVERY_QUEUE_MEDIUM_SCORE_THRESHOLD,
            approval_required,
            owner_missing,
            urgent,
            decision_type in {"appeal_denial", "payer_contract_review", "manager_review"},
        ]
    )
    if not force:
        if not should_promote:
            return None
        if confidence < RCM_DECISION_MIN_CONFIDENCE and not (approval_required or urgent or high_value):
            return None
        if priority == "Routine" and expected_recovery < RCM_DECISION_MIN_EXPECTED_RECOVERY:
            return None

    recommended_owner = _decision_recommended_owner(decision_type, item)
    recommended_channel = _decision_recommended_channel(decision_type)
    recommended_action = _decision_recommended_action(decision_type)
    decision_reason = _decision_reason(item, decision_type, approval_required, confidence)
    decision_status = "awaiting_review" if approval_required or owner_missing else "recommended"
    auto_dispatch_eligible = (
        not approval_required
        and confidence >= 0.80
        and expected_recovery >= RCM_DECISION_AUTO_DISPATCH_THRESHOLD
        and due_pressure == "Future"
    )
    source_item_id = str(item.get("opportunity_id") or item.get("claim_ref") or item.get("claim_id") or "")
    return {
        "source_item_id": source_item_id,
        "source_type": _decision_source_type(item),
        "decision_type": decision_type,
        "decision_reason": decision_reason,
        "recommended_action": recommended_action,
        "recommended_owner": recommended_owner,
        "recommended_channel": recommended_channel,
        "expected_recovery": round(expected_recovery, 2),
        "expected_effort_hours": round(effort_hours, 2),
        "expected_roi_per_hour": round(expected_recovery / max(effort_hours, 0.25), 2),
        "due_pressure": due_pressure,
        "recoverability_probability": recoverability_probability,
        "confidence": confidence,
        "risk_of_inaction": _decision_risk_of_inaction(decision_type, item),
        "comparable_case_support": comparable_case_support,
        "approval_required": approval_required,
        "approval_role": approval_role,
        "decision_status": decision_status,
        "outcome_status": "pending",
        "priority": priority,
        "decision_score": decision_score,
        "policy_weight": policy_weight,
        "confidence_weight": confidence_weight,
        "auto_dispatch_eligible": auto_dispatch_eligible,
        "manual_action_required": False,
        "generated_by": "rcm_decision_model_v1",
        "recommended_actions": _decision_action_plan(decision_type),
        "data_inputs": {
            "source_snapshot": {
                "claim_ref": item.get("claim_ref"),
                "claim_id": item.get("claim_id"),
                "opportunity_id": item.get("opportunity_id"),
                "payer_id": item.get("payer_id") or item.get("payer"),
                "payer_label": item.get("payer_label"),
                "issue_type": item.get("issue_type"),
                "issue_label": item.get("issue_label"),
                "root_cause": item.get("root_cause"),
                "source_evidence": item.get("source_evidence"),
                "owner_label": item.get("owner_label"),
                "owner_team": item.get("owner_team"),
                "timeline": item.get("timeline") or [],
                "due_date": item.get("due_date"),
            },
            "scoring": {
                "decision_score": decision_score,
                "priority_score": _as_number(item.get("priority_score")),
                "urgency_multiplier": urgency_multiplier,
                "policy_weight": policy_weight,
                "confidence_weight": confidence_weight,
                "recoverability_probability": recoverability_probability,
            },
            "thresholds": {
                "min_expected_recovery": RCM_DECISION_MIN_EXPECTED_RECOVERY,
                "approval_threshold": RCM_DECISION_APPROVAL_THRESHOLD,
                "high_value_threshold": RCM_DECISION_HIGH_VALUE_THRESHOLD,
                "min_confidence": RCM_DECISION_MIN_CONFIDENCE,
            },
        },
    }


def _rcm_log_transition(
    conn: Any,
    decision_id: int,
    previous_state: str | None,
    new_state: str,
    action: str,
    *,
    performed_by: str,
    performed_by_role: str,
    reason: str | None = None,
    notes: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        insert into decision.decision_log (
            decision_id,
            previous_state,
            new_state,
            action,
            performed_by,
            performed_by_role,
            reason,
            notes,
            metadata
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            decision_id,
            previous_state,
            new_state,
            action,
            performed_by,
            performed_by_role,
            reason,
            notes,
            _json(metadata or {}),
        ),
    )


def _rcm_log_notification(
    conn: Any,
    decision_id: int,
    notification_type: str,
    *,
    recipient_team: str | None = None,
    recipient_user: str | None = None,
    recipient_email: str | None = None,
    delivery_status: str = "skipped",
    error_message: str | None = None,
) -> None:
    conn.execute(
        """
        insert into decision.notification_log (
            decision_id,
            notification_type,
            channel,
            recipient_email,
            recipient_team,
            recipient_user,
            subject,
            delivery_status,
            error_message
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            decision_id,
            notification_type,
            "manual",
            recipient_email,
            recipient_team,
            recipient_user,
            "RCM decision workflow",
            delivery_status,
            error_message,
        ),
    )


def _find_existing_rcm_decision(conn: Any, item: dict[str, Any]) -> dict[str, Any] | None:
    source_item_id = str(item.get("opportunity_id") or item.get("claim_ref") or item.get("claim_id") or "")
    claim_id = str(item.get("claim_id") or item.get("claim_ref") or "")
    row = conn.execute(
        """
        select *
        from decision.decision_queue
        where use_case = %s
          and (
            source_item_id = %s
            or source_opportunity_id = %s
            or (claim_id is not null and claim_id = %s)
          )
        order by updated_at desc nulls last, id desc
        limit 1
        """,
        (USE_CASE_ID, source_item_id, item.get("opportunity_id"), claim_id),
    ).fetchone()
    return dict(row) if row else None


def _insert_rcm_decision_candidate(conn: Any, item: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    entity_id = str(candidate["source_item_id"] or item.get("claim_ref") or item.get("claim_id") or item.get("opportunity_id"))
    claim_ref = str(item.get("claim_ref") or item.get("claim_id") or item.get("opportunity_id") or "Recovery item")
    payer_label = str(item.get("payer_label") or item.get("payer_id") or "Unknown insurer")
    inserted = conn.execute(
        """
        insert into decision.decision_queue (
            use_case,
            decision_type,
            entity_type,
            entity_id,
            entity_name,
            priority,
            priority_score,
            urgency_score,
            impact_score,
            title,
            signal_summary,
            decision_summary,
            rationale,
            recommended_actions,
            data_inputs,
            model_version,
            confidence_level,
            confidence_detail,
            owner_team,
            owner_user_id,
            assignee_user,
            assignee_email,
            source_opportunity_id,
            source_item_id,
            source_type,
            claim_id,
            payer_id,
            department_id,
            expected_recovery,
            due_at,
            status,
            recommended_action,
            recommended_owner,
            recommended_channel,
            decision_reason,
            risk_of_inaction,
            approval_required,
            approval_role,
            auto_dispatch_eligible,
            manual_action_required,
            decision_score,
            recoverability_probability,
            confidence,
            policy_weight,
            confidence_weight,
            due_pressure,
            expected_effort_hours,
            expected_roi_per_hour,
            comparable_case_support,
            outcome_status,
            generated_by
        )
        values (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        returning *
        """,
        (
            USE_CASE_ID,
            candidate["decision_type"],
            candidate["source_type"],
            entity_id,
            f"{claim_ref} · {payer_label}",
            candidate["priority"],
            candidate["decision_score"],
            round(_queue_urgency_multiplier(item.get("days_to_due")) * 100, 2),
            round(candidate["expected_recovery"] / 1_000, 2),
            f"{candidate['recommended_action']} · {claim_ref}",
            f"{item.get('issue_label') or item.get('issue_type') or 'Recovery item'} · {candidate['due_pressure']} · {item.get('formatted_expected_recovery') or _format_queue_currency(candidate['expected_recovery'])}",
            candidate["decision_reason"],
            candidate["risk_of_inaction"],
            _json(candidate["recommended_actions"]),
            _json(candidate["data_inputs"]),
            "rcm-decision-v1.0",
            "High" if candidate["confidence"] >= RCM_DECISION_HIGH_CONFIDENCE else ("Medium" if candidate["confidence"] >= RCM_DECISION_MIN_CONFIDENCE else "Low"),
            f"Confidence {candidate['confidence']:.0%} from issue pattern, due pressure, and source evidence coverage.",
            candidate["recommended_owner"],
            item.get("owner_user_id"),
            item.get("owner_user_id"),
            None,
            item.get("opportunity_id"),
            candidate["source_item_id"],
            candidate["source_type"],
            item.get("claim_id") or item.get("claim_ref"),
            item.get("payer_id") or item.get("payer"),
            item.get("department_id"),
            candidate["expected_recovery"],
            item.get("due_date"),
            candidate["decision_status"],
            candidate["recommended_action"],
            candidate["recommended_owner"],
            candidate["recommended_channel"],
            candidate["decision_reason"],
            candidate["risk_of_inaction"],
            candidate["approval_required"],
            candidate["approval_role"],
            candidate["auto_dispatch_eligible"],
            candidate["manual_action_required"],
            candidate["decision_score"],
            candidate["recoverability_probability"],
            candidate["confidence"],
            candidate["policy_weight"],
            candidate["confidence_weight"],
            candidate["due_pressure"],
            candidate["expected_effort_hours"],
            candidate["expected_roi_per_hour"],
            _json(candidate["comparable_case_support"]),
            candidate["outcome_status"],
            candidate["generated_by"],
        ),
    ).fetchone()
    inserted_row = dict(inserted)
    _rcm_log_transition(
        conn,
        int(inserted_row["id"]),
        None,
        str(inserted_row["status"]),
        "generated",
        performed_by=str(candidate["generated_by"]),
        performed_by_role="decision_model",
        notes="RCM decision candidate generated from active recovery backlog.",
        metadata={"source_item_id": candidate["source_item_id"], "decision_score": candidate["decision_score"]},
    )
    return inserted_row


def _apply_rcm_decision_signals(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for item in items:
        preview = _decision_candidate_preview(item)
        decision_status = _lower_text(item.get("decision_status"))
        has_live_decision = bool(item.get("decision_id")) and decision_status not in {
            "completed",
            "dismissed",
            "expired",
            "closed",
            "rejected",
        }
        enriched.append(
            {
                **item,
                "linked_decision_id": _decision_display_id(item.get("decision_id")) if item.get("decision_id") else None,
                "decision_required": preview is not None or has_live_decision,
                "can_promote_to_decision": preview is not None and not has_live_decision,
                "decision_reason": preview.get("decision_reason") if preview else None,
                "recommended_decision_action": preview.get("recommended_action") if preview else None,
                "decision_priority": preview.get("priority") if preview else None,
                "decision_confidence": preview.get("confidence") if preview else None,
                "approval_required": preview.get("approval_required") if preview else False,
                "approval_role": preview.get("approval_role") if preview else None,
            }
        )
    return enriched


def _sync_rcm_decision_candidates(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ensure_decision_schema()
    created: list[dict[str, Any]] = []
    with connect() as conn:
        for item in items:
            if item.get("decision_id") and _lower_text(item.get("decision_status")) not in {
                "completed",
                "dismissed",
                "expired",
                "closed",
                "rejected",
            }:
                continue
            candidate = _decision_candidate_preview(item)
            if not candidate:
                continue
            existing = _find_existing_rcm_decision(conn, item)
            if existing and _lower_text(existing.get("status")) not in {"completed", "dismissed", "expired", "closed", "rejected"}:
                continue
            created.append(_insert_rcm_decision_candidate(conn, item, candidate))
    return created


def _format_queue_currency(value: object) -> str:
    numeric_value = _currency_number(value)
    if numeric_value is None:
        return "-"
    return f"{RECOVERY_QUEUE_CURRENCY} {numeric_value:,.0f}"


def _format_queue_currency_compact(value: object) -> str:
    numeric_value = _currency_number(value)
    if numeric_value is None:
        return "-"
    absolute_value = abs(numeric_value)
    if absolute_value >= 1_000_000:
        return f"{RECOVERY_QUEUE_CURRENCY} {numeric_value / 1_000_000:.1f}M"
    if absolute_value >= 1_000:
        return f"{RECOVERY_QUEUE_CURRENCY} {numeric_value / 1_000:.0f}K"
    return _format_queue_currency(numeric_value)


def _format_queue_hours(value: object) -> str:
    numeric_value = _currency_number(value)
    if numeric_value is None:
        return "-"
    if float(numeric_value).is_integer():
        return f"{int(numeric_value)}h"
    return f"{numeric_value:.1f}h"


def _format_queue_number(value: object) -> str:
    numeric_value = _currency_number(value)
    if numeric_value is None:
        return "-"
    if float(numeric_value).is_integer():
        return f"{int(numeric_value):,}"
    return f"{numeric_value:,.1f}"


def _humanize_token(value: object) -> str:
    return str(value or "").replace("_", " ").replace("-", " ").title()


def _queue_days_to_due(due_date_value: object, status_value: object | None = None) -> int | None:
    if _lower_text(status_value) in TERMINAL_RECOVERY_STATUSES:
        return None
    due_date = _parse_date(due_date_value)
    if due_date is None:
        return None
    return (due_date - date.today()).days


def _queue_due_window(due_date_value: object, status_value: object | None = None) -> str:
    if _lower_text(status_value) in TERMINAL_RECOVERY_STATUSES:
        return "Closed"
    days_to_due = _queue_days_to_due(due_date_value, status_value)
    if days_to_due is None:
        return "No due date"
    if days_to_due < 0:
        return "Overdue"
    if days_to_due == 0:
        return "Due Today"
    if days_to_due <= 7:
        return "Due This Week"
    return "Future"


def _queue_urgency_multiplier(days_to_due: int | None) -> float:
    if days_to_due is None:
        return 1.0
    if days_to_due < 0:
        return 2.5
    if days_to_due == 0:
        return 2.1
    if days_to_due <= 2:
        return 1.8
    if days_to_due <= 7:
        return 1.4
    return 1.0


def _queue_priority_score(row: dict[str, Any]) -> float:
    existing_score = _currency_number(row.get("priority_score"))
    if existing_score is not None and existing_score > 0:
        return round(existing_score, 2)
    expected_recovery = _as_number(row.get("expected_recovery_amount") or row.get("expected_recovery"))
    effort_hours = _as_number(row.get("effort_hours"))
    if expected_recovery <= 0 or effort_hours <= 0:
        return 0.0
    days_to_due = _queue_days_to_due(row.get("due_date") or row.get("due_at"), row.get("decision_status") or row.get("status"))
    return round((expected_recovery / effort_hours) * _queue_urgency_multiplier(days_to_due), 2)


def _queue_priority_label(recoverable_value: float, priority_score: float, due_window: str) -> str:
    if (
        due_window == "Overdue"
        or recoverable_value >= RECOVERY_QUEUE_HIGH_VALUE_THRESHOLD
        or priority_score >= RECOVERY_QUEUE_CRITICAL_SCORE_THRESHOLD
    ):
        return "Critical"
    if priority_score >= RECOVERY_QUEUE_HIGH_SCORE_THRESHOLD:
        return "High"
    if priority_score >= RECOVERY_QUEUE_MEDIUM_SCORE_THRESHOLD:
        return "Medium"
    return "Routine"


def _queue_priority_rank(value: object) -> int:
    mapping = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "routine": 1,
    }
    return mapping.get(_lower_text(value), 0)


def _queue_due_rank(value: object) -> int:
    mapping = {
        "overdue": 5,
        "due today": 4,
        "due this week": 3,
        "future": 2,
        "no due date": 1,
        "closed": 0,
    }
    return mapping.get(_lower_text(value), 0)


def _queue_status_label(status: object) -> str:
    normalized = _lower_text(status)
    if not normalized:
        return "Open"
    return _humanize_token(normalized)


def _queue_scope_value(item: dict[str, Any], field: str) -> str:
    if field == "payer":
        return _lower_text(item.get("payer_id"))
    if field == "issue_type":
        return _lower_text(item.get("issue_type"))
    if field == "owner":
        return _lower_text(item.get("owner_key"))
    if field == "status":
        return _lower_text(item.get("status_key"))
    if field == "priority":
        return _lower_text(item.get("priority"))
    if field == "due_window":
        return _lower_text(item.get("sla_risk"))
    return ""


def _queue_sort_items(items: list[dict[str, Any]], sort_by: str) -> list[dict[str, Any]]:
    def _sort_tuple(item: dict[str, Any]) -> tuple[Any, ...]:
        if sort_by == "recoverable_value":
            return (-_as_number(item.get("recoverable_value")), -_as_number(item.get("priority_score")), item.get("claim_ref") or "")
        if sort_by == "expected_recovery":
            return (-_as_number(item.get("expected_recovery")), -_as_number(item.get("priority_score")), item.get("claim_ref") or "")
        if sort_by == "due_date":
            return (
                _queue_due_rank(item.get("sla_risk")) * -1,
                _parse_date(item.get("due_date")) or date.max,
                -_as_number(item.get("priority_score")),
            )
        if sort_by == "effort_hours":
            return (_as_number(item.get("effort_hours")), -_as_number(item.get("expected_recovery")), item.get("claim_ref") or "")
        if sort_by == "payer":
            return (str(item.get("payer_label") or item.get("payer") or ""), -_as_number(item.get("expected_recovery")), item.get("claim_ref") or "")
        return (-_as_number(item.get("priority_score")), -_as_number(item.get("expected_recovery")), _parse_date(item.get("due_date")) or date.max)

    return sorted(items, key=_sort_tuple)


def _queue_group_value(item: dict[str, Any], group_by: str) -> str:
    if group_by == "issue_type":
        return str(item.get("issue_type") or "unknown")
    if group_by == "payer":
        return str(item.get("payer_id") or "unknown")
    if group_by == "owner":
        return str(item.get("owner_key") or "unassigned")
    if group_by == "due_window":
        return str(item.get("sla_risk") or "Future")
    if group_by == "status":
        return str(item.get("status_key") or "open")
    return "all"


def _queue_group_label(item: dict[str, Any], group_by: str) -> str:
    if group_by == "issue_type":
        return str(item.get("issue_label") or "Unknown issue")
    if group_by == "payer":
        return str(item.get("payer_label") or "Insurer pending")
    if group_by == "owner":
        return str(item.get("owner_label") or "Unassigned")
    if group_by == "due_window":
        return str(item.get("sla_risk") or "Future")
    if group_by == "status":
        return str(item.get("status_label") or "Open")
    return "All visible items"


def _build_recovery_queue_story(
    total_value: float,
    due_this_week: int,
    high_priority_count: int,
    overdue_count: int,
    top_issue_label: str | None,
    top_payer_label: str | None,
) -> str:
    issue_segment = top_issue_label or "the current recovery queue"
    payer_segment = top_payer_label or "the visible insurer mix"
    return (
        f"Most recoverable value is currently concentrated in {issue_segment} for {payer_segment}. "
        f"The queue contains {_format_queue_currency_compact(total_value)} of recoverable value, "
        f"{due_this_week} items are due this week, {high_priority_count} are high priority, and {overdue_count} are overdue."
    )


def _build_recovery_queue_payload(
    items: list[dict[str, Any]],
    pipeline_rows: list[dict[str, Any]],
    filters: dict[str, Any] | None = None,
    as_of: str | None = None,
) -> dict[str, Any]:
    raw_filters = filters or {}
    issue_filter = _parse_multi_value(raw_filters.get("issue_type"))
    payer_filter = _parse_multi_value(raw_filters.get("payer"))
    owner_filter = _parse_multi_value(raw_filters.get("owner"))
    status_filter = _parse_multi_value(raw_filters.get("status"))
    priority_filter = _parse_multi_value(raw_filters.get("priority"))
    due_window_filter = _parse_multi_value(raw_filters.get("due_window"))
    search_term = _lower_text(raw_filters.get("search"))
    sort_by = _lower_text(raw_filters.get("sort_by") or "priority_score")
    group_by = _lower_text(raw_filters.get("group_by") or "issue_type")
    view_mode = _lower_text(raw_filters.get("view") or "table")
    min_value = _currency_number(raw_filters.get("min_value"))
    requested_start = _parse_date(raw_filters.get("date_from"))
    requested_end = _parse_date(raw_filters.get("date_to"))
    period_key = _lower_text(raw_filters.get("period"))
    unsupported_filters = [
        key
        for key in ("facility", "specialty", "patient_type", "claim_status")
        if raw_filters.get(key)
    ]

    if period_key and requested_start is None and requested_end is None:
        anchor_end = date.today()
        if period_key in {"7d", "7days", "7_days"}:
            requested_start = anchor_end - timedelta(days=6)
            requested_end = anchor_end
        elif period_key in {"30d", "30days", "30_days"}:
            requested_start = anchor_end - timedelta(days=29)
            requested_end = anchor_end
        elif period_key in {"90d", "90days", "90_days"}:
            requested_start = anchor_end - timedelta(days=89)
            requested_end = anchor_end

    def _within_date_scope(item: dict[str, Any]) -> bool:
        candidate_date = _parse_date(item.get("detected_date")) or _parse_date(item.get("due_date"))
        if requested_start and (candidate_date is None or candidate_date < requested_start):
            return False
        if requested_end and (candidate_date is None or candidate_date > requested_end):
            return False
        return True

    filtered_items = []
    for item in items:
        if issue_filter and _queue_scope_value(item, "issue_type") not in issue_filter:
            continue
        if payer_filter and _queue_scope_value(item, "payer") not in payer_filter:
            continue
        if owner_filter and _queue_scope_value(item, "owner") not in owner_filter:
            continue
        if status_filter and _queue_scope_value(item, "status") not in status_filter:
            continue
        if priority_filter and _queue_scope_value(item, "priority") not in priority_filter:
            continue
        if due_window_filter and _queue_scope_value(item, "due_window") not in due_window_filter:
            continue
        if min_value is not None and _as_number(item.get("recoverable_value")) < min_value:
            continue
        if search_term:
            haystack = " ".join(
                [
                    str(item.get("claim_ref") or ""),
                    str(item.get("claim_id") or ""),
                    str(item.get("encounter_id") or ""),
                    str(item.get("opportunity_id") or ""),
                ]
            ).lower()
            if search_term not in haystack:
                continue
        if not _within_date_scope(item):
            continue
        filtered_items.append(item)

    filtered_items = _queue_sort_items(filtered_items, sort_by)

    recoverable_value = sum(_as_number(item.get("recoverable_value")) for item in filtered_items)
    expected_recovery = sum(_as_number(item.get("expected_recovery")) for item in filtered_items)
    due_this_week = sum(1 for item in filtered_items if item.get("sla_risk") in {"Due Today", "Due This Week"})
    overdue_items = sum(1 for item in filtered_items if item.get("sla_risk") == "Overdue")
    high_priority_items = sum(1 for item in filtered_items if item.get("priority") in {"Critical", "High"})
    effort_hours = sum(_as_number(item.get("effort_hours")) for item in filtered_items)

    if overdue_items > 0 or (high_priority_items > 0 and due_this_week >= RECOVERY_QUEUE_DUE_PRESSURE_THRESHOLD):
        severity = "critical"
    elif due_this_week > 0 or high_priority_items > 0:
        severity = "watch"
    else:
        severity = "healthy"

    issue_rollup: dict[str, dict[str, Any]] = {}
    payer_rollup: dict[str, dict[str, Any]] = {}
    owner_rollup: dict[str, dict[str, Any]] = {}
    due_rollup: dict[str, dict[str, Any]] = {}
    group_rollup: dict[str, dict[str, Any]] = {}

    for item in filtered_items:
        issue_key = str(item.get("issue_type") or "unknown")
        issue_entry = issue_rollup.setdefault(
            issue_key,
            {
                "issue_type": issue_key,
                "label": item.get("issue_label") or "Unknown issue",
                "count": 0,
                "recoverable_value": 0.0,
                "expected_recovery": 0.0,
                "effort_hours": 0.0,
                "high_priority_items": 0,
            },
        )
        issue_entry["count"] += 1
        issue_entry["recoverable_value"] += _as_number(item.get("recoverable_value"))
        issue_entry["expected_recovery"] += _as_number(item.get("expected_recovery"))
        issue_entry["effort_hours"] += _as_number(item.get("effort_hours"))
        if item.get("priority") in {"Critical", "High"}:
            issue_entry["high_priority_items"] += 1

        payer_key = str(item.get("payer_id") or "unknown")
        payer_entry = payer_rollup.setdefault(
            payer_key,
            {
                "payer": payer_key,
                "label": item.get("payer_label") or "Insurer pending",
                "count": 0,
                "recoverable_value": 0.0,
                "expected_recovery": 0.0,
            },
        )
        payer_entry["count"] += 1
        payer_entry["recoverable_value"] += _as_number(item.get("recoverable_value"))
        payer_entry["expected_recovery"] += _as_number(item.get("expected_recovery"))

        owner_key = str(item.get("owner_key") or "unassigned")
        owner_entry = owner_rollup.setdefault(
            owner_key,
            {
                "owner": owner_key,
                "label": item.get("owner_label") or "Unassigned",
                "count": 0,
                "effort_hours": 0.0,
                "expected_recovery": 0.0,
            },
        )
        owner_entry["count"] += 1
        owner_entry["effort_hours"] += _as_number(item.get("effort_hours"))
        owner_entry["expected_recovery"] += _as_number(item.get("expected_recovery"))

        due_key = str(item.get("sla_risk") or "Future")
        due_entry = due_rollup.setdefault(
            due_key,
            {
                "label": due_key,
                "count": 0,
                "recoverable_value": 0.0,
            },
        )
        due_entry["count"] += 1
        due_entry["recoverable_value"] += _as_number(item.get("recoverable_value"))

        current_group = group_by if group_by in {"issue_type", "payer", "owner", "due_window", "status"} else "issue_type"
        group_key = _queue_group_value(item, current_group)
        group_entry = group_rollup.setdefault(
            group_key,
            {
                "key": group_key,
                "label": _queue_group_label(item, current_group),
                "group_by": current_group,
                "count": 0,
                "recoverable_value": 0.0,
                "expected_recovery": 0.0,
                "effort_hours": 0.0,
                "high_priority_items": 0,
                "overdue_items": 0,
                "top_payer": item.get("payer_label") or "Insurer pending",
                "top_owner": item.get("owner_label") or "Unassigned",
            },
        )
        group_entry["count"] += 1
        group_entry["recoverable_value"] += _as_number(item.get("recoverable_value"))
        group_entry["expected_recovery"] += _as_number(item.get("expected_recovery"))
        group_entry["effort_hours"] += _as_number(item.get("effort_hours"))
        if item.get("priority") in {"Critical", "High"}:
            group_entry["high_priority_items"] += 1
        if item.get("sla_risk") == "Overdue":
            group_entry["overdue_items"] += 1

    issue_mix = sorted(issue_rollup.values(), key=lambda row: row["recoverable_value"], reverse=True)
    payer_recovery = sorted(payer_rollup.values(), key=lambda row: row["recoverable_value"], reverse=True)
    owner_workload = sorted(owner_rollup.values(), key=lambda row: (row["count"], row["effort_hours"]), reverse=True)
    due_window = sorted(due_rollup.values(), key=lambda row: _queue_due_rank(row["label"]), reverse=True)
    grouped_queue = sorted(group_rollup.values(), key=lambda row: (row["recoverable_value"], row["expected_recovery"]), reverse=True)

    issue_leader = issue_mix[0]["label"] if issue_mix else None
    payer_leader = payer_recovery[0]["label"] if payer_recovery else None

    queue_story = _build_recovery_queue_story(
        recoverable_value,
        due_this_week,
        high_priority_items,
        overdue_items,
        issue_leader,
        payer_leader,
    )

    period_candidates = [
        _parse_date(item.get("detected_date")) or _parse_date(item.get("due_date"))
        for item in filtered_items
    ]
    valid_period_candidates = [candidate for candidate in period_candidates if candidate]
    period_start = requested_start or (min(valid_period_candidates) if valid_period_candidates else None)
    period_end = requested_end or (max(valid_period_candidates) if valid_period_candidates else None)

    filter_options = {
        "issue_type": [
            {"value": row["issue_type"], "label": row["label"]}
            for row in sorted(issue_rollup.values(), key=lambda row: row["label"])
        ],
        "payer": [
            {"value": row["payer"], "label": row["label"]}
            for row in sorted(payer_rollup.values(), key=lambda row: row["label"])
        ],
        "owner": [
            {"value": row["owner"], "label": row["label"]}
            for row in sorted(owner_rollup.values(), key=lambda row: row["label"])
        ],
        "status": [
            {"value": value, "label": label}
            for value, label in sorted(
                {
                    str(item.get("status_key") or "open"): str(item.get("status_label") or "Open")
                    for item in filtered_items
                }.items(),
                key=lambda pair: pair[1],
            )
        ],
        "priority": [
            {"value": value, "label": value}
            for value in ["Critical", "High", "Medium", "Routine"]
            if any(item.get("priority") == value for item in filtered_items)
        ],
        "due_window": [
            {"value": row["label"], "label": row["label"]}
            for row in due_window
        ],
    }

    source_tables = [
        {
            "table": f"{settings.analytics_schema}.fct_cash_recovery_opportunity",
            "role": "Recoverable value, expected recovery, owner, effort, and due-date backlog.",
            "loaded": True,
        },
        {
            "table": f"{settings.analytics_schema}.fct_denials",
            "role": "Rejected-claim recovery queue mix and comparable rejected-claim pipeline trends.",
            "loaded": True,
        },
        {
            "table": f"{settings.decision_schema}.decision_queue",
            "role": "Decision workflow status, expected recovery, and action due dates.",
            "loaded": True,
        },
        {
            "table": f"{settings.decision_schema}.decision_outcomes",
            "role": "Measured recovery outcomes for completed actions when available.",
            "loaded": True,
        },
        {
            "table": f"{settings.decision_schema}.notification_log",
            "role": "Notification and dispatch evidence for queue action delivery.",
            "loaded": True,
        },
    ]

    kpis = [
        {
            "id": "recoverable_queue_value",
            "label": "Recoverable Queue Value",
            "value": recoverable_value,
            "formatted_value": _format_queue_currency_compact(recoverable_value),
            "status": severity,
            "interpretation": "Total recoverable value across visible queue items.",
            "target_label": "Lower is better as actions are worked down.",
        },
        {
            "id": "expected_recovery",
            "label": "Expected Recovery",
            "value": expected_recovery,
            "formatted_value": _format_queue_currency_compact(expected_recovery),
            "status": "healthy" if expected_recovery >= recoverable_value * 0.75 else "watch",
            "interpretation": "Expected cash recovery after applying row-level expected recovery values.",
            "target_label": "Expected recovery should stay close to recoverable value.",
        },
        {
            "id": "due_this_week",
            "label": "Due This Week",
            "value": due_this_week,
            "formatted_value": _format_queue_number(due_this_week),
            "status": "critical" if due_this_week >= RECOVERY_QUEUE_DUE_PRESSURE_THRESHOLD else ("watch" if due_this_week > 0 else "healthy"),
            "interpretation": "Actions due within the next 7 days including today.",
            "target_label": "Target: keep weekly due pressure below 10 items.",
        },
        {
            "id": "overdue_items",
            "label": "Overdue Items",
            "value": overdue_items,
            "formatted_value": _format_queue_number(overdue_items),
            "status": "critical" if overdue_items > 0 else "healthy",
            "interpretation": "Items with a due date before today and no terminal status.",
            "target_label": "Target: 0 overdue items.",
        },
        {
            "id": "high_priority_items",
            "label": "High Priority Items",
            "value": high_priority_items,
            "formatted_value": _format_queue_number(high_priority_items),
            "status": "critical" if high_priority_items >= RECOVERY_QUEUE_DUE_PRESSURE_THRESHOLD else ("watch" if high_priority_items > 0 else "healthy"),
            "interpretation": "Rows marked Critical or High by the priority thresholds.",
            "target_label": "Use with due pressure to sequence work first.",
        },
        {
            "id": "recovery_effort_hours",
            "label": "Recovery Effort Hours",
            "value": effort_hours,
            "formatted_value": _format_queue_hours(effort_hours),
            "status": "watch" if effort_hours > 0 and expected_recovery / max(effort_hours, 1) < 5_000 else "healthy",
            "interpretation": "Estimated work effort required across visible queue items.",
            "target_label": "Higher expected cash per hour indicates better queue quality.",
        },
    ]

    filters_applied = {
        "date_from": _serialize(period_start),
        "date_to": _serialize(period_end),
        "period": period_key or None,
        "payer": sorted(payer_filter) if payer_filter else [],
        "issue_type": sorted(issue_filter) if issue_filter else [],
        "owner": sorted(owner_filter) if owner_filter else [],
        "status": sorted(status_filter) if status_filter else [],
        "priority": sorted(priority_filter) if priority_filter else [],
        "due_window": sorted(due_window_filter) if due_window_filter else [],
        "min_value": min_value,
        "search": raw_filters.get("search") or None,
        "sort_by": sort_by,
        "group_by": group_by,
        "view": view_mode,
    }

    pipeline_by_month: dict[str, dict[str, Any]] = {}
    for row in pipeline_rows:
        month_label = _month_label(row.get("month_key"))
        month_entry = pipeline_by_month.setdefault(
            month_label,
            {"month": month_label, "Clinical": 0, "Coding": 0, "Eligibility": 0, "Other": 0},
        )
        month_entry[str(row.get("category"))] = int(row.get("total_count") or 0)

    return {
        "generated_at": as_of or _now_iso(),
        "as_of": as_of or _now_iso(),
        "currency": RECOVERY_QUEUE_CURRENCY,
        "period": {
            "date_from": _serialize(period_start),
            "date_to": _serialize(period_end),
            "label": _format_period_label(period_start, period_end, requested_start is None and requested_end is None),
        },
        "filters_applied": filters_applied,
        "data_freshness": {"seconds": 0 if filtered_items else None, "status": "fresh" if filtered_items else "unknown"},
        "meta": {
            "use_case": USE_CASE_ID,
            "section": "recovery-queue",
            "empty": len(filtered_items) == 0,
            "message": "No recovery queue items matched the selected filters." if not filtered_items else None,
        },
        "headline": {
            "severity": severity,
            "message": (
                f"Active recovery queue contains {_format_queue_currency_compact(recoverable_value)} of recoverable value. "
                f"{due_this_week} items are due this week, {high_priority_items} are high priority, and {overdue_items} are overdue. "
                f"The highest ranked actions are concentrated in {issue_leader or 'the visible queue'}."
            ),
            "metrics": [
                {"label": "Recoverable value", "value": recoverable_value, "formatted_value": _format_queue_currency_compact(recoverable_value)},
                {"label": "Due this week", "value": due_this_week, "formatted_value": _format_queue_number(due_this_week)},
                {"label": "High priority", "value": high_priority_items, "formatted_value": _format_queue_number(high_priority_items)},
                {"label": "Overdue", "value": overdue_items, "formatted_value": _format_queue_number(overdue_items)},
            ],
        },
        "story": queue_story,
        "kpis": kpis,
        "intelligence": {
            "issue_mix": [
                {
                    **row,
                    "formatted_value": _format_queue_currency_compact(row["recoverable_value"]),
                    "formatted_expected_recovery": _format_queue_currency_compact(row["expected_recovery"]),
                    "formatted_effort_hours": _format_queue_hours(row["effort_hours"]),
                }
                for row in issue_mix
            ],
            "payer_recovery": [
                {
                    **row,
                    "formatted_value": _format_queue_currency_compact(row["recoverable_value"]),
                    "formatted_expected_recovery": _format_queue_currency_compact(row["expected_recovery"]),
                }
                for row in payer_recovery[:6]
            ],
            "owner_workload": [
                {
                    **row,
                    "formatted_effort_hours": _format_queue_hours(row["effort_hours"]),
                    "formatted_expected_recovery": _format_queue_currency_compact(row["expected_recovery"]),
                }
                for row in owner_workload[:6]
            ],
            "due_window": [
                {
                    **row,
                    "formatted_value": _format_queue_currency_compact(row["recoverable_value"]),
                }
                for row in due_window
            ],
        },
        "queue_items": filtered_items,
        "grouped_queue": [
            {
                **row,
                "formatted_value": _format_queue_currency_compact(row["recoverable_value"]),
                "formatted_expected_recovery": _format_queue_currency_compact(row["expected_recovery"]),
                "formatted_effort_hours": _format_queue_hours(row["effort_hours"]),
            }
            for row in grouped_queue
        ],
        "filter_options": filter_options,
        "data_quality": {
            "generated_at": as_of or _now_iso(),
            "currency": RECOVERY_QUEUE_CURRENCY,
            "sources_loaded": sum(1 for row in source_tables if row["loaded"]),
            "total_sources": len(source_tables),
            "source_tables": source_tables,
            "filters_applied": filters_applied,
            "metric_definitions": [
                {"label": "Recoverable Queue Value", "definition": "Total recoverable amount across visible queue items."},
                {"label": "Expected Recovery", "definition": "Visible queue value adjusted by row-level expected recovery estimates."},
                {"label": "Priority Score", "definition": "Existing backend score when present, otherwise expected recovery per effort hour adjusted by due-date urgency."},
            ],
            "missing_metrics": [
                {
                    "label": "Recovery probability by payer cohort",
                    "reason": "No separate payer-risk weighting field is currently exposed on the live recovery opportunity mart.",
                }
            ],
            "warnings": [
                *(
                    [
                        "Unsupported filters were ignored: "
                        + ", ".join(unsupported_filters)
                        + ". These dimensions are not exposed on the current recovery queue marts."
                    ]
                    if unsupported_filters
                    else []
                ),
            ],
            "limitations": [
                "Facility, specialty, patient type, and claim status filters are accepted for contract compatibility but are not available on the current recovery queue mart.",
                "The queue is ranked with existing backend priority_score when present; otherwise the fallback score uses expected recovery per effort hour adjusted by due-date urgency.",
            ],
        },
        "total": len(filtered_items),
        "items": filtered_items,
        "dashboard": {
            "denial_pipeline": list(pipeline_by_month.values()),
            "action_cards": [
                {
                    "label": issue_leader or "Top recovery focus",
                    "amount": recoverable_value,
                    "subtext": queue_story,
                    "button_label": "View queue",
                    "href": "/use-cases/revenue-cycle-management/recovery-queue",
                },
                {
                    "label": payer_leader or "Top payer exposure",
                    "amount": expected_recovery,
                    "subtext": f"Expected recovery is {_format_queue_currency_compact(expected_recovery)} across the visible queue.",
                    "button_label": "Open payer control",
                    "href": "/use-cases/revenue-cycle-management/payer-control",
                },
            ],
        },
    }


def recovery_queue(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    ensure_decision_schema()
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
        recoverable_amount = _as_number(row.get("recoverable_amount"))
        expected_recovery = _as_number(row.get("expected_recovery_amount") or row.get("expected_recovery"))
        days_to_due = _queue_days_to_due(row.get("due_date") or row.get("due_at"), status)
        sla_risk = _queue_due_window(row.get("due_date") or row.get("due_at"), status)
        priority_score = _queue_priority_score(row)
        priority = _queue_priority_label(recoverable_amount, priority_score, sla_risk)
        status_key = _lower_text(status) or "open"
        owner_key = str(row.get("owner_user_id") or row.get("owner_team") or "unassigned")
        claim_ref = str(row.get("claim_id") or row.get("opportunity_id") or row.get("encounter_id") or "Unknown")
        detected_date = row.get("detected_date")
        due_date = row.get("due_date") or row.get("due_at")

        timeline = []
        if detected_date:
            timeline.append({"label": "Detected", "value": detected_date})
        if due_date:
            timeline.append({"label": "Due", "value": due_date})
        if row.get("measured_at"):
            timeline.append({"label": "Outcome measured", "value": row.get("measured_at")})

        items.append(
            {
                **row,
                "claim_ref": claim_ref,
                "currency": RECOVERY_QUEUE_CURRENCY,
                "recoverable_value": recoverable_amount,
                "expected_recovery": expected_recovery,
                "formatted_recoverable_value": _format_queue_currency(recoverable_amount),
                "formatted_expected_recovery": _format_queue_currency(expected_recovery),
                "formatted_effort": _format_queue_hours(row.get("effort_hours")),
                "priority_score": priority_score,
                "formatted_priority_score": f"{priority_score:,.2f}",
                "priority": priority,
                "priority_label": priority,
                "owner": owner_key,
                "owner_key": owner_key,
                "owner_label": _humanize_token(owner_key),
                "payer": row.get("payer_id"),
                "payer_label": _humanize_token(row.get("payer_id")),
                "issue_label": _humanize_token(row.get("issue_type")),
                "status_key": status_key,
                "status_label": _queue_status_label(status_key),
                "detected_date": detected_date,
                "due_date": due_date,
                "days_to_due": days_to_due,
                "sla_risk": sla_risk,
                "root_cause": row.get("issue_reason"),
                "source_evidence": row.get("evidence_summary"),
                "timeline": timeline,
                "notification_status": {
                    "sent_count": row.get("sent_count", 0) or 0,
                    "failed_count": row.get("failed_count", 0) or 0,
                    "skipped_count": row.get("skipped_count", 0) or 0,
                },
                "outcome_status": outcome_status,
                "next_action": _next_step(status, outcome_status),
                "next_step": _next_step(status, outcome_status),
            }
        )

    items = _apply_rcm_decision_signals(items)
    as_of = _now_iso() if items else None
    return _build_recovery_queue_payload(items, [_serialize_row(row) for row in pipeline_rows], filters, as_of)


def _decision_generation_filters(filters: dict[str, Any] | None) -> dict[str, Any]:
    raw = filters or {}
    allowed_keys = {
        "date_from",
        "date_to",
        "period",
        "facility",
        "payer",
        "department",
        "specialty",
        "patient_type",
        "claim_status",
        "issue_type",
        "owner",
        "priority",
        "due_window",
        "min_value",
        "search",
    }
    return {key: value for key, value in raw.items() if key in allowed_keys and value not in (None, "")}


def _decision_available_actions(decision: dict[str, Any]) -> dict[str, dict[str, Any]]:
    status = str(decision.get("decision_status") or decision.get("status") or "recommended")
    approval_required = bool(decision.get("approval_required"))
    base_message = {
        "approve": "Marks the recommendation as approved for governed execution.",
        "reject": "Closes the recommendation and records why it should not proceed.",
        "revise": "Keeps the recommendation open but requests a different routing or narrative.",
        "dispatch": "Marks the recommendation as dispatched. Downstream handoff remains manual until workflow integration exists.",
        "escalate": "Routes the item back into supervisory review and records escalation.",
        "note": "Appends an audit note without changing status.",
        "assign": "Assigns an owner for the governed decision workflow.",
    }
    actions: dict[str, dict[str, Any]] = {}
    for action in ("approve", "reject", "revise", "dispatch", "escalate", "note", "assign"):
        enabled = _decision_transition_allowed(status, action)
        reason = None
        if action == "dispatch" and approval_required and status not in {"approved", "revised"}:
            enabled = False
            reason = "Approval is required before dispatch."
        elif not enabled:
            reason = f"{_decision_status_label(status)} decisions cannot {action.replace('_', ' ')}."
        actions[action] = {"enabled": enabled, "message": base_message[action], "reason": reason}
    return actions


def _serialize_rcm_decision_row(
    row: dict[str, Any],
    *,
    audit_count: int = 0,
    latest_log_at: str | None = None,
    sent_count: int = 0,
    failed_count: int = 0,
    skipped_count: int = 0,
) -> dict[str, Any]:
    data_inputs = row.get("data_inputs") or {}
    source_snapshot = data_inputs.get("source_snapshot") or {}
    scoring = data_inputs.get("scoring") or {}
    confidence = _as_number(row.get("confidence"))
    expected_recovery = _as_number(row.get("expected_recovery"))
    effort_hours = _as_number(row.get("expected_effort_hours"))
    due_at = row.get("due_at") or source_snapshot.get("due_date")
    decision = {
        "id": row.get("id"),
        "decision_id": _decision_display_id(row.get("id")),
        "source_item_id": row.get("source_item_id") or row.get("source_opportunity_id") or row.get("claim_id"),
        "source_type": row.get("source_type") or row.get("entity_type"),
        "source_label": source_snapshot.get("claim_ref") or row.get("entity_id"),
        "payer": source_snapshot.get("payer_label") or _humanize_token(row.get("payer_id")),
        "payer_id": row.get("payer_id"),
        "decision_type": row.get("decision_type"),
        "decision_type_label": _humanize_token(row.get("decision_type")),
        "recommended_action": row.get("recommended_action") or _decision_recommended_action(str(row.get("decision_type") or "")),
        "decision_reason": row.get("decision_reason") or row.get("decision_summary") or row.get("rationale"),
        "why_now": row.get("decision_reason") or row.get("decision_summary") or row.get("signal_summary"),
        "expected_recovery": expected_recovery,
        "formatted_expected_recovery": _format_queue_currency(expected_recovery),
        "expected_effort_hours": effort_hours,
        "formatted_expected_effort_hours": _format_queue_hours(effort_hours),
        "expected_roi_per_hour": _as_number(row.get("expected_roi_per_hour")),
        "formatted_expected_roi_per_hour": f"{RECOVERY_QUEUE_CURRENCY} {_as_number(row.get('expected_roi_per_hour')):,.0f}/h",
        "decision_score": _as_number(row.get("decision_score") or row.get("priority_score")),
        "formatted_decision_score": _format_queue_number(row.get("decision_score") or row.get("priority_score")),
        "priority": row.get("priority"),
        "priority_label": row.get("priority"),
        "confidence": confidence,
        "formatted_confidence": f"{confidence:.0%}",
        "confidence_detail": row.get("confidence_detail"),
        "due_pressure": row.get("due_pressure") or _queue_due_window(due_at, row.get("status")),
        "due_at": due_at,
        "risk_of_inaction": row.get("risk_of_inaction") or row.get("rationale"),
        "approval_required": bool(row.get("approval_required")),
        "approval_role": row.get("approval_role"),
        "decision_status": row.get("status"),
        "decision_status_label": _decision_status_label(row.get("status")),
        "outcome_status": row.get("outcome_status") or "pending",
        "recommended_owner": row.get("recommended_owner") or row.get("owner_team"),
        "recommended_channel": row.get("recommended_channel"),
        "assignee_user": row.get("assignee_user"),
        "assignee_email": row.get("assignee_email"),
        "manual_action_required": bool(row.get("manual_action_required")),
        "auto_dispatch_eligible": bool(row.get("auto_dispatch_eligible")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "approved_at": row.get("approved_at"),
        "approved_by": row.get("approved_by"),
        "dispatched_at": row.get("dispatched_at"),
        "closed_at": row.get("closed_at"),
        "generated_by": row.get("generated_by"),
        "claim_ref": source_snapshot.get("claim_ref") or row.get("claim_id"),
        "issue_type": source_snapshot.get("issue_type"),
        "issue_label": source_snapshot.get("issue_label") or _humanize_token(source_snapshot.get("issue_type")),
        "root_cause": source_snapshot.get("root_cause"),
        "source_evidence": source_snapshot.get("source_evidence"),
        "timeline": source_snapshot.get("timeline") or [],
        "comparable_case_support": row.get("comparable_case_support") or [],
        "scoring_breakdown": {
            "decision_score": _as_number(row.get("decision_score") or row.get("priority_score")),
            "priority_score": _as_number(scoring.get("priority_score")),
            "urgency_multiplier": _as_number(scoring.get("urgency_multiplier")),
            "policy_weight": _as_number(row.get("policy_weight") or scoring.get("policy_weight")),
            "confidence_weight": _as_number(row.get("confidence_weight") or scoring.get("confidence_weight")),
            "recoverability_probability": _as_number(row.get("recoverability_probability") or scoring.get("recoverability_probability")),
        },
        "notification_status": {
            "sent_count": sent_count,
            "failed_count": failed_count,
            "skipped_count": skipped_count,
        },
        "audit_event_count": audit_count,
        "last_log_at": latest_log_at,
    }
    decision["available_actions"] = _decision_available_actions(decision)
    return decision


def _decision_filter_options(decisions: list[dict[str, Any]]) -> dict[str, list[dict[str, str]]]:
    def collect(key: str) -> list[dict[str, str]]:
        values = sorted({str(item.get(key) or "").strip() for item in decisions if str(item.get(key) or "").strip()})
        return [{"value": value, "label": value if key == "payer" else _humanize_token(value)} for value in values]

    return {
        "decision_type": collect("decision_type"),
        "payer": collect("payer"),
        "approval_role": collect("approval_role"),
        "owner": collect("recommended_owner"),
        "priority": collect("priority"),
        "decision_status": collect("decision_status"),
        "due_window": collect("due_pressure"),
    }


def _matches_decision_filter(decision: dict[str, Any], filters: dict[str, Any]) -> bool:
    if not filters:
        return decision.get("decision_status") in RCM_DECISION_ACTIVE_STATUSES

    def text(key: str) -> str:
        return _lower_text(decision.get(key))

    search = _lower_text(filters.get("search"))
    if search:
        haystack = " ".join(
            [
                str(decision.get("decision_id") or ""),
                str(decision.get("source_item_id") or ""),
                str(decision.get("claim_ref") or ""),
                str(decision.get("payer") or ""),
                str(decision.get("recommended_action") or ""),
                str(decision.get("decision_reason") or ""),
                str(decision.get("approval_role") or ""),
                str(decision.get("recommended_owner") or ""),
            ]
        ).lower()
        if search not in haystack:
            return False

    checks = {
        "payer": text("payer"),
        "decision_type": text("decision_type"),
        "decision_status": text("decision_status"),
        "approval_role": text("approval_role"),
        "owner": text("recommended_owner"),
        "priority": text("priority"),
        "due_window": text("due_pressure"),
        "department": _lower_text(decision.get("department_id")),
    }
    for key, decision_value in checks.items():
        filter_value = _lower_text(filters.get(key))
        if filter_value and decision_value != filter_value:
            return False

    if filters.get("min_expected_recovery") not in (None, "") and _as_number(decision.get("expected_recovery")) < _as_number(filters.get("min_expected_recovery")):
        return False
    if filters.get("confidence_min") not in (None, "") and _as_number(decision.get("confidence")) < _as_number(filters.get("confidence_min")):
        return False
    if filters.get("date_from"):
        created_date = _parse_date(decision.get("created_at"))
        from_date = _parse_date(filters.get("date_from"))
        if from_date and created_date and created_date < from_date:
            return False
    if filters.get("date_to"):
        created_date = _parse_date(decision.get("created_at"))
        to_date = _parse_date(filters.get("date_to"))
        if to_date and created_date and created_date > to_date:
            return False
    status_filter = _lower_text(filters.get("decision_status"))
    if not status_filter and decision.get("decision_status") not in RCM_DECISION_ACTIVE_STATUSES:
        return False
    return True


def _sort_decisions(decisions: list[dict[str, Any]], sort_by: str) -> list[dict[str, Any]]:
    def sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
        if sort_by == "expected_recovery":
            return (-_as_number(item.get("expected_recovery")), -_as_number(item.get("decision_score")), str(item.get("decision_id") or ""))
        if sort_by == "confidence":
            return (-_as_number(item.get("confidence")), -_as_number(item.get("expected_recovery")), str(item.get("decision_id") or ""))
        if sort_by == "due_date":
            return (_parse_date(item.get("due_at")) or date.max, -_as_number(item.get("decision_score")), str(item.get("decision_id") or ""))
        if sort_by == "approval_role":
            return (str(item.get("approval_role") or ""), -_as_number(item.get("decision_score")), str(item.get("decision_id") or ""))
        return (-_as_number(item.get("decision_score")), -_as_number(item.get("expected_recovery")), str(item.get("decision_id") or ""))

    return sorted(decisions, key=sort_key)


def decision_queue(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    raw_filters = filters or {}
    source_queue = recovery_queue(_decision_generation_filters(raw_filters))
    source_items = list(source_queue.get("items") or source_queue.get("queue_items") or [])
    _sync_rcm_decision_candidates(source_items)

    ensure_decision_schema()
    with connect() as conn:
        rows = [dict(row) for row in conn.execute("select * from decision.decision_queue where use_case = %s order by updated_at desc, id desc", (USE_CASE_ID,)).fetchall()]
        log_rows = conn.execute(
            """
            select decision_id, count(*)::integer as audit_count, max(created_at) as last_log_at
            from decision.decision_log
            group by decision_id
            """
        ).fetchall()
        notification_rows = conn.execute(
            """
            select
                decision_id,
                count(*) filter (where delivery_status = 'sent')::integer as sent_count,
                count(*) filter (where delivery_status = 'failed')::integer as failed_count,
                count(*) filter (where delivery_status = 'skipped')::integer as skipped_count
            from decision.notification_log
            group by decision_id
            """
        ).fetchall()

    audit_map = {
        int(row["decision_id"]): {
            "audit_count": int(row["audit_count"] or 0),
            "last_log_at": _serialize(row["last_log_at"]),
        }
        for row in log_rows
    }
    notification_map = {
        int(row["decision_id"]): {
            "sent_count": int(row["sent_count"] or 0),
            "failed_count": int(row["failed_count"] or 0),
            "skipped_count": int(row["skipped_count"] or 0),
        }
        for row in notification_rows
    }
    decisions = [
        _serialize_rcm_decision_row(
            _serialize_row(row),
            audit_count=audit_map.get(int(row["id"]), {}).get("audit_count", 0),
            latest_log_at=audit_map.get(int(row["id"]), {}).get("last_log_at"),
            sent_count=notification_map.get(int(row["id"]), {}).get("sent_count", 0),
            failed_count=notification_map.get(int(row["id"]), {}).get("failed_count", 0),
            skipped_count=notification_map.get(int(row["id"]), {}).get("skipped_count", 0),
        )
        for row in rows
    ]
    filtered = _sort_decisions([decision for decision in decisions if _matches_decision_filter(decision, raw_filters)], _lower_text(raw_filters.get("sort_by") or "decision_score"))

    expected_recovery = sum(_as_number(item.get("expected_recovery")) for item in filtered)
    requiring_review = sum(1 for item in filtered if item.get("decision_status") in {"recommended", "awaiting_review", "revised"})
    approval_required_count = sum(1 for item in filtered if item.get("approval_required"))
    high_confidence_count = sum(1 for item in filtered if _as_number(item.get("confidence")) >= RCM_DECISION_HIGH_CONFIDENCE)
    due_this_week_count = sum(1 for item in filtered if item.get("due_pressure") in {"Overdue", "Due Today", "Due This Week"})
    dispatched_today = sum(1 for item in filtered if item.get("decision_status") == "dispatched" and _parse_date(item.get("dispatched_at")) == date.today())

    def rollup(key: str) -> list[dict[str, Any]]:
        grouped: dict[str, dict[str, Any]] = {}
        for item in filtered:
            label = str(item.get(key) or "Unspecified")
            bucket = grouped.setdefault(label, {"label": label, "count": 0, "expected_recovery": 0.0})
            bucket["count"] += 1
            bucket["expected_recovery"] += _as_number(item.get("expected_recovery"))
        return [
            {
                **entry,
                "formatted_expected_recovery": _format_queue_currency_compact(entry["expected_recovery"]),
            }
            for entry in sorted(grouped.values(), key=lambda row: (-row["count"], -row["expected_recovery"], row["label"]))
        ]

    unsupported_filters = [
        key
        for key in ("facility", "specialty", "patient_type", "claim_status")
        if raw_filters.get(key) not in (None, "")
    ]
    if not filtered:
        return {
            "generated_at": _now_iso(),
            "currency": RECOVERY_QUEUE_CURRENCY,
            "period": source_queue.get("period"),
            "filters_applied": {key: value for key, value in raw_filters.items() if value not in (None, "")},
            "data_freshness": source_queue.get("data_freshness"),
            "meta": {
                "use_case": USE_CASE_ID,
                "section": "decision-queue",
                "empty": True,
                "message": "No governed recovery decisions match the selected filters.",
            },
            "headline": {
                "severity": "healthy",
                "message": "Recovery Work Queue still holds the full backlog. No governed subset requires action for the current filters.",
                "decision_count": 0,
                "approval_required_count": 0,
                "expected_recovery": 0,
                "high_confidence_count": 0,
            },
            "kpis": [],
            "decision_mix": {"by_decision_type": [], "by_approval_role": [], "by_payer": [], "by_status": []},
            "decisions": [],
            "filter_options": _decision_filter_options(decisions),
            "data_quality": {
                "generated_at": _now_iso(),
                "currency": RECOVERY_QUEUE_CURRENCY,
                "source_tables": [
                    {"table": f"{settings.analytics_schema}.fct_cash_recovery_opportunity", "role": "Recovery backlog source", "loaded": True},
                    {"table": f"{settings.decision_schema}.decision_queue", "role": "Persisted governed decisions", "loaded": True},
                    {"table": f"{settings.decision_schema}.decision_log", "role": "Decision audit trail", "loaded": True},
                    {"table": f"{settings.decision_schema}.notification_log", "role": "Dispatch and notification evidence", "loaded": True},
                ],
                "filters_applied": {key: value for key, value in raw_filters.items() if value not in (None, "")},
                "scoring_logic": [
                    "decision_score = expected_recovery_value * recoverability_probability * urgency_multiplier * policy_weight * confidence_weight / effort_hours",
                ],
                "decision_thresholds": [
                    {"label": "Minimum expected recovery", "value": _format_queue_currency(RCM_DECISION_MIN_EXPECTED_RECOVERY)},
                    {"label": "Approval threshold", "value": _format_queue_currency(RCM_DECISION_APPROVAL_THRESHOLD)},
                    {"label": "High confidence threshold", "value": f"{RCM_DECISION_HIGH_CONFIDENCE:.0%}"},
                ],
                "confidence_logic": [
                    "Confidence blends issue-type recoverability priors, evidence coverage, due pressure, and owner readiness.",
                ],
                "approval_rules": [
                    "Insurer contract review, manager review, overdue interventions, and high-value cash exposure require human approval.",
                ],
                "missing_fields": [],
                "warnings": ["Comparable-case support uses seeded benchmarks until RCM outcome history accumulates."],
                "unsupported_filters": unsupported_filters,
                "limitations": ["Outcome review remains deferred until measured RCM decision outcomes are captured in production."],
            },
        }

    severity = "critical" if due_this_week_count > 0 and approval_required_count > 0 else ("watch" if requiring_review > 0 else "healthy")
    return {
        "generated_at": _now_iso(),
        "currency": RECOVERY_QUEUE_CURRENCY,
        "period": source_queue.get("period"),
        "filters_applied": {key: value for key, value in raw_filters.items() if value not in (None, "")},
        "data_freshness": source_queue.get("data_freshness"),
        "meta": {"empty": False, "message": None},
        "headline": {
            "severity": severity,
            "message": (
                f"Recovery Work Queue shows all recoverable work. Decision Review Queue narrows that to {len(filtered)} governed interventions, "
                f"with {approval_required_count} requiring formal approval and {_format_queue_currency_compact(expected_recovery)} under decision."
            ),
            "decision_count": len(filtered),
            "approval_required_count": approval_required_count,
            "expected_recovery": expected_recovery,
            "high_confidence_count": high_confidence_count,
        },
        "kpis": [
            {"id": "decisions_requiring_review", "label": "Decisions Requiring Review", "value": requiring_review, "formatted_value": _format_queue_number(requiring_review), "status": severity},
            {"id": "expected_recovery_under_decision", "label": "Expected Recovery Under Decision", "value": expected_recovery, "formatted_value": _format_queue_currency_compact(expected_recovery), "status": "watch" if expected_recovery > 0 else "healthy"},
            {"id": "approval_required", "label": "Approval Required", "value": approval_required_count, "formatted_value": _format_queue_number(approval_required_count), "status": "critical" if approval_required_count > 0 else "healthy"},
            {"id": "high_confidence_recommendations", "label": "High Confidence Recommendations", "value": high_confidence_count, "formatted_value": _format_queue_number(high_confidence_count), "status": "healthy" if high_confidence_count > 0 else "watch"},
            {"id": "due_this_week", "label": "Due This Week", "value": due_this_week_count, "formatted_value": _format_queue_number(due_this_week_count), "status": "critical" if due_this_week_count > 0 else "healthy"},
            {"id": "dispatched_today", "label": "Dispatched Today", "value": dispatched_today, "formatted_value": _format_queue_number(dispatched_today), "status": "healthy"},
        ],
        "decision_mix": {
            "by_decision_type": rollup("decision_type_label"),
            "by_approval_role": rollup("approval_role"),
            "by_payer": rollup("payer"),
            "by_status": rollup("decision_status_label"),
        },
        "decisions": filtered,
        "filter_options": _decision_filter_options(decisions),
        "data_quality": {
            "generated_at": _now_iso(),
            "currency": RECOVERY_QUEUE_CURRENCY,
            "source_tables": [
                {"table": f"{settings.analytics_schema}.fct_cash_recovery_opportunity", "role": "Recovery backlog source", "loaded": True},
                {"table": f"{settings.decision_schema}.decision_queue", "role": "Persisted governed decisions", "loaded": True},
                {"table": f"{settings.decision_schema}.decision_log", "role": "Decision audit trail", "loaded": True},
                {"table": f"{settings.decision_schema}.notification_log", "role": "Dispatch and notification evidence", "loaded": True},
            ],
            "filters_applied": {key: value for key, value in raw_filters.items() if value not in (None, "")},
            "scoring_logic": [
                "decision_score = expected_recovery_value * recoverability_probability * urgency_multiplier * policy_weight * confidence_weight / effort_hours",
                "Urgency multiplier reuses the Recovery Work Queue due-date pressure bands.",
                "Critical / High / Medium priority thresholds reuse the existing recovery priority score breakpoints.",
            ],
            "decision_thresholds": [
                {"label": "Minimum expected recovery", "value": _format_queue_currency(RCM_DECISION_MIN_EXPECTED_RECOVERY)},
                {"label": "Approval threshold", "value": _format_queue_currency(RCM_DECISION_APPROVAL_THRESHOLD)},
                {"label": "High value threshold", "value": _format_queue_currency(RCM_DECISION_HIGH_VALUE_THRESHOLD)},
                {"label": "Minimum confidence", "value": f"{RCM_DECISION_MIN_CONFIDENCE:.0%}"},
                {"label": "High confidence", "value": f"{RCM_DECISION_HIGH_CONFIDENCE:.0%}"},
            ],
            "confidence_logic": [
                "Confidence blends issue-type recoverability priors, evidence coverage, due pressure, and owner readiness.",
            ],
            "approval_rules": [
                "Insurer contract review, manager review, overdue interventions, missing-owner interventions, and high-value exposure require human approval.",
            ],
            "missing_fields": [],
            "warnings": [
                "Comparable-case support uses seeded benchmarks until RCM outcome history accumulates.",
                "Dispatch persists audit evidence but remains a manual downstream handoff until workqueue integration is connected.",
            ],
            "unsupported_filters": unsupported_filters,
            "limitations": [
                "Outcome review structure exists but RCM measurement is not yet populated from production recovery outcomes.",
            ],
        },
        "outcome_review": {
            "enabled": False,
            "reason": "Outcome measurement structure exists but production RCM actual-recovery measurement is deferred.",
        },
    }


def decision_workspace(decision_id: int) -> dict[str, Any] | None:
    ensure_decision_schema()
    with connect() as conn:
        row = conn.execute("select * from decision.decision_queue where use_case = %s and id = %s", (USE_CASE_ID, decision_id)).fetchone()
        if not row:
            return None
        logs = [
            _serialize_row(dict(log))
            for log in conn.execute(
                "select * from decision.decision_log where decision_id = %s order by created_at desc, id desc",
                (decision_id,),
            ).fetchall()
        ]
        notifications = [
            _serialize_row(dict(log))
            for log in conn.execute(
                "select * from decision.notification_log where decision_id = %s order by sent_at desc nulls last, id desc",
                (decision_id,),
            ).fetchall()
        ]
        outcome = conn.execute(
            "select * from decision.decision_outcomes where decision_id = %s order by measured_at desc nulls last, id desc limit 1",
            (decision_id,),
        ).fetchone()

    serialized = _serialize_rcm_decision_row(
        _serialize_row(dict(row)),
        audit_count=len(logs),
        latest_log_at=logs[0]["created_at"] if logs else None,
        sent_count=sum(int(entry.get("delivery_status") == "sent") for entry in notifications),
        failed_count=sum(int(entry.get("delivery_status") == "failed") for entry in notifications),
        skipped_count=sum(int(entry.get("delivery_status") == "skipped") for entry in notifications),
    )
    return {
        "generated_at": _now_iso(),
        "decision": serialized,
        "audit_trail": logs,
        "notifications": notifications,
        "outcome_review": _serialize_row(dict(outcome)) if outcome else {
            "enabled": False,
            "reason": "Outcome measurement has not yet been recorded for this RCM decision.",
        },
    }


def promote_recovery_item(
    source_item_id: str,
    *,
    performed_by: str = "portal_user",
    performed_by_role: str = "rcm_supervisor",
) -> dict[str, Any]:
    queue_payload = recovery_queue({"search": source_item_id})
    items = list(queue_payload.get("items") or queue_payload.get("queue_items") or [])
    match = next(
        (
            item
            for item in items
            if source_item_id in {
                str(item.get("opportunity_id") or ""),
                str(item.get("claim_ref") or ""),
                str(item.get("claim_id") or ""),
            }
        ),
        None,
    )
    if not match:
        raise ValueError("Recovery item not found for promotion")

    ensure_decision_schema()
    with connect() as conn:
        existing = _find_existing_rcm_decision(conn, match)
        if existing and _lower_text(existing.get("status")) not in {"completed", "dismissed", "expired", "closed", "rejected"}:
            return {
                "created": False,
                "decision": _serialize_rcm_decision_row(_serialize_row(existing)),
            }
        candidate = _decision_candidate_preview(match, force=True)
        if not candidate:
            raise ValueError("Recovery item cannot be promoted to a governed decision")
        inserted = _insert_rcm_decision_candidate(conn, match, candidate)
        _rcm_log_transition(
            conn,
            int(inserted["id"]),
            str(inserted["status"]),
            str(inserted["status"]),
            "promoted",
            performed_by=performed_by,
            performed_by_role=performed_by_role,
            notes="Promoted from Recovery Work Queue into governed Decision Review Queue.",
        )
    return {
        "created": True,
        "decision": _serialize_rcm_decision_row(_serialize_row(inserted)),
    }


def transition_rcm_decision(
    decision_id: int,
    action: str,
    payload: dict[str, Any] | None = None,
    *,
    performed_by: str = "portal_user",
    performed_by_role: str = "rcm_supervisor",
) -> dict[str, Any] | None:
    ensure_decision_schema()
    action_payload = payload or {}
    with connect() as conn:
        current_row = conn.execute(
            "select * from decision.decision_queue where use_case = %s and id = %s for update",
            (USE_CASE_ID, decision_id),
        ).fetchone()
        if not current_row:
            return None
        current = _serialize_row(dict(current_row))
        current_status = str(current.get("status") or "recommended")
        if not _decision_transition_allowed(current_status, action):
            raise ValueError(f"{_decision_status_label(current_status)} decisions cannot {action.replace('_', ' ')}.")
        if action == "dispatch" and current.get("approval_required") and current_status not in {"approved", "revised"}:
            raise ValueError("Approval is required before dispatch.")

        next_status = current_status
        transition_reason = str(action_payload.get("reason") or "").strip() or None
        notes = str(action_payload.get("notes") or "").strip() or None
        metadata = dict(action_payload.get("metadata") or {})

        if action == "approve":
            next_status = "approved"
            conn.execute(
                """
                update decision.decision_queue
                set status = %s, approved_by = %s, approved_at = now(), updated_at = now()
                where id = %s
                """,
                (next_status, performed_by, decision_id),
            )
        elif action == "reject":
            next_status = "rejected"
            conn.execute(
                """
                update decision.decision_queue
                set status = %s, outcome_status = %s, closed_at = now(), updated_at = now()
                where id = %s
                """,
                (next_status, "not_measurable", decision_id),
            )
        elif action == "revise":
            next_status = "revised"
            conn.execute(
                """
                update decision.decision_queue
                set status = %s,
                    decision_reason = coalesce(%s, decision_reason),
                    recommended_action = coalesce(%s, recommended_action),
                    updated_at = now()
                where id = %s
                """,
                (
                    next_status,
                    action_payload.get("decision_reason"),
                    action_payload.get("recommended_action"),
                    decision_id,
                ),
            )
        elif action == "dispatch":
            next_status = "dispatched"
            assignee_user = action_payload.get("assignee_user") or current.get("assignee_user") or current.get("owner_user_id")
            assignee_email = action_payload.get("assignee_email") or current.get("assignee_email")
            conn.execute(
                """
                update decision.decision_queue
                set status = %s,
                    assignee_user = %s,
                    assignee_email = %s,
                    dispatched_at = now(),
                    manual_action_required = true,
                    updated_at = now()
                where id = %s
                """,
                (next_status, assignee_user, assignee_email, decision_id),
            )
            _rcm_log_notification(
                conn,
                decision_id,
                "dispatch",
                recipient_team=str(current.get("recommended_owner") or current.get("owner_team") or ""),
                recipient_user=str(assignee_user or ""),
                recipient_email=str(assignee_email or "") or None,
                delivery_status="skipped",
                error_message="Manual action required until downstream RCM dispatch workflow is integrated.",
            )
        elif action == "escalate":
            next_status = "awaiting_review"
            conn.execute(
                """
                update decision.decision_queue
                set status = %s,
                    escalation_count = coalesce(escalation_count, 0) + 1,
                    last_escalated_at = now(),
                    updated_at = now()
                where id = %s
                """,
                (next_status, decision_id),
            )
        elif action == "note":
            next_status = current_status
        elif action == "assign":
            next_status = current_status if current_status in {"approved", "revised", "dispatched"} else "awaiting_review"
            assignee_user = action_payload.get("assignee_user") or current.get("assignee_user") or performed_by
            assignee_email = action_payload.get("assignee_email") or current.get("assignee_email")
            conn.execute(
                """
                update decision.decision_queue
                set status = %s,
                    assignee_user = %s,
                    assignee_email = %s,
                    recommended_owner = coalesce(%s, recommended_owner),
                    updated_at = now()
                where id = %s
                """,
                (next_status, assignee_user, assignee_email, action_payload.get("recommended_owner"), decision_id),
            )
            _rcm_log_notification(
                conn,
                decision_id,
                "assignment",
                recipient_team=str(action_payload.get("recommended_owner") or current.get("recommended_owner") or current.get("owner_team") or ""),
                recipient_user=str(assignee_user or ""),
                recipient_email=str(assignee_email or "") or None,
                delivery_status="skipped",
                error_message="Assignment recorded, but notification delivery is not integrated for RCM yet.",
            )
        else:
            raise ValueError(f"Unsupported RCM decision action: {action}")

        _rcm_log_transition(
            conn,
            decision_id,
            current_status,
            next_status,
            action,
            performed_by=performed_by,
            performed_by_role=performed_by_role,
            reason=transition_reason,
            notes=notes,
            metadata=metadata,
        )
        updated = conn.execute("select * from decision.decision_queue where id = %s", (decision_id,)).fetchone()
    return _serialize_rcm_decision_row(_serialize_row(dict(updated))) if updated else None


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
            "risk": f"Insurer {item.get('payer_id')} underpayment and deadline exposure",
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
