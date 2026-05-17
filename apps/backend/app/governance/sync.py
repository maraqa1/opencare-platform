from __future__ import annotations

from dataclasses import dataclass

from app.governance.config_loader import GovernanceUseCaseConfig
from app.governance.policy_loader import PolicyConfig, PolicyMatchConfig


@dataclass(frozen=True)
class GovernanceSeedPayload:
    use_cases: list[dict[str, object]]
    governed_assets: list[dict[str, object]]
    policies: list[dict[str, object]]
    policy_rules: list[dict[str, object]]
    divergence_report: dict[str, object]


def model_to_dict(model: PolicyConfig | PolicyMatchConfig) -> dict[str, object]:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")
    return model.dict()


def build_seed_payload(
    use_cases: list[GovernanceUseCaseConfig],
    policies: list[PolicyConfig],
    legacy_slugs: set[str] | None = None,
) -> GovernanceSeedPayload:
    legacy_slugs = legacy_slugs or set()
    next_slugs = {use_case.slug for use_case in use_cases}

    use_case_rows = [
        {
            "slug": use_case.slug,
            "name": use_case.name,
            "domain": use_case.domain,
            "maturity": use_case.maturity,
            "owner": use_case.ownership.owner,
            "steward": use_case.ownership.steward,
            "review_cadence": use_case.ownership.review_cadence,
            "config_checksum": use_case.checksum,
            "config_source": use_case.source_path,
        }
        for use_case in use_cases
    ]

    asset_rows = [
        {
            "asset_id": table.id,
            "use_case_slug": use_case.slug,
            "asset_type": table.stage,
            "schema_name": table.schema_name,
            "table_name": table.table_name,
            "display_name": f"{table.schema_name}.{table.table_name}",
            "owner": use_case.ownership.owner,
            "steward": use_case.ownership.steward,
            "evidence_source": "governance_use_case_yaml",
        }
        for use_case in use_cases
        for table in use_case.governed_tables
    ]

    policy_rows = [
        {
            "policy_id": policy.policy_id,
            "version": policy.version,
            "name": policy.name,
            "status": policy.status,
            "owner": policy.owner,
            "standard_or_framework": policy.standard_or_framework,
            "raw_definition": {
                key: value
                for key, value in model_to_dict(policy).items()
                if key != "source_path"
            },
        }
        for policy in policies
    ]

    rule_rows = [
        {
            "policy_id": policy.policy_id,
            "policy_version": policy.version,
            "rule_id": rule.rule_id,
            "description": rule.description,
            "classification": rule.classification.value,
            "sensitivity": rule.sensitivity.value,
            "match_definition": model_to_dict(rule.match),
            "actions": rule.actions,
            "requires_review": rule.requires_review,
        }
        for policy in policies
        for rule in policy.rules
    ]

    divergence_report = {
        "missing_from_governance_yaml": sorted(legacy_slugs - next_slugs),
        "new_in_governance_yaml": sorted(next_slugs - legacy_slugs),
        "matched": sorted(next_slugs & legacy_slugs),
    }

    return GovernanceSeedPayload(
        use_cases=use_case_rows,
        governed_assets=asset_rows,
        policies=policy_rows,
        policy_rules=rule_rows,
        divergence_report=divergence_report,
    )
