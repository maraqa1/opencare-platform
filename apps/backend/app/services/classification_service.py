from __future__ import annotations

import re
from collections import Counter
from typing import Any

SensitivityClass = str
DataDomain = str
ClassificationSource = str
ReviewState = str
EnforcementAction = str
ConfidenceTier = str

COLUMN_CLASSIFICATION_RULES = (
    {
        "id": "rule-patient-identifiers",
        "pattern": re.compile(r"(^|_)(patient_id|patient_key|mrn|medical_record_number)($|_)", re.IGNORECASE),
        "sensitivity": "restricted",
        "domain": "patient_identity",
        "source": "field_name_rule",
        "confidence": 0.92,
        "rationale": "Patient identifiers are restricted and require steward review before enforcement.",
    },
    {
        "id": "rule-demographic-dates",
        "pattern": re.compile(r"(^|_)(date_of_birth|dob|birth_date|encounter_date)($|_)", re.IGNORECASE),
        "sensitivity": "sensitive",
        "domain": "patient_identity",
        "source": "field_name_rule",
        "confidence": 0.82,
        "rationale": "Demographic and encounter dates are sensitive when paired with operational healthcare context.",
    },
    {
        "id": "rule-financial-identifiers",
        "pattern": re.compile(r"(^|_)(claim_id|account_number|billing_id|payer_id)($|_)", re.IGNORECASE),
        "sensitivity": "sensitive",
        "domain": "revenue_cycle",
        "source": "field_name_rule",
        "confidence": 0.86,
        "rationale": "Revenue-cycle identifiers should be treated as sensitive unless explicitly downgraded by a steward.",
    },
    {
        "id": "rule-operational-identifiers",
        "pattern": re.compile(r"(^|_)(ward_id|ward_code|department_id|department_code)($|_)", re.IGNORECASE),
        "sensitivity": "internal",
        "domain": "operations",
        "source": "field_name_rule",
        "confidence": 0.8,
        "rationale": "Operational identifiers are needed in product workflows but remain internal data.",
    },
)
ASSET_CLASSIFICATION_DEFAULTS = {
    "public": ("public", "reference", 0.95),
    "internal": ("internal", "operations", 0.82),
    "operational": ("internal", "operations", 0.78),
    "reference": ("internal", "reference", 0.78),
    "commercial": ("confidential", "operations", 0.74),
    "financial": ("sensitive", "finance", 0.78),
    "patient_identifiable": ("phi", "patient_identity", 0.9),
}
PII_LEVEL_CLASSIFICATION = {
    "HIGH": ("phi", 0.96),
    "MEDIUM": ("sensitive", 0.9),
    "LOW": ("confidential", 0.82),
}
ENFORCEMENT_ELIGIBLE_SOURCES = {"explicit", "steward_reviewed", "dbt_meta"}


def confidence_tier(score: float) -> ConfidenceTier:
    if score >= 0.85:
        return "high"
    if score >= 0.65:
        return "medium"
    return "low"


def default_policy_actions(sensitivity: SensitivityClass, enforcement_eligible: bool) -> list[EnforcementAction]:
    if not enforcement_eligible:
        return ["none"]
    if sensitivity == "phi":
        return ["mask", "suppress", "restrict_access", "block_export", "require_approval"]
    if sensitivity == "restricted":
        return ["mask", "suppress", "restrict_access", "require_approval"]
    if sensitivity == "sensitive":
        return ["restrict_access", "require_approval"]
    if sensitivity == "confidential":
        return ["restrict_access"]
    return ["none"]


def infer_domain(asset_name: str, column_name: str, parent_meta: dict[str, Any] | None = None) -> DataDomain:
    parent_meta = parent_meta or {}
    explicit_domain = parent_meta.get("domain")
    if isinstance(explicit_domain, str) and explicit_domain:
        return explicit_domain

    value = f"{asset_name} {column_name}".lower()
    if any(token in value for token in ("patient", "medical_record", "mrn", "date_of_birth", "dob")):
        return "patient_identity"
    if any(token in value for token in ("claim", "payer", "denial", "posting", "cash", "revenue")):
        return "revenue_cycle"
    if any(token in value for token in ("ward", "bed", "occupancy", "department")):
        return "operations"
    if any(token in value for token in ("metric", "dictionary", "reference", "dim_")):
        return "reference"
    if asset_name.startswith(("fct_", "fact_")):
        return "derived_analytics"
    return "unknown"


def classify_column(
    column_name: str,
    column: dict[str, Any] | None = None,
    parent_meta: dict[str, Any] | None = None,
    asset_name: str = "",
) -> dict[str, Any]:
    column = column or {}
    parent_meta = parent_meta or {}
    meta = dict(column.get("meta", {}))
    evidence: list[dict[str, Any]] = []
    source_breakdown: list[dict[str, Any]] = []

    explicit = meta.get("classification")
    if isinstance(explicit, str) and explicit:
        sensitivity = explicit
        domain = infer_domain(asset_name, column_name, parent_meta)
        source = "explicit"
        confidence = 0.95
        evidence.append({"type": "dbt_meta", "field": "meta.classification", "value": explicit})
    elif meta.get("contains_pii") is True:
        pii_level = str(meta.get("pii_level", "MEDIUM")).upper()
        sensitivity, confidence = PII_LEVEL_CLASSIFICATION.get(pii_level, ("sensitive", 0.88))
        domain = "patient_identity"
        source = "pii_rule"
        evidence.append({"type": "dbt_meta", "field": "meta.contains_pii", "value": True})
        evidence.append({"type": "dbt_meta", "field": "meta.pii_level", "value": pii_level})
    else:
        matched_rule = next(
            (rule for rule in COLUMN_CLASSIFICATION_RULES if rule["pattern"].search(column_name)),
            None,
        )
        if matched_rule:
            sensitivity = str(matched_rule["sensitivity"])
            domain = str(matched_rule["domain"])
            source = str(matched_rule["source"])
            confidence = float(matched_rule["confidence"])
            evidence.append(
                {
                    "type": "classification_rule",
                    "rule_id": matched_rule["id"],
                    "field": "column_name",
                    "value": column_name,
                    "rationale": matched_rule["rationale"],
                }
            )
        else:
            parent_classification = parent_meta.get("classification")
            inherited = (
                ASSET_CLASSIFICATION_DEFAULTS.get(parent_classification)
                if isinstance(parent_classification, str)
                else None
            )
            if inherited:
                sensitivity, inherited_domain, confidence = inherited
                domain = infer_domain(asset_name, column_name, {"domain": inherited_domain})
                source = "asset_inherited"
                evidence.append(
                    {
                        "type": "asset_meta",
                        "field": "meta.classification",
                        "value": parent_classification,
                    }
                )
            else:
                sensitivity = "unknown"
                domain = infer_domain(asset_name, column_name, parent_meta)
                source = "default"
                confidence = 0.35
                evidence.append({"type": "default", "value": "No explicit, rule, or inherited classification found."})

    source_breakdown.append({"source": source, "confidence": confidence})
    review_state = "not_reviewed" if source not in {"explicit", "steward_reviewed"} else "approved"
    enforcement_eligible = source in ENFORCEMENT_ELIGIBLE_SOURCES and review_state == "approved"
    actions = default_policy_actions(sensitivity, enforcement_eligible)

    return {
        "sensitivity": sensitivity,
        "domain": domain,
        "source": source,
        "confidence": round(confidence, 2),
        "confidence_tier": confidence_tier(confidence),
        "review_state": review_state,
        "evidence": evidence,
        "policy_actions": actions,
        "source_breakdown": source_breakdown,
        "enforcement_eligible": enforcement_eligible,
    }


def normalise_column_metadata(
    column_name: str,
    column: dict[str, Any],
    parent_meta: dict[str, Any] | None = None,
    asset_name: str = "",
) -> dict[str, Any]:
    classification = classify_column(column_name, column, parent_meta, asset_name)
    meta = dict(column.get("meta", {}))
    meta.setdefault("classification", classification["sensitivity"])
    meta.setdefault("classification_source", classification["source"])
    meta.setdefault("classification_confidence", classification["confidence"])
    meta.setdefault("classification_review_state", classification["review_state"])
    meta.setdefault("classification_domain", classification["domain"])
    return {
        "type": column.get("data_type", ""),
        "description": column.get("description", ""),
        "meta": meta,
        "classification": classification,
    }


class ClassificationService:
    def inventory(self) -> dict[str, Any]:
        from app.services.lineage_service import get_lineage_service

        lineage = get_lineage_service()
        rows: list[dict[str, Any]] = []
        for node in sorted(lineage.graph["nodes"].values(), key=lambda item: (item.get("schema", ""), item.get("name", ""))):
            asset = self.asset_classification(node)
            for column_name, column in sorted(node.get("columns", {}).items()):
                classification = column.get("classification") or classify_column(
                    column_name,
                    column,
                    node.get("meta", {}),
                    node.get("name", ""),
                )
                rows.append(
                    {
                        "asset_id": node["id"],
                        "asset": node.get("qualified_name") or node.get("label") or node.get("name"),
                        "asset_name": node.get("name"),
                        "asset_stage": node.get("stage"),
                        "column": column_name,
                        "data_type": column.get("type", ""),
                        "description": column.get("description", ""),
                        "sensitivity": classification["sensitivity"],
                        "domain": classification["domain"],
                        "source": classification["source"],
                        "confidence": classification["confidence"],
                        "confidence_tier": classification["confidence_tier"],
                        "review_state": classification["review_state"],
                        "policy_actions": classification["policy_actions"],
                        "enforcement_eligible": classification["enforcement_eligible"],
                        "evidence": classification["evidence"],
                        "source_breakdown": classification["source_breakdown"],
                        "asset_classification": asset,
                    }
                )

        return {
            "items": rows,
            "summary": self._summary(rows),
        }

    def asset_classification(self, node: dict[str, Any]) -> dict[str, Any]:
        columns = node.get("columns", {})
        classifications = [
            column.get("classification") or classify_column(column_name, column, node.get("meta", {}), node.get("name", ""))
            for column_name, column in columns.items()
        ]
        sensitivity_order = ["unknown", "public", "internal", "confidential", "sensitive", "restricted", "phi"]
        highest = "unknown"
        for classification in classifications:
            sensitivity = classification["sensitivity"]
            if sensitivity_order.index(sensitivity) > sensitivity_order.index(highest):
                highest = sensitivity

        meta = node.get("meta", {})
        if highest == "unknown" and isinstance(meta.get("classification"), str):
            highest = ASSET_CLASSIFICATION_DEFAULTS.get(meta["classification"], ("unknown", "unknown", 0.35))[0]

        return {
            "asset_id": node.get("id"),
            "asset": node.get("qualified_name") or node.get("label") or node.get("name"),
            "sensitivity": highest,
            "domain": infer_domain(node.get("name", ""), "", meta),
            "source": "column_rollup" if classifications else "asset_inherited",
            "column_count": len(columns),
            "review_state": "needs_review" if any(item["review_state"] == "not_reviewed" for item in classifications) else "approved",
            "enforcement_eligible": all(item["enforcement_eligible"] for item in classifications) if classifications else False,
        }

    def _summary(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        sensitivities = Counter(row["sensitivity"] for row in rows)
        review_states = Counter(row["review_state"] for row in rows)
        confidence_tiers = Counter(row["confidence_tier"] for row in rows)
        return {
            "total_columns": len(rows),
            "phi_columns": sensitivities["phi"],
            "restricted_columns": sensitivities["restricted"],
            "sensitive_columns": sensitivities["sensitive"],
            "unreviewed_columns": review_states["not_reviewed"],
            "low_confidence_columns": confidence_tiers["low"],
            "enforcement_eligible_columns": sum(1 for row in rows if row["enforcement_eligible"]),
            "by_sensitivity": dict(sorted(sensitivities.items())),
            "by_review_state": dict(sorted(review_states.items())),
            "by_confidence_tier": dict(sorted(confidence_tiers.items())),
        }


def get_classification_service() -> ClassificationService:
    return ClassificationService()
