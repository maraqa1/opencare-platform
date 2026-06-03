from __future__ import annotations

import csv
import random
from datetime import date, datetime, timedelta
from pathlib import Path

SEED = 1812
OUTPUT_DIR = Path(__file__).resolve().parent / "generated"
BREACH_MUNICIPALITIES = {"M003", "M007", "M011"}
RECOVERY_MUNICIPALITIES = {"M003", "M007"}
KPI_IDS = [
    "KPI-VDQ-01",
    "KPI-SRC-02",
    "KPI-PIT-03",
    "KPI-USC-04",
    "KPI-ERR-05",
    "KPI-CSI-06",
]
RUNTIME_IDS = [
    "rt_jazan_service_rnn_forecast",
    "rt_jazan_service_anomaly",
    "rt_jazan_decision_candidate",
]


def month_starts(start: date, count: int) -> list[date]:
    months = []
    y, m = start.year, start.month
    for _ in range(count):
        months.append(date(y, m, 1))
        m += 1
        if m == 13:
            m = 1
            y += 1
    return months


def write_csv(name: str, rows: list[dict]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / name
    if not rows:
        raise ValueError(f"refusing to write empty CSV: {name}")
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def safe_ratio(numerator: float, denominator: float) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def state_for(value: float, target: float, threshold: float, direction: str) -> str:
    if direction == "higher_is_better":
        if value >= target:
            return "meeting"
        if value >= threshold:
            return "approaching"
        return "breach"
    if value <= target:
        return "meeting"
    if value <= threshold:
        return "approaching"
    return "breach"


def build_demo() -> None:
    rng = random.Random(SEED)
    months = month_starts(date(2025, 1, 1), 18)

    municipalities = []
    municipality_owners = []
    service_requests = []
    visual_cases = []
    permit_requests = []
    coverage_assets = []
    emergency_checks = []
    satisfaction_surveys = []
    kpi_results = []

    decisions = []
    corrective_actions = []
    action_lifecycle = []
    decision_action_events = []
    notification_outbox = []
    email_delivery_log = []
    ticket_requests = []
    recovery_outcomes = []
    runtime_executions = []
    intervention_history = []

    decision_counter = 1000
    action_counter = 2000
    lifecycle_counter = 3000
    event_counter = 4000
    notification_counter = 5000
    email_counter = 6000
    ticket_counter = 7000
    recovery_counter = 8000
    intervention_counter = 9000

    for idx in range(1, 26):
        municipality_id = f"M{idx:03d}"
        population = 48000 + idx * 6200
        municipalities.append(
            {
                "municipality_id": municipality_id,
                "municipality_name": f"Municipality {idx:02d}",
                "archetype": "urban" if idx % 3 == 0 else "mixed",
                "population": population,
            }
        )
        municipality_owners.append(
            {
                "municipality_owner_id": f"OWN-{idx:03d}",
                "municipality_id": municipality_id,
                "owner_role": "field_compliance" if idx % 2 else "services_agency",
                "owner_display_label": f"Owner {idx:02d}",
                "notification_channel": "email",
                "active_flag": "true",
                "email_address": f"owner{idx:02d}@example.org",
            }
        )

        for month_index, month_start in enumerate(months, start=1):
            breach_multiplier = 1 if municipality_id in BREACH_MUNICIPALITIES and month_index >= 15 else 0
            recovery_multiplier = 1 if municipality_id in RECOVERY_MUNICIPALITIES and month_index >= 17 else 0

            requests_received = 70 + idx + month_index
            requests_rejected = 4 + (idx % 3)
            requests_within_sla = requests_received - requests_rejected - 5 - breach_multiplier * 10 + recovery_multiplier * 6
            requests_completed = requests_received - requests_rejected - 2
            reopen_rate = 0.05 + (idx % 4) * 0.01 + breach_multiplier * 0.03 - recovery_multiplier * 0.02
            satisfaction = round(0.78 - breach_multiplier * 0.08 + recovery_multiplier * 0.05 - (idx % 5) * 0.005, 3)
            closure_rate = safe_ratio(requests_within_sla, requests_received - requests_rejected)

            case_id = f"CASE-{municipality_id}-{month_start:%Y%m}"
            cases_closed = 12 + (idx % 5)
            cases_meeting_quality = cases_closed - 2 - breach_multiplier * 3 + recovery_multiplier * 2
            vdq = safe_ratio(cases_meeting_quality, cases_closed)

            permit_days = round(5.4 + (idx % 4) * 0.3 + breach_multiplier * 1.8 - recovery_multiplier * 0.7, 2)
            coverage_rate = round(0.95 - breach_multiplier * 0.05 + recovery_multiplier * 0.03 - (idx % 3) * 0.003, 3)
            readiness = round(0.82 - breach_multiplier * 0.08 + recovery_multiplier * 0.04 - (idx % 4) * 0.004, 3)
            satisfaction_index = round(0.77 - breach_multiplier * 0.06 + recovery_multiplier * 0.03 - (idx % 6) * 0.003, 3)

            service_requests.append(
                {
                    "service_request_id": f"SR-{municipality_id}-{month_start:%Y%m}",
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "created_at": datetime.combine(month_start, datetime.min.time()).isoformat(),
                    "completed_at": datetime.combine(month_start + timedelta(days=14), datetime.min.time()).isoformat(),
                    "requests_received": requests_received,
                    "requests_rejected": requests_rejected,
                    "requests_completed_within_sla": requests_within_sla,
                    "requests_completed": requests_completed,
                    "reopen_rate": round(reopen_rate, 3),
                    "avg_request_satisfaction_score": satisfaction,
                }
            )
            visual_cases.append(
                {
                    "case_id": case_id,
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "opened_at": datetime.combine(month_start + timedelta(days=2), datetime.min.time()).isoformat(),
                    "closed_at": datetime.combine(month_start + timedelta(days=18), datetime.min.time()).isoformat(),
                    "cases_closed": cases_closed,
                    "cases_meeting_quality_bar": cases_meeting_quality,
                    "case_priority": "high" if breach_multiplier else "normal",
                    "quality_bar_met": "true" if vdq >= 0.85 else "false",
                }
            )
            permit_requests.append(
                {
                    "permit_request_id": f"PR-{municipality_id}-{month_start:%Y%m}",
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "submission_date": month_start.isoformat(),
                    "approval_date": (month_start + timedelta(days=int(permit_days))).isoformat(),
                    "avg_permit_issuance_days": permit_days,
                }
            )
            coverage_assets.append(
                {
                    "asset_record_id": f"COV-{municipality_id}-{month_start:%Y%m}",
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "covered_population": int(population * coverage_rate),
                    "total_population": population,
                }
            )
            emergency_checks.append(
                {
                    "check_id": f"ER-{municipality_id}-{month_start:%Y%m}",
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "checks_completed": 12 + (idx % 3),
                    "drill_pass_rate": round(readiness, 3),
                    "recovery_time_adherence": round(readiness - 0.02, 3),
                }
            )
            satisfaction_surveys.append(
                {
                    "survey_id": f"CS-{municipality_id}-{month_start:%Y%m}",
                    "municipality_id": municipality_id,
                    "month_start_date": month_start.isoformat(),
                    "survey_score": satisfaction_index,
                    "respondent_weight": population,
                }
            )

            kpi_definitions = [
                ("KPI-VDQ-01", vdq, 0.85, 0.75, "higher_is_better"),
                ("KPI-SRC-02", closure_rate, 0.90, 0.85, "higher_is_better"),
                ("KPI-PIT-03", permit_days, 5.0, 7.0, "lower_is_better"),
                ("KPI-USC-04", coverage_rate, 0.95, 0.93, "higher_is_better"),
                ("KPI-ERR-05", readiness, 0.80, 0.75, "higher_is_better"),
                ("KPI-CSI-06", satisfaction_index, 0.75, 0.70, "higher_is_better"),
            ]
            for kpi_id, value, target, threshold, direction in kpi_definitions:
                kpi_results.append(
                    {
                        "kpi_result_id": f"KR-{municipality_id}-{kpi_id}-{month_start:%Y%m}",
                        "municipality_id": municipality_id,
                        "kpi_id": kpi_id,
                        "month_start_date": month_start.isoformat(),
                        "current_value": round(value, 4),
                        "target": target,
                        "threshold": threshold,
                        "state": state_for(value, target, threshold, direction),
                    }
                )

                if month_index >= 17 and municipality_id in BREACH_MUNICIPALITIES and kpi_id in {"KPI-VDQ-01", "KPI-SRC-02"}:
                    decision_counter += 1
                    action_counter += 1
                    lifecycle_counter += 1
                    decision_id = f"DEC-{decision_counter}"
                    action_id = f"ACT-{action_counter}"
                    lifecycle_id = f"AL-{lifecycle_counter}"
                    generated_at = datetime.combine(month_start + timedelta(days=20), datetime.min.time())
                    decision_status = "approved" if municipality_id in RECOVERY_MUNICIPALITIES else "under_review"
                    recommended_action = {
                        "M003": "create_ticket",
                        "M007": "approve_decision",
                        "M011": "email_owner",
                    }.get(municipality_id, "escalate_decision")

                    decisions.append(
                        {
                            "decision_id": decision_id,
                            "municipality_id": municipality_id,
                            "kpi_id": kpi_id,
                            "case_id": case_id,
                            "generated_at": generated_at.isoformat(),
                            "recommended_action": recommended_action,
                            "owner_role": "field_compliance",
                            "status": decision_status,
                        }
                    )
                    corrective_actions.append(
                        {
                            "action_id": action_id,
                            "decision_id": decision_id,
                            "case_id": case_id,
                            "municipality_id": municipality_id,
                            "action_type": recommended_action,
                            "owner_role": "field_compliance",
                            "created_at": generated_at.isoformat(),
                        }
                    )

                    notification_id = f"NOT-{notification_counter}" if recommended_action in {"email_owner", "create_ticket", "escalate_decision"} else ""
                    ticket_id = f"TCK-{ticket_counter}" if recommended_action == "create_ticket" else ""
                    recovery_id = f"REC-{recovery_counter}" if municipality_id in RECOVERY_MUNICIPALITIES and month_index == 18 else ""
                    current_state = "closed" if recovery_id else ("fired" if recommended_action in {"email_owner", "escalate_decision"} else "in_progress")
                    action_lifecycle.append(
                        {
                            "action_lifecycle_id": lifecycle_id,
                            "decision_id": decision_id,
                            "action_id": action_id,
                            "action_type": recommended_action,
                            "action_channel": "email" if recommended_action in {"email_owner", "escalate_decision"} else ("ticket" if recommended_action == "create_ticket" else "portal"),
                            "triggered_by": "runtime_service",
                            "authorized_by": "reviewer_01",
                            "owner_role": "field_compliance",
                            "owner_lookup_ref": f"OWN-{idx:03d}",
                            "current_state": current_state,
                            "previous_state": "authorised",
                            "fired_at": (generated_at + timedelta(hours=2)).isoformat(),
                            "acknowledged_at": (generated_at + timedelta(hours=6)).isoformat(),
                            "due_at": (generated_at + timedelta(days=14)).isoformat(),
                            "resolved_at": (generated_at + timedelta(days=21)).isoformat() if recovery_id else "",
                            "sla_status": "within_sla",
                            "escalation_level": 1 if recommended_action == "escalate_decision" else 0,
                            "external_reference_id": ticket_id or notification_id or f"EXT-{decision_counter}",
                            "notification_id": notification_id,
                            "ticket_id": ticket_id,
                            "audit_event_id": f"EVT-{event_counter + 3}",
                            "evidence_pack_id": f"EP-{decision_counter}",
                            "recovery_outcome_id": recovery_id,
                            "created_at": generated_at.isoformat(),
                            "updated_at": (generated_at + timedelta(days=1)).isoformat(),
                        }
                    )

                    lifecycle_events = [
                        ("generated", generated_at),
                        ("authorised", generated_at + timedelta(hours=1)),
                        ("fired", generated_at + timedelta(hours=2)),
                    ]
                    if recovery_id:
                        lifecycle_events.extend(
                            [
                                ("evidence_submitted", generated_at + timedelta(days=10)),
                                ("verified", generated_at + timedelta(days=15)),
                                ("closed", generated_at + timedelta(days=21)),
                            ]
                        )
                    else:
                        lifecycle_events.append(("in_progress", generated_at + timedelta(days=3)))
                    previous = ""
                    for state, event_ts in lifecycle_events:
                        event_counter += 1
                        decision_action_events.append(
                            {
                                "decision_event_id": f"EVT-{event_counter}",
                                "action_lifecycle_id": lifecycle_id,
                                "decision_id": decision_id,
                                "action_id": action_id,
                                "action_type": recommended_action,
                                "action_channel": "email" if recommended_action in {"email_owner", "escalate_decision"} else ("ticket" if recommended_action == "create_ticket" else "portal"),
                                "previous_state": previous,
                                "current_state": state,
                                "actor_id": "reviewer_01",
                                "actor_role": "performance_office",
                                "human_authorised": "true",
                                "external_reference_id": ticket_id or notification_id or f"EXT-{decision_counter}",
                                "notification_id": notification_id,
                                "ticket_id": ticket_id,
                                "evidence_pack_id": f"EP-{decision_counter}",
                                "recovery_outcome_id": recovery_id,
                                "event_ts": event_ts.isoformat(),
                                "audit_event": f"decision.{recommended_action}.{state}",
                            }
                        )
                        previous = state

                    if notification_id:
                        notification_counter += 1
                        notification_outbox.append(
                            {
                                "notification_id": notification_id,
                                "action_lifecycle_id": lifecycle_id,
                                "decision_id": decision_id,
                                "action_id": action_id,
                                "municipality_id": municipality_id,
                                "channel": "email",
                                "recipient_role": "field_compliance",
                                "created_at": (generated_at + timedelta(hours=2)).isoformat(),
                            }
                        )
                        email_counter += 1
                        email_delivery_log.append(
                            {
                                "email_delivery_id": f"EML-{email_counter}",
                                "notification_id": notification_id,
                                "attempted_at": (generated_at + timedelta(hours=2, minutes=15)).isoformat(),
                                "delivery_status": "sent",
                            }
                        )

                    if ticket_id:
                        ticket_counter += 1
                        ticket_requests.append(
                            {
                                "ticket_request_id": ticket_id,
                                "decision_id": decision_id,
                                "action_id": action_id,
                                "municipality_id": municipality_id,
                                "created_at": (generated_at + timedelta(hours=2)).isoformat(),
                                "external_reference_id": f"MAKEEN-{decision_counter}",
                                "ticket_status": "open" if not recovery_id else "closed",
                            }
                        )

                    if recovery_id:
                        recovery_counter += 1
                        recovery_outcomes.append(
                            {
                                "recovery_outcome_id": recovery_id,
                                "case_id": case_id,
                                "action_id": action_id,
                                "municipality_id": municipality_id,
                                "resolved_at": (generated_at + timedelta(days=21)).isoformat(),
                                "recovered_flag": "true",
                                "current_value_after_recovery": round(0.88 if kpi_id == "KPI-VDQ-01" else 0.91, 4),
                            }
                        )

                    intervention_counter += 1
                    intervention_history.append(
                        {
                            "intervention_id": f"INT-{intervention_counter}",
                            "action_id": action_id,
                            "decision_id": decision_id,
                            "municipality_id": municipality_id,
                            "recorded_at": (generated_at + timedelta(days=22)).isoformat(),
                            "effectiveness_score": round(0.82 if recovery_id else 0.61, 3),
                        }
                    )

    for runtime_id in RUNTIME_IDS:
        for month_start in months:
            runtime_executions.append(
                {
                    "runtime_execution_id": f"RTX-{runtime_id.split('_')[-1]}-{month_start:%Y%m}",
                    "runtime_id": runtime_id,
                    "execution_date": month_start.isoformat(),
                    "status": "retry_succeeded" if runtime_id == "rt_jazan_decision_candidate" and month_start.month == 4 else "succeeded",
                    "degraded_flag": "true" if runtime_id == "rt_jazan_decision_candidate" and month_start.month == 4 else "false",
                }
            )

    write_csv("municipalities.csv", municipalities)
    write_csv("municipality_owners.csv", municipality_owners)
    write_csv("service_requests.csv", service_requests)
    write_csv("visual_distortion_cases.csv", visual_cases)
    write_csv("permit_requests.csv", permit_requests)
    write_csv("service_coverage_assets.csv", coverage_assets)
    write_csv("emergency_readiness_checks.csv", emergency_checks)
    write_csv("citizen_satisfaction_surveys.csv", satisfaction_surveys)
    write_csv("kpi_results.csv", kpi_results)
    write_csv("generated_service_decisions.csv", decisions)
    write_csv("corrective_actions.csv", corrective_actions)
    write_csv("action_lifecycle.csv", action_lifecycle)
    write_csv("decision_action_events.csv", decision_action_events)
    write_csv("notification_outbox.csv", notification_outbox)
    write_csv("email_delivery_log.csv", email_delivery_log)
    write_csv("ticket_requests.csv", ticket_requests)
    write_csv("recovery_outcomes.csv", recovery_outcomes)
    write_csv("runtime_executions.csv", runtime_executions)
    write_csv("intervention_history.csv", intervention_history)


if __name__ == "__main__":
    build_demo()
