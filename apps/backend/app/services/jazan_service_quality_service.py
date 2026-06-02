from __future__ import annotations

from copy import deepcopy
from typing import Any


SHELL_DATA: dict[str, Any] = {
    "meta": {
        "use_case": "jazan_urban_service_quality_visual_distortion_loop",
        "mode": "seeded",
        "connected": False,
        "source": "platform_seed",
        "message": "First native shell slice seeded from the golden bundle contract while platform data connections are still being wired.",
    },
    "purpose": {
        "eyebrow": "Purpose",
        "title": "Full golden thread from strategy to recovery",
        "description": (
            "This use case connects KPI contracts, certified data, RNN forecast outputs, anomaly detection, "
            "transparent risk scoring, recommendation lookup, controlled decision buttons, corrective-action closure, "
            "and learning feedback."
        ),
    },
    "active_case": {
        "municipality": "Samtah",
        "risk_score": "84 / 100",
        "breach_probability": "78%",
        "stage": "Evidence",
        "owner": "Field Compliance",
        "due": "+5 days",
    },
    "overview": {
        "demo_metrics": [
            ["Municipalities covered", "25 / 25", "all linked to service-quality objective"],
            ["Visual closure quality", "82%", "watch · target >= 90%"],
            ["Breach probability", "78%", "RNN forecast · 4-week horizon"],
            ["Open corrective actions", "14", "8 municipalities"],
        ],
        "golden_thread_labels": [
            "Strategic objective",
            "KPI contract",
            "Certified data",
            "Predict & recommend",
            "Track",
            "Improve",
        ],
        "status_value": "94%",
        "headline_kpis": [
            ["Closure Quality", "100%", "Target >=90%"],
            ["Permit Time", "1.2 days", "Target <=1.4"],
            ["Coverage", "96%", "Target >=95%"],
            ["Readiness", "97%", "Target >=90%"],
            ["Satisfaction", "4.2 / 5", "Target >=4.0"],
        ],
        "top_risk": {
            "municipality": "Municipality 13",
            "status": "High risk",
            "risk_score": "84 / 100",
            "breach_probability": "78%",
        },
        "recommended_intervention": {
            "title": "Field-response rebalancing + SLA escalation + repeat-zone prioritization.",
            "similar_cases": "3",
            "expected_lift": "+9 to +13 pp",
            "decision_href": "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/decision-action-tracker?demo=1&decision=JZN-DEC-1011",
        },
        "action_summary": ["Approved 7", "In progress 12", "Evidence 3", "Closed 18"],
        "evidence_groups": [
            ["Sources", "source_jazan.visual_distortion_cases", "source_jazan.service_requests", "source_jazan.permit_requests", "source_jazan.municipalities"],
            ["Analytics marts", "analytics.fct_jazan_visual_distortion_performance", "analytics.fct_jazan_service_quality", "analytics.fct_jazan_corrective_action"],
            ["Outputs", "output.jazan_service_rnn_forecast", "output.jazan_service_quality_anomaly", "output.jazan_municipality_service_risk_score"],
            ["Decision tables", "decision.jazan_generated_service_decisions", "decision.jazan_service_quality_action_queue", "decision.jazan_visual_distortion_recovery_outcome"],
            ["APIs", "GET /api/v1/jazan/service-quality/overview", "GET /api/v1/jazan/service-quality/decision-queue", "GET /api/v1/jazan/service-quality/runtime-evidence"],
        ],
    },
    "kpi_contract": {
        "objective_title": "Sustain and improve municipal service quality and visual-distortion response",
        "objective_stats": [
            ["Municipalities", "25 / 25"],
            ["KPIs", "6"],
            ["Data sources", "9"],
            ["Alignment", "100%"],
        ],
        "kpi_rows": [
            ["Visual distortion closure quality", "valid closed / total * 100", ">=90%", "100%", "On track", "Field Compliance", "visual_distortion_cases"],
            ["Average permit issuance time", "avg issued - submitted", "<=1.4d", "1.2d", "On track", "Licensing", "permit_requests"],
            ["Urban service coverage", "covered / total * 100", ">=95%", "96%", "On track", "Services Agency", "service_coverage_assets"],
            ["Emergency readiness", "weighted readiness score", ">=90%", "97%", "On track", "Emergency Team", "readiness_checks"],
            ["Citizen satisfaction", "average score", ">=4.0", "4.2", "On track", "Service Quality", "surveys"],
            ["Service request closure rate", "closed / total * 100", ">=90%", "91%", "On track", "Services Agency", "service_requests"],
        ],
        "monitor_cards": [
            ["Visual distortion closure quality", "100%", ">=90%", "On track", "No action"],
            ["Service request closure rate", "91%", ">=90%", "On track", "Monitor"],
            ["Average permit issuance time", "1.2d", "<=1.4d", "On track", "No action"],
            ["Urban service coverage", "96%", ">=95%", "On track", "No action"],
            ["Emergency readiness", "97%", ">=90%", "On track", "No action"],
            ["Citizen satisfaction", "4.2/5", ">=4.0", "On track", "Monitor"],
        ],
        "trigger_rules": [
            ["KPI breach", "Current below target", "Create decision candidate", "Pillar 5"],
            ["Forecast breach", "RNN predicts target miss within 4 weeks", "Queue advisory action", "Pillar 4 -> 5"],
            ["Anomaly", "z-score exceeds threshold", "Request review", "Pillar 4"],
            ["Repeated gap", "Same municipality at risk twice", "Training / sustainability need", "Pillar 6"],
        ],
    },
    "runtime_evidence": {
        "lineage_labels": ["source systems", "staging", "analytics mart", "model outputs", "decision layer"],
        "high_risk_municipality": {
            "name": "Municipality 13",
            "status": "High risk",
            "risk_score": "84 / 100",
            "breach_probability": "78%",
            "driver": "Top driver: visual distortion closure quality and repeated complaints.",
        },
        "forecast_series": [
            ["Week 0", 82, 90],
            ["Week 1", 80, 90],
            ["Week 2", 76, 90],
            ["Week 3", 72, 90],
            ["Week 4", 68, 90],
        ],
        "model_cards": [
            {
                "key": "rnn-forecast",
                "title": "RNN Forecast",
                "value": "78% breach probability",
                "note": "GRU/LSTM sequence runtime forecasts target breach within 4 weeks.",
                "output": "output.jazan_service_rnn_forecast",
            },
            {
                "key": "anomaly-detection",
                "title": "Anomaly Detection",
                "value": "+23% deviation",
                "note": "Resolution time and complaint volume are above local historical baseline.",
                "output": "output.jazan_service_quality_anomaly",
            },
            {
                "key": "composite-risk",
                "title": "Composite Risk Score",
                "value": "84 / 100 high risk",
                "note": "Weighted model combining forecast, anomaly, backlog, SLA, and complaints.",
                "output": "output.jazan_municipality_service_risk_score",
            },
            {
                "key": "recommendation-lookup",
                "title": "Recommendation Lookup",
                "value": "Field-response rebalancing",
                "note": "Similarity lookup finds recovered cases and proposes advisory actions.",
                "output": "output.jazan_recommended_intervention",
            },
        ],
        "runtime_runs": [
            ["RNN forecast", "12 May 2025 02:00", "300", "Success"],
            ["Anomaly detector", "12 May 2025 02:10", "42", "Success"],
        ],
    },
    "decision_queue": {
        "stats": [
            ["New decisions", "7"],
            ["Under review", "5"],
            ["Approved", "9"],
            ["In progress", "12"],
            ["Overdue", "3"],
            ["Escalated", "2"],
        ],
        "action_buttons": ["Approve", "Request Revision", "Escalate", "Create Ticket", "Email Owner"],
        "cases": [
            {
                "id": "JZN-DEC-1007",
                "municipality": "Samtah",
                "risk": "Visual distortion complaints",
                "probability": "78%",
                "action": "Joint inspection sweep + owner notification",
                "owner": "Field Compliance",
                "due": "+5 days",
                "status": "Evidence pending",
                "stage": "Evidence",
                "evidence": [
                    ["Complaint anomaly", "Citizen complaints +287% over 14 days - 47 reports vs baseline 12.", "z = +3.2"],
                    ["Backlog forecast", "Complaint backlog projected to breach 30-day SLA in 21 days without action.", "LSTM runtime"],
                    ["Composite risk", "42 / 100 - Moderate: complaint surge, cluster concentration, property-owner non-response.", "dbt mart"],
                    ["Recommendation", "Joint inspection sweep and property-owner notification under municipal compliance code.", "similarity lookup"],
                ],
                "log": [
                    "Auto-triggered by early-warning complaint-anomaly detector.",
                    "Property-owner notifications dispatched.",
                    "Evidence package submitted to verification queue.",
                ],
            },
            {
                "id": "JZN-DEC-1011",
                "municipality": "Sabya",
                "risk": "Service closure delay",
                "probability": "84%",
                "action": "Rebalance field-response capacity",
                "owner": "Services Agency",
                "due": "+23 days",
                "status": "In progress",
                "stage": "In progress",
                "evidence": [
                    ["Forecast", "78% probability of missing closure-rate target within 4 weeks.", "RNN runtime"],
                    ["Anomaly", "Resolution time +23% above Sabya baseline.", "z = +2.4"],
                    ["Composite risk", "84 / 100 - High: forecast 78%, anomaly +2.4, backlog +18%, SLA -8pp.", "dbt mart"],
                    ["Recommendation", "Field-response rebalancing and SLA escalation protocol.", "advisory"],
                ],
                "log": [
                    "Auto-triggered by early-warning composite risk score.",
                    "Weekly review approved intervention.",
                    "Services Agency activated field-response protocol.",
                ],
            },
        ],
    },
    "outcome_feedback": {
        "stats": [
            ["Total actions", "12"],
            ["In progress", "6"],
            ["Awaiting evidence", "2"],
            ["Verified", "2"],
            ["Closed", "2"],
            ["Avg improvement", "+10.2 pp"],
        ],
        "recovery_rows": [
            ["Visual distortion closure quality", "82%", ">=90%", "91%", "Recovered", "+9 pp"],
            ["Service request closure rate", "68%", ">=90%", "88%", "Improving", "+20 pp"],
            ["Average permit issuance time", "2.4d", "<=1.4d", "1.6d", "Watch", "-0.8d"],
            ["Citizen satisfaction", "3.7 / 5", ">=4.0", "4.2 / 5", "Recovered", "+0.5"],
        ],
        "forecast_accuracy": "78%",
        "recommendation_effectiveness": "+10 pp",
        "similar_cases": "3",
        "learning_feedback": [
            "Pillar 1: Objective remains certified",
            "Pillar 4: Recommendation history updated",
            "Pillar 5: Decision log records recovery",
            "Pillar 6: Training need generated if repeated",
        ],
    },
    "governance_evidence": {
        "rows": [
            ["visual_distortion_cases", "Restricted", "Field Compliance", "DQ pass", "source -> raw -> staging -> analytics -> output -> decision"],
            ["service_requests", "Internal", "Services Agency", "DQ watch", "source -> raw -> staging -> analytics.fct_jazan_service_quality"],
            ["jazan_service_rnn_forecast", "Internal model output", "Forecast Runtime", "Fresh", "analytics features -> RNN output -> decision candidate"],
            ["jazan_generated_service_decisions", "Restricted", "Decision Engine", "Audited", "model outputs -> human approval -> action queue"],
        ],
        "exports": [
            ["KPI definition pack", "Formulas, targets, owners, source mappings"],
            ["Runtime evidence pack", "RNN run, anomaly run, scored rows, output tables"],
            ["Decision audit pack", "Human approval, actions, ticket/email outbox, decision log"],
            ["Outcome learning pack", "Before/after results, forecast accuracy, recommendation effectiveness"],
        ],
    },
}


def _payload(section: str | None = None) -> dict[str, Any]:
    if section is None:
        return deepcopy(SHELL_DATA)

    payload = deepcopy(SHELL_DATA.get(section, {}))
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        section: payload,
    }


def shell_payload() -> dict[str, Any]:
    return _payload()


def overview_payload() -> dict[str, Any]:
    return _payload("overview")


def kpi_contract_payload() -> dict[str, Any]:
    return _payload("kpi_contract")


def runtime_evidence_payload() -> dict[str, Any]:
    return _payload("runtime_evidence")


def decision_queue_payload() -> dict[str, Any]:
    return _payload("decision_queue")


def outcome_feedback_payload() -> dict[str, Any]:
    return _payload("outcome_feedback")


def governance_evidence_payload() -> dict[str, Any]:
    return _payload("governance_evidence")
