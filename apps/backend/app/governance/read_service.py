from __future__ import annotations

from pathlib import Path
from typing import Any

from app.governance.config_loader import GovernanceUseCaseConfig, load_governance_use_cases
from app.governance.models import (
    EvidencePackDescriptor,
    EvidenceSource,
    MetricGovernanceRecord,
    PolicyRecord,
    TableGovernanceRecord,
    UseCaseGovernanceRecord,
)
from app.governance.policy_loader import PolicyConfig, load_policies
from app.governance.resolver import GovernanceResolver
from app.governance.taxonomy import SignalStatus, TrustStatus, derive_trust_status


class GovernanceNotFound(LookupError):
    pass


class GovernanceReadService:
    def __init__(self, use_cases_dir: Path, policies_dir: Path, resolver: GovernanceResolver | None = None) -> None:
        self.use_cases_dir = use_cases_dir
        self.policies_dir = policies_dir
        self.resolver = resolver or GovernanceResolver()

    def _use_cases(self) -> list[GovernanceUseCaseConfig]:
        return load_governance_use_cases(self.use_cases_dir)

    def _policies(self) -> list[PolicyConfig]:
        return load_policies(self.policies_dir)

    def _get_use_case_config(self, slug: str) -> GovernanceUseCaseConfig:
        for use_case in self._use_cases():
            if use_case.slug == slug:
                return use_case
        raise GovernanceNotFound(f"Governance use case not found: {slug}")

    def list_use_cases(self) -> list[UseCaseGovernanceRecord]:
        return [self.get_use_case(use_case.slug) for use_case in self._use_cases()]

    def get_use_case(self, slug: str) -> UseCaseGovernanceRecord:
        use_case = self._get_use_case_config(slug)
        signals = [
            self.resolver.unknown_signal("freshness", f"{slug}:freshness"),
            self.resolver.unknown_signal("quality", f"{slug}:quality"),
            self.resolver.unknown_signal("coverage", f"{slug}:coverage"),
        ]
        signals.append(
            self.resolver.unknown_signal("ownership", f"{slug}:ownership")
            if not use_case.ownership.owner or not use_case.ownership.steward
            else self.resolver.loaded_signal(
                "ownership",
                f"{slug}:ownership",
                "governance_use_case_yaml",
                "Owner and steward are declared in governance use-case YAML.",
                SignalStatus.PASS,
            )
        )
        return UseCaseGovernanceRecord(
            slug=use_case.slug,
            name=use_case.name,
            domain=use_case.domain,
            maturity=use_case.maturity,
            owner=use_case.ownership.owner,
            steward=use_case.ownership.steward,
            trust_status=derive_trust_status(
                freshness=signals[0].status,
                quality=signals[1].status,
                coverage=signals[2].status,
                ownership=signals[3].status,
            ),
            signals=signals,
        )

    def list_metrics(self, slug: str) -> list[MetricGovernanceRecord]:
        use_case = self._get_use_case_config(slug)
        return [
            MetricGovernanceRecord(
                id=kpi.id,
                use_case_slug=use_case.slug,
                name=kpi.name,
                definition=kpi.definition,
                formula=kpi.formula,
                owner=kpi.owner,
                source_table_id=kpi.source_table,
                consumers=kpi.consumers,
                trust_status=TrustStatus.UNKNOWN,
                evidence=[
                    EvidenceSource(
                        source_id=f"{use_case.slug}:kpi:{kpi.id}",
                        source_type="governance_use_case_yaml",
                        state="loaded",
                        detail="Metric declaration is loaded from governance use-case YAML.",
                    ),
                    self.resolver.evidence_or_missing(
                        f"{use_case.slug}:kpi:{kpi.id}:quality",
                        "dbt_run_results",
                        "dbt run_results artifact is not loaded for metric quality evidence.",
                    ),
                ],
            )
            for kpi in use_case.kpis
        ]

    def get_metric(self, slug: str, metric_id: str) -> MetricGovernanceRecord:
        for metric in self.list_metrics(slug):
            if metric.id == metric_id:
                return metric
        raise GovernanceNotFound(f"Governance metric not found: {slug}/{metric_id}")

    def list_tables(self, slug: str) -> list[TableGovernanceRecord]:
        use_case = self._get_use_case_config(slug)
        consumer_ids = [consumer.id for consumer in use_case.consumers]
        return [
            TableGovernanceRecord(
                id=table.id,
                use_case_slug=use_case.slug,
                name=f"{table.schema_name}.{table.table_name}",
                schema_name=table.schema_name,
                table_name=table.table_name,
                owner=use_case.ownership.owner,
                steward=use_case.ownership.steward,
                consumers=consumer_ids,
                trust_status=TrustStatus.UNKNOWN,
                attributes=[],
                evidence=[
                    EvidenceSource(
                        source_id=f"{use_case.slug}:table:{table.id}",
                        source_type="governance_use_case_yaml",
                        state="loaded",
                        detail="Table declaration is loaded from governance use-case YAML.",
                    ),
                    self.resolver.evidence_or_missing(
                        f"{use_case.slug}:table:{table.id}:catalog",
                        "dbt_catalog",
                        "dbt catalog artifact is not loaded; attributes are unavailable.",
                    ),
                    self.resolver.evidence_or_missing(
                        f"{use_case.slug}:table:{table.id}:quality",
                        "dbt_run_results",
                        "dbt run_results artifact is not loaded; quality status is Unknown.",
                    ),
                ],
            )
            for table in use_case.governed_tables
        ]

    def get_table(self, slug: str, table_id: str) -> TableGovernanceRecord:
        for table in self.list_tables(slug):
            if table.id == table_id:
                return table
        raise GovernanceNotFound(f"Governance table not found: {slug}/{table_id}")

    def get_attribute(self, attribute_id: str) -> dict[str, object]:
        raise GovernanceNotFound(f"Governance attribute evidence is not loaded: {attribute_id}")

    def get_lineage(self, slug: str) -> dict[str, object]:
        use_case = self._get_use_case_config(slug)
        source_nodes = [
            {
                "id": f"source:{source.id}",
                "label": source.name,
                "kind": "source",
                "evidence_source": "use-case declared",
            }
            for source in use_case.source_systems
        ]
        table_nodes = [
            {
                "id": table.id,
                "label": f"{table.schema_name}.{table.table_name}",
                "kind": table.stage,
                "evidence_source": "use-case declared",
                "detail_route": f"/governance/use-cases/{slug}/tables/{table.id}",
            }
            for table in use_case.governed_tables
        ]
        consumer_nodes = [
            {
                "id": f"consumer:{consumer.id}",
                "label": consumer.name,
                "kind": consumer.type,
                "evidence_source": "use-case declared",
                "link": consumer.link,
            }
            for consumer in use_case.consumers
        ]
        return {
            "use_case_slug": slug,
            "nodes": [*source_nodes, *table_nodes, *consumer_nodes],
            "edges": [],
            "evidence": [
                EvidenceSource(
                    source_id=f"{slug}:lineage:declared",
                    source_type="governance_use_case_yaml",
                    state="loaded",
                    detail="Declared source, table, and consumer nodes are loaded from governance use-case YAML.",
                ),
                self.resolver.evidence_or_missing(
                    f"{slug}:lineage:dbt",
                    "dbt_manifest",
                    "dbt manifest artifact is not loaded; observed model edges are unavailable.",
                ),
            ],
        }

    def list_issues(self) -> list[dict[str, object]]:
        return []

    def get_issue(self, issue_id: str) -> dict[str, object]:
        raise GovernanceNotFound(f"Governance issue not found: {issue_id}")

    def list_evidence_packs(self) -> list[EvidencePackDescriptor]:
        return [
            EvidencePackDescriptor(
                id="asset-inventory",
                name="Asset Inventory",
                description="Governed use cases and declared governed tables.",
                state="loaded" if self._use_cases() else "no_evidence_loaded",
                evidence_sources=[
                    EvidenceSource(
                        source_id="governance:use-cases",
                        source_type="governance_use_case_yaml",
                        state="loaded" if self._use_cases() else "no_evidence_loaded",
                        detail="Evidence pack descriptor is based on loaded governance use-case YAML files.",
                    )
                ],
            ),
            EvidencePackDescriptor(
                id="classification-register",
                name="Classification Register",
                description="Policy-backed attribute classifications when catalog evidence is loaded.",
                state="not_instrumented",
                evidence_sources=[
                    self.resolver.evidence_or_missing(
                        "governance:classification-register",
                        "dbt_catalog",
                        "Attribute catalog evidence is not loaded; classification register export is not instrumented.",
                    )
                ],
            ),
        ]

    def list_policies(self) -> list[PolicyRecord]:
        return [self._policy_record(policy) for policy in self._policies()]

    def get_policy(self, policy_id: str) -> PolicyRecord:
        for policy in self._policies():
            if policy.policy_id == policy_id:
                return self._policy_record(policy)
        raise GovernanceNotFound(f"Governance policy not found: {policy_id}")

    def _policy_record(self, policy: PolicyConfig) -> PolicyRecord:
        return PolicyRecord(
            policy_id=policy.policy_id,
            name=policy.name,
            version=policy.version,
            status=policy.status,
            owner=policy.owner,
            standard_or_framework=policy.standard_or_framework,
            scope=policy.scope,
            rules=[self._rule_payload(rule) for rule in policy.rules],
            evidence=EvidenceSource(
                source_id=f"policy:{policy.policy_id}:{policy.version}",
                source_type="governance_policy_yaml",
                state="loaded",
                detail="Policy definition is loaded from governance policy YAML.",
            ),
        )

    def _rule_payload(self, rule: Any) -> dict[str, object]:
        return {
            "rule_id": rule.rule_id,
            "description": rule.description,
            "match": {
                "column_name_patterns": rule.match.column_name_patterns,
                "semantic_terms": rule.match.semantic_terms,
            },
            "classification": rule.classification.value,
            "sensitivity": rule.sensitivity.value,
            "actions": rule.actions,
            "requires_review": rule.requires_review,
        }

    def list_audit_events(self) -> list[dict[str, object]]:
        return []
