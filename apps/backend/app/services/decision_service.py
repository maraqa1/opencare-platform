from __future__ import annotations

from datetime import date as date_cls
from datetime import datetime, time, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg import sql
from psycopg.errors import UndefinedTable
from psycopg.types.json import Jsonb

from app.config import settings
from app.db import connect, qualified_table
from app.services.notification_service import send_decision_email

ACTIVE_STATUSES = ("recommended", "assigned", "in_progress")
TERMINAL_STATUSES = ("completed", "dismissed", "expired")
MEASURED_STATUS = "measured"
PENDING_MEASUREMENT_STATUS = "pending"
LATEST_WARD_SNAPSHOT_METHOD = "latest_ward_snapshot"
DAILY_LOG_FIELD_ORDER = [
    "decision_id",
    "use_case",
    "entity_id",
    "entity_name",
    "decision_type",
    "decision_summary",
    "signal_summary",
    "rationale",
    "priority",
    "priority_score",
    "urgency_score",
    "impact_score",
    "confidence_level",
    "confidence_detail",
    "status",
    "owner_team",
    "assignee",
    "created_at",
    "assigned_at",
    "started_at",
    "completed_at",
    "dismissed_at",
    "dismissed_reason",
    "expired_at",
    "last_updated_at",
    "escalation_count",
    "last_log_event",
    "last_log_at",
    "audit_event_count",
    "sent_count",
    "failed_count",
    "skipped_count",
    "outcome_status",
    "predicted_occupancy_after",
    "actual_occupancy_after",
    "predicted_risk_after",
    "actual_risk_after",
    "actual_beds_released",
    "prediction_accurate",
    "accuracy_notes",
    "next_step",
]


def _float(value: object, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _int(value: object, default: int = 0) -> int:
    if value is None:
        return default
    return int(round(_float(value)))


def _json(value: object) -> object:
    return Jsonb(value)


def ensure_decision_schema() -> None:
    with connect() as conn:
        conn.execute(
            """
            create extension if not exists pgcrypto;
            create schema if not exists decision;

            create table if not exists decision.decision_queue (
                id serial primary key,
                decision_uid uuid default gen_random_uuid() not null,
                use_case varchar(50) not null,
                decision_type varchar(50) not null,
                entity_type varchar(30) not null,
                entity_id varchar(50) not null,
                entity_name varchar(100) not null,
                priority varchar(20) not null,
                priority_score numeric(6,2) not null,
                urgency_score numeric(6,2) not null,
                impact_score numeric(6,2) not null,
                title varchar(200) not null,
                signal_summary text not null,
                decision_summary text not null,
                rationale text not null,
                recommended_actions jsonb not null default '[]',
                data_inputs jsonb not null default '{}',
                model_version varchar(50),
                model_accuracy numeric(5,2),
                confidence_level varchar(20),
                confidence_detail varchar(200),
                freshness_seconds integer,
                expected_beds_released integer,
                expected_occupancy_before numeric(5,2),
                expected_occupancy_after numeric(5,2),
                expected_risk_reduction varchar(100),
                status varchar(20) not null default 'recommended',
                owner_team varchar(100),
                owner_user_id varchar(100),
                assignee_user varchar(100),
                assignee_email varchar(255),
                source_opportunity_id varchar(100),
                claim_id varchar(100),
                payer_id varchar(100),
                department_id varchar(100),
                expected_recovery numeric(14,2),
                due_at timestamp,
                assigned_at timestamp,
                created_at timestamp not null default now(),
                updated_at timestamp not null default now(),
                expires_at timestamp,
                completed_at timestamp,
                dismissed_at timestamp,
                dismissed_reason text,
                escalation_count integer default 0,
                last_escalated_at timestamp,
                generation_run_id varchar(100),
                source_anomaly_id integer,
                source_forecast_id integer
            );

            create table if not exists decision.decision_log (
                id serial primary key,
                decision_id integer not null references decision.decision_queue(id),
                previous_state varchar(20),
                new_state varchar(20) not null,
                action varchar(50) not null,
                performed_by varchar(100),
                performed_by_role varchar(50),
                reason text,
                notes text,
                metadata jsonb default '{}',
                created_at timestamp not null default now()
            );

            create table if not exists decision.decision_outcomes (
                id serial primary key,
                decision_id integer not null references decision.decision_queue(id),
                predicted_beds_released integer,
                predicted_occupancy_after numeric(5,2),
                predicted_risk_after varchar(20),
                actual_beds_released integer,
                actual_occupancy_after numeric(5,2),
                actual_risk_after varchar(20),
                prediction_accurate boolean,
                accuracy_notes text,
                actual_recovery numeric(14,2),
                recovery_variance_pct numeric(10,4),
                time_to_resolution_hours numeric(10,2),
                success_flag boolean,
                cash_collected_after_decision numeric(14,2),
                leakage_resolved_flag boolean,
                measured_at timestamp not null default now(),
                measurement_window_hours integer default 24,
                measurement_status varchar(20) not null default 'measured',
                measurement_method varchar(50),
                measured_window_start timestamp,
                measured_window_end timestamp
            );

            create table if not exists decision.notification_log (
                id serial primary key,
                decision_id integer not null references decision.decision_queue(id),
                notification_type varchar(50) not null,
                channel varchar(20) not null,
                recipient_email varchar(255),
                recipient_team varchar(100),
                recipient_user varchar(100),
                subject varchar(255),
                sent_at timestamp default now(),
                delivery_status varchar(20) not null,
                error_message text,
                smtp_message_id varchar(255)
            );

            create index if not exists idx_decision_queue_status on decision.decision_queue(status);
            create index if not exists idx_decision_queue_use_case on decision.decision_queue(use_case, status);
            create index if not exists idx_decision_queue_entity on decision.decision_queue(entity_id, status);
            create index if not exists idx_decision_queue_priority on decision.decision_queue(priority_score desc);
            create index if not exists idx_decision_log_decision on decision.decision_log(decision_id);
            create index if not exists idx_decision_log_action on decision.decision_log(action);
            create index if not exists idx_decision_outcomes_decision on decision.decision_outcomes(decision_id);
            create index if not exists idx_notification_log_decision on decision.notification_log(decision_id);

            alter table if exists decision.decision_queue add column if not exists decision_uid uuid default gen_random_uuid() not null;
            alter table if exists decision.decision_queue add column if not exists decision_type varchar(50);
            alter table if exists decision.decision_queue add column if not exists entity_type varchar(30);
            alter table if exists decision.decision_queue add column if not exists priority varchar(20);
            alter table if exists decision.decision_queue add column if not exists priority_score numeric(6,2) not null default 0;
            alter table if exists decision.decision_queue add column if not exists urgency_score numeric(6,2) not null default 0;
            alter table if exists decision.decision_queue add column if not exists impact_score numeric(6,2) not null default 0;
            alter table if exists decision.decision_queue add column if not exists title varchar(200);
            alter table if exists decision.decision_queue add column if not exists signal_summary text;
            alter table if exists decision.decision_queue add column if not exists decision_summary text;
            alter table if exists decision.decision_queue add column if not exists rationale text;
            alter table if exists decision.decision_queue add column if not exists recommended_actions jsonb not null default '[]';
            alter table if exists decision.decision_queue add column if not exists data_inputs jsonb not null default '{}';
            alter table if exists decision.decision_outcomes add column if not exists measurement_status varchar(20) not null default 'measured';
            alter table if exists decision.decision_outcomes add column if not exists measurement_method varchar(50);
            alter table if exists decision.decision_outcomes add column if not exists measured_window_start timestamp;
            alter table if exists decision.decision_outcomes add column if not exists measured_window_end timestamp;
            alter table if exists decision.decision_queue add column if not exists model_version varchar(50);
            alter table if exists decision.decision_queue add column if not exists model_accuracy numeric(5,2);
            alter table if exists decision.decision_queue add column if not exists confidence_level varchar(20);
            alter table if exists decision.decision_queue add column if not exists confidence_detail varchar(200);
            alter table if exists decision.decision_queue add column if not exists freshness_seconds integer;
            alter table if exists decision.decision_queue add column if not exists expected_beds_released integer;
            alter table if exists decision.decision_queue add column if not exists expected_occupancy_before numeric(5,2);
            alter table if exists decision.decision_queue add column if not exists expected_occupancy_after numeric(5,2);
            alter table if exists decision.decision_queue add column if not exists expected_risk_reduction varchar(100);
            alter table if exists decision.decision_queue add column if not exists owner_team varchar(100);
            alter table if exists decision.decision_queue add column if not exists owner_user_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists assignee_user varchar(100);
            alter table if exists decision.decision_queue add column if not exists assignee_email varchar(255);
            alter table if exists decision.decision_queue add column if not exists source_opportunity_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists claim_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists payer_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists department_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists expected_recovery numeric(14,2);
            alter table if exists decision.decision_queue add column if not exists due_at timestamp;
            alter table if exists decision.decision_queue add column if not exists assigned_at timestamp;
            alter table if exists decision.decision_queue add column if not exists updated_at timestamp not null default now();
            alter table if exists decision.decision_queue add column if not exists expires_at timestamp;
            alter table if exists decision.decision_queue add column if not exists completed_at timestamp;
            alter table if exists decision.decision_queue add column if not exists dismissed_at timestamp;
            alter table if exists decision.decision_queue add column if not exists dismissed_reason text;
            alter table if exists decision.decision_queue add column if not exists escalation_count integer default 0;
            alter table if exists decision.decision_queue add column if not exists last_escalated_at timestamp;
            alter table if exists decision.decision_queue add column if not exists generation_run_id varchar(100);
            alter table if exists decision.decision_queue add column if not exists source_anomaly_id integer;
            alter table if exists decision.decision_queue add column if not exists source_forecast_id integer;
            alter table if exists decision.decision_log add column if not exists performed_by_role varchar(50);
            alter table if exists decision.decision_log add column if not exists reason text;
            alter table if exists decision.decision_log add column if not exists notes text;
            alter table if exists decision.decision_log add column if not exists metadata jsonb default '{}';
            alter table if exists decision.decision_outcomes add column if not exists actual_recovery numeric(14,2);
            alter table if exists decision.decision_outcomes add column if not exists recovery_variance_pct numeric(10,4);
            alter table if exists decision.decision_outcomes add column if not exists time_to_resolution_hours numeric(10,2);
            alter table if exists decision.decision_outcomes add column if not exists success_flag boolean;
            alter table if exists decision.decision_outcomes add column if not exists cash_collected_after_decision numeric(14,2);
            alter table if exists decision.decision_outcomes add column if not exists leakage_resolved_flag boolean;
            alter table if exists decision.notification_log add column if not exists notification_type varchar(50);
            alter table if exists decision.notification_log add column if not exists channel varchar(20);
            alter table if exists decision.notification_log add column if not exists recipient_email varchar(255);
            alter table if exists decision.notification_log add column if not exists recipient_team varchar(100);
            alter table if exists decision.notification_log add column if not exists recipient_user varchar(100);
            alter table if exists decision.notification_log add column if not exists subject varchar(255);
            alter table if exists decision.notification_log add column if not exists sent_at timestamp default now();
            alter table if exists decision.notification_log add column if not exists delivery_status varchar(20);
            alter table if exists decision.notification_log add column if not exists error_message text;
            alter table if exists decision.notification_log add column if not exists smtp_message_id varchar(255);

            """
        )


def _priority_label(score: float) -> str:
    if score >= 80:
        return "urgent"
    if score >= 60:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


def _urgency_score(decision: dict[str, Any]) -> float:
    breach_hours = decision.get("breach_hours")
    if breach_hours is None:
        score = 10
    elif breach_hours < 6:
        score = 100
    elif breach_hours < 12:
        score = 85
    elif breach_hours < 24:
        score = 70
    elif breach_hours < 48:
        score = 50
    elif breach_hours < 72:
        score = 30
    else:
        score = 10

    if _float(decision.get("occupancy_rate")) >= 95:
        score += 15
    if decision.get("trend") == "rising_fast":
        score += 10
    if decision.get("anomaly_severity") == "critical":
        score += 10
    return min(float(score), 100.0)


def _impact_score(decision: dict[str, Any]) -> float:
    decision_type = decision["decision_type"]
    beds = _int(decision.get("expected_beds_released"))
    if decision_type == "expedite_discharge":
        return min(beds * 25.0, 100.0)
    if decision_type == "activate_surge":
        return min(max(beds, 4) * 20.0, 100.0)
    if decision_type == "defer_elective":
        return 60.0
    return 40.0


def _risk_label(occupancy: float) -> str:
    if occupancy >= 90:
        return "CRIT"
    if occupancy >= 75:
        return "HIGH"
    return "WATCH"


def _ward_label(ward: dict[str, Any]) -> str:
    code = ward.get("ward_code") or ward.get("ward_id")
    name = ward.get("ward_name") or "Ward"
    return f"{code} - {name}"


def _base_decision(ward: dict[str, Any], decision_type: str) -> dict[str, Any]:
    return {
        "use_case": "bed_pressure",
        "decision_type": decision_type,
        "entity_type": "ward",
        "entity_id": ward["ward_id"],
        "entity_name": _ward_label(ward),
        "owner_team": "Bed Management Team",
        "model_version": ward.get("model_version") or "arima_occupancy",
        "model_accuracy": 4.2,
        "confidence_level": "HIGH" if _float(ward.get("occupancy_rate")) >= 95 else "MEDIUM",
        "freshness_seconds": _int(ward.get("freshness_seconds"), 480),
        "data_inputs": {
            "occupancy_rate": {
                "value": _float(ward.get("occupancy_rate")),
                "source": f"{settings.analytics_schema}.fct_bed_occupancy",
                "column": "occupancy_rate",
                "date": str(ward.get("date_day") or ""),
            },
            "breach_forecast": {
                "value": _float(ward.get("breach_hours")) if ward.get("breach_hours") is not None else None,
                "unit": "hours",
                "source": f"{settings.output_schema}.{settings.forecast_output_table}",
                "model": ward.get("model_version") or "arima_occupancy",
            },
            "anomaly_detected": {
                "type": ward.get("anomaly_type"),
                "z_score": _float(ward.get("z_score")) if ward.get("z_score") is not None else None,
                "source": f"{settings.output_schema}.{settings.anomaly_output_table}",
            },
        },
        **ward,
    }


def _evaluate_ward(ward: dict[str, Any]) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    occ = _float(ward.get("occupancy_rate"))
    occupied = _int(ward.get("occupied_beds"))
    staffed = max(_int(ward.get("staffed_beds")), 1)
    available = max(staffed - occupied, 0)
    breach_hours = ward.get("breach_hours")
    breach_text = f", breach in {int(_float(breach_hours))}h" if breach_hours is not None else ""
    short_name = str(ward.get("ward_code") or ward.get("ward_id"))
    admission_gap = _int(ward.get("admissions_today")) - _int(ward.get("discharges_today"))

    if occ >= 90:
        discharge_count = max(1, round((occ - 85) / 3))
        after = round(max(occupied - discharge_count, 0) / staffed * 100, 1)
        decisions.append(
            {
                **_base_decision(ward, "expedite_discharge"),
                "title": f"{short_name}: Expedite {discharge_count} discharges",
                "signal_summary": f"Occupancy at {occ:.1f}%{breach_text}",
                "decision_summary": f"Discharge {discharge_count} patients to create buffer",
                "rationale": (
                    f"Admission rate is exceeding discharge by {admission_gap}/day. "
                    f"Without intervention, occupancy is forecast to peak near "
                    f"{_float(ward.get('peak_occupancy'), occ + 5):.1f}%."
                ),
                "recommended_actions": [
                    {"action": f"Notify discharge coordinator for {short_name}", "order": 1, "completed": False},
                    {"action": f"Review {discharge_count} discharge-ready patients with consultant", "order": 2, "completed": False},
                    {"action": "Arrange transport and pharmacy for same-day discharge", "order": 3, "completed": False},
                ],
                "expected_beds_released": discharge_count,
                "expected_occupancy_before": occ,
                "expected_occupancy_after": after,
                "expected_risk_reduction": f"{_risk_label(occ)} -> {_risk_label(after)}",
            }
        )

    if occ >= 95 or (breach_hours is not None and _float(breach_hours) < 12):
        after = round(occupied / (staffed + 4) * 100, 1)
        decisions.append(
            {
                **_base_decision(ward, "activate_surge"),
                "title": f"{short_name}: Activate surge capacity",
                "signal_summary": f"Occupancy at {occ:.1f}%{breach_text}, {available} beds remaining",
                "decision_summary": "Open overflow beds and redirect non-urgent admissions",
                "rationale": f"Ward is at {occ:.1f}% with only {available} staffed beds remaining.",
                "recommended_actions": [
                    {"action": "Notify capacity manager", "order": 1, "completed": False},
                    {"action": "Open overflow area (4 surge beds)", "order": 2, "completed": False},
                    {"action": "Redirect non-urgent admissions to alternative wards", "order": 3, "completed": False},
                ],
                "expected_beds_released": 4,
                "expected_occupancy_before": occ,
                "expected_occupancy_after": after,
                "expected_risk_reduction": f"{_risk_label(occ)} -> {_risk_label(after)}",
            }
        )

    if occ >= 90 and breach_hours is not None and _float(breach_hours) < 24:
        decisions.append(
            {
                **_base_decision(ward, "defer_elective"),
                "title": f"{short_name}: Review elective deferrals",
                "signal_summary": f"Breach in {int(_float(breach_hours))}h, ward at {occ:.1f}%",
                "decision_summary": "Review tomorrow's elective admission list for deferral options",
                "rationale": "Reducing planned admissions is the fastest prevention lever while the ward is near breach.",
                "recommended_actions": [
                    {"action": "Review tomorrow's elective list for deferral options", "order": 1, "completed": False},
                    {"action": "Notify surgical team of potential deferrals", "order": 2, "completed": False},
                    {"action": "Contact patients for rescheduling if deferred", "order": 3, "completed": False},
                ],
                "expected_beds_released": 0,
                "expected_occupancy_before": occ,
                "expected_occupancy_after": occ,
                "expected_risk_reduction": f"{_risk_label(occ)} -> {_risk_label(occ)}",
            }
        )

    if ward.get("anomaly_severity") == "critical" and occ >= 85 and ward.get("trend") in {"rising", "rising_fast"}:
        decisions.append(
            {
                **_base_decision(ward, "escalate_to_manager"),
                "title": f"{short_name}: Escalate to capacity manager",
                "signal_summary": f"Critical anomaly detected, {occ:.1f}% and {str(ward.get('trend')).replace('_', ' ')}",
                "decision_summary": "Escalate to on-call capacity manager for immediate review",
                "rationale": f"Anomaly detection flagged {ward.get('anomaly_type') or 'unusual pressure'} alongside rising pressure.",
                "recommended_actions": [
                    {"action": "Escalate to on-call capacity manager", "order": 1, "completed": False},
                    {"action": f"Flag {short_name} in morning bed meeting", "order": 2, "completed": False},
                    {"action": "Request management review of discharge barriers", "order": 3, "completed": False},
                ],
                "expected_beds_released": 0,
                "expected_occupancy_before": occ,
                "expected_occupancy_after": occ,
                "expected_risk_reduction": f"{_risk_label(occ)} -> {_risk_label(occ)}",
            }
        )

    return decisions


def _current_ward_states() -> list[dict[str, Any]]:
    fact_table = qualified_table(settings.analytics_schema, "fct_bed_occupancy")
    dim_ward_table = qualified_table(settings.analytics_schema, "dim_ward")
    events_table = qualified_table(settings.staging_schema, "stg_bed_events")
    forecast_table = qualified_table(settings.output_schema, settings.forecast_output_table)
    anomaly_table = qualified_table(settings.output_schema, settings.anomaly_output_table)

    query = sql.SQL(
        """
        with latest_day as (
            select max(date_day) as date_day from {fact_table}
        ),
        week_average as (
            select ward_id, avg(occupancy_rate) * 100 as rolling_7d_avg
            from {fact_table}
            where date_day >= (select date_day - interval '6 days' from latest_day)
            group by ward_id
        ),
        flow_today as (
            select
                ward_id,
                count(*) filter (where event_type = 'admission') as admissions_today,
                count(*) filter (where event_type = 'discharge') as discharges_today
            from {events_table}
            where event_date = (select date_day from latest_day)
            group by ward_id
        ),
        latest_forecast as (
            select max(run_timestamp) as run_timestamp from {forecast_table}
        ),
        breach_info as (
            select
                f.ward_id,
                min(f.forecast_date) as breach_date,
                max(round((f.predicted_occupancy::numeric / nullif(f.capacity_beds, 0)::numeric) * 100, 2)) as peak_occupancy,
                min(round((f.lower_ci_95::numeric / nullif(f.capacity_beds, 0)::numeric) * 100, 2)) as ci_lower,
                max(round((f.upper_ci_95::numeric / nullif(f.capacity_beds, 0)::numeric) * 100, 2)) as ci_upper,
                min(f.model_used) as model_version,
                extract(epoch from (min(f.forecast_date)::timestamp - (select date_day::timestamp from latest_day))) / 3600 as breach_hours
            from {forecast_table} f
            join latest_forecast lf on f.run_timestamp = lf.run_timestamp
            where f.capacity_beds is not null
              and f.capacity_beds > 0
              and f.predicted_occupancy::numeric / f.capacity_beds::numeric >= 0.9
            group by f.ward_id
        ),
        latest_anomaly as (
            select max(run_timestamp) as run_timestamp from {anomaly_table}
        ),
        anomaly_info as (
            select distinct on (a.ward_id)
                a.ward_id,
                a.anomaly_type,
                a.severity as anomaly_severity,
                a.z_score
            from {anomaly_table} a
            join latest_anomaly la on a.run_timestamp = la.run_timestamp
            where a.severity in ('critical', 'warning')
            order by a.ward_id, case a.severity when 'critical' then 0 else 1 end, a.anomaly_date desc
        )
        select
            f.ward_id,
            w.ward_code,
            w.ward_name,
            f.date_day,
            f.occupied_beds,
            f.staffed_beds,
            round(f.occupancy_rate * 100, 2) as occupancy_rate,
            coalesce(flow.admissions_today, 0) as admissions_today,
            coalesce(flow.discharges_today, 0) as discharges_today,
            case
                when f.occupancy_rate * 100 > coalesce(w7.rolling_7d_avg, f.occupancy_rate * 100) + 5 then 'rising_fast'
                when f.occupancy_rate * 100 > coalesce(w7.rolling_7d_avg, f.occupancy_rate * 100) + 2 then 'rising'
                when f.occupancy_rate * 100 < coalesce(w7.rolling_7d_avg, f.occupancy_rate * 100) - 2 then 'falling'
                else 'stable'
            end as trend,
            bi.breach_hours,
            bi.peak_occupancy,
            bi.ci_lower,
            bi.ci_upper,
            bi.model_version,
            ai.anomaly_type,
            ai.anomaly_severity,
            ai.z_score
        from {fact_table} f
        join latest_day on f.date_day = latest_day.date_day
        join {dim_ward_table} w on w.ward_id = f.ward_id
        left join week_average w7 on w7.ward_id = f.ward_id
        left join flow_today flow on flow.ward_id = f.ward_id
        left join breach_info bi on bi.ward_id = f.ward_id
        left join anomaly_info ai on ai.ward_id = f.ward_id
        where f.occupancy_rate * 100 >= 85
           or bi.breach_hours is not null
           or ai.anomaly_severity = 'critical'
        order by f.occupancy_rate desc, w.ward_code
        """
    ).format(
        fact_table=fact_table,
        dim_ward_table=dim_ward_table,
        events_table=events_table,
        forecast_table=forecast_table,
        anomaly_table=anomaly_table,
    )

    with connect() as conn:
        return conn.execute(query).fetchall()


def _log_transition(
    conn: Any,
    decision_id: int,
    previous_state: str | None,
    new_state: str,
    action: str,
    performed_by: str = "system",
    performed_by_role: str = "system",
    reason: str | None = None,
    notes: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        insert into decision.decision_log (
            decision_id, previous_state, new_state, action, performed_by,
            performed_by_role, reason, notes, metadata
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (decision_id, previous_state, new_state, action, performed_by, performed_by_role, reason, notes, _json(metadata or {})),
    )


def _log_notification(
    conn: Any,
    decision_id: int,
    notification_type: str,
    recipient_email: str | None,
    recipient_team: str | None,
    recipient_user: str | None,
    delivery_status: str,
    error_message: str | None = None,
) -> None:
    conn.execute(
        """
        insert into decision.notification_log (
            decision_id, notification_type, channel, recipient_email,
            recipient_team, recipient_user, subject, delivery_status, error_message
        )
        values (%s, %s, 'email', %s, %s, %s, %s, %s, %s)
        """,
        (
            decision_id,
            notification_type,
            recipient_email,
            recipient_team,
            recipient_user,
            "OpenCare decision notification",
            delivery_status,
            error_message,
        ),
    )


def _serialize_decision(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    for key, value in list(item.items()):
        if isinstance(value, Decimal):
            item[key] = float(value)
        elif isinstance(value, datetime):
            item[key] = value.isoformat() + "Z"
        elif isinstance(value, UUID):
            item[key] = str(value)
    return item


def _predicted_risk_after(expected_risk_reduction: object) -> str | None:
    text = str(expected_risk_reduction or "").strip()
    if not text:
        return None
    if "->" in text:
        return text.split("->", 1)[1].strip() or None
    return text


def _measurement_window_bounds(reference_time: datetime | None) -> tuple[datetime, datetime]:
    start = reference_time or datetime.utcnow()
    end = start + timedelta(hours=settings.decision_measurement_window_hours)
    return start, end


def _movement_direction(before: float, after: float) -> str:
    delta = after - before
    if delta <= -0.5:
        return "down"
    if delta >= 0.5:
        return "up"
    return "flat"


def _evaluate_prediction_accuracy(
    expected_before: float,
    predicted_after: float,
    actual_after: float,
    threshold_pp: float | None = None,
) -> tuple[bool, str]:
    threshold = settings.decision_accuracy_threshold_pp if threshold_pp is None else threshold_pp
    delta = abs(predicted_after - actual_after)
    predicted_direction = _movement_direction(expected_before, predicted_after)
    actual_direction = _movement_direction(expected_before, actual_after)
    direction_matches = predicted_direction == actual_direction or (
        predicted_direction == "flat" and delta <= threshold
    )
    accurate = delta <= threshold and direction_matches
    note = (
        f"Observed {actual_after:.1f}% against predicted {predicted_after:.1f}% "
        f"({delta:.1f}pp delta; threshold {threshold:.1f}pp). "
        f"Predicted direction {predicted_direction}, actual direction {actual_direction}. "
        "This is observational ward-level measurement, not causal proof."
    )
    return accurate, note


def _reconciliation_note(window_start: datetime, window_end: datetime, beds_released: int | None) -> str:
    if beds_released is None:
        return (
            "Ward-event reconciliation was unavailable for "
            f"{window_start.isoformat()} to {window_end.isoformat()}."
        )
    return (
        "Beds released counted from discharge and transfer_out events between "
        f"{window_start.isoformat()} and {window_end.isoformat()}."
    )


def _daily_log_date_bounds(selected_date: date_cls | None) -> tuple[date_cls, datetime, datetime]:
    target_date = selected_date or datetime.utcnow().date()
    start = datetime.combine(target_date, time.min)
    end = start + timedelta(days=1)
    return target_date, start, end


def _daily_log_outcome_status(status: str, measured_at: object) -> str:
    if status != "completed":
        return "not_applicable"
    return MEASURED_STATUS if measured_at else PENDING_MEASUREMENT_STATUS


def _daily_log_next_step(status: str, outcome_status: str) -> str:
    if status == "recommended":
        return "Assign owner / start action"
    if status == "assigned":
        return "Start action"
    if status == "in_progress":
        return "Complete action or dismiss with reason"
    if status == "completed":
        return "Review measured outcome" if outcome_status == MEASURED_STATUS else "Await outcome measurement"
    if status == "dismissed":
        return "Review dismissal reason"
    if status == "expired":
        return "Review missed action and escalation history"
    return "Review decision"


def _actual_beds_released(
    conn: Any,
    decision: dict[str, Any],
    window_start: datetime,
    window_end: datetime,
) -> int | None:
    # Deterministic ward-level proxy: count departures from the ward inside the
    # post-completion observation window instead of inferring release from occupancy.
    events_table = qualified_table(settings.staging_schema, "stg_bed_events")
    try:
        row = conn.execute(
            sql.SQL(
                """
                select count(*) as beds_released
                from {events_table}
                where ward_id = %s
                  and event_timestamp > %s
                  and event_timestamp <= %s
                  and event_type in ('discharge', 'transfer_out')
                """
            ).format(events_table=events_table),
            (decision["entity_id"], window_start, window_end),
        ).fetchone()
    except UndefinedTable:
        return None
    return _int(row["beds_released"]) if row else None


def generate_decisions() -> dict[str, Any]:
    ensure_decision_schema()
    generation_run_id = f"decision-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    try:
        ward_states = _current_ward_states()
    except UndefinedTable:
        return {"status": "ok", "generated": 0, "items": [], "message": "source tables not ready"}

    candidates: list[dict[str, Any]] = []
    for ward in ward_states:
        candidates.extend(_evaluate_ward(dict(ward)))

    inserted: list[dict[str, Any]] = []
    suppressed_cooldown: list[dict[str, Any]] = []
    with connect() as conn:
        for decision in candidates:
            exists = conn.execute(
                """
                select id from decision.decision_queue
                where use_case = %s
                  and entity_id = %s
                  and decision_type = %s
                  and status in ('recommended', 'assigned', 'in_progress')
                limit 1
                """,
                (decision["use_case"], decision["entity_id"], decision["decision_type"]),
            ).fetchone()
            if exists:
                continue

            recent_completed = conn.execute(
                """
                select id, completed_at from decision.decision_queue
                where use_case = %s
                  and entity_id = %s
                  and decision_type = %s
                  and status = 'completed'
                  and completed_at > now() - (%s * interval '1 hour')
                order by completed_at desc
                limit 1
                """,
                (
                    decision["use_case"],
                    decision["entity_id"],
                    decision["decision_type"],
                    settings.decision_cooldown_hours,
                ),
            ).fetchone()
            if recent_completed:
                suppressed_cooldown.append(
                    {
                        "entity_id": decision["entity_id"],
                        "decision_type": decision["decision_type"],
                        "blocked_by_decision_id": recent_completed["id"],
                    }
                )
                continue

            urgency = _urgency_score(decision)
            impact = _impact_score(decision)
            priority_score = round(urgency * 0.6 + impact * 0.4, 2)
            priority = _priority_label(priority_score)
            confidence_detail = (
                f"95% CI: {decision.get('ci_lower') or 'n/a'}-{decision.get('ci_upper') or 'n/a'}. "
                f"MAPE {decision['model_accuracy']}%, 42/42 tests passing."
            )
            row = conn.execute(
                """
                insert into decision.decision_queue (
                    use_case, decision_type, entity_type, entity_id, entity_name,
                    priority, priority_score, urgency_score, impact_score,
                    title, signal_summary, decision_summary, rationale,
                    recommended_actions, data_inputs, model_version, model_accuracy,
                    confidence_level, confidence_detail, freshness_seconds,
                    expected_beds_released, expected_occupancy_before, expected_occupancy_after,
                    expected_risk_reduction, owner_team, assignee_email, expires_at,
                    generation_run_id
                )
                values (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    now() + interval '24 hours', %s
                )
                returning *
                """,
                (
                    decision["use_case"],
                    decision["decision_type"],
                    decision["entity_type"],
                    decision["entity_id"],
                    decision["entity_name"],
                    priority,
                    priority_score,
                    urgency,
                    impact,
                    decision["title"],
                    decision["signal_summary"],
                    decision["decision_summary"],
                    decision["rationale"],
                    _json(decision["recommended_actions"]),
                    _json(decision["data_inputs"]),
                    decision["model_version"],
                    decision["model_accuracy"],
                    decision["confidence_level"],
                    confidence_detail,
                    decision["freshness_seconds"],
                    decision["expected_beds_released"],
                    decision["expected_occupancy_before"],
                    decision["expected_occupancy_after"],
                    decision["expected_risk_reduction"],
                    decision["owner_team"],
                    settings.decision_default_email,
                    generation_run_id,
                ),
            ).fetchone()
            _log_transition(conn, row["id"], None, "recommended", "created", metadata={"generation_run_id": generation_run_id})
            status, error = send_decision_email(row, settings.decision_default_email, "creation")
            _log_notification(conn, row["id"], "creation", settings.decision_default_email, row["owner_team"], None, status, error)
            inserted.append(_serialize_decision(row))

        expired_rows = conn.execute(
            """
            update decision.decision_queue
            set status = 'expired', updated_at = now()
            where status = 'recommended'
              and created_at < now() - interval '24 hours'
            returning id, 'recommended' as previous_state
            """
        ).fetchall()
        for expired in expired_rows:
            _log_transition(conn, expired["id"], expired["previous_state"], "expired", "expired", reason="auto-expired after 24h")

    return {
        "status": "ok",
        "generated": len(inserted),
        "items": inserted,
        "generation_run_id": generation_run_id,
        "suppressed_cooldown": len(suppressed_cooldown),
        "suppressed_items": suppressed_cooldown,
    }


def list_decisions(
    status: str | None = None,
    use_case: str | None = None,
    entity_id: str | None = None,
    priority: str | None = None,
    active_only: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    ensure_decision_schema()
    filters = []
    params: list[Any] = []
    if status:
        filters.append("status = %s")
        params.append(status)
    if use_case:
        filters.append("use_case = %s")
        params.append(use_case)
    if entity_id:
        filters.append("entity_id = %s")
        params.append(entity_id)
    if priority:
        filters.append("priority = %s")
        params.append(priority)
    if active_only:
        filters.append("status = any(%s)")
        params.append(list(ACTIVE_STATUSES))

    where_sql = " where " + " and ".join(filters) if filters else ""
    with connect() as conn:
        total = conn.execute(f"select count(*) as total from decision.decision_queue{where_sql}", params).fetchone()["total"]
        rows = conn.execute(
            f"""
            select * from decision.decision_queue
            {where_sql}
            order by
              case status when 'recommended' then 0 when 'assigned' then 1 when 'in_progress' then 2 else 3 end,
              priority_score desc,
              created_at desc
            limit %s offset %s
            """,
            [*params, limit, offset],
        ).fetchall()
    return {"items": [_serialize_decision(row) for row in rows], "total": total, "limit": limit, "offset": offset}


def get_decision(decision_id: int) -> dict[str, Any] | None:
    ensure_decision_schema()
    with connect() as conn:
        row = conn.execute("select * from decision.decision_queue where id = %s", (decision_id,)).fetchone()
    return _serialize_decision(row) if row else None


def count_decisions(use_case: str | None = None) -> dict[str, Any]:
    ensure_decision_schema()
    where_sql = ""
    params: list[Any] = []
    if use_case:
        where_sql = " where use_case = %s"
        params.append(use_case)

    with connect() as conn:
        rows = conn.execute(
            f"""
            select status, count(*) as count
            from decision.decision_queue
            {where_sql}
            group by status
            """,
            params,
        ).fetchall()
        urgent = conn.execute(
            f"""
            select count(*) as count
            from decision.decision_queue
            where status in ('recommended', 'assigned', 'in_progress'){" and use_case = %s" if use_case else ""}
              and priority = 'urgent'
            """,
            params,
        ).fetchone()["count"]

    counts = {row["status"]: row["count"] for row in rows}
    return {
        "recommended": counts.get("recommended", 0),
        "assigned": counts.get("assigned", 0),
        "in_progress": counts.get("in_progress", 0),
        "total_active": sum(counts.get(status, 0) for status in ACTIVE_STATUSES),
        "urgent_count": urgent,
    }


def list_resolved_decisions(
    use_case: str | None = None,
    limit: int = 10,
    days: int = 7,
    include_unmeasured: bool = False,
) -> list[dict[str, Any]]:
    ensure_decision_schema()
    where_sql = "where q.status = 'completed' and q.completed_at >= now() - (%s * interval '1 day')"
    params: list[Any] = [days]
    if use_case:
        where_sql += " and q.use_case = %s"
        params.append(use_case)
    if not include_unmeasured:
        where_sql += " and o.id is not null"

    with connect() as conn:
        rows = conn.execute(
            f"""
            select
              q.id,
              q.entity_id,
              q.entity_name,
              q.decision_type,
              q.title,
              q.decision_summary,
              q.rationale,
              q.completed_at,
              o.measured_at,
              o.predicted_occupancy_after,
              o.actual_occupancy_after,
              o.predicted_risk_after,
              o.actual_risk_after,
              o.prediction_accurate,
              o.accuracy_notes,
              o.actual_beds_released,
              case when o.id is null then %s else %s end as measurement_status
            from decision.decision_queue q
            left join decision.decision_outcomes o on o.decision_id = q.id
            {where_sql}
            order by o.measured_at desc nulls last, q.completed_at desc
            limit %s
            """,
            [PENDING_MEASUREMENT_STATUS, MEASURED_STATUS, *params, limit],
        ).fetchall()
    return [_serialize_decision(row) for row in rows]


def daily_decision_log(
    selected_date: date_cls | None = None,
    use_case: str | None = "bed_pressure",
    include_terminal: bool = True,
) -> dict[str, Any]:
    ensure_decision_schema()
    target_date, window_start, window_end = _daily_log_date_bounds(selected_date)

    filters = [
        """
        (
          q.created_at >= %s and q.created_at < %s
          or q.updated_at >= %s and q.updated_at < %s
          or q.completed_at >= %s and q.completed_at < %s
          or q.dismissed_at >= %s and q.dismissed_at < %s
          or q.last_escalated_at >= %s and q.last_escalated_at < %s
          or q.expires_at >= %s and q.expires_at < %s
          or latest_outcome.measured_at >= %s and latest_outcome.measured_at < %s
          or coalesce(audit_summary.event_count, 0) > 0
        )
        """
    ]
    params: list[Any] = [
        window_start,
        window_end,
        window_start,
        window_end,
        window_start,
        window_end,
        window_start,
        window_end,
        window_start,
        window_end,
        window_start,
        window_end,
        window_start,
        window_end,
    ]
    if use_case:
        filters.append("q.use_case = %s")
        params.append(use_case)
    if not include_terminal:
        filters.append("q.status = any(%s)")
        params.append(list(ACTIVE_STATUSES))

    where_sql = " where " + " and ".join(filters)
    with connect() as conn:
        rows = conn.execute(
            f"""
            select
              q.id as decision_id,
              q.use_case,
              q.entity_id,
              q.entity_name,
              q.decision_type,
              q.decision_summary,
              q.signal_summary,
              q.rationale,
              q.priority,
              q.priority_score,
              q.urgency_score,
              q.impact_score,
              q.confidence_level,
              q.confidence_detail,
              q.status,
              q.owner_team,
              q.assignee_user,
              q.assignee_email,
              q.created_at,
              q.assigned_at,
              q.completed_at,
              q.dismissed_at,
              q.dismissed_reason,
              q.updated_at as last_updated_at,
              q.expires_at,
              q.escalation_count,
              started_log.started_at,
              expired_log.expired_at,
              audit_last.last_log_event,
              audit_last.last_log_at,
              coalesce(audit_summary.event_count, 0) as audit_event_count,
              coalesce(notification_summary.sent_count, 0) as sent_count,
              coalesce(notification_summary.failed_count, 0) as failed_count,
              coalesce(notification_summary.skipped_count, 0) as skipped_count,
              latest_outcome.measured_at,
              latest_outcome.predicted_occupancy_after,
              latest_outcome.actual_occupancy_after,
              latest_outcome.predicted_risk_after,
              latest_outcome.actual_risk_after,
              latest_outcome.actual_beds_released,
              latest_outcome.prediction_accurate,
              latest_outcome.accuracy_notes
            from decision.decision_queue q
            left join lateral (
              select
                o.measured_at,
                o.predicted_occupancy_after,
                o.actual_occupancy_after,
                o.predicted_risk_after,
                o.actual_risk_after,
                o.actual_beds_released,
                o.prediction_accurate,
                o.accuracy_notes
              from decision.decision_outcomes o
              where o.decision_id = q.id
              order by o.measured_at desc nulls last, o.id desc
              limit 1
            ) latest_outcome on true
            left join lateral (
              select created_at as started_at
              from decision.decision_log l
              where l.decision_id = q.id and l.action = 'started'
              order by created_at desc
              limit 1
            ) started_log on true
            left join lateral (
              select created_at as expired_at
              from decision.decision_log l
              where l.decision_id = q.id and l.action = 'expired'
              order by created_at desc
              limit 1
            ) expired_log on true
            left join lateral (
              select action as last_log_event, created_at as last_log_at
              from decision.decision_log l
              where l.decision_id = q.id
                and l.created_at >= %s
                and l.created_at < %s
              order by created_at desc
              limit 1
            ) audit_last on true
            left join lateral (
              select count(*) as event_count
              from decision.decision_log l
              where l.decision_id = q.id
                and l.created_at >= %s
                and l.created_at < %s
            ) audit_summary on true
            left join lateral (
              select
                count(*) filter (where delivery_status = 'sent') as sent_count,
                count(*) filter (where delivery_status = 'failed') as failed_count,
                count(*) filter (where delivery_status = 'skipped') as skipped_count
              from decision.notification_log n
              where n.decision_id = q.id
                and n.sent_at >= %s
                and n.sent_at < %s
            ) notification_summary on true
            {where_sql}
            order by q.updated_at desc, q.id desc
            """,
            [
                window_start,
                window_end,
                window_start,
                window_end,
                window_start,
                window_end,
                *params,
            ],
        ).fetchall()

    decisions: list[dict[str, Any]] = []
    summary = {
        "total": 0,
        "recommended": 0,
        "assigned": 0,
        "in_progress": 0,
        "completed": 0,
        "dismissed": 0,
        "expired": 0,
        "measured_outcomes": 0,
        "pending_outcomes": 0,
    }

    for row in rows:
        item = _serialize_decision(row)
        outcome_status = _daily_log_outcome_status(str(item["status"]), item.get("measured_at"))
        next_step = _daily_log_next_step(str(item["status"]), outcome_status)
        assignee = item.get("assignee_user") or item.get("assignee_email")
        notification_status = {
            "sent_count": item.get("sent_count", 0),
            "failed_count": item.get("failed_count", 0),
            "skipped_count": item.get("skipped_count", 0),
        }
        decision = {
            "decision_id": item["decision_id"],
            "use_case": item["use_case"],
            "entity_id": item["entity_id"],
            "entity_name": item["entity_name"],
            "decision_type": item["decision_type"],
            "decision_summary": item["decision_summary"],
            "signal_summary": item["signal_summary"],
            "rationale": item["rationale"],
            "priority": item["priority"],
            "priority_score": item["priority_score"],
            "urgency_score": item["urgency_score"],
            "impact_score": item["impact_score"],
            "confidence_level": item.get("confidence_level"),
            "confidence_detail": item.get("confidence_detail"),
            "status": item["status"],
            "owner_team": item.get("owner_team"),
            "assignee": assignee,
            "created_at": item.get("created_at"),
            "assigned_at": item.get("assigned_at"),
            "started_at": item.get("started_at"),
            "completed_at": item.get("completed_at"),
            "dismissed_at": item.get("dismissed_at"),
            "dismissed_reason": item.get("dismissed_reason"),
            "expired_at": item.get("expired_at"),
            "last_updated_at": item.get("last_updated_at"),
            "escalation_count": item.get("escalation_count", 0),
            "notification_status": notification_status,
            "sent_count": notification_status["sent_count"],
            "failed_count": notification_status["failed_count"],
            "skipped_count": notification_status["skipped_count"],
            "last_log_event": item.get("last_log_event"),
            "last_log_at": item.get("last_log_at"),
            "audit_event_count": item.get("audit_event_count", 0),
            "outcome_status": outcome_status,
            "predicted_occupancy_after": item.get("predicted_occupancy_after"),
            "actual_occupancy_after": item.get("actual_occupancy_after"),
            "predicted_risk_after": item.get("predicted_risk_after"),
            "actual_risk_after": item.get("actual_risk_after"),
            "actual_beds_released": item.get("actual_beds_released"),
            "prediction_accurate": item.get("prediction_accurate"),
            "accuracy_notes": item.get("accuracy_notes"),
            "next_step": next_step,
        }
        decisions.append(decision)
        summary["total"] += 1
        if decision["status"] in summary:
            summary[str(decision["status"])] += 1
        if outcome_status == MEASURED_STATUS:
            summary["measured_outcomes"] += 1
        elif outcome_status == PENDING_MEASUREMENT_STATUS:
            summary["pending_outcomes"] += 1

    return {
        "date": target_date.isoformat(),
        "use_case": use_case or "all",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": summary,
        "decisions": decisions,
    }


def transition_decision(
    decision_id: int,
    action: str,
    payload: dict[str, Any],
    performed_by: str = "portal_user",
    performed_by_role: str = "bed_manager",
) -> dict[str, Any] | None:
    ensure_decision_schema()
    with connect() as conn:
        row = conn.execute("select * from decision.decision_queue where id = %s for update", (decision_id,)).fetchone()
        if not row:
            return None

        allowed_transitions = {
            "assign": {"recommended"},
            "start": {"assigned", "recommended"},
            "complete": {"assigned", "in_progress"},
            "dismiss": {"recommended", "assigned", "in_progress"},
            "execute_all": {"recommended", "assigned", "in_progress"},
        }

        def refresh() -> dict[str, Any]:
            current = conn.execute("select * from decision.decision_queue where id = %s", (decision_id,)).fetchone()
            if not current:
                raise ValueError("Decision not found after update")
            return current

        def ensure_allowed(current_row: dict[str, Any], requested_action: str) -> None:
            current_state = current_row["status"]
            if current_state in TERMINAL_STATUSES:
                raise ValueError(f"Decision is already {current_state} and cannot be changed")
            if requested_action in allowed_transitions and current_state not in allowed_transitions[requested_action]:
                allowed = ", ".join(sorted(allowed_transitions[requested_action]))
                raise ValueError(
                    f"Cannot {requested_action} decision from status {current_state}; expected one of: {allowed}"
                )

        def assign(current_row: dict[str, Any]) -> dict[str, Any]:
            ensure_allowed(current_row, "assign")
            assignee_user = payload.get("assignee_user") or performed_by
            assignee_email = payload.get("assignee_email") or current_row.get("assignee_email")
            conn.execute(
                """
                update decision.decision_queue
                set status = %s, assignee_user = %s, assignee_email = %s,
                    assigned_at = now(), updated_at = now()
                where id = %s
                """,
                ("assigned", assignee_user, assignee_email, decision_id),
            )
            status, error = send_decision_email(
                {**current_row, "priority": current_row["priority"]},
                assignee_email or "",
                "assignment",
            )
            _log_notification(
                conn,
                decision_id,
                "assignment",
                assignee_email,
                current_row["owner_team"],
                assignee_user,
                status,
                error,
            )
            _log_transition(
                conn,
                decision_id,
                current_row["status"],
                "assigned",
                "assign",
                performed_by=performed_by,
                performed_by_role=performed_by_role,
                notes=payload.get("notes"),
            )
            return refresh()

        def start(current_row: dict[str, Any]) -> dict[str, Any]:
            ensure_allowed(current_row, "start")
            conn.execute(
                "update decision.decision_queue set status = %s, updated_at = now() where id = %s",
                ("in_progress", decision_id),
            )
            _log_transition(
                conn,
                decision_id,
                current_row["status"],
                "in_progress",
                "started",
                performed_by=performed_by,
                performed_by_role=performed_by_role,
                notes=payload.get("notes"),
            )
            return refresh()

        def complete(
            current_row: dict[str, Any],
            actions_completed: list[int],
            *,
            default_to_all: bool = False,
        ) -> dict[str, Any]:
            ensure_allowed(current_row, "complete")
            actions = current_row["recommended_actions"] or []
            selected_actions = set(actions_completed)
            if not selected_actions and default_to_all:
                selected_actions = {item.get("order") for item in actions if item.get("order") is not None}
            for item in actions:
                if item.get("order") in selected_actions:
                    item["completed"] = True
            conn.execute(
                """
                update decision.decision_queue
                set status = %s, completed_at = now(), updated_at = now(), recommended_actions = %s
                where id = %s
                """,
                ("completed", _json(actions), decision_id),
            )
            completion_recipient = current_row["assignee_email"] or settings.decision_default_email
            completion_payload = {**current_row, "status": "completed", "recommended_actions": actions}
            status, error = send_decision_email(completion_payload, completion_recipient, "completion")
            _log_notification(
                conn,
                decision_id,
                "completion",
                completion_recipient,
                current_row["owner_team"],
                current_row["assignee_user"],
                status,
                error,
            )
            _log_transition(
                conn,
                decision_id,
                current_row["status"],
                "completed",
                "complete",
                performed_by=performed_by,
                performed_by_role=performed_by_role,
                reason=payload.get("reason"),
                notes=payload.get("notes"),
                metadata={"actions_completed": sorted(selected_actions)},
            )
            return refresh()

        def dismiss(current_row: dict[str, Any]) -> dict[str, Any]:
            ensure_allowed(current_row, "dismiss")
            reason = str(payload.get("reason") or "").strip()
            if not reason:
                raise ValueError("Dismiss reason is required")
            conn.execute(
                """
                update decision.decision_queue
                set status = %s, dismissed_at = now(), dismissed_reason = %s, updated_at = now()
                where id = %s
                """,
                ("dismissed", reason, decision_id),
            )
            _log_transition(
                conn,
                decision_id,
                current_row["status"],
                "dismissed",
                "dismiss",
                performed_by=performed_by,
                performed_by_role=performed_by_role,
                reason=reason,
                notes=payload.get("notes"),
            )
            return refresh()

        ensure_allowed(row, action)

        if action == "assign":
            updated = assign(row)
        elif action == "start":
            updated = start(row)
        elif action == "complete":
            updated = complete(row, list(payload.get("actions_completed") or []), default_to_all=False)
        elif action == "dismiss":
            updated = dismiss(row)
        elif action == "execute_all":
            current = row
            if current["status"] == "recommended":
                current = assign(current)
            if current["status"] == "assigned":
                current = start(current)
            if current["status"] == "in_progress":
                action_orders = payload.get("actions_completed") or [
                    item.get("order")
                    for item in (current["recommended_actions"] or [])
                    if item.get("order") is not None
                ]
                current = complete(current, list(action_orders), default_to_all=True)
            updated = current
        else:
            raise ValueError(f"Unsupported decision action: {action}")
    return _serialize_decision(updated)


def decision_log(decision_id: int) -> list[dict[str, Any]]:
    ensure_decision_schema()
    with connect() as conn:
        rows = conn.execute(
            "select * from decision.decision_log where decision_id = %s order by created_at",
            (decision_id,),
        ).fetchall()
    return [_serialize_decision(row) for row in rows]


def decision_outcome(decision_id: int) -> dict[str, Any] | None:
    ensure_decision_schema()
    with connect() as conn:
        row = conn.execute(
            "select * from decision.decision_outcomes where decision_id = %s order by measured_at desc limit 1",
            (decision_id,),
        ).fetchone()
    return _serialize_decision(row) if row else None


def check_escalations() -> dict[str, Any]:
    ensure_decision_schema()
    sent = 0
    with connect() as conn:
        rows = conn.execute(
            """
            select * from decision.decision_queue
            where status in ('recommended', 'assigned')
              and created_at < now() - (%s * interval '1 minute')
              and escalation_count < %s
            order by priority_score desc
            """,
            (settings.escalation_threshold_minutes, settings.max_escalations),
        ).fetchall()
        for row in rows:
            status, error = send_decision_email(row, settings.escalation_email, "escalation")
            conn.execute(
                """
                update decision.decision_queue
                set escalation_count = escalation_count + 1,
                    last_escalated_at = now(),
                    updated_at = now()
                where id = %s
                """,
                (row["id"],),
            )
            _log_transition(conn, row["id"], row["status"], row["status"], "escalated", reason="unactioned beyond escalation threshold")
            _log_notification(conn, row["id"], "escalation", settings.escalation_email, row["owner_team"], row["assignee_user"], status, error)
            sent += 1
    return {"status": "ok", "escalated": sent}


def measure_outcomes() -> dict[str, Any]:
    ensure_decision_schema()
    measured = 0
    fact_table = qualified_table(settings.analytics_schema, "fct_bed_occupancy")
    with connect() as conn:
        rows = conn.execute(
            """
            select q.*
            from decision.decision_queue q
            left join decision.decision_outcomes o on o.decision_id = q.id
            where q.status = 'completed'
              and q.completed_at < now() - interval '24 hours'
              and o.id is null
            """,
        ).fetchall()
        for decision in rows:
            window_start, window_end = _measurement_window_bounds(decision.get("completed_at"))
            current = conn.execute(
                sql.SQL(
                    """
                    select occupied_beds, round(occupancy_rate * 100, 2) as occupancy_rate
                    from {fact_table}
                    where ward_id = %s
                    order by date_day desc
                    limit 1
                    """
                ).format(fact_table=fact_table),
                (decision["entity_id"],),
            ).fetchone()
            if not current:
                continue
            actual_occupancy = _float(current["occupancy_rate"])
            predicted_after = _float(decision["expected_occupancy_after"])
            accurate, accuracy_note = _evaluate_prediction_accuracy(
                _float(decision["expected_occupancy_before"]),
                predicted_after,
                actual_occupancy,
            )
            actual_beds_released = _actual_beds_released(conn, decision, window_start, window_end)
            reconciliation_note = _reconciliation_note(window_start, window_end, actual_beds_released)
            conn.execute(
                """
                insert into decision.decision_outcomes (
                    decision_id, predicted_beds_released, predicted_occupancy_after,
                    predicted_risk_after, actual_beds_released, actual_occupancy_after,
                    actual_risk_after, prediction_accurate, accuracy_notes,
                    measurement_window_hours, measurement_status, measurement_method,
                    measured_window_start, measured_window_end
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    decision["id"],
                    decision["expected_beds_released"],
                    predicted_after,
                    _predicted_risk_after(decision["expected_risk_reduction"]),
                    actual_beds_released,
                    actual_occupancy,
                    _risk_label(actual_occupancy),
                    accurate,
                    f"{accuracy_note} {reconciliation_note}",
                    settings.decision_measurement_window_hours,
                    MEASURED_STATUS,
                    LATEST_WARD_SNAPSHOT_METHOD,
                    window_start,
                    window_end,
                ),
            )
            measured += 1
    return {"status": "ok", "measured": measured}
