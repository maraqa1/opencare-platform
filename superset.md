# Superset Bootstrap Notes

This document captures the Superset bootstrap issues we hit in Phase 4b, the debugging trail, and the final working solution.

## Final Status

Superset dashboard sync now completes successfully during:

```bash
bash scripts/superset/apply_superset.sh
```

Confirmed successful output:

```text
[ok] database OpenCare Analytics -> 1
[sync] dashboard bed_pressure
  [ok] dataset analytics.fct_bed_occupancy -> 1
  [ok] dataset analytics.dim_ward -> 2
  [ok] dataset analytics.dim_date -> 3
  [ok] chart 30-Day Occupancy Trend -> 1 (updated)
  [ok] chart Ward Comparison -> 2 (updated)
  [ok] chart Admissions vs Discharges -> 3 (updated)
[ok] dashboard Bed Occupancy Intelligence -> 1 (updated)
[ok] dashboard chart count -> 3
[ok] dashboard url -> https://analytics.opencare.opendatalake.com/superset/dashboard/bed-occupancy-trends/
[ok] linked 3 charts to dashboard bed-occupancy-trends
[SUCCESS] Superset deployment ready
```

The portal embed flow also now works end to end.

Confirmed backend response:

```json
{
  "status": "ok",
  "dashboard_id": "bed-occupancy-trends",
  "token": "",
  "superset_url": "https://analytics.opencare.opendatalake.com",
  "embed_url": "https://analytics.opencare.opendatalake.com/superset/dashboard/bed-occupancy-trends/?standalone=2"
}
```

## What Went Wrong

We hit several distinct issues in sequence:

1. Superset metadata was not persistent.
   Superset initially fell back to pod-local state instead of a persistent metadata database.

2. The custom Superset image was missing runtime dependencies.
   `Flask-Cors` and `psycopg2-binary` had to be added to the image.

3. Dashboard sync was running from the VM host instead of inside the Superset pod.
   That caused service discovery and auth problems against in-cluster Superset.

4. CSRF/auth behavior blocked API writes.
   We hit multiple layers:
   - Superset form CSRF expectations
   - header-vs-cookie auth conflicts
   - anonymous-user behavior during REST chart creation

5. Superset REST API hid existing metadata objects.
   Even though objects existed in `superset_meta`, some REST list endpoints did not reliably expose them for lookup.

6. REST chart creation failed with:

```text
AttributeError: 'AnonymousUserMixin' object has no attribute '_sa_instance_state'
```

This came from `POST /api/v1/chart/` running without a usable FAB user context.

## Final Working Fixes

### 1. Persistent metadata in Postgres

`superset/superset_config.py` now points Superset metadata at Postgres, defaulting to schema `superset_meta`.

### 2. Demo-friendly auth/config

The mounted Superset config includes:

```python
WTF_CSRF_ENABLED = False
PUBLIC_ROLE_LIKE = "Gamma"
SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "change-me-superset")
JWT_COOKIE_CSRF_PROTECT = False
JWT_SECRET_KEY = SECRET_KEY
```

This made the demo embed/auth behavior workable for our environment.

### 3. Sync runs inside the Superset pod

`scripts/superset/apply_superset.sh` now copies the sync script and dashboard config into the Superset pod and runs them there.

### 4. Metadata fallback for hidden REST objects

`scripts/sync_dashboards.py` now falls back to direct metadata-table lookup via `psycopg2` when the REST API hides objects:

- `dbs`
- `tables`
- `slices`
- `dashboards`

This solved the existing-database and existing-dataset discovery issues.

### 5. ORM-based chart and dashboard sync

This was the key final fix.

Instead of using REST for chart creation/update, `scripts/sync_dashboards.py` now uses Superset ORM inside the pod:

- `Slice` for charts
- `Dashboard` for dashboards
- `dashboard.slices` for chart attachment

This bypasses the anonymous-user REST write failure entirely.

### 6. Correct dashboard embed route

The final portal issue was not bootstrap anymore. It was the backend-generated embed URL.

The stale backend route was returning:

```text
https://analytics.opencare.opendatalake.com/dashboard/p/bed-occupancy-trends/?standalone=1
```

That was wrong for this deployment and caused the portal iframe to land on the wrong Superset page.

The working backend route is now:

```text
https://analytics.opencare.opendatalake.com/superset/dashboard/bed-occupancy-trends/?standalone=2
```

This is generated in `apps/backend/app/routes/superset.py`.

## Why ORM Was Necessary

Database and dataset lookup could be worked around with metadata fallback.

Chart creation could not.

Even with valid bearer auth, Superset REST chart creation still failed under this deployment because the request path did not establish a usable FAB user object for model creation. The ORM path inside `app.app_context()` was the reliable fix.

## Files That Matter

Primary files involved in the final solution:

- [superset/superset_config.py](C:/R_Home/opencare-platform/superset/superset_config.py)
- [scripts/sync_dashboards.py](C:/R_Home/opencare-platform/scripts/sync_dashboards.py)
- [scripts/superset/apply_superset.sh](C:/R_Home/opencare-platform/scripts/superset/apply_superset.sh)
- [scripts/superset/link_dashboard_slices.py](C:/R_Home/opencare-platform/scripts/superset/link_dashboard_slices.py)
- [apps/backend/app/routes/superset.py](C:/R_Home/opencare-platform/apps/backend/app/routes/superset.py)
- [superset/Dockerfile](C:/R_Home/opencare-platform/superset/Dockerfile)

## Current Dashboard Route

The dashboard is available at:

```text
https://analytics.opencare.opendatalake.com/superset/dashboard/bed-occupancy-trends/
```

The working portal embed URL is:

```text
https://analytics.opencare.opendatalake.com/superset/dashboard/bed-occupancy-trends/?standalone=2
```

That route is now returned by the backend embed endpoint.

## Recommended Future Cleanup

For demo stability, keep the current working setup.

For later production hardening, consider:

1. Replace public demo access with proper guest-token embedding.
2. Revisit whether REST-based dataset sync should also move to ORM for consistency.
3. Add automated validation after sync:
   - dashboard exists
   - 3 charts attached
   - dashboard URL returns a non-404 route
4. Reduce bootstrap complexity by separating:
   - infrastructure/bootstrap
   - metadata sync
   - embed/auth configuration

## Practical Rule

If Superset bootstrap breaks again:

- trust `superset_meta` over REST visibility
- prefer ORM inside the Superset pod for metadata writes
- treat REST as optional for reads/validation, not the source of truth for object creation
