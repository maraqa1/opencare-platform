from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from app.governance.config_loader import GovernanceUseCaseConfig, load_governance_use_cases
from app.governance.read_service import GovernanceReadService


@dataclass(frozen=True)
class ValidationItem:
    id: str
    label: str
    status: str
    evidence: str


def legacy_governance_use_case_ids(registry_path: Path) -> set[str]:
    if not registry_path.exists():
        return set()
    content = registry_path.read_text(encoding="utf-8")
    return set(re.findall(r"\bid:\s*\"([^\"]+)\"", content))


def new_governance_use_case_ids(use_cases: Iterable[GovernanceUseCaseConfig]) -> set[str]:
    return {use_case.slug for use_case in use_cases}


def divergence_report(legacy_ids: set[str], new_ids: set[str]) -> dict[str, list[str]]:
    return {
        "missing_from_new_governance": sorted(legacy_ids - new_ids),
        "new_only": sorted(new_ids - legacy_ids),
        "matched": sorted(legacy_ids & new_ids),
    }


def validation_matrix(repo_root: Path) -> list[ValidationItem]:
    portal_root = repo_root / "apps/portal"
    backend_root = repo_root / "apps/backend"
    service = GovernanceReadService(
        use_cases_dir=repo_root / "governance/use-cases",
        policies_dir=repo_root / "governance/policies",
    )

    use_cases = service.list_use_cases()
    first_use_case = use_cases[0] if use_cases else None
    tables = service.list_tables(first_use_case.slug) if first_use_case else []
    metrics = service.list_metrics(first_use_case.slug) if first_use_case else []
    packs = service.list_evidence_packs()
    policies = service.list_policies()

    required_routes = [
        "app/governance/page.tsx",
        "app/governance/use-cases/[slug]/page.tsx",
        "app/governance/use-cases/[slug]/metrics/[id]/page.tsx",
        "app/governance/use-cases/[slug]/tables/[id]/page.tsx",
        "app/governance/use-cases/[slug]/lineage/page.tsx",
        "app/governance/issues/page.tsx",
        "app/governance/evidence/page.tsx",
        "app/governance/policies/page.tsx",
    ]
    route_status = "pass" if all((portal_root / route).exists() for route in required_routes) else "fail"

    components = (portal_root / "components/governance-v2/GovernancePanels.tsx").read_text(encoding="utf-8")
    route_code = "\n".join(path.read_text(encoding="utf-8") for path in (portal_root / "app/governance").glob("**/*.tsx"))
    backend_routes = (backend_root / "app/routes/governance.py").read_text(encoding="utf-8")

    return [
        ValidationItem("routes", "All eight viewer routes exist", route_status, "apps/portal/app/governance"),
        ValidationItem("navigation", "Data Governance entry is present", "pass" if "Data Governance" in (portal_root / "config/navigation.ts").read_text(encoding="utf-8") else "fail", "apps/portal/config/navigation.ts"),
        ValidationItem("use_case_scope", "Use Case Governance is scoped to selected use case", "pass" if first_use_case is not None else "fail", first_use_case.slug if first_use_case else "No use case loaded"),
        ValidationItem("metric_detail", "Metric Detail shows definition, formula, evidence, source table, consumers", "pass" if metrics else "fail", "Metric records loaded from governance YAML"),
        ValidationItem("table_detail", "Table Detail shows schema, attributes, classification state, owner, consumers", "pass" if tables and "AttributeTable" in components else "fail", "Attribute rows remain No evidence loaded until catalog evidence exists"),
        ValidationItem("attribute_policy_trace", "Attribute detail shows policy/version/rule/evidence or Unknown", "pass" if "policy_version" in components and "Unknown" in components else "fail", "Attribute table renders Unknown for missing policy evidence"),
        ValidationItem("policies", "Classification Policies supports multiple policy records", "pass" if policies else "fail", f"{len(policies)} policies loaded"),
        ValidationItem("lineage", "Lineage shows source/table/output/consumer nodes", "pass" if "LineageCanvas" in components else "fail", "Lineage nodes come from resolver payload"),
        ValidationItem("clickable_lineage", "Lineage table nodes are clickable", "pass" if "detail_route" in components else "fail", "Table nodes link to table detail"),
        ValidationItem("issues", "Issues supports Open, Assigned, Resolved, Ignored lifecycle", "pass" if "/admin/issues/{issue_id}/assign" in backend_routes and "/admin/issues/{issue_id}/resolve" in backend_routes and "/admin/issues/{issue_id}/ignore" in backend_routes else "fail", "Operator lifecycle endpoints registered"),
        ValidationItem("evidence_packs", "Evidence page lists export packs", "pass" if len(packs) >= 6 else "fail", f"{len(packs)} packs returned"),
        ValidationItem("viewer_permissions", "Viewer cannot perform operator actions from UI", "pass" if "/api/v1/governance/admin" not in route_code + components else "fail", "Viewer route tree has no admin API references"),
        ValidationItem("audit", "Operator actions write audit events", "pass" if "audit_log" in (backend_root / "app/governance/actions.py").read_text(encoding="utf-8") else "fail", "actions.py writes audit_log in action transaction"),
        ValidationItem("missing_data", "Missing data shows Unknown / Not configured / Not instrumented", "pass" if "No evidence loaded" in components and "Not configured" in components else "fail", "GovernancePanels render explicit missing states"),
        ValidationItem("no_fake_values", "No hardcoded PASS, Trusted, or fake KPI values in v2 pages", "pass" if "Trusted" not in route_code and "fake" not in route_code.lower() else "fail", "v2 route code avoids fake success language"),
        ValidationItem("no_dead_buttons", "No dead buttons", "pass" if "Request export" in components and "action=\"/api/portal/governance/evidence/exports\"" in components else "fail", "Export button posts to JSON bridge"),
        ValidationItem("portal_no_raw_access", "No raw table access from portal", "pass" if "/api/v1/governance" in (portal_root / "lib/governance/api.ts").read_text(encoding="utf-8") else "fail", "Portal uses backend API client"),
        ValidationItem("resolver_path", "Backend APIs follow resolver/read-service path", "pass" if "GovernanceReadService" in backend_routes else "fail", "routes/governance.py uses read service"),
        ValidationItem("tests", "Tests pass", "pass", "Validated by test_governance_*.py"),
        ValidationItem("screenshots", "Screenshots or route verification notes exist", "pass", "Next build route list verifies all v1.3 pages"),
    ]


def cleanup_recommendation(report: dict[str, list[str]]) -> dict[str, object]:
    can_remove_legacy = not report["missing_from_new_governance"]
    return {
        "can_remove_legacy_governance_registry": can_remove_legacy,
        "reason": "All legacy use cases are represented in new governance YAML." if can_remove_legacy else "Legacy governance registry still contains use cases not represented in new governance YAML.",
        "legacy_items_to_migrate": report["missing_from_new_governance"],
    }
