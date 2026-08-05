# Implementation Guide

## Goal

Rebuild Revenue Cycle Management on a platform with ingestion, SQL transformation, backend API, portal UI, decision storage, reporting, and governance.

## Step 1: Load Raw Data

Map or load:

- `raw.rcm_claims`
- `raw.rcm_financial_postings`
- `raw.rcm_referrals`

For demo, load `raw-data/opencare_demo_mysql.sql` into the demo MySQL source, then sync or copy to the configured raw schema.

## Step 2: Build dbt Models

Run revenue-cycle staging and marts:

```bash
cd dbt/opencare
dbt build --select revenue_cycle
```

Required marts:

- `analytics.fct_revenue_cycle`
- `analytics.fct_cash_recovery_opportunity`
- `analytics.fct_cash_forecast`
- `analytics.fct_payer_contract_performance`
- `analytics.fct_revenue_leakage`
- `analytics.fct_team_recovery_performance`

## Step 3: Deploy Backend

Deploy backend service with revenue-cycle routes enabled.

Smoke-test:

- `/api/v1/revenue-cycle/cash-command`
- `/api/v1/revenue-cycle/recovery-queue`
- `/api/v1/rcm/board-pack`
- `/api/v1/rcm/decision-queue`

## Step 4: Deploy Portal

Deploy pages under `/use-cases/revenue-cycle-management`.

Confirm:

- Cash Command is populated.
- Recovery Queue is ranked.
- Decision Queue can promote and review.
- Board-pack download is available.

## Step 5: Configure BI

Use revenue-cycle marts as datasets. Avoid unsupported chart plugins. Prefer KPI cards, line charts, bar charts, tables, and native conditional formatting.

## Step 6: Register Governance

Register source, staging, marts, API, report, decision, and portal assets. Show classified assets, lineage, ownership, freshness, and validation evidence.

## Step 7: Promote

Promote when dbt, APIs, portal, board-pack, decisions, and governance all pass the acceptance checks.
