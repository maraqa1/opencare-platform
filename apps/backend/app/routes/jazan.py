from fastapi import APIRouter, HTTPException

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
        "summary": "Cascade regional objectives into municipal scorecards, initiatives, and accountable outcomes.",
        "primary_kpi": {"label": "Objectives with approved KPI mapping", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/strategic-alignment-objective-cascade",
        "responsible_control": "Strategy cascade review",
    },
    {
        "id": "kpi-performance-governance",
        "number": 2,
        "title": "KPI & Performance Governance",
        "tone": "teal",
        "summary": "Define KPI ownership, formulas, thresholds, evidence, and review accountability.",
        "primary_kpi": {"label": "Governed KPIs with owner and formula", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/kpi-performance-governance",
        "responsible_control": "KPI dictionary control",
    },
    {
        "id": "data-analytics-dashboards",
        "number": 3,
        "title": "Data, Analytics & Dashboards",
        "tone": "green",
        "summary": "Create trusted data products, dashboards, lineage, and decision-ready analytics.",
        "primary_kpi": {"label": "Certified dashboard data products", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/data-analytics-dashboards",
        "responsible_control": "Data product certification",
    },
    {
        "id": "municipal-project-early-warning",
        "number": 4,
        "title": "Municipal & Project Early Warning",
        "tone": "cyan",
        "summary": "Detect municipal service, project delivery, and performance risks early enough to act.",
        "primary_kpi": {"label": "Risks detected before escalation", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/municipal-project-early-warning",
        "responsible_control": "Early warning triage",
    },
    {
        "id": "decision-rhythm-corrective-actions",
        "number": 5,
        "title": "Decision Rhythm & Corrective Actions",
        "tone": "purple",
        "summary": "Convert performance signals into review packs, ownership, decisions, and closure.",
        "primary_kpi": {"label": "Corrective actions closed on time", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/decision-rhythm-corrective-actions",
        "responsible_control": "Decision log and closure control",
    },
    {
        "id": "quality-knowledge-transfer-sustainability",
        "number": 6,
        "title": "Quality, Knowledge Transfer & Sustainability",
        "tone": "orange",
        "summary": "Sustain adoption through quality assurance, capability transfer, and operating cadence.",
        "primary_kpi": {"label": "Knowledge transfer milestones accepted", "value": None, "unit": None},
        "status": "unavailable",
        "open_risks": None,
        "data_freshness": None,
        "route": "/jazan-performance/quality-knowledge-transfer-sustainability",
        "responsible_control": "Sustainability acceptance review",
    },
]


@router.get("/overview")
def overview() -> dict[str, object]:
    return {
        "region": "Jazan Region",
        "platform": "Performance Management Platform",
        "vision": (
            "A unified performance management ecosystem that drives strategic alignment, "
            "data-driven decisions, accountability, and measurable impact for Jazan Region."
        ),
        "stakeholders": [
            {"title": "Decision Makers", "coverage": ["Executive leadership", "Steering committee"]},
            {"title": "Performance Owners", "coverage": ["Sector leaders", "Department heads"]},
            {"title": "Municipal Coverage", "coverage": MUNICIPALITIES},
            {"title": "Users", "coverage": ["Employees", "Managers", "Citizens and beneficiaries"]},
            {"title": "External Partners", "coverage": ["National entities", "Vendors and partners", "Auditors and regulators"]},
        ],
        "foundation_enablers": [
            "Technology & Tools",
            "PMO & Governance",
            "Data Governance",
            "Change Management",
            "Communications",
            "Capability Building",
            "Risk & Compliance",
        ],
        "governance_controls": [
            "Governance & Leadership",
            "Steering Committee",
            "PMO",
            "Performance Owners",
            "Data & Analytics",
            "Decision log",
            "Evidence audit",
        ],
        "success_measures": [
            {"label": "Strategic objectives with KPIs", "value": None},
            {"label": "Timely performance reports", "value": None},
            {"label": "Data quality score", "value": None},
            {"label": "Initiatives on-track", "value": None},
            {"label": "Citizen satisfaction", "value": None},
        ],
    }


@router.get("/pillars")
def pillars() -> dict[str, object]:
    return {"pillars": PILLARS}


@router.get("/pillars/{pillar_id}")
def pillar_detail(pillar_id: str) -> dict[str, object]:
    for pillar in PILLARS:
        if pillar["id"] == pillar_id:
            return {"pillar": pillar}
    raise HTTPException(status_code=404, detail="Jazan pillar not found")
