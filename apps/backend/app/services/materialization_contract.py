from __future__ import annotations

from copy import deepcopy
from typing import Any


PLATFORM_CAPABILITY_MANIFEST = {
    "renderers": {"opencare_native_bi"},
    "components": {
        "trust_strip",
        "kpi_card",
        "kpi_card_group",
        "line_chart",
        "bar_chart",
        "area_chart",
        "queue_table",
        "drilldown_table",
        "filter_chip_group",
        "governance_badge",
        "link_group",
    },
    "interactions": {
        "none",
        "drilldown",
        "row_drilldown",
        "open_drawer",
        "open_governance_drawer",
        "filter_propagation",
        "governance_drawer",
        "navigate",
    },
    "governance_modes": {
        "aggregate_only",
        "aggregated_only_no_patient_identifiers",
        "dictionary_only_no_patient_identifiers",
        "governance_metadata_only",
        "masked_patient_id_only",
        "masked_patient_level",
        "no_patient_identifiers",
        "patient_level_audited_reveal",
    },
}


BLOCK_REASON_TEMPLATES = {
    "checksum_mismatch": {
        "gate": "integrity",
        "message": "Package checksum no longer matches the originally uploaded artifact.",
        "remediation": "Re-upload the package and rerun validation before materialization.",
    },
    "missing_required_component": {
        "gate": "capability",
        "message": "A required component is missing from the resolved runtime definition.",
        "remediation": "Add the missing component to native-bi/components.yaml or layout.yaml.",
    },
    "unsupported_component_type": {
        "gate": "capability",
        "message": "The platform does not support this component type.",
        "remediation": "Extend the platform capability manifest and renderer before activation.",
    },
    "unsupported_interaction": {
        "gate": "capability",
        "message": "The platform does not support this interaction type.",
        "remediation": "Implement the interaction generically or remove it from the package contract.",
    },
    "unsupported_governance_mode": {
        "gate": "governance_enforce",
        "message": "The platform does not support this governance mode.",
        "remediation": "Implement the governance mode generically or change the package contract.",
    },
    "missing_data_binding": {
        "gate": "data_bind",
        "message": "The component has no usable data binding.",
        "remediation": "Declare a valid backend binding in native-bi/data-bindings.yaml and reference it from the component.",
    },
    "missing_endpoint_binding": {
        "gate": "data_bind",
        "message": "The component points to an endpoint that is not in the compiled backend endpoint registry.",
        "remediation": "Add or fix the backend route binding so the endpoint exists at compile time.",
    },
    "unsupported_renderer": {
        "gate": "capability",
        "message": "The package requires a renderer the platform does not expose.",
        "remediation": "Add the renderer to the platform capability manifest or change the package materialization profile.",
    },
    "unsupported_interaction": {
        "gate": "capability",
        "message": "The component requires an interaction the platform cannot guarantee.",
        "remediation": "Implement the interaction generically or remove it from the package contract.",
    },
    "unsupported_governance_mode": {
        "gate": "governance_enforce",
        "message": "The component requires a governance mode the platform cannot enforce.",
        "remediation": "Implement the governance mode generically or change the package contract.",
    },
    "missing_phi_masking_for_patient_level_component": {
        "gate": "governance_enforce",
        "message": "A patient-level component has no enforced PHI masking rule.",
        "remediation": "Add endpoint phi_handling and prove masked identifier output before activation.",
    },
    "missing_audit_policy_for_patient_level_component": {
        "gate": "governance_enforce",
        "message": "A patient-level component has no audit policy wired to its endpoint access.",
        "remediation": "Add role_policy and audit event emission before activation.",
    },
    "missing_governance_evidence_link": {
        "gate": "governance_enforce",
        "message": "The component declares governance posture but has no evidence target.",
        "remediation": "Declare an evidence target in governance bindings or component governance contract.",
    },
    "missing_required_smoke_test": {
        "gate": "governance_enforce",
        "message": "A required smoke test for governance or rendering is missing.",
        "remediation": "Add the missing negative smoke-test declaration before live activation.",
    },
}


def make_block_reason(
    code: str,
    *,
    component_id: str | None = None,
    message: str | None = None,
    remediation: str | None = None,
    gate: str | None = None,
) -> dict[str, Any]:
    template = BLOCK_REASON_TEMPLATES.get(code, {})
    return {
        "code": code,
        "gate": gate or template.get("gate") or "unknown",
        "component_id": component_id,
        "message": message or template.get("message") or code,
        "remediation": remediation or template.get("remediation") or "Inspect the package and platform capability contract.",
    }


def serialize_reason(reason: dict[str, Any]) -> str:
    component = reason.get("component_id")
    scoped = f"{reason['code']}:{component}" if component else reason["code"]
    return f"{scoped} - {reason.get('message', '')}".strip()


def dedupe_reasons(reasons: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str | None]] = set()
    unique: list[dict[str, Any]] = []
    for reason in reasons:
        key = (str(reason.get("code") or ""), reason.get("component_id"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(deepcopy(reason))
    return unique
