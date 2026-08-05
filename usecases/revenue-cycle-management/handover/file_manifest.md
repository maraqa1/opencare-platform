# RCM File Manifest

## Bundle

- `usecases/revenue-cycle-management`

## Source and dbt

- `config/use_cases.yaml`
- `dbt/opencare/models/sources.yml`
- `dbt/opencare/models/revenue_cycle`
- `dbt/opencare/tests/revenue_cycle_gl_reconciliation.sql`

## Backend

- `apps/backend/app/routes/revenue_cycle.py`
- `apps/backend/app/services/revenue_cycle_service.py`
- `apps/backend/tests/test_revenue_cycle_service.py`

## Portal

- `apps/portal/app/use-cases/revenue-cycle-management`
- `apps/portal/components/rcm`
- `apps/portal/components/RCMDashboard.tsx`
- `apps/portal/components/RevenueCycleConsole.tsx`

## Board Pack

- `apps/portal/app/api/v1/revenue-cycle/board-pack/route.ts`
- `apps/portal/lib/rcm-board-pack.ts`
- `apps/portal/public/reports/revenue-cycle-board-pack-prompt.md`
- `apps/portal/public/reports/revenue-cycle-board-pack-sample.html`

## Demo Data

- `scripts/demo/generate_demo_data.py`
- `raw-data/opencare_demo_mysql.sql`
- `raw-data/opencare_demo_validation.sql`
- `raw-data/opencare_demo_summary.json`
