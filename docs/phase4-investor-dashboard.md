# Phase 4 Investor Dashboard

## What Changed

Phase 4 upgrades the portal from a technically correct product surface into the investor-facing command centre for hospital operations.

- the portal now presents an executive KPI summary bar with live pipeline status
- occupancy cards are severity-led, sortable, and visually prioritised for critical wards
- the forecast experience uses a native chart with threshold lines, confidence ranges, and breach callouts
- anomaly handling is now a grouped alert feed rather than a flat operational table
- the analytics tab is wrapped in a board-ready portal shell around the embedded Superset dashboard
- Superset dashboard definitions now live in version-controlled metadata
- Superset theme assets and a schema-isolated read-only access path are defined in-repo

## Investor Story

1. Open the portal landing page and confirm the KPI summary bar loads with live ward counts and pipeline freshness.
2. Move into `Occupancy` to show critical wards, progress bars, and rapid drill-down into a forecast.
3. Open `Forecasts` for a pressured ward and narrate the predicted threshold breach window.
4. Open `Alerts` to show anomaly signals grouped by severity with occupancy and z-score context.
5. Open `Analytics` to show the embedded board view and explain that dashboards are metadata-synced rather than handcrafted one by one.
6. Close on `config/use_cases.yaml` plus `dbt/opencare/models/metadata/dashboard_config.yml` to demonstrate extensibility.

## Extensibility Proof

Adding a new dashboarded use case now has a config-first path:

1. add or update the use case entry in `config/use_cases.yaml`
2. append the Superset metadata in `dbt/opencare/models/metadata/dashboard_config.yml`
3. run `python3 scripts/sync_dashboards.py`
4. enable the use case in the registry and redeploy

The portal shell, navigation, and analytics wrapper do not need a fresh structural rewrite for each additional use case.

## Operational Notes

- Superset branding assets are stored in `superset/custom_theme.css` and `superset/superset_config.py`
- schema-isolated read-only grants are defined in `sql/superset/superset_readonly.sql`
- the deployment bootstrap script now creates a `superset-assets` config map before deploying Superset

## Suggested Validation

```bash
cd apps/portal
npm install
npm run build
```

```bash
bash scripts/superset/apply_superset.sh
python3 scripts/sync_dashboards.py
```

```bash
curl -sS http://127.0.0.1:8001/api/v1/admin/runtime-status
curl -sS http://127.0.0.1:8001/api/v1/superset/dashboards
```
