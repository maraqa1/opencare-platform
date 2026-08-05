# Bed Pressure Intelligence Golden Bundle

This folder is the canonical, self-contained contract package for the Bed Pressure use case.

It does not duplicate the platform implementation. Instead, it declares the full use-case boundary: business objectives, KPIs, screens, APIs, data assets, runtimes, decisions, governance, validation, and demo acceptance.

The implementation currently remains in:

- `apps/portal/app/use-cases/bed-pressure`
- `apps/portal/components/bed-pressure`
- `apps/portal/components/DecisionCards.tsx`
- `apps/backend/app/routes/occupancy.py`
- `apps/backend/app/routes/forecasts.py`
- `apps/backend/app/routes/anomalies.py`
- `apps/backend/app/routes/decisions.py`
- `apps/backend/app/services/decision_service.py`
- `dbt/opencare/models/marts`
- `manifests/runtimes`
- `manifests/decisions`

Use this package as the repeatable source of truth when installing, validating, or rebuilding the use case.
