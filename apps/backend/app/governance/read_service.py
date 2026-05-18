from __future__ import annotations

import json
from datetime import datetime
from fnmatch import fnmatchcase
from pathlib import Path
from typing import Any

from app.config import settings
from app.governance.config_loader import AttributeConfig, GovernedTableConfig, GovernanceUseCaseConfig, load_governance_use_cases
from app.governance.models import (
    AttributeRecord,
    EvidencePackDescriptor,
    EvidenceSource,
    MetricGovernanceRecord,
    PolicyRecord,
    TableGovernanceRecord,
    UseCaseGovernanceRecord,
)
from app.governance.policy_loader import PolicyConfig, PolicyRuleConfig, load_policies, select_policy_rule
from app.governance.resolver import GovernanceResolver
from app.governance.taxonomy import SignalStatus, TrustStatus, derive_trust_status


class GovernanceNotFound(LookupError):
    pass


class GovernanceReadService:
    def __init__(
        self,
        use_cases_dir: Path,
        policies_dir: Path,
        resolver: GovernanceResolver | None = None,
        dbt_manifest_path: Path | None = None,
    ) -> None:
        self.use_cases_dir = use_cases_dir
        self.policies_dir = policies_dir
        self.resolver = resolver or GovernanceResolver()
        self.dbt_manifest_path = dbt_manifest_path or Path(settings.dbt_manifest_path)

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
                attributes=self._table_attributes(use_case, table),
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
                        "dbt catalog artifact is not loaded; YAML-declared attributes are used until observed schema evidence is available.",
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

    def get_attribute(self, attribute_id: str) -> AttributeRecord:
        for use_case in self._use_cases():
            for table in use_case.governed_tables:
                for attribute in self._table_attributes(use_case, table):
                    if attribute.id == attribute_id:
                        return attribute
        raise GovernanceNotFound(f"Governance attribute not found: {attribute_id}")

    def get_lineage(self, slug: str) -> dict[str, object]:
        use_case = self._get_use_case_config(slug)
        dbt_lineage = self._dbt_lineage_for_use_case(use_case)
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
        nodes_by_id = {
            node["id"]: node
            for node in [*source_nodes, *table_nodes, *consumer_nodes]
        }
        for node in dbt_lineage["nodes"]:
            nodes_by_id[node["id"]] = {**nodes_by_id.get(node["id"], {}), **node}
        dbt_evidence_state = "loaded" if dbt_lineage["matched"] else "not_instrumented"
        dbt_evidence_detail = (
            "dbt manifest lineage is loaded for one or more governed table nodes."
            if dbt_lineage["matched"]
            else "dbt manifest artifact is loaded, but no governed table in this use case matched a dbt model/source node."
        )
        if not dbt_lineage["manifest_loaded"]:
            dbt_evidence_state = "no_evidence_loaded"
            dbt_evidence_detail = "dbt manifest artifact is not loaded; observed model edges are unavailable."
        return {
            "use_case_slug": slug,
            "nodes": list(nodes_by_id.values()),
            "edges": dbt_lineage["edges"],
            "evidence": [
                EvidenceSource(
                    source_id=f"{slug}:lineage:declared",
                    source_type="governance_use_case_yaml",
                    state="loaded",
                    detail="Declared source, table, and consumer nodes are loaded from governance use-case YAML.",
                ),
                EvidenceSource(
                    source_id=f"{slug}:lineage:dbt",
                    source_type="dbt_manifest",
                    state=dbt_evidence_state,
                    detail=dbt_evidence_detail,
                ),
            ],
        }

    def list_issues(self) -> list[dict[str, object]]:
        return []

    def get_issue(self, issue_id: str) -> dict[str, object]:
        raise GovernanceNotFound(f"Governance issue not found: {issue_id}")

    def list_evidence_packs(self) -> list[EvidencePackDescriptor]:
        has_attribute_classifications = any(
            table.attributes
            for use_case in self._use_cases()
            for table in use_case.governed_tables
        )
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
                id="metric-definitions",
                name="Metric Definitions",
                description="KPI definitions, formulas, source tables, owners, consumers, and evidence state.",
                state="loaded" if self._use_cases() else "no_evidence_loaded",
                evidence_sources=[
                    EvidenceSource(
                        source_id="governance:metrics",
                        source_type="governance_use_case_yaml",
                        state="loaded" if self._use_cases() else "no_evidence_loaded",
                        detail="Metric definitions are loaded from governed use-case YAML files.",
                    )
                ],
            ),
            EvidencePackDescriptor(
                id="ownership-register",
                name="Ownership Register",
                description="Use-case and table ownership declarations with evidence state.",
                state="loaded" if self._use_cases() else "no_evidence_loaded",
                evidence_sources=[
                    EvidenceSource(
                        source_id="governance:ownership",
                        source_type="governance_use_case_yaml",
                        state="loaded" if self._use_cases() else "no_evidence_loaded",
                        detail="Ownership evidence is loaded from governed use-case YAML files.",
                    )
                ],
            ),
            EvidencePackDescriptor(
                id="classification-register",
                name="Classification Register",
                description="Policy-backed attribute classifications from governed use-case attributes and active policies.",
                state="loaded" if has_attribute_classifications else "not_instrumented",
                evidence_sources=[
                    EvidenceSource(
                        source_id="governance:classification-register",
                        source_type="governance_use_case_yaml+governance_policy_yaml",
                        state="loaded" if has_attribute_classifications else "not_instrumented",
                        detail="Classification register is built from YAML-declared attributes and active policy YAML; dbt catalog remains an additional missing observed-schema source.",
                    )
                ],
            ),
            EvidencePackDescriptor(
                id="freshness-summary",
                name="Freshness Summary",
                description="Freshness signal evidence for governed use cases.",
                state="no_evidence_loaded",
                evidence_sources=[
                    self.resolver.evidence_or_missing(
                        "governance:freshness-summary",
                        "dbt_source_freshness",
                        "dbt source freshness artifact is not loaded; freshness export values are Unknown.",
                    )
                ],
            ),
            EvidencePackDescriptor(
                id="issues-register",
                name="Issues Register",
                description="Governance issue records and lifecycle state.",
                state="no_evidence_loaded",
                evidence_sources=[
                    self.resolver.evidence_or_missing(
                        "governance:issues-register",
                        "governance_issue_store",
                        "Governance issue store returned no loaded issue evidence.",
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

    def _table_attributes(self, use_case: GovernanceUseCaseConfig, table: GovernedTableConfig) -> list[AttributeRecord]:
        policies = [
            policy
            for policy in self._policies()
            if policy.status == "active" and policy.policy_id in set(use_case.policies_in_scope)
        ]
        return [self._attribute_record(use_case, table, attribute, policies) for attribute in table.attributes]

    def _attribute_record(
        self,
        use_case: GovernanceUseCaseConfig,
        table: GovernedTableConfig,
        attribute: AttributeConfig,
        policies: list[PolicyConfig],
    ) -> AttributeRecord:
        matches = self._matching_policy_rules(attribute, policies)
        selected = select_policy_rule([rule for _, rule in matches])
        selected_policy = next((policy for policy, rule in matches if rule is selected), None)
        evidence_state = "loaded" if selected and selected_policy else "unknown"
        evidence_detail = (
            f"Attribute classification is derived from {selected_policy.policy_id} v{selected_policy.version} rule {selected.rule_id}."
            if selected and selected_policy
            else "Attribute is declared in governance use-case YAML, but no active policy rule matched it."
        )
        return AttributeRecord(
            id=f"{table.id}.{attribute.name}",
            table_id=table.id,
            name=attribute.name,
            business_name=attribute.business_name,
            data_type=attribute.data_type,
            description=attribute.description,
            source_table=table.id,
            source_system=self._source_system_label(use_case),
            classification=selected.classification if selected and isinstance(selected, PolicyRuleConfig) else "unknown",
            sensitivity=selected.sensitivity if selected and isinstance(selected, PolicyRuleConfig) else "unknown",
            policy_id=selected_policy.policy_id if selected_policy else None,
            policy_version=selected_policy.version if selected_policy else None,
            matched_rule=selected.rule_id if selected and isinstance(selected, PolicyRuleConfig) else None,
            owner=attribute.owner or use_case.ownership.owner,
            steward=attribute.steward or use_case.ownership.steward,
            review_status=attribute.review_status,
            reviewer=attribute.reviewer,
            last_reviewed=self._parse_optional_datetime(attribute.last_reviewed),
            active_exception=None,
            consumers=[consumer.id for consumer in use_case.consumers],
            lineage_route=f"/governance/use-cases/{use_case.slug}/lineage?node={table.id}",
            history=[],
            evidence=EvidenceSource(
                source_id=f"{use_case.slug}:table:{table.id}:attribute:{attribute.name}",
                source_type="governance_use_case_yaml+governance_policy_yaml" if selected_policy else "governance_use_case_yaml",
                state=evidence_state,
                detail=evidence_detail,
            ),
        )

    def _matching_policy_rules(
        self,
        attribute: AttributeConfig,
        policies: list[PolicyConfig],
    ) -> list[tuple[PolicyConfig, PolicyRuleConfig]]:
        attribute_name = attribute.name.lower()
        semantic_terms = {term.lower() for term in attribute.semantic_terms}
        matches: list[tuple[PolicyConfig, PolicyRuleConfig]] = []
        for policy in policies:
            for rule in policy.rules:
                column_match = any(self._matches_column_pattern(attribute_name, pattern) for pattern in rule.match.column_name_patterns)
                semantic_match = bool(semantic_terms.intersection(term.lower() for term in rule.match.semantic_terms))
                if column_match or semantic_match:
                    matches.append((policy, rule))
        return matches

    def _matches_column_pattern(self, attribute_name: str, pattern: str) -> bool:
        normalized_pattern = pattern.lower()
        if any(token in normalized_pattern for token in ["*", "?", "["]):
            return fnmatchcase(attribute_name, normalized_pattern)
        return attribute_name == normalized_pattern

    def _source_system_label(self, use_case: GovernanceUseCaseConfig) -> str | None:
        names = [source.name for source in use_case.source_systems if source.name]
        if not names:
            return None
        return ", ".join(names)

    def _parse_optional_datetime(self, value: str | None) -> datetime | None:
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def _dbt_lineage_for_use_case(self, use_case: GovernanceUseCaseConfig) -> dict[str, Any]:
        payload = self._dbt_manifest_payload()
        if payload is None:
            return {"manifest_loaded": False, "matched": False, "nodes": [], "edges": []}

        manifest_nodes = {
            key: node
            for key, node in payload.get("nodes", {}).items()
            if isinstance(node, dict) and node.get("resource_type") == "model"
        }
        manifest_nodes.update(
            {
                key: node
                for key, node in payload.get("sources", {}).items()
                if isinstance(node, dict)
            }
        )
        parent_map = payload.get("parent_map", {}) if isinstance(payload.get("parent_map"), dict) else {}
        child_map = payload.get("child_map", {}) if isinstance(payload.get("child_map"), dict) else {}
        governed_table_ids = {table.id for table in use_case.governed_tables}
        matched_keys = {
            key
            for key, node in manifest_nodes.items()
            if self._dbt_node_lineage_id(key, node) in governed_table_ids
        }
        if not matched_keys:
            return {"manifest_loaded": True, "matched": False, "nodes": [], "edges": []}

        selected_keys: set[str] = set(matched_keys)
        for key in list(matched_keys):
            selected_keys.update(self._walk_manifest_lineage(key, parent_map, manifest_nodes))
            selected_keys.update(self._walk_manifest_lineage(key, child_map, manifest_nodes))

        nodes = [
            self._dbt_lineage_node(key, manifest_nodes[key], use_case.slug, governed_table_ids)
            for key in sorted(selected_keys)
            if key in manifest_nodes
        ]
        selected_ids = {node["id"] for node in nodes}
        edges = []
        for child_key, parent_keys in parent_map.items():
            if child_key not in selected_keys or not isinstance(parent_keys, list):
                continue
            for parent_key in parent_keys:
                if parent_key not in selected_keys:
                    continue
                source = self._dbt_node_lineage_id(parent_key, manifest_nodes[parent_key])
                target = self._dbt_node_lineage_id(child_key, manifest_nodes[child_key])
                if source in selected_ids and target in selected_ids:
                    edges.append({"from": source, "to": target, "evidence_source": "dbt observed"})
        return {"manifest_loaded": True, "matched": True, "nodes": nodes, "edges": edges}

    def _dbt_manifest_payload(self) -> dict[str, Any] | None:
        if not self.dbt_manifest_path.is_file():
            return None
        payload = json.loads(self.dbt_manifest_path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None

    def _walk_manifest_lineage(
        self,
        key: str,
        lineage_map: dict[str, Any],
        manifest_nodes: dict[str, dict[str, Any]],
        visited: set[str] | None = None,
    ) -> set[str]:
        visited = visited or set()
        if key in visited:
            return set()
        visited.add(key)
        results: set[str] = set()
        for next_key in lineage_map.get(key, []):
            if next_key not in manifest_nodes:
                continue
            results.add(next_key)
            results.update(self._walk_manifest_lineage(next_key, lineage_map, manifest_nodes, visited))
        return results

    def _dbt_lineage_node(
        self,
        key: str,
        node: dict[str, Any],
        slug: str,
        governed_table_ids: set[str],
    ) -> dict[str, object]:
        node_id = self._dbt_node_lineage_id(key, node)
        kind = self._dbt_node_stage(node)
        payload: dict[str, object] = {
            "id": node_id,
            "label": node.get("name") or node.get("alias") or key.split(".")[-1],
            "kind": kind,
            "evidence_source": "dbt observed",
            "dbt_node_id": key,
        }
        if node_id in governed_table_ids:
            payload["detail_route"] = f"/governance/use-cases/{slug}/tables/{node_id}"
        return payload

    def _dbt_node_lineage_id(self, key: str, node: dict[str, Any]) -> str:
        schema_name = node.get("schema")
        table_name = node.get("alias") or node.get("name")
        if schema_name and table_name:
            return f"{schema_name}.{table_name}"
        if node.get("source_name") and table_name:
            return f"{node['source_name']}.{table_name}"
        return key

    def _dbt_node_stage(self, node: dict[str, Any]) -> str:
        resource_type = node.get("resource_type")
        if resource_type == "source" or node.get("source_name"):
            return "source"
        schema_name = node.get("schema")
        name = str(node.get("name") or "")
        if schema_name == settings.output_schema:
            return "output"
        if schema_name == settings.staging_schema or name.startswith("stg_"):
            return "staging"
        if schema_name == settings.analytics_schema or name.startswith(("fct_", "fact_", "dim_", "dict_")):
            return "analytics"
        return "analytics"

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
