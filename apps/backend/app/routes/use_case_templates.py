from __future__ import annotations

import shutil
import tempfile
import uuid
import json
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.config import settings
from app.services.use_case_template_lifecycle import UseCaseTemplateLifecycleService
from app.services.use_case_template_preview import UseCaseTemplatePreviewService
from app.services.use_case_template_security import UseCaseTemplateSecurityError, safe_extract_package_zip
from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso
from app.services.use_case_template_validator import UseCaseTemplateValidationService

router = APIRouter(prefix="/api/v1/admin/use-case-templates", tags=["admin"])
storage = UseCaseTemplateStorage(Path(settings.use_case_template_storage_root))
lifecycle = UseCaseTemplateLifecycleService(storage)


class UninstallPayload(BaseModel):
    confirm: bool
    preserve_audit: bool = True


def _actor(request: Request) -> str:
    return request.headers.get("x-opencare-actor", "portal-admin")


def _require_admin(request: Request) -> None:
    value = request.headers.get(settings.use_case_template_admin_header, "").strip().lower()
    if value not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Admin/operator context required")


def _read_yaml(path: Path) -> dict[str, Any]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return payload if isinstance(payload, dict) else {}


def _record_id(package_id: str, version: str) -> str:
    return f"{package_id}@{version}"


def _runtime_diagnostics(record: dict[str, Any]) -> dict[str, Any]:
    compile_report = record.get("compile_report", {}) if isinstance(record.get("compile_report"), dict) else {}
    runtime_definition = compile_report.get("runtime_definition", {}) if isinstance(compile_report.get("runtime_definition"), dict) else {}
    backend_registry = runtime_definition.get("backend_registry", {}) if isinstance(runtime_definition.get("backend_registry"), dict) else {}
    tabs = runtime_definition.get("tabs", []) if isinstance(runtime_definition.get("tabs"), list) else []
    endpoint_bindings = backend_registry.get("endpoint_bindings", {}) if isinstance(backend_registry.get("endpoint_bindings"), dict) else {}
    slug = str(record.get("slug") or "")
    return {
        "slug": slug,
        "workspace_route": f"/api/v1/use-cases/{slug}/workspace" if slug else "",
        "api_prefix": runtime_definition.get("api_prefix") or runtime_definition.get("route_prefix") or "",
        "tab_routes": [
            {
                "id": tab.get("id"),
                "route": tab.get("route"),
                "component_count": len(tab.get("components", [])) if isinstance(tab.get("components"), list) else 0,
            }
            for tab in tabs
            if isinstance(tab, dict)
        ],
        "backend_registry": {
            "route_prefix": backend_registry.get("route_prefix") or runtime_definition.get("route_prefix"),
            "endpoint_count": len(endpoint_bindings),
            "endpoints": sorted(endpoint_bindings.keys()),
        },
    }


def _registry_diagnostics(record: dict[str, Any]) -> dict[str, Any]:
    slug = str(record.get("slug") or "")
    registry = storage.load_registry()
    packages = registry.get("packages", {}) if isinstance(registry.get("packages"), dict) else {}
    active_versions = registry.get("active_versions", {}) if isinstance(registry.get("active_versions"), dict) else {}
    active_pointer = storage.get_active_pointer(slug) if slug else None
    active_package = storage.get_active_package_by_slug(slug) if slug else None
    return {
        "package_key": record.get("id") or record.get("package_id"),
        "package_present": bool(packages.get(record.get("id") or record.get("package_id"))),
        "package_count": len(packages),
        "package_keys": sorted(packages.keys()),
        "active_pointer": active_pointer,
        "active_slug_count": len(active_versions),
        "active_slugs": sorted(active_versions.keys()),
        "active_package_id": active_package.get("id") if isinstance(active_package, dict) else None,
        "active_package_status": {
            "status": active_package.get("status"),
            "materialization_status": active_package.get("materialization_status"),
            "activation_status": active_package.get("activation_status"),
            "live_verification_status": active_package.get("live_verification_status"),
        }
        if isinstance(active_package, dict)
        else None,
    }


def _display_contract_export(record: dict[str, Any]) -> dict[str, Any]:
    compile_report = record.get("compile_report", {}) if isinstance(record.get("compile_report"), dict) else {}
    runtime_definition = compile_report.get("runtime_definition", {}) if isinstance(compile_report.get("runtime_definition"), dict) else {}
    tabs = runtime_definition.get("tabs", []) if isinstance(runtime_definition.get("tabs"), list) else []
    return {
        "package": {
            "id": record.get("id"),
            "package_id": record.get("package_id"),
            "slug": record.get("slug"),
            "name": record.get("name"),
            "version": record.get("version"),
        },
        "workspace_route": runtime_definition.get("workspace_route"),
        "tabs": [
            {
                "id": tab.get("id"),
                "label": tab.get("label"),
                "route": tab.get("route"),
                "components": [
                    {
                        "id": spec.get("id"),
                        "component_type": spec.get("component_type"),
                        "display_contract": spec.get("display_contract", {}),
                    }
                    for spec in tab.get("component_specs", [])
                    if isinstance(spec, dict)
                ],
            }
            for tab in tabs
            if isinstance(tab, dict)
        ],
    }


def _load_preview(package_id: str) -> dict[str, Any]:
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    preview = UseCaseTemplatePreviewService(Path(record["staged_path"])).build()
    return preview


def _load_validation(package_id: str) -> dict[str, Any]:
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    validation = UseCaseTemplateValidationService(Path(record["staged_path"])).validate()
    record["validation_summary"] = validation
    record["package_validation_status"] = validation["status"]
    record["status"] = "validated" if validation["status"] in {"passed", "warning"} else "validation_failed"
    storage.upsert_package(record)
    return validation


@router.post("/upload")
async def upload_use_case_template(
    request: Request,
    package: UploadFile = File(...),
) -> dict[str, Any]:
    _require_admin(request)
    actor = _actor(request)

    if not package.filename or not package.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP packages are supported")

    content = await package.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded ZIP is empty")

    with tempfile.TemporaryDirectory(prefix="use-case-package-") as tmp_dir:
        tmp_root = Path(tmp_dir)
        tmp_zip = tmp_root / "upload.zip"
        tmp_zip.write_bytes(content)
        tmp_extract = tmp_root / "extract"

        try:
            extraction = safe_extract_package_zip(tmp_zip, tmp_extract)
        except UseCaseTemplateSecurityError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        package_yaml = _read_yaml(tmp_extract / "package.yaml")
        metadata = package_yaml.get("metadata", {}) if isinstance(package_yaml, dict) else {}
        package_id = str(package_yaml.get("package_id") or f"pkg-{uuid.uuid4()}")
        slug = str(metadata.get("slug") or package_id)
        version = str(metadata.get("version") or "0.0.0")
        record_id = _record_id(package_id, version)

        original_zip_path = storage.save_original_zip(package_id, version, content)
        staged_dir = storage.staged_dir(package_id, version)
        if staged_dir.exists():
            shutil.rmtree(staged_dir)
        shutil.copytree(tmp_extract, staged_dir)

    validation = UseCaseTemplateValidationService(staged_dir).validate()
    preview = UseCaseTemplatePreviewService(staged_dir).build()
    status = "validated" if validation["status"] in {"passed", "warning"} else "validation_failed"

    record = {
        "id": record_id,
        "package_id": package_id,
        "slug": slug,
        "name": metadata.get("name") or preview.get("name") or slug,
        "version": version,
        "domain": metadata.get("domain") or preview.get("domain"),
        "owner": metadata.get("owner") or preview.get("owner"),
        "uploaded_by": actor,
        "uploaded_at": utc_now_iso(),
        "status": status,
        "enabled": False,
        "package_validation_status": validation["status"],
        "compile_status": "parsed",
        "materialization_status": "staged",
        "activation_status": "previewable",
        "live_verification_status": "previewable",
        "original_zip_path": str(original_zip_path),
        "staged_path": str(staged_dir),
        "installed_path": "",
        "package_yaml": package_yaml,
        "manifest_yaml": _read_yaml(staged_dir / "manifest/usecase.yaml"),
        "archive_sha256": extraction.sha256,
        "extraction_summary": {
            "root_folder": extraction.root_folder,
            "file_count": extraction.file_count,
            "extracted_bytes": extraction.extracted_bytes,
            "files": extraction.files,
        },
        "validation_summary": validation,
        "preview_summary": preview,
        "checksum_status": validation["status"],
        "last_action": "upload",
        "last_action_at": utc_now_iso(),
        "error_message": "; ".join(validation["blocking_errors"]) if validation["blocking_errors"] else "",
        "last_error": "; ".join(validation["blocking_errors"]) if validation["blocking_errors"] else "",
        "actions": [],
    }
    storage.upsert_package(record)
    storage.record_action(
        package_id=package_id,
        slug=slug,
        version=version,
        actor=actor,
        action="upload",
        status=status,
        validation_result=validation["status"],
        log="Package uploaded, extracted safely, validated, and previewed.",
        error_message=record["error_message"] or None,
    )
    stored = storage.get_package(package_id) or record
    return {
        "status": "ok",
        "package_id": package_id,
        "record_id": record_id,
        "slug": slug,
        "version": version,
        "package": stored,
        "validation": validation,
    }


@router.get("")
def list_use_case_templates(
    request: Request,
    status: str | None = Query(default=None),
    domain: str | None = Query(default=None),
    slug: str | None = Query(default=None),
) -> dict[str, Any]:
    _require_admin(request)
    packages = storage.list_packages()
    if status:
        packages = [package for package in packages if package.get("status") == status]
    if domain:
        packages = [package for package in packages if package.get("domain") == domain]
    if slug:
        packages = [package for package in packages if package.get("slug") == slug]
    packages.sort(key=lambda package: package.get("uploaded_at", ""), reverse=True)
    return {"status": "ok", "packages": packages}


@router.get("/{package_id}")
def get_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    return {"status": "ok", "package": record}


@router.get("/{package_id}/validation")
def get_use_case_template_validation(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    return {
        "status": "ok",
        "package_id": package_id,
        "validation": record.get("validation_summary") or _load_validation(package_id),
    }


@router.get("/{package_id}/preview")
def get_use_case_template_preview(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    preview = record.get("preview_summary") or _load_preview(package_id)
    return {"status": "ok", "package_id": package_id, "preview": preview}


@router.get("/{package_id}/dashboard-materialization")
def get_use_case_template_dashboard_materialization(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    return {
        "status": "ok",
        "package_id": package_id,
        "slug": record.get("slug"),
        "version": record.get("version"),
        "dashboard_materialization_status": record.get("materialization_status"),
        "activation_status": record.get("activation_status"),
        "live_verification_status": record.get("live_verification_status"),
        "report": record.get("materialization_report", {}),
    }


@router.get("/{package_id}/diagnostics")
def get_use_case_template_diagnostics(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")

    return {
        "status": "ok",
        "package_id": package_id,
        "diagnostics": {
            "package": {
                "id": record.get("id"),
                "package_id": record.get("package_id"),
                "slug": record.get("slug"),
                "name": record.get("name"),
                "version": record.get("version"),
                "status": record.get("status"),
                "enabled": record.get("enabled"),
                "package_validation_status": record.get("package_validation_status"),
                "compile_status": record.get("compile_status"),
                "materialization_status": record.get("materialization_status"),
                "activation_status": record.get("activation_status"),
                "live_verification_status": record.get("live_verification_status"),
                "archive_sha256": record.get("archive_sha256"),
                "last_action": record.get("last_action"),
                "last_action_at": record.get("last_action_at"),
                "last_error": record.get("last_error"),
            },
            "registry": _registry_diagnostics(record),
            "runtime": _runtime_diagnostics(record),
            "extraction_summary": record.get("extraction_summary", {}),
            "validation_summary": record.get("validation_summary", {}),
            "preview_summary": record.get("preview_summary", {}),
            "compile_report": record.get("compile_report", {}),
            "materialization_report": record.get("materialization_report", {}),
            "live_verification_report": record.get("live_verification_report", {}),
            "actions": record.get("actions", []),
            "files": {
                "staged": storage.safe_file_tree(package_id, record["version"], state="staged"),
                "installed": storage.safe_file_tree(package_id, record["version"], state="installed"),
            },
        },
    }


@router.get("/{package_id}/display-contract")
def download_use_case_template_display_contract(request: Request, package_id: str) -> Response:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    if not isinstance(record.get("compile_report"), dict) or not record.get("compile_report", {}).get("runtime_definition"):
        raise HTTPException(status_code=409, detail="Compile the package before exporting display_contract.")

    payload = _display_contract_export(record)
    slug = record.get("slug") or record.get("package_id") or package_id
    version = record.get("version") or "unknown"
    filename = f"{slug}-display-contract-{version}.json"
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"content-disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{package_id}/validate")
def validate_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    actor = _actor(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")

    validation = _load_validation(package_id)
    preview = _load_preview(package_id)
    record = storage.get_package(package_id) or record
    record["preview_summary"] = preview
    record["package_validation_status"] = validation["status"]
    storage.upsert_package(record)
    storage.record_action(
        package_id=package_id,
        slug=record["slug"],
        version=record["version"],
        actor=actor,
        action="validate",
        status=record["status"],
        validation_result=validation["status"],
        log="Validation rerun completed.",
        error_message="; ".join(validation["blocking_errors"]) if validation["blocking_errors"] else None,
    )
    return {"status": "ok", "validation": validation, "preview": preview}


def _run_lifecycle(request: Request, package_id: str, action: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    _require_admin(request)
    actor = _actor(request)
    try:
        if action == "compile":
            record = lifecycle.compile(package_id, actor=actor)
        elif action == "plan-materialization":
            record = lifecycle.plan_materialization(package_id, actor=actor)
        elif action == "materialize":
            record = lifecycle.materialize(package_id, actor=actor)
        elif action == "activate":
            record = lifecycle.activate(package_id, actor=actor)
        elif action == "verify-live":
            record = lifecycle.verify_live(package_id, actor=actor)
        elif action == "install":
            record = lifecycle.install(package_id, actor=actor)
        elif action == "apply":
            record = lifecycle.apply(package_id, actor=actor)
        elif action == "include":
            record = lifecycle.include(package_id, actor=actor)
        elif action == "exclude":
            record = lifecycle.exclude(package_id, actor=actor)
        elif action == "remove-operational":
            record = lifecycle.remove_operational(package_id, actor=actor)
        elif action == "uninstall":
            record = lifecycle.uninstall(
                package_id,
                actor=actor,
                confirm=bool(payload and payload.get("confirm")),
                preserve_audit=bool(payload.get("preserve_audit", True) if payload else True),
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"status": "ok", "package": record}


@router.post("/{package_id}/install")
def install_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "install")


@router.post("/{package_id}/compile")
def compile_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "compile")


@router.post("/{package_id}/plan-materialization")
def plan_materialization_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "plan-materialization")


@router.post("/{package_id}/materialize")
def materialize_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "materialize")


@router.post("/{package_id}/activate")
def activate_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "activate")


@router.post("/{package_id}/verify-live")
def verify_live_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "verify-live")


@router.post("/{package_id}/apply")
def apply_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "apply")


@router.post("/{package_id}/include")
def include_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "include")


@router.post("/{package_id}/exclude")
def exclude_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "exclude")


@router.post("/{package_id}/remove-operational")
def remove_operational_use_case_template(request: Request, package_id: str) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "remove-operational")


@router.post("/{package_id}/uninstall")
def uninstall_use_case_template(
    request: Request,
    package_id: str,
    payload: UninstallPayload,
) -> dict[str, Any]:
    return _run_lifecycle(request, package_id, "uninstall", payload.model_dump())


@router.get("/{package_id}/actions")
def get_use_case_template_actions(request: Request, package_id: str) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    return {"status": "ok", "actions": record.get("actions", [])}


@router.get("/{package_id}/files")
def get_use_case_template_files(
    request: Request,
    package_id: str,
    state: str = Query(default="staged"),
) -> dict[str, Any]:
    _require_admin(request)
    record = storage.get_package(package_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown package: {package_id}")
    return {
        "status": "ok",
        "files": storage.safe_file_tree(package_id, record["version"], state=state),
    }
