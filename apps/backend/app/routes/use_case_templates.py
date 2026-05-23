from __future__ import annotations

import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, File, Header, HTTPException, Query, Request, UploadFile
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
        "original_zip_path": str(original_zip_path),
        "staged_path": str(staged_dir),
        "installed_path": "",
        "package_yaml": package_yaml,
        "manifest_yaml": _read_yaml(staged_dir / "manifest/usecase.yaml"),
        "validation_summary": validation,
        "preview_summary": preview,
        "checksum_status": validation["status"],
        "last_action": "upload",
        "last_action_at": utc_now_iso(),
        "error_message": "; ".join(validation["blocking_errors"]) if validation["blocking_errors"] else "",
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
        if action == "install":
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
