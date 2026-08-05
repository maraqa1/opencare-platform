# Implementation Mapping

## Bundle

- `usecases/revenue-cycle-management`

## dbt

- `dbt/opencare/models/revenue_cycle`
- `dbt/opencare/models/revenue_cycle/staging`
- `dbt/opencare/models/revenue_cycle/marts`
- `dbt/opencare/tests/revenue_cycle_gl_reconciliation.sql`

## Backend

- `apps/backend/app/routes/revenue_cycle.py`
- `apps/backend/app/services/revenue_cycle_service.py`

## Portal

- `apps/portal/app/use-cases/revenue-cycle-management`
- `apps/portal/components/rcm`
- `apps/portal/components/RCMDashboard.tsx`
- `apps/portal/components/RevenueCycleConsole.tsx`

## Board Pack

- `apps/portal/app/api/v1/revenue-cycle/board-pack/route.ts`
- `apps/portal/lib/rcm-board-pack.ts`
- `apps/portal/public/reports`

## Demo Data

- `scripts/demo/generate_demo_data.py`
- `raw-data/opencare_demo_mysql.sql` in complete handover zip
