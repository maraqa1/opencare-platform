from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, ValidationError, validator


class GovernanceConfigError(ValueError):
    pass


class OwnershipConfig(BaseModel):
    owner: str
    steward: str
    review_cadence: str


class GovernedTableConfig(BaseModel):
    id: str
    schema_name: str = Field(alias="schema")
    table_name: str = Field(alias="table")
    stage: Literal["source", "raw", "staging", "analytics", "output", "consumption"]
    description: str | None = None


class KpiConfig(BaseModel):
    id: str
    name: str
    definition: str
    formula: str | None = None
    owner: str | None = None
    source_table: str
    consumers: list[str] = Field(default_factory=list)


class GovernanceUseCaseConfig(BaseModel):
    slug: str
    name: str
    domain: str
    maturity: str
    ownership: OwnershipConfig
    source_systems: list[str]
    governed_tables: list[GovernedTableConfig]
    kpis: list[KpiConfig]
    policies_in_scope: list[str]
    consumers: list[str]
    freshness_sla: str
    checksum: str | None = None
    source_path: str | None = None

    @validator("source_systems", "governed_tables", "kpis", "policies_in_scope", "consumers")
    def require_non_empty(cls, value: list[Any]) -> list[Any]:
        if not value:
            raise ValueError("must contain at least one item")
        return value


def checksum_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_governance_use_case(path: Path) -> GovernanceUseCaseConfig:
    try:
        raw = path.read_bytes()
        payload = yaml.safe_load(raw) or {}
        if not isinstance(payload, dict):
            raise GovernanceConfigError(f"{path} must contain a YAML mapping")
        config = GovernanceUseCaseConfig(**payload)
        config.checksum = checksum_bytes(raw)
        config.source_path = str(path)
        return config
    except ValidationError as exc:
        raise GovernanceConfigError(f"Invalid governance use-case YAML: {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise GovernanceConfigError(f"Invalid YAML syntax: {path}: {exc}") from exc


def load_governance_use_cases(root: Path) -> list[GovernanceUseCaseConfig]:
    if not root.exists():
        return []
    if not root.is_dir():
        raise GovernanceConfigError(f"Governance use-case path is not a directory: {root}")

    configs = [load_governance_use_case(path) for path in sorted(root.glob("*.yaml"))]
    slugs = [config.slug for config in configs]
    duplicates = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    if duplicates:
        raise GovernanceConfigError(f"Duplicate governance use-case slug(s): {', '.join(duplicates)}")
    return configs
