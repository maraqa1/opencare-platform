#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

import yaml
from superset.app import create_app


def enabled_dashboards(config_path: Path):
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    for dashboard in config.get("dashboards", {}).values():
        if not dashboard.get("enabled", False):
            continue
        charts = [
            chart
            for chart in dashboard.get("charts", [])
            if chart.get("enabled", True)
        ]
        yield dashboard, charts


def bytes_to_uuid(value) -> str:
    if isinstance(value, bytes):
        return str(uuid.UUID(bytes=value))
    return str(value)


def dashboard_position_data(dashboard: dict, chart_refs: list[dict]) -> dict:
    rows: dict[int, list[tuple[dict, dict]]] = {}
    for chart_config, chart_ref in zip(dashboard.get("charts", []), chart_refs, strict=False):
        if not chart_config.get("enabled", True):
            continue
        layout = chart_config.get("layout", {})
        rows.setdefault(int(layout.get("y", 0)), []).append((chart_config, chart_ref))

    position_data = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {
            "type": "ROOT",
            "id": "ROOT_ID",
            "children": ["GRID_ID"],
        },
        "GRID_ID": {
            "type": "GRID",
            "id": "GRID_ID",
            "children": [],
            "parents": ["ROOT_ID"],
        },
    }

    for row_index, row_y in enumerate(sorted(rows), start=1):
        row_id = f"ROW-{row_index}"
        position_data["GRID_ID"]["children"].append(row_id)
        position_data[row_id] = {
            "type": "ROW",
            "id": row_id,
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        }

        for chart_config, chart_ref in sorted(rows[row_y], key=lambda item: int(item[0].get("layout", {}).get("x", 0))):
            chart_id = int(chart_ref["id"])
            chart_component_id = f"CHART-{chart_id}"
            layout = chart_config.get("layout", {})
            position_data[row_id]["children"].append(chart_component_id)
            position_data[chart_component_id] = {
                "type": "CHART",
                "id": chart_component_id,
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "meta": {
                    "chartId": chart_id,
                    "sliceName": chart_ref["title"],
                    "uuid": chart_ref["uuid"],
                    "width": int(layout.get("w", 12)),
                    "height": int(layout.get("h", 12)) * 4,
                },
            }

    return position_data


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: link_dashboard_slices.py dashboard_config.yml", file=sys.stderr)
        return 2

    config_path = Path(argv[1])
    app = create_app()

    with app.app_context():
        from superset import db
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        for dashboard_config, chart_configs in enabled_dashboards(config_path):
            dashboard_slug = dashboard_config["dashboard_id"]
            chart_titles = [chart["title"] for chart in chart_configs]
            dashboard = db.session.query(Dashboard).filter_by(slug=dashboard_slug).one_or_none()
            if dashboard is None:
                raise RuntimeError(f"Dashboard slug not found: {dashboard_slug}")

            slices = (
                db.session.query(Slice)
                .filter(Slice.slice_name.in_(chart_titles))
                .all()
            )
            found_titles = {slice_.slice_name for slice_ in slices}
            missing_titles = sorted(set(chart_titles) - found_titles)
            if missing_titles:
                raise RuntimeError(
                    f"Missing charts for {dashboard_slug}: {', '.join(missing_titles)}"
                )

            slices_by_title = {slice_.slice_name: slice_ for slice_ in slices}
            ordered_slices = [slices_by_title[title] for title in chart_titles]
            chart_refs = [
                {"id": slice_.id, "title": slice_.slice_name, "uuid": bytes_to_uuid(slice_.uuid)}
                for slice_ in ordered_slices
            ]

            dashboard.slices = ordered_slices
            dashboard.position_json = json.dumps(dashboard_position_data(dashboard_config, chart_refs))
            db.session.add(dashboard)
            print(f"[ok] linked {len(ordered_slices)} charts to dashboard {dashboard_slug}")

        db.session.commit()

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
