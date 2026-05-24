from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from app.config import settings
from app.services.use_case_runtime_resolver import UseCaseRuntimeResolver
from app.services.use_case_template_storage import UseCaseTemplateStorage

router = APIRouter(prefix="/api/v1/use-cases", tags=["use-cases"])
storage = UseCaseTemplateStorage(Path(settings.use_case_template_storage_root))
resolver = UseCaseRuntimeResolver(storage)


def _filters(request: Request) -> dict[str, Any]:
    return {key: value for key, value in request.query_params.items()}


def _actor(request: Request) -> str:
    return request.headers.get("x-opencare-actor", "portal-user")


@router.get("/{slug}/workspace")
def get_use_case_workspace(slug: str) -> dict[str, Any]:
    try:
        workspace = resolver.get_workspace_definition(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown use case: {slug}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"status": "ok", "workspace": workspace}


@router.get("/{slug}/overview")
def get_use_case_overview(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/overview", request)


@router.get("/{slug}/kpis")
def get_use_case_kpis(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/kpis", request)


@router.get("/{slug}/trends")
def get_use_case_trends(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/trends", request)


@router.get("/{slug}/variation")
def get_use_case_variation(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/variation", request)


@router.get("/{slug}/queues/{queue_id}")
def get_use_case_queue(slug: str, queue_id: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, f"/queues/{queue_id}", request)


@router.get("/{slug}/drilldown")
def get_use_case_drilldown(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/drilldown", request)


@router.get("/{slug}/governance")
def get_use_case_governance(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/governance", request)


@router.get("/{slug}/filters")
def get_use_case_filters(slug: str, request: Request) -> dict[str, Any]:
    return _resolve(slug, "/filters", request)


def _resolve(slug: str, endpoint: str, request: Request) -> dict[str, Any]:
    try:
        return resolver.resolve_endpoint(
            slug,
            endpoint,
            filters=_filters(request),
            actor=_actor(request),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
