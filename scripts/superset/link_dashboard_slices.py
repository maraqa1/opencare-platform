#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

import yaml
from superset.app import create_app


def enabled_dashboards(config_path: Path):
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    for dashboard in config.get("dashboards", {}).values():
        if not dashboard.get("enabled", False):
            continue
        chart_titles = [
            chart["title"]
            for chart in dashboard.get("charts", [])
            if chart.get("enabled", True)
        ]
        yield dashboard["dashboard_id"], chart_titles


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

        for dashboard_slug, chart_titles in enabled_dashboards(config_path):
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

            dashboard.slices = slices
            db.session.add(dashboard)
            print(f"[ok] linked {len(slices)} charts to dashboard {dashboard_slug}")

        db.session.commit()

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
