# Revenue Cycle Management Architecture

## Purpose

Revenue Cycle Management turns hospital financial operations into a governed execution loop: cash command, recovery work, payer accountability, leakage detection, decision approval, team performance, and board reporting.

## End-To-End Flow

```mermaid
flowchart LR
  A["HIS / ERP / referral sources"] --> B["raw.rcm_claims"]
  A --> C["raw.rcm_financial_postings"]
  A --> D["raw.rcm_referrals"]
  B --> E["stg_rcm_claims"]
  C --> F["stg_rcm_financial_postings"]
  D --> G["stg_rcm_referrals"]
  E --> H["analytics.fct_revenue_cycle"]
  F --> H
  E --> I["analytics.fct_cash_recovery_opportunity"]
  E --> J["analytics.fct_cash_forecast"]
  E --> K["analytics.fct_payer_contract_performance"]
  E --> L["analytics.fct_revenue_leakage"]
  I --> M["Backend RCM service"]
  H --> M
  J --> M
  K --> M
  L --> M
  M --> N["Portal workspace"]
  M --> O["Board pack"]
  I --> P["Decision promotion"]
  P --> Q["decision.decision_queue"]
  Q --> M
```

## Platform Components

- Database schemas: `raw`, `staging`, `analytics`, and `decision`.
- Ingestion: any connector that lands claims, financial postings, and referrals.
- Transform: dbt revenue-cycle staging and mart models.
- Runtime logic: backend service calculations in `revenue_cycle_service.py`.
- API: FastAPI routes under `/api/v1/revenue-cycle` and `/api/v1/rcm`.
- Portal: Next.js workspace under `/use-cases/revenue-cycle-management`.
- Report: downloadable board pack generated from `/api/v1/rcm/board-pack`.
- BI: Superset dashboard backed by revenue-cycle marts.

## Current Runtime Position

Unlike Bed Pressure, RCM does not currently use a separate R forecasting or anomaly runtime. Forecast and decision-support calculations are deterministic dbt/backend logic. The golden structure still has a `runtime` folder to make this explicit and portable.
