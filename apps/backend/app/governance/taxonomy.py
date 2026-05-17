from __future__ import annotations

from enum import StrEnum


class TrustStatus(StrEnum):
    TRUSTED = "trusted"
    IN_PROGRESS = "in_progress"
    NEEDS_REVIEW = "needs_review"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


class Classification(StrEnum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class Sensitivity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SignalStatus(StrEnum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"
    UNKNOWN = "unknown"


CLASSIFICATION_PRECEDENCE = {
    Classification.PUBLIC: 0,
    Classification.INTERNAL: 1,
    Classification.CONFIDENTIAL: 2,
    Classification.RESTRICTED: 3,
}


def most_restrictive_classification(values: list[Classification]) -> Classification | None:
    if not values:
        return None
    return max(values, key=lambda item: CLASSIFICATION_PRECEDENCE[item])


def derive_trust_status(
    *,
    freshness: SignalStatus,
    quality: SignalStatus,
    ownership: SignalStatus,
    coverage: SignalStatus,
) -> TrustStatus:
    signals = [freshness, quality, ownership, coverage]
    if SignalStatus.UNKNOWN in signals:
        return TrustStatus.UNKNOWN
    if SignalStatus.FAIL in signals:
        return TrustStatus.DEGRADED
    if SignalStatus.WARN in signals:
        return TrustStatus.NEEDS_REVIEW
    if all(signal is SignalStatus.PASS for signal in signals):
        return TrustStatus.TRUSTED
    return TrustStatus.UNKNOWN


def normalise_signal(value: str | None) -> SignalStatus:
    if value is None:
        return SignalStatus.UNKNOWN

    normalized = value.strip().lower().replace("-", "_")
    aliases = {
        "ok": SignalStatus.PASS,
        "pass": SignalStatus.PASS,
        "passed": SignalStatus.PASS,
        "fresh": SignalStatus.PASS,
        "complete": SignalStatus.PASS,
        "assigned": SignalStatus.PASS,
        "warn": SignalStatus.WARN,
        "warning": SignalStatus.WARN,
        "partial": SignalStatus.WARN,
        "in_progress": SignalStatus.WARN,
        "needs_review": SignalStatus.WARN,
        "fail": SignalStatus.FAIL,
        "failed": SignalStatus.FAIL,
        "failing": SignalStatus.FAIL,
        "stale": SignalStatus.FAIL,
        "missing": SignalStatus.FAIL,
        "unknown": SignalStatus.UNKNOWN,
        "not_configured": SignalStatus.UNKNOWN,
        "not_instrumented": SignalStatus.UNKNOWN,
        "no_evidence_loaded": SignalStatus.UNKNOWN,
        "not_connected": SignalStatus.UNKNOWN,
    }
    return aliases.get(normalized, SignalStatus.UNKNOWN)

