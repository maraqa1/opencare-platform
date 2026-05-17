from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal

from app.governance.models import EvidenceSource, GovernanceSignal, UseCaseGovernanceRecord
from app.governance.taxonomy import SignalStatus, derive_trust_status


@dataclass(frozen=True)
class MissingEvidence:
    source_id: str
    source_type: str
    detail: str
    state: str = "no_evidence_loaded"

    def as_source(self) -> EvidenceSource:
        return EvidenceSource(
            source_id=self.source_id,
            source_type=self.source_type,
            state="no_evidence_loaded",
            detail=self.detail,
        )


class GovernanceResolver:
    """Resolver-only entry point for Data Governance facts.

    Phase 1 does not connect real stores yet. It establishes the contract that
    missing evidence must remain explicit and must not become a fake pass.
    """

    def __init__(self, evidence_sources: Iterable[EvidenceSource] | None = None) -> None:
        self.evidence_sources = {source.source_id: source for source in evidence_sources or []}

    def evidence_or_missing(self, source_id: str, source_type: str, detail: str) -> EvidenceSource:
        return self.evidence_sources.get(
            source_id,
            MissingEvidence(source_id=source_id, source_type=source_type, detail=detail).as_source(),
        )

    def unknown_signal(
        self,
        name: Literal["freshness", "quality", "ownership", "coverage"],
        source_id: str,
    ) -> GovernanceSignal:
        return GovernanceSignal(
            name=name,
            status=SignalStatus.UNKNOWN,
            evidence=self.evidence_or_missing(
                source_id=source_id,
                source_type="resolver",
                detail="Evidence source is not configured or has not been loaded.",
            ),
        )

    def loaded_signal(
        self,
        name: Literal["freshness", "quality", "ownership", "coverage"],
        source_id: str,
        source_type: str,
        detail: str,
        status: SignalStatus,
    ) -> GovernanceSignal:
        return GovernanceSignal(
            name=name,
            status=status,
            evidence=EvidenceSource(
                source_id=source_id,
                source_type=source_type,
                state="loaded",
                detail=detail,
            ),
        )

    def empty_use_case_record(self, slug: str, name: str) -> UseCaseGovernanceRecord:
        signals = [
            self.unknown_signal("freshness", f"{slug}:freshness"),
            self.unknown_signal("quality", f"{slug}:quality"),
            self.unknown_signal("ownership", f"{slug}:ownership"),
            self.unknown_signal("coverage", f"{slug}:coverage"),
        ]
        return UseCaseGovernanceRecord(
            slug=slug,
            name=name,
            trust_status=derive_trust_status(
                freshness=signals[0].status,
                quality=signals[1].status,
                ownership=signals[2].status,
                coverage=signals[3].status,
            ),
            signals=signals,
        )
