from __future__ import annotations

import io
import sys
import tempfile
import zipfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app
from app.routes import use_case_templates
from app.services.use_case_template_lifecycle import UseCaseTemplateLifecycleService
from app.services.use_case_template_storage import UseCaseTemplateStorage


def build_valid_package_tree(root: Path, *, slug: str = "golden-example", query_sql: str = "select 1 as ok") -> None:
    (root / "manifest").mkdir(parents=True, exist_ok=True)
    (root / "contracts").mkdir(parents=True, exist_ok=True)
    (root / "schemas").mkdir(parents=True, exist_ok=True)
    (root / "dbt/staging").mkdir(parents=True, exist_ok=True)
    (root / "dbt/marts").mkdir(parents=True, exist_ok=True)
    (root / "dbt/dictionary").mkdir(parents=True, exist_ok=True)
    (root / "backend/queries").mkdir(parents=True, exist_ok=True)
    (root / "backend/responses").mkdir(parents=True, exist_ok=True)
    (root / "portal/pages").mkdir(parents=True, exist_ok=True)
    (root / "dashboards/charts").mkdir(parents=True, exist_ok=True)
    (root / "dashboards/sql").mkdir(parents=True, exist_ok=True)
    (root / "governance").mkdir(parents=True, exist_ok=True)
    (root / "demo-data/generator").mkdir(parents=True, exist_ok=True)
    (root / "validation").mkdir(parents=True, exist_ok=True)
    (root / "lifecycle").mkdir(parents=True, exist_ok=True)
    (root / "checksums").mkdir(parents=True, exist_ok=True)

    (root / "package.yaml").write_text(
        "\n".join(
            [
                "api_version: v1",
                "kind: UseCasePackage",
                "package_id: golden-example",
                "metadata:",
                f"  slug: {slug}",
                "  name: Golden Example",
                "  version: 1.0.0",
                "  domain: Testing",
                "  owner: Platform",
                "compatibility:",
                "  min_platform_version: 0.1.0",
                "entrypoints:",
                "  portal_route: /use-cases/golden-example",
                "registration:",
                "  mode: staged_only",
                "features:",
                "  dbt: true",
                "  backend: true",
                "  portal: true",
                "  dashboards: true",
                "  governance: true",
                "  demo_data: true",
                "lifecycle:",
                "  install: true",
                "  apply: true",
                "  include: true",
                "  exclude: true",
                "  remove_operational: true",
                "  uninstall: true",
            ]
        ),
        encoding="utf-8",
    )
    (root / "manifest/usecase.yaml").write_text(
        "\n".join(
            [
                f"slug: {slug}",
                "name: Golden Example",
                "description: Test package",
                "api_prefix: /api/v1/golden-example",
                "superset_dashboard_id: golden-example-dashboard",
            ]
        ),
        encoding="utf-8",
    )

    contracts = {
        "business.yaml": "business_problem: Test problem\npersonas:\n  - Operator\nkpis:\n  - throughput\n",
        "data.yaml": "sources:\n  - demo\nfacts:\n  - golden_fact\n",
        "api.yaml": "endpoints:\n  - /summary\n",
        "dashboard.yaml": "dashboards:\n  - executive\n",
        "governance.yaml": "owner: Platform\nsteward: Governance Team\n",
        "validation.yaml": "checks:\n  - raw_count\n",
        "lifecycle.yaml": "supported:\n  - install\n",
        "demo-data.yaml": "demo_entities:\n  - customer\n",
    }
    for name, content in contracts.items():
        (root / "contracts" / name).write_text(content, encoding="utf-8")

    (root / "schemas/use_case.schema.yaml").write_text("type: object\n", encoding="utf-8")
    (root / "dbt/sources.yml").write_text("version: 2\nsources: []\n", encoding="utf-8")
    (root / "dbt/selectors.yml").write_text("selectors: []\n", encoding="utf-8")
    (root / "dbt/staging/stg_example.sql").write_text("select 1 as id", encoding="utf-8")
    (root / "dbt/marts/fct_example.sql").write_text("select * from {{ ref('stg_example') }}", encoding="utf-8")
    (root / "dbt/dictionary/dict_example.sql").write_text("select 'metric' as name", encoding="utf-8")

    (root / "backend/routes.yaml").write_text("routes:\n  - /summary\n", encoding="utf-8")
    (root / "backend/responses/summary.yaml").write_text("type: object\n", encoding="utf-8")
    (root / "backend/queries/summary.sql").write_text(query_sql, encoding="utf-8")

    (root / "portal/routes.yaml").write_text("routes:\n  - /use-cases/golden-example\n", encoding="utf-8")
    (root / "portal/navigation.yaml").write_text("navigation:\n  - golden-example\n", encoding="utf-8")
    (root / "portal/workspace.yaml").write_text("workspace:\n  title: Golden Example\n", encoding="utf-8")
    (root / "portal/empty-state.yaml").write_text("message: No data yet\n", encoding="utf-8")
    (root / "portal/pages/index.md").write_text("# Golden Example\n", encoding="utf-8")

    (root / "dashboards/dashboards.yaml").write_text("dashboards:\n  - executive\n", encoding="utf-8")
    (root / "dashboards/charts/executive.yaml").write_text("title: Executive\n", encoding="utf-8")
    (root / "dashboards/sql/executive.sql").write_text("select * from analytics.fct_example", encoding="utf-8")

    governance_files = {
        "ownership.yaml": "owner: Platform\n",
        "freshness_sla.yaml": "sla: daily\n",
        "dq_rules.yaml": "rules:\n  - completeness\n",
        "lineage.yaml": "lineage:\n  - source\n",
        "evidence_pack.yaml": "evidence:\n  - qa\n",
        "classification.yaml": "classification:\n  - internal\n",
    }
    for name, content in governance_files.items():
        (root / "governance" / name).write_text(content, encoding="utf-8")

    (root / "demo-data/generator/domain_model.yaml").write_text(
        "\n".join(
            [
                "domain:",
                f"  use_case_slug: {slug}",
                "entities:",
                "  - id: customer",
                "    type: account",
                "    output_seed: seeds/customers.csv",
                "    fields:",
                "      - id",
                "      - name",
                "relationships: []",
            ]
        ),
        encoding="utf-8",
    )
    (root / "demo-data/seeds").mkdir(parents=True, exist_ok=True)
    (root / "demo-data/seeds/customers.csv").write_text("id,name\n1,Acme\n", encoding="utf-8")
    (root / "validation/checks.yaml").write_text("checks:\n  - preview\n", encoding="utf-8")
    for action in ("install", "apply", "include", "exclude", "remove-operational", "uninstall"):
        (root / "lifecycle" / f"{action}.yaml").write_text(f"action: {action}\n", encoding="utf-8")
    (root / "checksums/manifest.sha256").write_text("", encoding="utf-8")


def build_zip_bytes(root_dir: Path) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in root_dir.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, arcname=file_path.relative_to(root_dir.parent).as_posix())
    return buffer.getvalue()


@contextmanager
def package_test_context() -> Iterator[UseCaseTemplateStorage]:
    with tempfile.TemporaryDirectory(prefix="use-case-template-tests-") as temp_dir:
        storage = UseCaseTemplateStorage(Path(temp_dir) / "data")
        lifecycle = UseCaseTemplateLifecycleService(storage)
        with (
            patch.object(use_case_templates, "storage", storage),
            patch.object(use_case_templates, "lifecycle", lifecycle),
        ):
            yield storage


def client():
    from fastapi.testclient import TestClient

    return TestClient(app)

