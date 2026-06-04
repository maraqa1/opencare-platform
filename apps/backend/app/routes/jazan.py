from fastapi import APIRouter, HTTPException

import app.services.jazan_service_quality_service as jazan_service_quality_service

router = APIRouter(prefix="/api/v1/jazan", tags=["jazan"])

MUNICIPALITIES = [
    "Jazan",
    "Sabya",
    "Abu Arish",
    "Samtah",
    "Ahad Al Masarihah",
    "Al Aridhah",
    "Al Dayer",
    "Al Darb",
    "Al Edabi",
    "Al Harth",
    "Al Reeth",
    "Baysh",
    "Damad",
    "Farasan",
    "Fifa",
    "Harub",
    "Baish",
    "Al Shuqaiq",
    "Al Tuwal",
    "Mizhirah",
    "Wadi Jazan",
    "Al Haqu",
    "Al Tawal",
    "Al Madaya",
    "Seasonal Services Municipality",
]

PILLARS = [
    {
        "id": "strategic-alignment-objective-cascade",
        "number": 1,
        "title": "Strategic Alignment & Objective Cascade",
        "tone": "blue",
        "bullets": [
            "Vision 2030 / ministry / Amanah alignment",
            "Objective cascade to agencies and municipalities",
            "Initiative linkage to strategic outcomes",
            "Alignment matrix and coverage tracking",
        ],
        "primary_kpi": {"label": "Alignment coverage", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/strategic-alignment-objective-cascade",
    },
    {
        "id": "kpi-performance-governance",
        "number": 2,
        "title": "KPI & Performance Governance",
        "tone": "teal",
        "bullets": [
            "KPI dictionary and formulas",
            "Baselines, targets, thresholds",
            "KPI owners and data owners",
            "Adaa-aligned performance scorecards",
        ],
        "primary_kpi": {"label": "KPI dictionary completeness", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/kpi-performance-governance",
    },
    {
        "id": "data-analytics-dashboards",
        "number": 3,
        "title": "Data, Analytics & Dashboards",
        "tone": "green",
        "bullets": [
            "Unified performance data sources",
            "Executive and operational dashboards",
            "Strategic / monthly / quarterly reports",
            "Data quality, freshness, and lineage",
        ],
        "primary_kpi": {"label": "Certified dashboard coverage", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/data-analytics-dashboards",
    },
    {
        "id": "municipal-project-early-warning",
        "number": 4,
        "title": "Municipal & Project Early Warning",
        "tone": "cyan",
        "bullets": [
            "Municipality risk ranking",
            "Project delay prediction",
            "Revenue decline warning",
            "Service and visual distortion alerts",
        ],
        "primary_kpi": {"label": "High-risk projects with action plans", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/municipal-project-early-warning",
    },
    {
        "id": "decision-rhythm-corrective-actions",
        "number": 5,
        "title": "Decision Rhythm & Corrective Actions",
        "tone": "purple",
        "bullets": [
            "Weekly / monthly / quarterly reviews",
            "Deviation and root-cause analysis",
            "Corrective-action queue",
            "Escalation and decision log",
        ],
        "primary_kpi": {"label": "Corrective-action closure rate", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/decision-rhythm-corrective-actions",
    },
    {
        "id": "quality-knowledge-transfer-sustainability",
        "number": 6,
        "title": "Quality, Knowledge Transfer & Sustainability",
        "tone": "orange",
        "bullets": [
            "Quality and excellence procedures",
            "Gap analysis and improvement plans",
            "Training and on-the-job coaching",
            "Handover and sustainability evidence",
        ],
        "primary_kpi": {"label": "Training completion", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/quality-knowledge-transfer-sustainability",
    },
]

OVERVIEW = {
    "region": "Jazan Region",
    "platform": "Performance Management Platform",
    "vision": (
        "A unified performance management ecosystem that drives strategic alignment, "
        "data-driven decisions, accountability, and measurable impact for Jazan Region."
    ),
    "stakeholders": [
        {"title": "Decision Makers", "coverage": ["Mayor / Secretary", "Deputies", "Steering Committee"]},
        {
            "title": "Performance Owners",
            "coverage": ["Agency leaders", "Department heads", "KPI owners", "Initiative owners"],
        },
        {
            "title": "Municipality Network",
            "coverage": ["25 linked municipalities", "Municipality coordinators", "Field operations teams"],
            "municipalities": MUNICIPALITIES,
        },
        {
            "title": "Enablement Teams",
            "coverage": ["PMO", "Data and analytics", "IT and digital", "Quality and excellence", "Finance and investment"],
        },
        {
            "title": "External Interfaces",
            "coverage": ["Ministry", "National entities", "Vendors and contractors", "Auditors and regulators"],
        },
    ],
    "foundation_enablers": [
        "PMO & Governance",
        "Data Governance",
        "Change Management",
        "Communications",
        "Capability Building",
        "Risk & Compliance",
        "Smart Technology & Tools",
        "Integration & Security",
    ],
    "governance": {
        "top": "Steering Committee",
        "description": "Strategic oversight and decisions",
        "boxes": [
            "PMO / Performance Office",
            "Performance Owners",
            "Data & Analytics",
            "Municipality Coordinators",
            "Quality & Excellence",
        ],
    },
    "success_measures": [
        {"label": "KPI dictionary completeness", "value": "100%"},
        {"label": "Municipality scorecard coverage", "value": "25 / 25"},
        {"label": "Timely monthly reports", "value": ">95%"},
        {"label": "Data freshness SLA", "value": ">90%"},
        {"label": "High-risk projects with action plans", "value": "100%"},
        {"label": "Corrective-action closure rate", "value": ">85%"},
        {"label": "Training completion", "value": ">90%"},
    ],
}


@router.get("/overview")
def overview() -> dict[str, object]:
    return OVERVIEW


@router.get("/pillars")
def pillars() -> dict[str, object]:
    return {"pillars": PILLARS}


@router.get("/pillars/{pillar_id}")
def pillar_detail(pillar_id: str) -> dict[str, object]:
    for pillar in PILLARS:
        if pillar["id"] == pillar_id:
            return {"pillar": pillar}
    raise HTTPException(status_code=404, detail="Jazan pillar not found")


@router.get("/service-quality/shell")
def service_quality_shell() -> dict[str, object]:
    return jazan_service_quality_service.shell_payload()


@router.get("/service-quality/overview")
def service_quality_overview() -> dict[str, object]:
    return jazan_service_quality_service.overview_payload()


@router.get("/service-quality/kpi-contract")
def service_quality_kpi_contract() -> dict[str, object]:
    return jazan_service_quality_service.kpi_contract_payload()


@router.get("/service-quality/kpi-workspace")
def service_quality_kpi_workspace() -> dict[str, object]:
    return jazan_service_quality_service.kpi_workspace_payload()


@router.get("/service-quality/case-workspace")
def service_quality_case_workspace() -> dict[str, object]:
    return jazan_service_quality_service.case_workspace_payload()


@router.get("/service-quality/cases/{case_id}/overview")
def service_quality_case_overview(case_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.case_overview_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan case not found") from exc


@router.get("/service-quality/cases/{case_id}/intelligence")
def service_quality_case_intelligence(case_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.case_intelligence_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan case not found") from exc


@router.get("/service-quality/cases/{case_id}/decision")
def service_quality_case_decision(case_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.case_decision_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan case not found") from exc


@router.get("/service-quality/cases/{case_id}/recovery")
def service_quality_case_recovery(case_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.case_recovery_payload(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan case not found") from exc


@router.get("/service-quality/decision-command")
def service_quality_decision_command() -> dict[str, object]:
    return jazan_service_quality_service.decision_command_payload()


@router.get("/service-quality/decisions/summary")
def service_quality_decision_summary() -> dict[str, object]:
    return jazan_service_quality_service.decision_summary_payload()


@router.get("/service-quality/decisions/{decision_id}")
def service_quality_decision_detail(decision_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.decision_detail_payload(decision_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan decision not found") from exc


@router.get("/service-quality/runtime-evidence")
def service_quality_runtime_evidence() -> dict[str, object]:
    return jazan_service_quality_service.runtime_evidence_payload()


@router.get("/service-quality/runtimes/{runtime_id}/history")
def service_quality_runtime_history(runtime_id: str) -> dict[str, object]:
    try:
        return jazan_service_quality_service.runtime_history_payload(runtime_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Jazan runtime not found") from exc


@router.get("/service-quality/decision-queue")
def service_quality_decision_queue() -> dict[str, object]:
    return jazan_service_quality_service.decision_queue_payload()


@router.get("/service-quality/outcome-feedback")
def service_quality_outcome_feedback() -> dict[str, object]:
    return jazan_service_quality_service.outcome_feedback_payload()


@router.get("/service-quality/decision-action-audit")
def service_quality_decision_action_audit() -> dict[str, object]:
    return jazan_service_quality_service.decision_action_audit_payload()


@router.get("/service-quality/audit/events")
def service_quality_audit_events() -> dict[str, object]:
    return jazan_service_quality_service.audit_events_payload()


@router.get("/service-quality/audit/emails")
def service_quality_audit_emails() -> dict[str, object]:
    return jazan_service_quality_service.audit_emails_payload()


@router.get("/service-quality/audit/tickets")
def service_quality_audit_tickets() -> dict[str, object]:
    return jazan_service_quality_service.audit_tickets_payload()


@router.get("/service-quality/audit/corrective-actions")
def service_quality_audit_corrective_actions() -> dict[str, object]:
    return jazan_service_quality_service.audit_corrective_actions_payload()


@router.get("/service-quality/governance-evidence")
def service_quality_governance_evidence() -> dict[str, object]:
    return jazan_service_quality_service.governance_evidence_payload()
