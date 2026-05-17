from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, ValidationError, validator

from app.governance.taxonomy import Classification, Sensitivity, most_restrictive_classification


class GovernancePolicyError(ValueError):
    pass


class PolicyMatchConfig(BaseModel):
    column_name_patterns: list[str] = Field(default_factory=list)
    semantic_terms: list[str] = Field(default_factory=list)


class PolicyRuleConfig(BaseModel):
    rule_id: str
    description: str
    match: PolicyMatchConfig
    classification: Classification
    sensitivity: Sensitivity
    actions: list[str] = Field(default_factory=list)
    requires_review: bool = False
    scope_specificity: int = 0

    @validator("match")
    def require_match_criteria(cls, value: PolicyMatchConfig) -> PolicyMatchConfig:
        if not value.column_name_patterns and not value.semantic_terms:
            raise ValueError("rule match requires column_name_patterns or semantic_terms")
        return value


class PolicyConfig(BaseModel):
    policy_id: str
    name: str
    version: str
    status: Literal["draft", "active", "retired", "superseded"]
    owner: str
    standard_or_framework: str
    scope: list[str]
    classification_levels: list[Classification]
    rules: list[PolicyRuleConfig]
    source_path: str | None = None

    @validator("scope", "classification_levels", "rules")
    def require_non_empty(cls, value: list[Any]) -> list[Any]:
        if not value:
            raise ValueError("must contain at least one item")
        return value


class ClassificationException(BaseModel):
    classification: Classification
    sensitivity: Sensitivity
    reason: str


def load_policy(path: Path) -> PolicyConfig:
    try:
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(payload, dict):
            raise GovernancePolicyError(f"{path} must contain a YAML mapping")
        policy = PolicyConfig(**payload)
        policy.source_path = str(path)
        return policy
    except ValidationError as exc:
        raise GovernancePolicyError(f"Invalid governance policy YAML: {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise GovernancePolicyError(f"Invalid YAML syntax: {path}: {exc}") from exc


def load_policies(root: Path) -> list[PolicyConfig]:
    if not root.exists():
        return []
    if not root.is_dir():
        raise GovernancePolicyError(f"Governance policy path is not a directory: {root}")
    return [load_policy(path) for path in sorted(root.glob("*.yaml"))]


def select_policy_rule(
    matches: list[PolicyRuleConfig],
    exception: ClassificationException | None = None,
) -> PolicyRuleConfig | ClassificationException | None:
    if exception is not None:
        return exception
    if not matches:
        return None

    most_restrictive = most_restrictive_classification([match.classification for match in matches])
    restrictive_matches = [match for match in matches if match.classification == most_restrictive]
    return sorted(
        restrictive_matches,
        key=lambda match: (match.scope_specificity, match.rule_id),
        reverse=True,
    )[0]
