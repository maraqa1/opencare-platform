from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pathlib import Path

from app.config import load_enabled_use_cases, load_use_cases, settings, update_use_case_enabled
from app.services.use_case_template_storage import UseCaseTemplateStorage

router = APIRouter(prefix="/api/v1/config", tags=["config"])
template_storage = UseCaseTemplateStorage(Path(settings.use_case_template_storage_root))


class UseCaseTogglePayload(BaseModel):
    enabled: bool


def _runtime_catalog_entry(record: dict[str, object]) -> dict[str, object]:
    runtime_definition = record.get("runtime_definition", {})
    runtime_definition = runtime_definition if isinstance(runtime_definition, dict) else {}
    identity = runtime_definition.get("identity", {})
    identity = identity if isinstance(identity, dict) else {}
    dashboard_model = runtime_definition.get("dashboard_model", {})
    dashboard_model = dashboard_model if isinstance(dashboard_model, dict) else {}
    tabs = dashboard_model.get("tabs", [])
    tabs = tabs if isinstance(tabs, list) else []
    preview_summary = record.get("preview_summary", {})
    preview_summary = preview_summary if isinstance(preview_summary, dict) else {}
    business_summary = preview_summary.get("business_summary", {})
    business_summary = business_summary if isinstance(business_summary, dict) else {}

    tab_entries: list[dict[str, object]] = []
    widget_count = 0
    for tab in tabs:
        if not isinstance(tab, dict):
            continue
        widgets = tab.get("widgets", [])
        widgets = widgets if isinstance(widgets, list) else []
        tab_entries.append(
            {
                "id": tab.get("id"),
                "label": tab.get("label"),
                "route": tab.get("route"),
                "widget_count": len(widgets),
            }
        )
        widget_count += len(widgets)

    default_tab_route = next(
        (
            str(entry.get("route"))
            for entry in tab_entries
            if isinstance(entry.get("route"), str) and str(entry.get("route")).startswith("/use-cases/")
        ),
        None,
    ) or runtime_definition.get("workspace_route")

    return {
        "name": identity.get("name") or record.get("name"),
        "slug": identity.get("slug") or record.get("slug"),
        "domain": identity.get("domain") or record.get("domain"),
        "description": identity.get("description") or business_summary.get("problem") or record.get("domain"),
        "workspace_route": runtime_definition.get("workspace_route"),
        "default_tab_route": default_tab_route,
        "tabs": tab_entries,
        "widget_count": widget_count,
        "personas": runtime_definition.get("personas", []),
        "kpis": runtime_definition.get("kpis", []),
        "materialization_status": record.get("materialization_status"),
        "activation_status": record.get("activation_status"),
        "live_verification_status": record.get("live_verification_status"),
    }


def _public_package_summary(record: dict[str, object]) -> dict[str, object]:
    return {
        "id": record.get("id"),
        "package_id": record.get("package_id"),
        "slug": record.get("slug"),
        "name": record.get("name"),
        "version": record.get("version"),
        "domain": record.get("domain"),
        "status": record.get("status"),
        "enabled": record.get("enabled"),
        "materialization_status": record.get("materialization_status"),
        "activation_status": record.get("activation_status"),
        "live_verification_status": record.get("live_verification_status"),
        "preview_summary": record.get("preview_summary"),
        "runtime_catalog_entry": _runtime_catalog_entry(record),
        "last_action_at": record.get("last_action_at"),
    }


@router.get("/use-cases")
def get_use_cases() -> dict[str, object]:
    imported_packages = [
        _public_package_summary(record)
        for record in template_storage.list_packages()
        if record.get("status") != "uninstalled"
    ]
    active_imported = [_public_package_summary(record) for record in template_storage.list_active_packages()]
    return {
        "status": "ok",
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
        "imported_use_cases": imported_packages,
        "active_imported_use_cases": active_imported,
    }


@router.put("/use-cases/{use_case_id}")
def set_use_case_enabled(use_case_id: str, payload: UseCaseTogglePayload) -> dict[str, object]:
    try:
        updated_use_case = update_use_case_enabled(use_case_id, payload.enabled)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown use case: {use_case_id}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "ok",
        "use_case_id": use_case_id,
        "use_case": updated_use_case,
        "use_cases": load_enabled_use_cases(),
        "all_use_cases": load_use_cases(include_disabled=True),
    }
