from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.governance.taxonomy import Classification, Sensitivity, Severity, SignalStatus, TrustStatus


EvidenceState = Literal["loaded", "unknown", "not_configured", "not_instrumented", "no_evidence_loaded"]


class EvidenceSource(BaseModel):
    source_id: str
    source_type: str
    state: EvidenceState = "unknown"
    detail: str | None = None


class GovernanceSignal(BaseModel):
    name: Literal["freshness", "quality", "ownership", "coverage"]
    status: SignalStatus
    evidence: EvidenceSource


class UseCaseGovernanceRecord(BaseModel):
    slug: str
    name: str
    domain: str | None = None
    maturity: str | None = None
    owner: str | None = None
    steward: str | None = None
    trust_status: TrustStatus = TrustStatus.UNKNOWN
    signals: list[GovernanceSignal] = Field(default_factory=list)


class MetricGovernanceRecord(BaseModel):
    id: str
    use_case_slug: str
    name: str
    definition: str | None = None
    formula: str | None = None
    owner: str | None = None
    source_table_id: str | None = None
    consumers: list[str] = Field(default_factory=list)
    trust_status: TrustStatus = TrustStatus.UNKNOWN
    evidence: list[EvidenceSource] = Field(default_factory=list)


class AttributeRecord(BaseModel):
    id: str
    table_id: str
    name: str
    business_name: str | None = None
    data_type: str | None = None
    description: str | None = None
    classification: Classification | Literal["unknown"] = "unknown"
    sensitivity: Sensitivity | Literal["unknown"] = "unknown"
    policy_id: str | None = None
    policy_version: str | None = None
    matched_rule: str | None = None
    review_status: str = "unknown"
    last_reviewed: datetime | None = None
    evidence: EvidenceSource


class TableGovernanceRecord(BaseModel):
    id: str
    use_case_slug: str
    name: str
    schema_name: str | None = None
    table_name: str | None = None
    owner: str | None = None
    steward: str | None = None
    consumers: list[str] = Field(default_factory=list)
    trust_status: TrustStatus = TrustStatus.UNKNOWN
    attributes: list[AttributeRecord] = Field(default_factory=list)
    evidence: list[EvidenceSource] = Field(default_factory=list)


class IssueRecord(BaseModel):
    id: str
    issue_type: str
    status: Literal["open", "assigned", "resolved", "ignored"]
    severity: Severity
    use_case_slug: str | None = None
    impacted_asset_id: str | None = None
    title: str
    description: str | None = None
    assigned_owner: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PolicyRecord(BaseModel):
    policy_id: str
    name: str
    version: str
    status: Literal["draft", "active", "retired", "superseded"]
    owner: str | None = None
    standard_or_framework: str | None = None
    scope: list[str] = Field(default_factory=list)
    rules: list[dict[str, Any]] = Field(default_factory=list)
    evidence: EvidenceSource


class AuditEvent(BaseModel):
    id: str | None = None
    actor: str
    role: str
    event_type: str
    target_type: str
    target_id: str
    use_case_slug: str | None = None
    before_state: dict[str, Any] | None = None
    after_state: dict[str, Any] | None = None
    reason: str | None = None
    request_id: str | None = None
    approval_chain: list[dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime | None = None


class ExceptionRecord(BaseModel):
    id: str
    target_type: str
    target_id: str
    owner: str
    reason: str
    expiry_date: datetime
    status: Literal["active", "expired", "revoked"]
    evidence: EvidenceSource


class EvidencePackDescriptor(BaseModel):
    id: str
    name: str
    description: str
    state: EvidenceState = "unknown"
    evidence_sources: list[EvidenceSource] = Field(default_factory=list)

