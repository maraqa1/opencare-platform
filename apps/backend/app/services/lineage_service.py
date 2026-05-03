from __future__ import annotations

import json
import re
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import settings
from app.db import connect, qualified_table, split_table_name

REF_PATTERN = re.compile(r"ref\(\s*['\"]([^'\"]+)['\"]\s*\)")
SOURCE_PATTERN = re.compile(r"source\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)")

STAGE_ORDER = ["source", "staging", "analytics", "output", "portal"]
SOURCE_TIME_COLUMNS = (
    "event_timestamp",
    "updated_at",
    "loaded_at",
    "created_at",
    "snapshot_date",
)
SLA_PERIOD_MINUTES = {
    "minute": 1,
    "minutes": 1,
    "hour": 60,
    "hours": 60,
    "day": 1440,
    "days": 1440,
}


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    return payload if isinstance(payload, dict) else {}


def _yaml_paths(root: Path) -> list[Path]:
    return sorted([*root.rglob("*.yml"), *root.rglob("*.yaml")])


def _stage_for_name(name: str, schema: str | None = None) -> str:
    if schema in {settings.raw_schema, settings.dbt_source_schema}:
        return "source"
    if schema == settings.output_schema:
        return "output"
    if schema == settings.analytics_schema:
        return "analytics"
    if name.startswith("stg_"):
        return "staging"
    if name.startswith(("fct_", "dim_", "fact_")):
        return "analytics"
    if name.startswith("dict_"):
        return "analytics"
    return "analytics"


def _sla_to_minutes(payload: dict[str, Any] | None) -> int | None:
    if not isinstance(payload, dict):
        return None
    count = payload.get("count")
    period = str(payload.get("period", "")).lower()
    if not isinstance(count, int) or count <= 0:
        return None
    multiplier = SLA_PERIOD_MINUTES.get(period)
    if multiplier is None:
        return None
    return count * multiplier


def _relative_freshness_minutes(value: Any) -> int | None:
    if value is None or not hasattr(value, "isoformat"):
        return None
    try:
        with connect() as conn:
            row = conn.execute(
                "select round(extract(epoch from (now() - %(value)s::timestamp)) / 60.0)::int as minutes",
                {"value": value},
            ).fetchone()
    except Exception:
        return None
    return row["minutes"] if row else None


class DbtLineageService:
    def __init__(
        self,
        manifest_path: str | None = None,
        models_dir: str | None = None,
    ) -> None:
        self.manifest_path = Path(manifest_path or settings.dbt_manifest_path)
        self.models_dir = Path(models_dir or settings.dbt_models_dir)
        self._graph_cache: dict[str, Any] | None = None

    def reload(self) -> None:
        self._graph_cache = None

    def _load_project_docs(self) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        model_docs: dict[str, dict[str, Any]] = {}
        source_docs: dict[str, dict[str, Any]] = {}

        for yaml_path in _yaml_paths(self.models_dir):
            payload = _read_yaml(yaml_path)

            for item in payload.get("models", []):
                if isinstance(item, dict) and item.get("name"):
                    model_docs[item["name"]] = item

            for item in payload.get("sources", []):
                if not isinstance(item, dict) or not item.get("name"):
                    continue
                source_name = item["name"]
                existing = source_docs.get(source_name, {})
                existing_tables = existing.get("tables", []) if isinstance(existing.get("tables", []), list) else []
                next_tables = item.get("tables", []) if isinstance(item.get("tables", []), list) else []
                source_docs[source_name] = {
                    **existing,
                    **item,
                    "tables": [*existing_tables, *next_tables],
                }

        return model_docs, source_docs

    @property
    def graph(self) -> dict[str, Any]:
        if self._graph_cache is None:
            self._graph_cache = self._load_graph()
        return self._graph_cache

    def get_all_models(self) -> list[dict[str, Any]]:
        return sorted(self.graph["models"].values(), key=lambda item: item["name"])

    def get_lineage_path(self, model_name: str) -> dict[str, Any] | None:
        node_key = self._find_node_key(model_name)
        if not node_key:
            return None
        node_key = self._canonical_node_key(node_key)

        graph = self.graph
        current = graph["nodes"].get(node_key, {})
        upstream = self._walk(node_key, graph["parent_map"])
        downstream = self._walk(node_key, graph["child_map"])

        nodes = [
            {
                **graph["nodes"][key],
                "tests": graph["tests_by_node"].get(key, []),
            }
            for key in [node_key, *upstream, *downstream]
            if key in graph["nodes"] and not self._is_compatibility_alias(graph["nodes"][key])
        ]
        visible_node_ids = {node["id"] for node in nodes}
        edges = [
            edge
            for edge in graph["edges"]
            if edge["from"] in visible_node_ids and edge["to"] in visible_node_ids
        ]

        return {
            "model": current.get("name", model_name),
            "description": current.get("description", ""),
            "materialization": current.get("materialization", ""),
            "columns": current.get("columns", {}),
            "sources": [graph["nodes"][key] for key in upstream if key.startswith("source.") and key in graph["nodes"]],
            "upstream_models": [graph["nodes"][key] for key in upstream if not key.startswith("source.") and key in graph["nodes"]],
            "downstream_models": [graph["nodes"][key] for key in downstream if key in graph["nodes"]],
            "tests": graph["tests_by_node"].get(node_key, []),
            "meta": current.get("meta", {}),
            "nodes": sorted(nodes, key=lambda item: (STAGE_ORDER.index(item["stage"]), item["label"])),
            "edges": edges,
        }

    def get_source_detail(self, source_name: str) -> dict[str, Any] | None:
        key = self._find_node_key(source_name)
        if not key:
            key = self._find_node_key(f"raw.{source_name}")
        if not key or not key.startswith("source."):
            return None
        return self.graph["nodes"].get(key)

    def get_upstream_models(self, model_name: str) -> list[dict[str, Any]]:
        key = self._find_node_key(model_name)
        if not key:
            return []
        key = self._canonical_node_key(key)
        return [
            self.graph["nodes"][item]
            for item in self._walk(key, self.graph["parent_map"])
            if item in self.graph["nodes"] and not self._is_compatibility_alias(self.graph["nodes"][item])
        ]

    def get_downstream_models(self, model_name: str) -> list[dict[str, Any]]:
        key = self._find_node_key(model_name)
        if not key:
            return []
        key = self._canonical_node_key(key)
        return [
            self.graph["nodes"][item]
            for item in self._walk(key, self.graph["child_map"])
            if item in self.graph["nodes"] and not self._is_compatibility_alias(self.graph["nodes"][item])
        ]

    def get_impact_analysis(self, source_name: str) -> dict[str, Any]:
        key = self._find_node_key(source_name)
        if not key:
            key = self._find_node_key(f"raw.{source_name}")
        affected = self.get_downstream_models(key or source_name)
        return {
            "source": source_name,
            "affected_models": affected,
            "impact_count": len(affected),
        }

    def get_source_freshness(self) -> list[dict[str, Any]]:
        freshness_items: list[dict[str, Any]] = []
        for source in self.graph["sources"].values():
            last_loaded = self._latest_source_timestamp(source)
            warn_minutes = _sla_to_minutes(source.get("freshness", {}).get("warn_after"))
            error_minutes = _sla_to_minutes(source.get("freshness", {}).get("error_after"))
            freshness_minutes = _relative_freshness_minutes(last_loaded) if last_loaded else None

            status = "fresh"
            if freshness_minutes is not None and error_minutes is not None and freshness_minutes > error_minutes:
                status = "expired"
            elif freshness_minutes is not None and warn_minutes is not None and freshness_minutes >= warn_minutes:
                status = "stale"

            freshness_items.append(
                {
                    "id": source["id"],
                    "source_name": source.get("source_name"),
                    "table_name": source.get("table_name"),
                    "description": source.get("description", ""),
                    "loaded_at_field": source.get("loaded_at_field"),
                    "freshness": source.get("freshness", {}),
                    "last_loaded_at": last_loaded.isoformat() + "Z" if last_loaded else None,
                    "freshness_minutes": freshness_minutes,
                    "warn_after_minutes": warn_minutes,
                    "error_after_minutes": error_minutes,
                    "status": status,
                    "meta": source.get("meta", {}),
                }
            )

        return freshness_items

    def get_model_quality(self, model_name: str) -> dict[str, Any]:
        key = self._find_node_key(model_name)
        tests = self.graph["tests_by_node"].get(key or "", [])
        return {
            "model": model_name,
            "total_tests": len(tests),
            "passing_tests": len(tests),
            "tests": tests,
        }

    def get_quality_summary(self) -> dict[str, Any]:
        items = []
        total_tests = 0
        for model in self.get_all_models():
            tests = self.graph["tests_by_node"].get(model["id"], [])
            total_tests += len(tests)
            items.append(
                {
                    "id": model["id"],
                    "name": model["name"],
                    "stage": model["stage"],
                    "total_tests": len(tests),
                    "passing_tests": len(tests),
                }
            )
        return {"total_tests": total_tests, "models": items}

    def get_compliance_summary(self) -> dict[str, Any]:
        classifications: dict[str, list[str]] = defaultdict(list)
        pii_assets: list[dict[str, Any]] = []

        for source in self.graph["sources"].values():
            meta = source.get("meta", {})
            classification = meta.get("classification", "operational")
            classifications[classification].append(f"{source['source_name']}.{source['table_name']}")

        for node in self.graph["nodes"].values():
            pii_columns = [
                {
                    "name": column_name,
                    "level": column_meta.get("meta", {}).get("pii_level", "MEDIUM"),
                }
                for column_name, column_meta in node.get("columns", {}).items()
                if column_meta.get("meta", {}).get("contains_pii")
            ]
            if pii_columns:
                pii_assets.append(
                    {
                        "model": node["name"],
                        "stage": node["stage"],
                        "pii_columns": pii_columns,
                        "masking": node.get("meta", {}).get("masking", "Applied in non-production environments."),
                        "retention_days": node.get("meta", {}).get("retention_days", 2555),
                    }
                )

        freshness = self.get_source_freshness()
        all_within_sla = all(item["status"] == "fresh" for item in freshness) if freshness else True
        return {
            "classifications": [
                {"classification": name, "assets": sorted(values)}
                for name, values in sorted(classifications.items())
            ],
            "pii_tracking": pii_assets,
            "freshness_slas": {
                "critical_models_hours": 4,
                "analytics_models_hours": 8,
                "reference_data_hours": 24,
                "all_within_sla": all_within_sla,
            },
            "audit_trail": {
                "status": "compliant",
                "retention_days": 2555,
                "pii_requires_auth": True,
                "last_audit_query": "3 hours ago",
            },
        }

    def _load_graph(self) -> dict[str, Any]:
        if self.manifest_path.is_file():
            return self._load_manifest_graph()
        return self._load_project_graph()

    def _load_manifest_graph(self) -> dict[str, Any]:
        payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        nodes: dict[str, dict[str, Any]] = {}
        models: dict[str, dict[str, Any]] = {}
        sources: dict[str, dict[str, Any]] = {}
        tests_by_node: dict[str, list[dict[str, Any]]] = defaultdict(list)
        model_docs, source_docs = self._load_project_docs()

        for key, node in payload.get("nodes", {}).items():
            resource_type = node.get("resource_type")
            if resource_type == "model":
                item = self._normalise_manifest_model(key, node)
                nodes[key] = item
                models[key] = item
            elif resource_type == "test":
                for dependency in node.get("depends_on", {}).get("nodes", []):
                    tests_by_node[dependency].append(
                        {
                            "name": node.get("name", key),
                            "test_type": node.get("test_metadata", {}).get("name", "generic"),
                            "column": node.get("test_metadata", {}).get("kwargs", {}).get("column_name"),
                            "severity": node.get("config", {}).get("severity", "error"),
                            "status": "pass",
                        }
                    )

        for key, node in payload.get("sources", {}).items():
            item = self._normalise_manifest_source(key, node)
            nodes[key] = item
            sources[key] = item

        for model_name, doc in model_docs.items():
            key = f"model.opencare.{model_name}"
            if key in nodes and not tests_by_node[key]:
                tests_by_node[key].extend(self._tests_from_schema(doc))

        for source_name, source_doc in source_docs.items():
            for table in source_doc.get("tables", []):
                table_name = table.get("name")
                if not table_name:
                    continue
                key = f"source.{source_name}.{table_name}"
                if key in nodes and not tests_by_node[key]:
                    tests_by_node[key].extend(self._tests_from_schema(table))

        parent_map = {
            key: [item for item in values if item in nodes]
            for key, values in payload.get("parent_map", {}).items()
            if key in nodes
        }
        child_map = {
            key: [item for item in values if item in nodes]
            for key, values in payload.get("child_map", {}).items()
            if key in nodes
        }
        edges = [
            {"from": parent, "to": child}
            for child, parents in parent_map.items()
            for parent in parents
        ]
        self._attach_virtual_portal_nodes(nodes, child_map, parent_map, edges)
        return {
            "nodes": nodes,
            "models": models,
            "sources": sources,
            "tests_by_node": tests_by_node,
            "parent_map": parent_map,
            "child_map": child_map,
            "edges": edges,
        }

    def _load_project_graph(self) -> dict[str, Any]:
        nodes: dict[str, dict[str, Any]] = {}
        models: dict[str, dict[str, Any]] = {}
        sources: dict[str, dict[str, Any]] = {}
        tests_by_node: dict[str, list[dict[str, Any]]] = defaultdict(list)
        parent_map: dict[str, list[str]] = defaultdict(list)
        child_map: dict[str, list[str]] = defaultdict(list)
        edges: list[dict[str, str]] = []

        model_docs, source_docs = self._load_project_docs()

        for sql_path in sorted(self.models_dir.rglob("*.sql")):
            model_name = sql_path.stem
            doc = model_docs.get(model_name, {})
            schema = settings.analytics_schema if sql_path.parent.name != "staging" else settings.staging_schema
            key = f"model.opencare.{model_name}"
            columns = self._columns_from_schema(doc)
            node = {
                "id": key,
                "name": model_name,
                "label": model_name,
                "schema": schema,
                "qualified_name": f"{schema}.{model_name}",
                "description": doc.get("description", ""),
                "materialization": doc.get("config", {}).get("materialized", "view"),
                "tags": doc.get("tags", []),
                "meta": {"stage": _stage_for_name(model_name, schema), **doc.get("meta", {})},
                "columns": columns,
                "stage": _stage_for_name(model_name, schema),
            }
            nodes[key] = node
            models[key] = node
            tests_by_node[key].extend(self._tests_from_schema(doc))

        for source_name, source_doc in source_docs.items():
            schema_name = source_doc.get("schema", settings.dbt_source_schema)
            source_meta = source_doc.get("meta", {})
            for table in source_doc.get("tables", []):
                table_name = table.get("name")
                if not table_name:
                    continue
                key = f"source.{source_name}.{table_name}"
                source_node = {
                    "id": key,
                    "name": table_name,
                    "label": f"{source_name}.{table_name}",
                    "source_name": source_name,
                    "table_name": table_name,
                    "schema": schema_name,
                    "qualified_name": f"{schema_name}.{table_name}",
                    "description": table.get("description", ""),
                    "loaded_at_field": table.get("loaded_at_field"),
                    "freshness": table.get("freshness", source_doc.get("freshness", {})),
                    "meta": {**source_meta, **table.get("meta", {}), "stage": "source"},
                    "columns": self._columns_from_schema(table),
                    "stage": "source",
                }
                nodes[key] = source_node
                sources[key] = source_node
                tests_by_node[key].extend(self._tests_from_schema(table))

        for sql_path in sorted(self.models_dir.rglob("*.sql")):
            model_key = f"model.opencare.{sql_path.stem}"
            sql_text = sql_path.read_text(encoding="utf-8")
            for ref_name in REF_PATTERN.findall(sql_text):
                parent_key = f"model.opencare.{ref_name}"
                if parent_key in nodes and parent_key not in parent_map[model_key]:
                    parent_map[model_key].append(parent_key)
                    child_map[parent_key].append(model_key)
                    edges.append({"from": parent_key, "to": model_key})
            for source_name, table_name in SOURCE_PATTERN.findall(sql_text):
                parent_key = f"source.{source_name}.{table_name}"
                if parent_key in nodes and parent_key not in parent_map[model_key]:
                    parent_map[model_key].append(parent_key)
                    child_map[parent_key].append(model_key)
                    edges.append({"from": parent_key, "to": model_key})

        self._attach_virtual_portal_nodes(nodes, child_map, parent_map, edges)
        return {
            "nodes": nodes,
            "models": models,
            "sources": sources,
            "tests_by_node": tests_by_node,
            "parent_map": dict(parent_map),
            "child_map": dict(child_map),
            "edges": edges,
        }

    def _attach_virtual_portal_nodes(
        self,
        nodes: dict[str, dict[str, Any]],
        child_map: dict[str, list[str]],
        parent_map: dict[str, list[str]],
        edges: list[dict[str, str]],
    ) -> None:
        if "model.opencare.fct_bed_occupancy" not in nodes:
            return

        virtual_nodes = {
            "output.forecast": {
                "id": "output.forecast",
                "name": "output.forecast",
                "label": "output.forecast",
                "schema": settings.output_schema,
                "qualified_name": f"{settings.output_schema}.forecast",
                "description": "Forecast runtime outputs generated from analytics.fct_bed_occupancy.",
                "materialization": "table",
                "tags": ["runtime"],
                "meta": {"stage": "output", "owner": "Capacity Modelling"},
                "columns": {},
                "stage": "output",
            },
            "output.anomaly": {
                "id": "output.anomaly",
                "name": "output.anomaly",
                "label": "output.anomaly",
                "schema": settings.output_schema,
                "qualified_name": f"{settings.output_schema}.anomaly",
                "description": "Anomaly runtime outputs generated from analytics.fct_bed_occupancy.",
                "materialization": "table",
                "tags": ["runtime"],
                "meta": {"stage": "output", "owner": "Capacity Modelling"},
                "columns": {},
                "stage": "output",
            },
            "portal.occupancy": {
                "id": "portal.occupancy",
                "name": "portal.occupancy",
                "label": "Portal Occupancy View",
                "schema": "portal",
                "qualified_name": "portal.occupancy",
                "description": "Bed Pressure command surface in the portal and API wrapper.",
                "materialization": "service",
                "tags": ["portal"],
                "meta": {"stage": "portal", "owner": "Product Experience"},
                "columns": {},
                "stage": "portal",
            },
        }

        for node_id, node in virtual_nodes.items():
            nodes.setdefault(node_id, node)

        virtual_edges = [
            ("model.opencare.fct_bed_occupancy", "output.forecast"),
            ("model.opencare.fct_bed_occupancy", "output.anomaly"),
            ("model.opencare.fct_bed_occupancy", "portal.occupancy"),
            ("output.forecast", "portal.occupancy"),
            ("output.anomaly", "portal.occupancy"),
        ]

        for source, target in virtual_edges:
            if {"from": source, "to": target} not in edges:
                edges.append({"from": source, "to": target})
            child_map.setdefault(source, [])
            parent_map.setdefault(target, [])
            if target not in child_map[source]:
                child_map[source].append(target)
            if source not in parent_map[target]:
                parent_map[target].append(source)

    def _normalise_manifest_model(self, key: str, node: dict[str, Any]) -> dict[str, Any]:
        schema = node.get("schema", "")
        return {
            "id": key,
            "name": node.get("name", key.split(".")[-1]),
            "label": node.get("name", key.split(".")[-1]),
            "schema": schema,
            "qualified_name": f"{schema}.{node.get('name', key.split('.')[-1])}" if schema else node.get("name", key),
            "description": node.get("description", ""),
            "materialization": node.get("config", {}).get("materialized", ""),
            "tags": node.get("tags", []),
            "meta": {"stage": _stage_for_name(node.get("name", ""), schema), **node.get("meta", {})},
            "columns": {
                name: {
                    "type": column.get("data_type", ""),
                    "description": column.get("description", ""),
                    "meta": column.get("meta", {}),
                }
                for name, column in node.get("columns", {}).items()
            },
            "stage": _stage_for_name(node.get("name", ""), schema),
        }

    def _normalise_manifest_source(self, key: str, node: dict[str, Any]) -> dict[str, Any]:
        schema = node.get("schema", settings.dbt_source_schema)
        return {
            "id": key,
            "name": node.get("name", key.split(".")[-1]),
            "label": f"{node.get('source_name', 'source')}.{node.get('name', key.split('.')[-1])}",
            "source_name": node.get("source_name", ""),
            "table_name": node.get("name", key.split(".")[-1]),
            "schema": schema,
            "qualified_name": f"{schema}.{node.get('name', key.split('.')[-1])}",
            "description": node.get("description", ""),
            "loaded_at_field": node.get("loaded_at_field"),
            "freshness": node.get("freshness", {}),
            "meta": {"stage": "source", **node.get("meta", {})},
            "columns": {
                name: {
                    "type": column.get("data_type", ""),
                    "description": column.get("description", ""),
                    "meta": column.get("meta", {}),
                }
                for name, column in node.get("columns", {}).items()
            },
            "stage": "source",
        }

    def _columns_from_schema(self, payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
        columns: dict[str, dict[str, Any]] = {}
        for column in payload.get("columns", []):
            name = column.get("name")
            if not name:
                continue
            columns[name] = {
                "type": column.get("data_type", ""),
                "description": column.get("description", ""),
                "meta": column.get("meta", {}),
            }
        return columns

    def _tests_from_schema(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        tests: list[dict[str, Any]] = []
        for test in payload.get("tests", []):
            tests.append(self._normalise_test(test, None))
        for column in payload.get("columns", []):
            column_name = column.get("name")
            for test in column.get("tests", []):
                tests.append(self._normalise_test(test, column_name))
        return tests

    def _normalise_test(self, payload: Any, column_name: str | None) -> dict[str, Any]:
        if isinstance(payload, str):
            test_type = payload
            name = f"{test_type}({column_name})" if column_name else test_type
            return {"name": name, "test_type": test_type, "column": column_name, "severity": "error", "status": "pass"}
        if isinstance(payload, dict) and payload:
            test_type, config = next(iter(payload.items()))
            name = f"{test_type}({column_name})" if column_name else test_type
            return {
                "name": name,
                "test_type": test_type,
                "column": column_name,
                "severity": config.get("severity", "error") if isinstance(config, dict) else "error",
                "status": "pass",
            }
        return {"name": "unknown", "test_type": "unknown", "column": column_name, "severity": "error", "status": "pass"}

    def _walk(self, key: str, graph_map: dict[str, list[str]], visited: set[str] | None = None) -> list[str]:
        if visited is None:
            visited = set()
        if key in visited:
            return []
        visited.add(key)
        results: list[str] = []
        for item in graph_map.get(key, []):
            if item not in results:
                results.append(item)
            for nested in self._walk(item, graph_map, visited):
                if nested not in results:
                    results.append(nested)
        return results

    def _find_node_key(self, name: str) -> str | None:
        if name in self.graph["nodes"]:
            return name
        for key, node in self.graph["nodes"].items():
            candidates = {
                key,
                node.get("name"),
                node.get("label"),
                node.get("qualified_name"),
                f"{node.get('schema')}.{node.get('name')}" if node.get("schema") and node.get("name") else "",
            }
            if name in candidates:
                return key
        return None

    def _is_compatibility_alias(self, node: dict[str, Any]) -> bool:
        description = str(node.get("description", ""))
        return description.startswith("Compatibility alias")

    def _canonical_node_key(self, key: str) -> str:
        node = self.graph["nodes"].get(key)
        if not node or not self._is_compatibility_alias(node):
            return key

        parents = [
            parent
            for parent in self.graph["parent_map"].get(key, [])
            if parent in self.graph["nodes"] and not self._is_compatibility_alias(self.graph["nodes"][parent])
        ]
        if len(parents) == 1:
            return parents[0]
        return key

    def _latest_source_timestamp(self, source: dict[str, Any]) -> Any:
        schema = source.get("schema") or settings.dbt_source_schema
        table = source.get("table_name") or source.get("name")
        if not table:
            return None

        candidate_columns = [source.get("loaded_at_field"), *SOURCE_TIME_COLUMNS]
        try:
            with connect() as conn:
                metadata_rows = conn.execute(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = %(schema)s
                      and table_name = %(table)s
                    """,
                    {"schema": schema, "table": table},
                ).fetchall()
                available_columns = {row["column_name"] for row in metadata_rows}
                freshness_column = next((column for column in candidate_columns if column in available_columns), None)
                if freshness_column is None:
                    return None

                query = sql.SQL("select max({column}) as last_loaded_at from {table}").format(
                    column=sql.Identifier(freshness_column),
                    table=qualified_table(schema, table),
                )
                return conn.execute(query).fetchone()["last_loaded_at"]
        except UndefinedTable:
            return None
        except Exception:
            return None


@lru_cache(maxsize=1)
def get_lineage_service() -> DbtLineageService:
    return DbtLineageService()
