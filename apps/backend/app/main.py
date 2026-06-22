from fastapi import FastAPI

from app.routes.admin import router as admin_router
from app.config import settings
from app.routes.anomalies import router as anomalies_router
from app.routes.classification import router as classification_router
from app.routes.config_routes import router as config_router
from app.routes.dictionary import router as dictionary_router
from app.routes.decisions import router as decisions_router
from app.routes.facts import router as facts_router
from app.routes.forecasts import router as forecasts_router
from app.routes.health import router as health_router
from app.routes.jazan import router as jazan_router
from app.routes.lineage import router as lineage_router
from app.routes.occupancy import router as occupancy_router
from app.routes.record_spec import router as record_spec_router
from app.routes.revenue_cycle import router as revenue_cycle_router, rcm_router
from app.routes.reports import router as reports_router
from app.routes.status import router as status_router
from app.routes.superset import router as superset_router
from app.routes.talemia import router as talemia_router

app = FastAPI(
    title="OpenCare Insight Platform Backend",
    version="0.1.0",
    description="Minimal API surface for occupancy intelligence and platform status.",
)

app.include_router(health_router)
app.include_router(config_router)
app.include_router(occupancy_router)
app.include_router(dictionary_router)
app.include_router(classification_router)
app.include_router(decisions_router)
app.include_router(lineage_router)
app.include_router(forecasts_router)
app.include_router(anomalies_router)
app.include_router(record_spec_router)
app.include_router(superset_router)
app.include_router(admin_router)
app.include_router(status_router)
app.include_router(reports_router)
app.include_router(facts_router)
app.include_router(revenue_cycle_router)
app.include_router(rcm_router)
app.include_router(talemia_router)
app.include_router(jazan_router)


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": settings.app_name,
        "environment": settings.environment,
        "docs": "/docs",
    }
