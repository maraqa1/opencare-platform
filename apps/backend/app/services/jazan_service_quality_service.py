from __future__ import annotations

from copy import deepcopy
from typing import Any


BASE_ROUTE = "/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop"
DEFAULT_KPI_SLUG = "visual-distortion-closure-quality"
DEFAULT_CASE_ID = "JZN-DEC-1007"
SUPPORTED_TABS = ["overview", "intelligence", "decisions", "recovery"]

KPI_WORKSPACES: list[dict[str, Any]] = [
    {
        "slug": "visual-distortion-closure-quality",
        "short_label": "KPI 1",
        "name": "Visual distortion closure quality",
        "description": "Percentage of visual distortion cases closed at municipal SLA quality. Higher is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_visual_distortion_performance",
        "last_refresh": "2026-06-01",
        "current_value": "0.71",
        "target_value": "0.85",
        "status": "In breach",
        "status_tone": "critical",
        "delta": "-0.14 below",
        "owner": "Field Compliance",
        "cadence": "Monthly",
        "trigger": "Forecast risk 0.78 for 2 weeks",
        "summary_strip": [
            {"label": "Current score", "value": "0.71", "note": "Population-weighted latest month"},
            {"label": "Target", "value": "0.85", "note": "Strategic objective threshold"},
            {"label": "At-risk municipalities", "value": "4", "note": "Composite risk >= 70"},
            {"label": "Open cases", "value": "2", "note": "Human review required"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Sabya",
                "current": "0.71",
                "target": "0.85",
                "risk_score": "84",
                "breach_probability": "78%",
                "status": "In breach",
                "case_id": "JZN-DEC-1007",
            },
            {
                "municipality": "Abu Arish",
                "current": "0.62",
                "target": "0.85",
                "risk_score": "62",
                "breach_probability": "62%",
                "status": "Watch",
                "case_id": "JZN-DEC-1011",
            },
            {
                "municipality": "Samtah",
                "current": "0.48",
                "target": "0.85",
                "risk_score": "48",
                "breach_probability": "44%",
                "status": "Recovery",
                "case_id": "JZN-DEC-1015",
            },
            {
                "municipality": "Farasan",
                "current": "0.71",
                "target": "0.85",
                "risk_score": "71",
                "breach_probability": "65%",
                "status": "Watch",
                "case_id": "JZN-DEC-1018",
            },
        ],
        "trend": [
            {"label": "Jun", "actual": 0.82, "target": 0.85},
            {"label": "Jul", "actual": 0.8, "target": 0.85},
            {"label": "Aug", "actual": 0.76, "target": 0.85},
            {"label": "Sep", "actual": 0.71, "target": 0.85},
            {"label": "Oct", "forecast": 0.69, "target": 0.85},
            {"label": "Nov", "forecast": 0.66, "target": 0.85},
            {"label": "Dec", "forecast": 0.63, "target": 0.85},
        ],
        "open_cases": [
            {
                "case_id": "JZN-DEC-1007",
                "municipality": "Sabya",
                "reason": "Complaint cluster and repeat closures degrading below target.",
                "owner": "Field Compliance",
                "href": f"{BASE_ROUTE}/case/JZN-DEC-1007/overview?demo=1",
            },
            {
                "case_id": "JZN-DEC-1011",
                "municipality": "Abu Arish",
                "reason": "Forecast breach probability remains above 60% for four weeks.",
                "owner": "Services Agency",
                "href": f"{BASE_ROUTE}/case/JZN-DEC-1011/overview?demo=1",
            },
        ],
        "governance": [
            {"label": "Source", "value": "source_jazan.visual_distortion_cases"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_visual_distortion_performance"},
            {"label": "Output", "value": "output.jazan_municipality_service_risk_score"},
            {"label": "Freshness", "value": "8m old"},
        ],
    },
    {
        "slug": "service-request-closure-rate",
        "short_label": "KPI 2",
        "name": "Service request closure rate",
        "description": "Percentage of municipal service requests closed within SLA. Higher is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_service_quality",
        "last_refresh": "2026-06-01",
        "current_value": "0.92",
        "target_value": "0.90",
        "status": "Meeting target",
        "status_tone": "positive",
        "delta": "+0.02 above",
        "owner": "Services Agency",
        "cadence": "Monthly",
        "trigger": "SLA drift or backlog growth",
        "summary_strip": [
            {"label": "Current score", "value": "0.92", "note": "Latest validated month"},
            {"label": "Target", "value": "0.90", "note": "Strategic objective threshold"},
            {"label": "Watch municipalities", "value": "3", "note": "Trend softening"},
            {"label": "Open cases", "value": "1", "note": "Rebalance capacity"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Abu Arish",
                "current": "0.89",
                "target": "0.90",
                "risk_score": "62",
                "breach_probability": "62%",
                "status": "Watch",
                "case_id": "JZN-DEC-1011",
            },
            {
                "municipality": "Jazan",
                "current": "0.94",
                "target": "0.90",
                "risk_score": "22",
                "breach_probability": "18%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Sabya",
                "current": "0.91",
                "target": "0.90",
                "risk_score": "31",
                "breach_probability": "26%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Samtah",
                "current": "0.87",
                "target": "0.90",
                "risk_score": "58",
                "breach_probability": "54%",
                "status": "Approaching trigger",
                "case_id": "",
            },
        ],
        "trend": [
            {"label": "Jun", "actual": 0.95, "target": 0.90},
            {"label": "Jul", "actual": 0.94, "target": 0.90},
            {"label": "Aug", "actual": 0.93, "target": 0.90},
            {"label": "Sep", "actual": 0.92, "target": 0.90},
            {"label": "Oct", "forecast": 0.9, "target": 0.90},
            {"label": "Nov", "forecast": 0.89, "target": 0.90},
            {"label": "Dec", "forecast": 0.88, "target": 0.90},
        ],
        "open_cases": [
            {
                "case_id": "JZN-DEC-1011",
                "municipality": "Abu Arish",
                "reason": "Backlog and repeated SLA misses require field rebalance.",
                "owner": "Services Agency",
                "href": f"{BASE_ROUTE}/case/JZN-DEC-1011/overview?demo=1",
            }
        ],
        "governance": [
            {"label": "Source", "value": "source_jazan.service_requests"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_service_quality"},
            {"label": "Output", "value": "output.jazan_service_rnn_forecast"},
            {"label": "Freshness", "value": "8m old"},
        ],
    },
    {
        "slug": "average-permit-issuance-time",
        "short_label": "KPI 3",
        "name": "Average permit issuance time",
        "description": "Mean days from permit application to issuance. Lower is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_permit_performance",
        "last_refresh": "2026-06-01",
        "current_value": "6.4 days",
        "target_value": "<=5 days",
        "status": "Approaching trigger",
        "status_tone": "warning",
        "delta": "+1.4 over",
        "owner": "Permit Office",
        "cadence": "Monthly",
        "trigger": "5-day commercial or 14-day building permit threshold",
        "summary_strip": [
            {"label": "Current cycle", "value": "6.4d", "note": "Weighted across permit classes"},
            {"label": "Target", "value": "<=5d", "note": "Strategic objective threshold"},
            {"label": "At-risk municipalities", "value": "2", "note": "Permit delay clusters"},
            {"label": "Open cases", "value": "1", "note": "Permit backlog recovery"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Samtah",
                "current": "6.4d",
                "target": "<=5d",
                "risk_score": "48",
                "breach_probability": "44%",
                "status": "Approaching trigger",
                "case_id": "JZN-DEC-1015",
            },
            {
                "municipality": "Sabya",
                "current": "5.9d",
                "target": "<=5d",
                "risk_score": "41",
                "breach_probability": "35%",
                "status": "Watch",
                "case_id": "",
            },
            {
                "municipality": "Jazan",
                "current": "5.3d",
                "target": "<=5d",
                "risk_score": "33",
                "breach_probability": "29%",
                "status": "Watch",
                "case_id": "",
            },
            {
                "municipality": "Abu Arish",
                "current": "4.8d",
                "target": "<=5d",
                "risk_score": "19",
                "breach_probability": "15%",
                "status": "Healthy",
                "case_id": "",
            },
        ],
        "trend": [
            {"label": "Jun", "actual": 5.4, "target": 5.0},
            {"label": "Jul", "actual": 5.7, "target": 5.0},
            {"label": "Aug", "actual": 6.0, "target": 5.0},
            {"label": "Sep", "actual": 6.4, "target": 5.0},
            {"label": "Oct", "forecast": 6.1, "target": 5.0},
            {"label": "Nov", "forecast": 5.8, "target": 5.0},
            {"label": "Dec", "forecast": 5.4, "target": 5.0},
        ],
        "open_cases": [
            {
                "case_id": "JZN-DEC-1015",
                "municipality": "Samtah",
                "reason": "Permit backlog recovery sprint required before quarter close.",
                "owner": "Licensing Department",
                "href": f"{BASE_ROUTE}/case/JZN-DEC-1015/overview?demo=1",
            }
        ],
        "governance": [
            {"label": "Source", "value": "source_jazan.permit_requests"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_permit_performance"},
            {"label": "Output", "value": "output.jazan_permit_service_risk_score"},
            {"label": "Freshness", "value": "14m old"},
        ],
    },
    {
        "slug": "urban-service-coverage",
        "short_label": "KPI 4",
        "name": "Urban service coverage",
        "description": "Proportion of urban residents with active municipal service coverage. Higher is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_service_coverage",
        "last_refresh": "2026-06-01",
        "current_value": "0.96",
        "target_value": "0.95",
        "status": "Most target",
        "status_tone": "positive",
        "delta": "+0.01 above",
        "owner": "Planning Office",
        "cadence": "Monthly",
        "trigger": "Coverage drops in any zone",
        "summary_strip": [
            {"label": "Current score", "value": "0.96", "note": "Latest geographic rollup"},
            {"label": "Target", "value": "0.95", "note": "Strategic objective threshold"},
            {"label": "Watch municipalities", "value": "1", "note": "Remote zone access"},
            {"label": "Open cases", "value": "0", "note": "Healthy portfolio"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Jazan",
                "current": "0.97",
                "target": "0.95",
                "risk_score": "18",
                "breach_probability": "12%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Abu Arish",
                "current": "0.96",
                "target": "0.95",
                "risk_score": "24",
                "breach_probability": "18%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Sabya",
                "current": "0.95",
                "target": "0.95",
                "risk_score": "29",
                "breach_probability": "24%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Farasan",
                "current": "0.93",
                "target": "0.95",
                "risk_score": "44",
                "breach_probability": "39%",
                "status": "Watch",
                "case_id": "",
            },
        ],
        "trend": [
            {"label": "Jun", "actual": 0.94, "target": 0.95},
            {"label": "Jul", "actual": 0.95, "target": 0.95},
            {"label": "Aug", "actual": 0.96, "target": 0.95},
            {"label": "Sep", "actual": 0.96, "target": 0.95},
            {"label": "Oct", "forecast": 0.96, "target": 0.95},
        ],
        "open_cases": [],
        "governance": [
            {"label": "Source", "value": "source_jazan.service_coverage_assets"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_service_coverage"},
            {"label": "Output", "value": "output.jazan_service_coverage_health"},
            {"label": "Freshness", "value": "1d old"},
        ],
    },
    {
        "slug": "emergency-readiness",
        "short_label": "KPI 5",
        "name": "Emergency and resilience readiness",
        "description": "Composite readiness score for emergency response capacity. Higher is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_emergency_readiness",
        "last_refresh": "2026-06-01",
        "current_value": "0.82",
        "target_value": "0.80",
        "status": "Most target",
        "status_tone": "positive",
        "delta": "+0.02 above",
        "owner": "Civil Defence",
        "cadence": "Monthly",
        "trigger": "Any critical drill failure",
        "summary_strip": [
            {"label": "Current score", "value": "0.82", "note": "Weighted readiness assessment"},
            {"label": "Target", "value": "0.80", "note": "Strategic objective threshold"},
            {"label": "Watch municipalities", "value": "1", "note": "Remote response gap"},
            {"label": "Open cases", "value": "1", "note": "Exercise remediation"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Farasan",
                "current": "0.71",
                "target": "0.80",
                "risk_score": "71",
                "breach_probability": "65%",
                "status": "Watch",
                "case_id": "JZN-DEC-1018",
            },
            {
                "municipality": "Sabya",
                "current": "0.84",
                "target": "0.80",
                "risk_score": "28",
                "breach_probability": "20%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Jazan",
                "current": "0.82",
                "target": "0.80",
                "risk_score": "34",
                "breach_probability": "27%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Abu Arish",
                "current": "0.78",
                "target": "0.80",
                "risk_score": "46",
                "breach_probability": "41%",
                "status": "Approaching trigger",
                "case_id": "",
            },
        ],
        "trend": [
            {"label": "Jun", "actual": 0.78, "target": 0.80},
            {"label": "Jul", "actual": 0.79, "target": 0.80},
            {"label": "Aug", "actual": 0.81, "target": 0.80},
            {"label": "Sep", "actual": 0.82, "target": 0.80},
            {"label": "Oct", "forecast": 0.8, "target": 0.80},
        ],
        "open_cases": [
            {
                "case_id": "JZN-DEC-1018",
                "municipality": "Farasan",
                "reason": "Emergency drill gap needs action plan before next review.",
                "owner": "Civil Defence",
                "href": f"{BASE_ROUTE}/case/JZN-DEC-1018/overview?demo=1",
            }
        ],
        "governance": [
            {"label": "Source", "value": "source_jazan.emergency_readiness_checks"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_emergency_readiness"},
            {"label": "Output", "value": "output.jazan_emergency_risk_score"},
            {"label": "Freshness", "value": "3h old"},
        ],
    },
    {
        "slug": "citizen-satisfaction",
        "short_label": "KPI 6",
        "name": "Citizen satisfaction",
        "description": "Citizen satisfaction index from quarterly survey. Higher is better.",
        "calculation": "Computed monthly from",
        "source_asset": "analytics.fct_jazan_citizen_satisfaction",
        "last_refresh": "2026-06-01",
        "current_value": "0.78",
        "target_value": "0.75",
        "status": "Emerging",
        "status_tone": "positive",
        "delta": "+0.03 above",
        "owner": "Performance Office",
        "cadence": "Quarterly",
        "trigger": "Quarterly drop greater than 0.05",
        "summary_strip": [
            {"label": "Current score", "value": "0.78", "note": "Latest weighted satisfaction survey"},
            {"label": "Target", "value": "0.75", "note": "Strategic objective threshold"},
            {"label": "Watch municipalities", "value": "2", "note": "Feedback concentration"},
            {"label": "Open cases", "value": "0", "note": "No active workflow"},
        ],
        "municipality_ranking": [
            {
                "municipality": "Sabya",
                "current": "0.79",
                "target": "0.75",
                "risk_score": "22",
                "breach_probability": "18%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Jazan",
                "current": "0.78",
                "target": "0.75",
                "risk_score": "24",
                "breach_probability": "19%",
                "status": "Healthy",
                "case_id": "",
            },
            {
                "municipality": "Abu Arish",
                "current": "0.74",
                "target": "0.75",
                "risk_score": "39",
                "breach_probability": "34%",
                "status": "Watch",
                "case_id": "",
            },
            {
                "municipality": "Farasan",
                "current": "0.71",
                "target": "0.75",
                "risk_score": "48",
                "breach_probability": "43%",
                "status": "Approaching trigger",
                "case_id": "",
            },
        ],
        "trend": [
            {"label": "Q1", "actual": 0.73, "target": 0.75},
            {"label": "Q2", "actual": 0.76, "target": 0.75},
            {"label": "Q3", "actual": 0.78, "target": 0.75},
            {"label": "Q4", "forecast": 0.79, "target": 0.75},
        ],
        "open_cases": [],
        "governance": [
            {"label": "Source", "value": "source_jazan.citizen_satisfaction_surveys"},
            {"label": "Analytics mart", "value": "analytics.fct_jazan_citizen_satisfaction"},
            {"label": "Output", "value": "output.jazan_satisfaction_watchlist"},
            {"label": "Freshness", "value": "Quarterly"},
        ],
    },
]

CASE_WORKSPACES: list[dict[str, Any]] = [
    {
        "case_id": "JZN-DEC-1007",
        "kpi_slug": "visual-distortion-closure-quality",
        "kpi_name": "Visual distortion closure quality",
        "municipality": "Sabya",
        "status": "Awaiting review",
        "owner": "Field Compliance",
        "due_date": "09 Sep 2026",
        "risk_score": "84",
        "breach_probability": "0.78",
        "current_value": "0.71",
        "target_value": "0.85",
        "rationale": (
            "Sabya municipality is forecast to breach the visual distortion closure-quality target "
            "with a 4-week lead. Drivers are a complaint cluster, declining closure quality, "
            "and repeated unresolved recurrence."
        ),
        "overview_metrics": [
            {"label": "Current KPI", "value": "0.71", "note": "Target 0.85"},
            {"label": "Forecast breach", "value": "0.78", "note": "4-6 week horizon"},
            {"label": "Anomaly score", "value": "2.6", "note": "Complaint cluster severity"},
            {"label": "Risk score", "value": "84 / 100", "note": "Composite municipal risk"},
        ],
        "intelligence": {
            "feature_contributions": [
                {"label": "Forecast breach probability", "value": "32.0"},
                {"label": "Anomaly z-score", "value": "20.8"},
                {"label": "Complaint recurrence", "value": "13.7"},
                {"label": "Backlog growth", "value": "17.5"},
            ],
            "trend": [
                {"label": "Jun", "actual": 0.82, "target": 0.85},
                {"label": "Jul", "actual": 0.8, "target": 0.85},
                {"label": "Aug", "actual": 0.76, "target": 0.85},
                {"label": "Sep", "actual": 0.71, "target": 0.85},
                {"label": "Oct", "forecast": 0.7, "target": 0.85},
                {"label": "Nov", "forecast": 0.67, "target": 0.85},
                {"label": "Dec", "forecast": 0.63, "target": 0.85},
            ],
            "ranked_actions": [
                {"title": "Accelerated inspection cycle", "impact": "+0.14 recovery", "note": "29 days"},
                {"title": "Contractor performance audit", "impact": "+0.09 recovery", "note": "35 days"},
                {"title": "Mobile evidence app deployment", "impact": "+0.11 recovery", "note": "42 days"},
            ],
            "outputs": [
                "output.jazan_service_rnn_forecast",
                "output.jazan_service_quality_anomaly",
                "output.jazan_municipality_service_risk_score",
                "output.jazan_recommended_intervention",
            ],
        },
        "decisions": {
            "recommended_actions": [
                "Accelerated inspection cycle",
                "Contractor performance audit",
                "Mobile evidence app deployment",
            ],
            "evidence_pack": [
                {"label": "Forecast", "value": "0.78 breach probability"},
                {"label": "Anomaly", "value": "Complaint cluster +2.6"},
                {"label": "Runtime note", "value": "RNN forecast and anomaly outputs certified"},
                {"label": "Governance", "value": "Lineage, freshness, owner, classification visible"},
            ],
            "action_buttons": [
                {"id": "approve", "label": "Approve", "tone": "approve"},
                {"id": "request-revision", "label": "Request revision", "tone": "neutral"},
                {"id": "escalate", "label": "Escalate", "tone": "warning"},
                {"id": "create-ticket", "label": "Create ticket", "tone": "outline"},
                {"id": "email-owner", "label": "Email owner", "tone": "outline"},
            ],
            "human_authorisation_note": (
                "Every external action is human authorised, audit logged, and bilingual ready."
            ),
        },
        "recovery": {
            "baseline": "0.71",
            "target": "0.85",
            "after_30_days": "0.85",
            "forecast_accuracy": "High",
            "intervention_effectiveness": "High",
            "learning_pillars": [
                "Pillar 1 strategic alignment remains certified.",
                "Pillar 2 KPI governance thresholds held without reinterpretation.",
                "Pillar 4 recommendation history updated for similar municipalities.",
                "Pillar 6 knowledge transfer package prepared for repeat clusters.",
            ],
        },
    },
    {
        "case_id": "JZN-DEC-1011",
        "kpi_slug": "service-request-closure-rate",
        "kpi_name": "Service request closure rate",
        "municipality": "Abu Arish",
        "status": "Queued",
        "owner": "Services Agency",
        "due_date": "10 Sep 2026",
        "risk_score": "62",
        "breach_probability": "0.62",
        "current_value": "0.89",
        "target_value": "0.90",
        "rationale": "Backlog growth and slower field response are softening closure performance.",
        "overview_metrics": [
            {"label": "Current KPI", "value": "0.89", "note": "Target 0.90"},
            {"label": "Forecast breach", "value": "0.62", "note": "4-week horizon"},
            {"label": "Anomaly score", "value": "1.8", "note": "Backlog severity"},
            {"label": "Risk score", "value": "62 / 100", "note": "Moderate risk"},
        ],
        "intelligence": {
            "feature_contributions": [
                {"label": "Backlog growth", "value": "18.2"},
                {"label": "Route coverage variance", "value": "11.4"},
                {"label": "Repeat requests", "value": "9.8"},
                {"label": "Owner capacity", "value": "7.3"},
            ],
            "trend": [
                {"label": "Jun", "actual": 0.95, "target": 0.90},
                {"label": "Jul", "actual": 0.94, "target": 0.90},
                {"label": "Aug", "actual": 0.93, "target": 0.90},
                {"label": "Sep", "actual": 0.89, "target": 0.90},
                {"label": "Oct", "forecast": 0.89, "target": 0.90},
                {"label": "Nov", "forecast": 0.88, "target": 0.90},
            ],
            "ranked_actions": [
                {"title": "Rebalance field-response capacity", "impact": "+0.08 recovery", "note": "21 days"},
                {"title": "Permit-team cross-support", "impact": "+0.05 recovery", "note": "28 days"},
            ],
            "outputs": [
                "output.jazan_service_rnn_forecast",
                "output.jazan_service_quality_anomaly",
            ],
        },
        "decisions": {
            "recommended_actions": [
                "Rebalance field-response capacity",
                "Permit-team cross-support",
            ],
            "evidence_pack": [
                {"label": "Forecast", "value": "0.62 breach probability"},
                {"label": "Anomaly", "value": "Backlog softening +1.8"},
            ],
            "action_buttons": [
                {"id": "approve", "label": "Approve", "tone": "approve"},
                {"id": "request-revision", "label": "Request revision", "tone": "neutral"},
                {"id": "email-owner", "label": "Email owner", "tone": "outline"},
            ],
            "human_authorisation_note": (
                "Owner notification is human authorised before any external email is sent."
            ),
        },
        "recovery": {
            "baseline": "0.89",
            "target": "0.90",
            "after_30_days": "0.91",
            "forecast_accuracy": "Medium",
            "intervention_effectiveness": "Improving",
            "learning_pillars": [
                "Route balancing improves closure rhythm before SLA failure.",
                "Action templates now reference owner capacity by municipality.",
            ],
        },
    },
    {
        "case_id": "JZN-DEC-1015",
        "kpi_slug": "average-permit-issuance-time",
        "kpi_name": "Average permit issuance time",
        "municipality": "Samtah",
        "status": "Under review",
        "owner": "Licensing Department",
        "due_date": "11 Sep 2026",
        "risk_score": "48",
        "breach_probability": "0.44",
        "current_value": "6.4 days",
        "target_value": "<=5 days",
        "rationale": "Commercial permit backlog is nearing the review threshold for intervention.",
        "overview_metrics": [
            {"label": "Current KPI", "value": "6.4d", "note": "Target <=5d"},
            {"label": "Forecast breach", "value": "0.44", "note": "3-week horizon"},
            {"label": "Anomaly score", "value": "1.1", "note": "Queue pressure"},
            {"label": "Risk score", "value": "48 / 100", "note": "Advisory state"},
        ],
        "intelligence": {
            "feature_contributions": [
                {"label": "Commercial permit backlog", "value": "12.3"},
                {"label": "Review queue length", "value": "8.1"},
            ],
            "trend": [
                {"label": "Jun", "actual": 5.4, "target": 5.0},
                {"label": "Jul", "actual": 5.7, "target": 5.0},
                {"label": "Aug", "actual": 6.0, "target": 5.0},
                {"label": "Sep", "actual": 6.4, "target": 5.0},
                {"label": "Oct", "forecast": 6.1, "target": 5.0},
            ],
            "ranked_actions": [
                {"title": "Permit backlog recovery sprint", "impact": "-0.8d", "note": "14 days"},
            ],
            "outputs": [
                "output.jazan_permit_service_risk_score",
            ],
        },
        "decisions": {
            "recommended_actions": ["Permit backlog recovery sprint"],
            "evidence_pack": [{"label": "Forecast", "value": "0.44 breach probability"}],
            "action_buttons": [
                {"id": "approve", "label": "Approve", "tone": "approve"},
                {"id": "request-revision", "label": "Request revision", "tone": "neutral"},
            ],
            "human_authorisation_note": "Advisory action remains human authorised before execution.",
        },
        "recovery": {
            "baseline": "6.4d",
            "target": "<=5d",
            "after_30_days": "5.2d",
            "forecast_accuracy": "Medium",
            "intervention_effectiveness": "Moderate",
            "learning_pillars": [
                "Permit backlog recovery should be templated for quarterly peaks.",
            ],
        },
    },
    {
        "case_id": "JZN-DEC-1018",
        "kpi_slug": "emergency-readiness",
        "kpi_name": "Emergency and resilience readiness",
        "municipality": "Farasan",
        "status": "Queued",
        "owner": "Civil Defence",
        "due_date": "12 Sep 2026",
        "risk_score": "71",
        "breach_probability": "0.65",
        "current_value": "0.71",
        "target_value": "0.80",
        "rationale": "Drill performance and equipment readiness point to an intervention need.",
        "overview_metrics": [
            {"label": "Current KPI", "value": "0.71", "note": "Target 0.80"},
            {"label": "Forecast breach", "value": "0.65", "note": "5-week horizon"},
            {"label": "Anomaly score", "value": "1.9", "note": "Remote response gap"},
            {"label": "Risk score", "value": "71 / 100", "note": "High watch"},
        ],
        "intelligence": {
            "feature_contributions": [
                {"label": "Drill failure recurrence", "value": "16.2"},
                {"label": "Equipment readiness", "value": "12.5"},
            ],
            "trend": [
                {"label": "Jun", "actual": 0.78, "target": 0.80},
                {"label": "Jul", "actual": 0.79, "target": 0.80},
                {"label": "Aug", "actual": 0.74, "target": 0.80},
                {"label": "Sep", "actual": 0.71, "target": 0.80},
                {"label": "Oct", "forecast": 0.72, "target": 0.80},
            ],
            "ranked_actions": [
                {"title": "Emergency drill action plan", "impact": "+0.07 recovery", "note": "30 days"},
            ],
            "outputs": [
                "output.jazan_emergency_risk_score",
            ],
        },
        "decisions": {
            "recommended_actions": ["Emergency drill action plan"],
            "evidence_pack": [{"label": "Forecast", "value": "0.65 breach probability"}],
            "action_buttons": [
                {"id": "approve", "label": "Approve", "tone": "approve"},
                {"id": "escalate", "label": "Escalate", "tone": "warning"},
            ],
            "human_authorisation_note": "Escalation remains blocked until a human reviewer confirms it.",
        },
        "recovery": {
            "baseline": "0.71",
            "target": "0.80",
            "after_30_days": "0.77",
            "forecast_accuracy": "Medium",
            "intervention_effectiveness": "In progress",
            "learning_pillars": [
                "Remote emergency-readiness cases need municipality owner directory coverage.",
            ],
        },
    },
]

STRATEGIC_DASHBOARD: dict[str, Any] = {
    "eyebrow": "01 Strategic objective cascade",
    "title": "Sustain and improve municipal service quality and visual distortion response",
    "subtitle": "One objective, six governed KPIs, and a dashboard-rigid story from monitoring to audit.",
    "objective_context": [
        "Vision 2030 Quality of Life",
        "MOMRAH municipal index",
        "25 municipalities and 1.6M residents",
    ],
    "summary_strip": [
        {"label": "Meeting target", "value": "5"},
        {"label": "Approaching trigger", "value": "1"},
        {"label": "In breach", "value": "1"},
        {"label": "Decision candidates", "value": "4"},
    ],
    "golden_thread": [
        "Strategic objective",
        "KPI contract",
        "Certified data",
        "Predict and recommend",
        "Human-authorised action",
        "Audit and learn",
    ],
    "kpi_cards": [
        {
            "slug": workspace["slug"],
            "short_label": workspace["short_label"],
            "name": workspace["name"],
            "status": workspace["status"],
            "status_tone": workspace["status_tone"],
            "current_value": workspace["current_value"],
            "target_value": workspace["target_value"],
            "delta": workspace["delta"],
            "owner": workspace["owner"],
            "cadence": workspace["cadence"],
            "trigger": workspace["trigger"],
            "href": f"{BASE_ROUTE}/kpi/{workspace['slug']}?demo=1",
        }
        for workspace in KPI_WORKSPACES
    ],
    "active_case_banner": {
        "case_id": "JZN-DEC-1007",
        "municipality": "Sabya",
        "kpi": "Visual distortion closure quality",
        "risk_score": "84 / 100",
        "breach_probability": "0.78",
        "summary": "Decision candidate awaiting review after complaint-cluster anomaly and forecast breach.",
        "href": f"{BASE_ROUTE}/case/JZN-DEC-1007/overview?demo=1",
    },
}

DECISION_QUEUE_ROWS = [
    {
        "decision_id": "JZN-DEC-1007",
        "municipality": "Sabya",
        "kpi": "Visual distortion closure quality",
        "risk_score": "84",
        "breach_probability": "78%",
        "recommendation": "Accelerated inspection cycle",
        "owner": "Field Compliance",
        "status": "Awaiting review",
        "due_date": "09 Sep 2026",
    },
    {
        "decision_id": "JZN-DEC-1011",
        "municipality": "Abu Arish",
        "kpi": "Service request closure rate",
        "risk_score": "62",
        "breach_probability": "62%",
        "recommendation": "Rebalance field-response capacity",
        "owner": "Services Agency",
        "status": "Queued",
        "due_date": "10 Sep 2026",
    },
    {
        "decision_id": "JZN-DEC-1015",
        "municipality": "Samtah",
        "kpi": "Average permit issuance time",
        "risk_score": "48",
        "breach_probability": "44%",
        "recommendation": "Permit backlog recovery sprint",
        "owner": "Licensing Department",
        "status": "Under review",
        "due_date": "11 Sep 2026",
    },
    {
        "decision_id": "JZN-DEC-1018",
        "municipality": "Farasan",
        "kpi": "Emergency and resilience readiness",
        "risk_score": "71",
        "breach_probability": "65%",
        "recommendation": "Emergency drill action plan",
        "owner": "Civil Defence",
        "status": "Queued",
        "due_date": "12 Sep 2026",
    },
]

SHELL_DATA: dict[str, Any] = {
    "meta": {
        "use_case": "jazan_urban_service_quality_visual_distortion_loop",
        "mode": "seeded",
        "connected": False,
        "source": "platform_seed",
        "message": (
            "Dashboard-rigid golden bundle implemented as a seeded native shell while "
            "real source integrations are still being wired."
        ),
    },
    "navigation": {
        "base_route": BASE_ROUTE,
        "default_kpi_slug": DEFAULT_KPI_SLUG,
        "default_case_id": DEFAULT_CASE_ID,
        "supported_tabs": SUPPORTED_TABS,
    },
    "purpose": {
        "eyebrow": "Jazan Performance Management",
        "title": "Urban Service Quality & Visual Distortion Loop",
        "description": (
            "A governed, seeded shell that preserves the bundle's six-dashboard story from "
            "strategic monitoring through KPI workspace, case intelligence, decision command, "
            "runtime evidence, and action audit."
        ),
    },
    "strategic_dashboard": STRATEGIC_DASHBOARD,
    "kpi_workspaces": KPI_WORKSPACES,
    "case_workspaces": CASE_WORKSPACES,
    "decision_command": {
        "counters": [
            {"label": "New decisions", "value": "7"},
            {"label": "Under review", "value": "5"},
            {"label": "Approved", "value": "9"},
            {"label": "Escalated", "value": "2"},
            {"label": "Tickets created", "value": "4"},
            {"label": "Emails sent", "value": "6"},
        ],
        "queue": DECISION_QUEUE_ROWS,
        "selected_case_id": DEFAULT_CASE_ID,
        "action_buttons": [
            {"id": "approve", "label": "Approve", "tone": "approve", "note": "Create corrective action"},
            {"id": "request-revision", "label": "Request revision", "tone": "neutral", "note": "Return to owner"},
            {"id": "escalate", "label": "Escalate", "tone": "warning", "note": "Escalate with approval"},
            {"id": "create-ticket", "label": "Create ticket", "tone": "outline", "note": "Requires human authorisation"},
            {"id": "email-owner", "label": "Email owner", "tone": "outline", "note": "SMTP workflow evidence logged"},
        ],
        "human_authorisation_note": (
            "Every external action is human authorised, audit logged, and bilingual ready."
        ),
    },
    "runtime_evidence": {
        "status": "3 / 3 online",
        "seed_note": "Demo data - seeded",
        "runtime_cards": [
            {
                "runtime_id": "rt_jazan_service_rnn_forecast",
                "name": "Jazan Service Quality RNN Forecast",
                "model_family": "RNN forecast",
                "status": "online",
                "last_run": "07 Sep 06:14",
                "duration": "4m 18s",
                "rows_out": "1,247",
                "next_run": "08 Sep 00:00",
                "note": "Healthy execution window across the last seven runs.",
                "image": "ghcr.io/opencare/runtimes/jazan-service-rnn:1.0.0",
                "inputs": [
                    "analytics.fct_jazan_service_quality",
                    "analytics.fct_jazan_visual_distortion_performance",
                ],
                "outputs": [
                    "output.jazan_service_rnn_forecast",
                ],
                "last_seven_runs": [
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                ],
                "hitl": False,
            },
            {
                "runtime_id": "rt_jazan_service_anomaly",
                "name": "Jazan Service Quality Anomaly Detector",
                "model_family": "Anomaly detector",
                "status": "online",
                "last_run": "07 Sep 06:18",
                "duration": "1m 47s",
                "rows_out": "312",
                "next_run": "08 Sep 00:10",
                "note": "Healthy execution window across the last seven runs.",
                "image": "ghcr.io/opencare/runtimes/jazan-anomaly:1.0.0",
                "inputs": [
                    "analytics.fct_jazan_service_quality",
                    "analytics.fct_jazan_visual_distortion_performance",
                ],
                "outputs": [
                    "output.jazan_service_quality_anomaly",
                ],
                "last_seven_runs": [
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                ],
                "hitl": False,
            },
            {
                "runtime_id": "rt_jazan_decision_candidate",
                "name": "Jazan Decision Candidate Generator",
                "model_family": "Decision candidate",
                "status": "online",
                "last_run": "07 Sep 06:22",
                "duration": "0m 38s",
                "rows_out": "8",
                "next_run": "08 Sep 00:20",
                "note": "Apr 2026 retry_succeeded remains visible as honest degraded history.",
                "image": "ghcr.io/opencare/runtimes/jazan-decision-candidate:1.0.0",
                "inputs": [
                    "output.jazan_service_rnn_forecast",
                    "output.jazan_service_quality_anomaly",
                ],
                "outputs": [
                    "decision.jazan_generated_service_decisions",
                    "decision.jazan_service_quality_action_queue",
                ],
                "last_seven_runs": [
                    "succeeded",
                    "succeeded",
                    "degraded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                    "succeeded",
                ],
                "hitl": True,
            },
        ],
        "execution_history": [
            {"runtime": "RNN forecast", "started_at": "07 Sep 06:14", "status": "success", "duration": "4m 18s"},
            {"runtime": "Anomaly detector", "started_at": "07 Sep 06:18", "status": "success", "duration": "1m 47s"},
            {"runtime": "Decision generator", "started_at": "07 Sep 06:22", "status": "success", "duration": "0m 38s"},
        ],
        "lineage_flow": [
            "source",
            "raw",
            "staging",
            "analytics",
            "output",
            "decision",
            "dashboard",
        ],
        "evidence_note": "Runtime evidence remains seeded but structurally aligned to the bundle.",
    },
    "decision_action_audit": {
        "counters": [
            {"label": "New decisions", "value": "7"},
            {"label": "Under review", "value": "5"},
            {"label": "Approved", "value": "9"},
            {"label": "Escalated", "value": "2"},
            {"label": "Actions in progress", "value": "12"},
            {"label": "Actions closed", "value": "18"},
        ],
        "queue": DECISION_QUEUE_ROWS,
        "action_history": [
            {
                "time": "07 Sep 06:24",
                "actor": "Performance Office",
                "action": "Approved decision",
                "channel": "Portal",
                "result": "Success",
                "created_record": "decision.approved/JZN-DEC-1007",
                "linked_decision_id": "JZN-DEC-1007",
            },
            {
                "time": "07 Sep 06:31",
                "actor": "System",
                "action": "Created corrective action",
                "channel": "Workflow",
                "result": "Success",
                "created_record": "action.lifecycle/ACT-0001",
                "linked_decision_id": "JZN-DEC-1007",
            },
            {
                "time": "07 Sep 06:42",
                "actor": "Field Compliance",
                "action": "Sent owner notification",
                "channel": "Email",
                "result": "Sent",
                "created_record": "notification.outbox/NOTIF-0042",
                "linked_decision_id": "JZN-DEC-1007",
            },
        ],
        "email_log": [
            {
                "notification_id": "NOTIF-0042",
                "recipient": "Field Compliance Owner",
                "recipient_role": "Field Compliance",
                "subject": "Visual distortion closure quality risk alert",
                "template": "visual_distortion_closure_risk",
                "status": "Sent",
                "sent_at": "07 Sep 06:42",
                "linked_decision_id": "JZN-DEC-1007",
            }
        ],
        "ticket_log": [
            {
                "system": "Service Desk",
                "ticket_id": "TCK-0045",
                "priority": "High",
                "status": "Open",
                "linked_case": "JZN-DEC-1007",
                "external_ticket_ref": "SD-2026-0045",
                "linked_action_id": "ACT-0001",
            }
        ],
        "corrective_actions": [
            {
                "action_id": "ACT-0001",
                "decision_id": "JZN-DEC-1007",
                "action_plan": "Accelerated inspection cycle",
                "owner": "Field Compliance",
                "status": "In progress",
                "due_in": "+14d",
                "evidence_status": "Pending",
                "next_step": "Submit evidence",
            },
            {
                "action_id": "ACT-0002",
                "decision_id": "JZN-DEC-1011",
                "action_plan": "Rebalance field-response capacity",
                "owner": "Services Agency",
                "status": "Queued",
                "due_in": "+10d",
                "evidence_status": "Not due",
                "next_step": "Await approval",
            },
        ],
        "audit_note": (
            "Audit data is seeded but preserves human-authorised email, ticket, and corrective-action traces."
        ),
    },
    "governance_evidence": {
        "lineage_flow": [
            "source -> raw -> staging -> analytics -> output -> decision -> dashboard",
        ],
        "datasets": [
            {
                "asset": "analytics.fct_jazan_visual_distortion_performance",
                "classification": "Restricted",
                "owner": "Field Compliance",
                "freshness": "8m old",
                "lineage": "source -> raw -> staging -> analytics",
            },
            {
                "asset": "analytics.fct_jazan_service_quality",
                "classification": "Internal",
                "owner": "Services Agency",
                "freshness": "8m old",
                "lineage": "source -> raw -> staging -> analytics",
            },
            {
                "asset": "output.jazan_service_rnn_forecast",
                "classification": "Internal model output",
                "owner": "Forecast Runtime",
                "freshness": "Fresh",
                "lineage": "analytics -> output -> decision",
            },
            {
                "asset": "decision.jazan_generated_service_decisions",
                "classification": "Restricted",
                "owner": "Decision Engine",
                "freshness": "Audited",
                "lineage": "output -> decision -> dashboard",
            },
        ],
        "quality_checks": [
            "Column descriptions present for KPI marts and decision tables.",
            "Ownership and stewardship defined for every governed asset.",
            "Freshness badges reflect seeded runtime timestamps.",
            "Classification rules preserved across analytics, outputs, and decision layers.",
        ],
        "evidence_packs": [
            {
                "name": "KPI definition pack",
                "contents": "Formulas, targets, owners, source mappings",
            },
            {
                "name": "Runtime evidence pack",
                "contents": "RNN run, anomaly run, scored rows, output tables",
            },
            {
                "name": "Decision audit pack",
                "contents": "Human approval, emails, tickets, corrective actions",
            },
            {
                "name": "Outcome learning pack",
                "contents": "Before and after results, forecast accuracy, recommendation effectiveness",
            },
        ],
    },
}

SHELL_DATA["overview"] = SHELL_DATA["strategic_dashboard"]
SHELL_DATA["kpi_contract"] = KPI_WORKSPACES[0]
SHELL_DATA["case_workspace"] = CASE_WORKSPACES[0]
SHELL_DATA["decision_queue"] = SHELL_DATA["decision_command"]
SHELL_DATA["outcome_feedback"] = CASE_WORKSPACES[0]["recovery"]


def _payload(section: str | None = None) -> dict[str, Any]:
    if section is None:
        return deepcopy(SHELL_DATA)

    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        section: deepcopy(SHELL_DATA[section]),
    }


def shell_payload() -> dict[str, Any]:
    return _payload()


def overview_payload() -> dict[str, Any]:
    return _payload("overview")


def kpi_contract_payload() -> dict[str, Any]:
    return _payload("kpi_contract")


def kpi_workspace_payload() -> dict[str, Any]:
    return _payload("kpi_workspaces")


def case_workspace_payload() -> dict[str, Any]:
    return _payload("case_workspaces")


def case_overview_payload(case_id: str) -> dict[str, Any]:
    case = _find_case_workspace(case_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "case_overview": deepcopy(case),
    }


def decision_command_payload() -> dict[str, Any]:
    return _payload("decision_command")


def runtime_evidence_payload() -> dict[str, Any]:
    return _payload("runtime_evidence")


def decision_queue_payload() -> dict[str, Any]:
    return _payload("decision_queue")


def outcome_feedback_payload() -> dict[str, Any]:
    return _payload("outcome_feedback")


def decision_action_audit_payload() -> dict[str, Any]:
    return _payload("decision_action_audit")


def governance_evidence_payload() -> dict[str, Any]:
    return _payload("governance_evidence")


def _find_case_workspace(case_id: str) -> dict[str, Any]:
    for case in CASE_WORKSPACES:
        if case["case_id"] == case_id:
            return deepcopy(case)
    raise KeyError(case_id)


def _find_decision_row(decision_id: str) -> dict[str, Any]:
    for row in DECISION_QUEUE_ROWS:
        if row["decision_id"] == decision_id:
            return deepcopy(row)
    raise KeyError(decision_id)


def case_intelligence_payload(case_id: str) -> dict[str, Any]:
    case = _find_case_workspace(case_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "case_intelligence": {
            "case_id": case["case_id"],
            "municipality": case["municipality"],
            "kpi_id": case["kpi_slug"],
            "risk_score": case["risk_score"],
            "forecast_breach_probability": case["breach_probability"],
            "composite_score": case["risk_score"],
            "feature_contributions": deepcopy(case["intelligence"]["feature_contributions"]),
            "forecast": {
                "series": deepcopy(case["intelligence"]["trend"]),
                "target": case["target_value"],
            },
            "anomaly": {
                "z_score": case["overview_metrics"][2]["value"],
                "signal_type": case["overview_metrics"][2]["note"],
                "detected_at": "07 Sep 06:18",
            },
            "recommendations": deepcopy(case["intelligence"]["ranked_actions"]),
            "decision": {
                "decision_id": case["case_id"],
                "status": case["status"],
                "recommended_action": case["decisions"]["recommended_actions"][0],
            },
        },
    }


def case_decision_payload(case_id: str) -> dict[str, Any]:
    case = _find_case_workspace(case_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "case_decision": {
            "case_id": case["case_id"],
            "municipality": case["municipality"],
            "kpi_id": case["kpi_slug"],
            "risk_score": case["risk_score"],
            "decision_status": case["status"],
            "rationale": case["rationale"],
            "recommended_actions": deepcopy(case["decisions"]["recommended_actions"]),
            "evidence_pack": deepcopy(case["decisions"]["evidence_pack"]),
            "action_buttons": deepcopy(case["decisions"]["action_buttons"]),
            "human_authorisation_note": case["decisions"]["human_authorisation_note"],
        },
    }


def case_recovery_payload(case_id: str) -> dict[str, Any]:
    case = _find_case_workspace(case_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "case_recovery": {
            "case_id": case["case_id"],
            "status": case["status"],
            **deepcopy(case["recovery"]),
        },
    }


def decision_summary_payload() -> dict[str, Any]:
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "decision_summary": deepcopy(SHELL_DATA["decision_command"]["counters"]),
    }


def decision_detail_payload(decision_id: str) -> dict[str, Any]:
    row = _find_decision_row(decision_id)
    case = _find_case_workspace(decision_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "decision_detail": {
            **row,
            "rationale": case["rationale"],
            "recommended_actions": deepcopy(case["decisions"]["recommended_actions"]),
            "action_buttons": deepcopy(case["decisions"]["action_buttons"]),
            "human_authorisation_note": case["decisions"]["human_authorisation_note"],
        },
    }


def runtime_history_payload(runtime_id: str) -> dict[str, Any]:
    runtime = next(
        (card for card in SHELL_DATA["runtime_evidence"]["runtime_cards"] if card["runtime_id"] == runtime_id),
        None,
    )
    if runtime is None:
        raise KeyError(runtime_id)
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "runtime_history": {
            "runtime_id": runtime_id,
            "last_seven_runs": deepcopy(runtime["last_seven_runs"]),
            "note": runtime["note"],
        },
    }


def audit_events_payload() -> dict[str, Any]:
    return {"meta": deepcopy(SHELL_DATA["meta"]), "events": deepcopy(SHELL_DATA["decision_action_audit"]["action_history"])}


def audit_emails_payload() -> dict[str, Any]:
    return {"meta": deepcopy(SHELL_DATA["meta"]), "emails": deepcopy(SHELL_DATA["decision_action_audit"]["email_log"])}


def audit_tickets_payload() -> dict[str, Any]:
    return {"meta": deepcopy(SHELL_DATA["meta"]), "tickets": deepcopy(SHELL_DATA["decision_action_audit"]["ticket_log"])}


def audit_corrective_actions_payload() -> dict[str, Any]:
    return {
        "meta": deepcopy(SHELL_DATA["meta"]),
        "corrective_actions": deepcopy(SHELL_DATA["decision_action_audit"]["corrective_actions"]),
    }
