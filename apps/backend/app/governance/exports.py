from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from uuid import uuid4

from psycopg import sql

from app.config import settings
from app.db import connect
from app.governance.actions import _insert_audit
from app.governance.read_service import GovernanceReadService


class GovernanceExportError(ValueError):
    pass


def _governance_table(name: str) -> sql.Composed:
    return sql.SQL("{}.{}").format(sql.Identifier(settings.governance_schema), sql.Identifier(name))


def _default_read_service() -> GovernanceReadService:
    return GovernanceReadService(
        use_cases_dir=Path(settings.governance_use_cases_dir),
        policies_dir=Path(settings.governance_policies_dir),
    )


def _actor(payload: dict[str, Any]) -> str:
    return str(payload.get("actor") or "portal_user")


def _role(payload: dict[str, Any]) -> str:
    return str(payload.get("role") or "viewer")


def _jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return _jsonable(value.model_dump(mode="json"))
    if hasattr(value, "dict"):
        return _jsonable(value.dict())
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "value"):
        return value.value
    return value


def _asset_inventory(service: GovernanceReadService) -> dict[str, Any]:
    use_cases = service.list_use_cases()
    tables = [table for use_case in use_cases for table in service.list_tables(use_case.slug)]
    return {
        "pack_id": "asset-inventory",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "use_cases": _jsonable(use_cases),
        "tables": _jsonable(tables),
    }


def _metric_definitions(service: GovernanceReadService) -> dict[str, Any]:
    use_cases = service.list_use_cases()
    metrics = [metric for use_case in use_cases for metric in service.list_metrics(use_case.slug)]
    return {
        "pack_id": "metric-definitions",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": _jsonable(metrics),
    }


def _ownership_register(service: GovernanceReadService) -> dict[str, Any]:
    use_cases = service.list_use_cases()
    tables = [table for use_case in use_cases for table in service.list_tables(use_case.slug)]
    return {
        "pack_id": "ownership-register",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "use_cases": [
            {
                "slug": use_case.slug,
                "name": use_case.name,
                "owner": use_case.owner,
                "steward": use_case.steward,
                "evidence_state": "loaded" if use_case.owner and use_case.steward else "unknown",
            }
            for use_case in use_cases
        ],
        "tables": [
            {
                "id": table.id,
                "use_case_slug": table.use_case_slug,
                "owner": table.owner,
                "steward": table.steward,
                "evidence_state": "loaded" if table.owner and table.steward else "unknown",
            }
            for table in tables
        ],
    }


def _classification_register(service: GovernanceReadService) -> dict[str, Any]:
    policies = service.list_policies()
    use_cases = service.list_use_cases()
    tables = [table for use_case in use_cases for table in service.list_tables(use_case.slug)]
    return {
        "pack_id": "classification-register",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policies": _jsonable(policies),
        "attributes": [
            _jsonable(attribute)
            for table in tables
            for attribute in table.attributes
        ],
    }


def _freshness_summary(service: GovernanceReadService) -> dict[str, Any]:
    use_cases = service.list_use_cases()
    return {
        "pack_id": "freshness-summary",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "signals": [
            {
                "use_case_slug": use_case.slug,
                "status": next((signal.status for signal in use_case.signals if signal.name == "freshness"), "unknown"),
                "state": next((signal.evidence.state for signal in use_case.signals if signal.name == "freshness"), "unknown"),
            }
            for use_case in use_cases
        ],
    }


def _issues_register(service: GovernanceReadService) -> dict[str, Any]:
    return {
        "pack_id": "issues-register",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "issues": _jsonable(service.list_issues()),
    }


PACK_BUILDERS: dict[str, Callable[[GovernanceReadService], dict[str, Any]]] = {
    "asset-inventory": _asset_inventory,
    "metric-definitions": _metric_definitions,
    "ownership-register": _ownership_register,
    "classification-register": _classification_register,
    "freshness-summary": _freshness_summary,
    "issues-register": _issues_register,
}


def build_export_payload(pack_id: str, service: GovernanceReadService | None = None) -> dict[str, Any]:
    builder = PACK_BUILDERS.get(pack_id)
    if builder is None:
        raise GovernanceExportError(f"Unknown evidence pack: {pack_id}")
    return builder(service or _default_read_service())


def request_export(pack_id: str, payload: dict[str, Any], service: GovernanceReadService | None = None) -> dict[str, Any]:
    export_id = str(payload.get("export_id") or f"{pack_id}-{uuid4()}")
    actor = _actor(payload)
    role = _role(payload)
    request_id = payload.get("request_id")

    with connect() as conn:
        conn.execute(
            sql.SQL(
                """
                insert into {} (
                  export_id,
                  pack_id,
                  status,
                  requested_by,
                  requested_at
                )
                values (%s, %s, %s, %s, now())
                """
            ).format(_governance_table("evidence_exports")),
            (export_id, pack_id, "requested", actor),
        )
        _insert_audit(
            conn,
            actor=actor,
            role=role,
            event_type="evidence_export_requested",
            target_type="evidence_export",
            target_id=export_id,
            after_state={"export_id": export_id, "pack_id": pack_id, "status": "requested"},
            request_id=request_id,
        )
        try:
            pack_payload = build_export_payload(pack_id, service)
            conn.execute(
                sql.SQL("update {} set status = %s, completed_at = now(), storage_uri = %s where export_id = %s").format(
                    _governance_table("evidence_exports")
                ),
                ("completed", f"resolver://governance/evidence/{pack_id}", export_id),
            )
            _insert_audit(
                conn,
                actor=actor,
                role=role,
                event_type="evidence_export_generated",
                target_type="evidence_export",
                target_id=export_id,
                after_state={"export_id": export_id, "pack_id": pack_id, "status": "completed"},
                request_id=request_id,
            )
            return {
                "export_id": export_id,
                "pack_id": pack_id,
                "status": "completed",
                "download_path": f"/api/v1/governance/evidence/exports/{export_id}/download",
                "preview": pack_payload,
            }
        except Exception as exc:
            conn.execute(
                sql.SQL("update {} set status = %s, completed_at = now(), error_message = %s where export_id = %s").format(
                    _governance_table("evidence_exports")
                ),
                ("failed", str(exc), export_id),
            )
            _insert_audit(
                conn,
                actor=actor,
                role=role,
                event_type="evidence_export_failed",
                target_type="evidence_export",
                target_id=export_id,
                after_state={"export_id": export_id, "pack_id": pack_id, "status": "failed", "error": str(exc)},
                request_id=request_id,
            )
            raise GovernanceExportError(str(exc)) from exc


def get_export(export_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        return conn.execute(
            sql.SQL("select * from {} where export_id = %s").format(_governance_table("evidence_exports")),
            (export_id,),
        ).fetchone()


def list_exports(limit: int = 20) -> list[dict[str, Any]]:
    with connect() as conn:
        return conn.execute(
            sql.SQL("select * from {} order by requested_at desc limit %s").format(_governance_table("evidence_exports")),
            (limit,),
        ).fetchall()


def download_export(export_id: str, payload: dict[str, Any] | None = None, service: GovernanceReadService | None = None) -> tuple[str, str]:
    payload = payload or {}
    row = get_export(export_id)
    if row is None:
        raise GovernanceExportError(f"Evidence export not found: {export_id}")
    if row.get("status") != "completed":
        raise GovernanceExportError(f"Evidence export is not ready: {export_id}")

    pack_id = row["pack_id"]
    content = json.dumps(build_export_payload(pack_id, service), indent=2, sort_keys=True)
    with connect() as conn:
        _insert_audit(
            conn,
            actor=_actor(payload),
            role=_role(payload),
            event_type="evidence_export_downloaded",
            target_type="evidence_export",
            target_id=export_id,
            after_state={"export_id": export_id, "pack_id": pack_id, "status": "downloaded"},
            request_id=payload.get("request_id"),
        )
    return f"{pack_id}.json", content
