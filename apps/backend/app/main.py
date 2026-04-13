from fastapi import FastAPI

from app.config import settings
from app.routes.anomalies import router as anomalies_router
from app.routes.dictionary import router as dictionary_router
from app.routes.facts import router as facts_router
from app.routes.forecasts import router as forecasts_router
from app.routes.health import router as health_router
from app.routes.reports import router as reports_router
from app.routes.status import router as status_router

app = FastAPI(
    title="OpenCare Insight Platform Backend",
    version="0.1.0",
    description="Minimal API surface for occupancy intelligence and platform status.",
)

app.include_router(health_router)
app.include_router(dictionary_router)
app.include_router(forecasts_router)
app.include_router(anomalies_router)
app.include_router(status_router)
app.include_router(reports_router)
app.include_router(facts_router)


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": settings.app_name,
        "environment": settings.environment,
        "docs": "/docs",
    }
