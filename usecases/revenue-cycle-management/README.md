# Revenue Cycle Management Golden Bundle

This folder is the canonical, self-contained contract package for the Revenue Cycle Management use case.

It declares the full use-case boundary: business objectives, KPIs, source data, dbt models, backend runtime logic, APIs, portal screens, decision workflow, board pack, governance, validation, and demo acceptance. Use it as the repeatable source of truth when rebuilding this use case on OpenCare or another platform with equivalent components.

## Implementation Files

- Portal route files: `apps/portal/app/use-cases/revenue-cycle-management`
- Portal components: `apps/portal/components/rcm`, `apps/portal/components/RCMDashboard.tsx`, `apps/portal/components/RevenueCycleConsole.tsx`
- Board pack: `apps/portal/app/api/v1/revenue-cycle/board-pack/route.ts`, `apps/portal/lib/rcm-board-pack.ts`, `apps/portal/public/reports`
- Backend APIs: `apps/backend/app/routes/revenue_cycle.py`
- Backend service/runtime logic: `apps/backend/app/services/revenue_cycle_service.py`
- dbt models: `dbt/opencare/models/revenue_cycle`
- Raw demo data generator: `scripts/demo/generate_demo_data.py`
- Superset/dashboard sync: `scripts/sync_dashboards.py`, `scripts/superset`

## Documentation Map

- [Architecture](docs/architecture.md): end-to-end component map and data flow.
- [Source Data and Metadata](docs/source_data_and_metadata.md): raw claim, posting, and referral contracts.
- [dbt Models](docs/dbt_models.md): staging and analytics mart contracts.
- [Runtime Logic](docs/runtime_logic.md): backend calculations, board-pack runtime, and decision runtime.
- [Backend API Contract](docs/backend_api_contract.md): endpoints, filters, and response purpose.
- [Portal Implementation](docs/portal_implementation.md): page structure and component mapping.
- [Decision Workflow](docs/decision_workflow.md): recovery item promotion, approval, dispatch, audit, and outcomes.
- [Governance and Validation](docs/governance_and_validation.md): classified assets, lineage, owners, freshness, and promotion gates.
- [Implementation Guide](docs/implementation_guide.md): rebuild sequence for another platform.
- [Handover Package](handover/README.md): delivery brief, checklist, file manifest, and VM pull steps.

## Non-Negotiable Contracts

- Financial numbers must come from dbt marts or backend APIs, not hard-coded UI values.
- The board pack must be generated from `GET /api/v1/rcm/board-pack`.
- Recovery queue rows may be promoted to governed decisions, but decision actions require human approval.
- Data trust must show source lineage, freshness, missing metrics, and governed assets.
- Jargon must be avoided in portal and report copy unless a term is explicitly defined.
