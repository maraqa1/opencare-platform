# Implementation Guide

## Goal

This guide describes how to rebuild Bed Pressure Intelligence on OpenCare or another platform with similar components: ingestion, dbt, database schemas, model runtimes, API services, portal UI, BI dashboards, scheduler, and governance registry.

## Prerequisites

- A PostgreSQL-compatible warehouse or operational analytics database.
- Raw source landing tables for wards, patients, and bed events.
- dbt or equivalent SQL transformation runner.
- A scheduler such as Kubernetes CronJob, Airflow, Dagster, or platform cron.
- A runtime service layer capable of running the forecast and anomaly jobs.
- An API layer capable of exposing occupancy, forecast, anomaly, and decision endpoints.
- A frontend or portal shell.
- A governance registry or metadata catalog.

## Step 1: Configure Source Landing

Create or map the source tables:

- `raw.wards`
- `raw.patients`
- `raw.bed_events`

If physical schemas differ, keep the logical dbt source named `raw` and map the physical schema with `DBT_SOURCE_SCHEMA` or `RAW_SCHEMA`.

Acceptance:

- Source freshness fields are populated.
- Ward identifiers match across `wards` and `bed_events`.
- `bed_events` includes daily census rows and movement rows.

## Step 2: Build dbt Staging

Implement:

- `stg_wards`
- `stg_patients`
- `stg_bed_events`
- `stg_departments` if compatibility with department views is required.

Acceptance:

- `stg_bed_events` deduplicates by event key.
- `event_type` is normalized.
- `occupancy_rate` is calculated only when staffed beds are available.

## Step 3: Build Analytics Marts

Implement:

- `dim_ward`
- `fct_bed_occupancy`
- `fact_bed_occupancy` compatibility alias if required by legacy consumers.
- `fct_bed_pressure_daily_summary`
- `fct_bed_pressure_latest_snapshot`
- `fct_bed_pressure_distribution`
- `fct_bed_pressure_executive_actions`

Acceptance:

- `fct_bed_occupancy` is the single governed input for runtime models.
- Latest snapshot returns one row per ward for the latest day.
- Executive actions table contains both plain text and display columns.

## Step 4: Deploy Forecast Runtime

Deploy the service equivalent of `r-runtime/bed-forecast`.

Acceptance:

- `GET /healthz` returns ok.
- `POST /run` writes `output.forecast`.
- `GET /latest` returns rows for the latest run.
- Backend forecast endpoint reads the latest forecast run.

## Step 5: Deploy Anomaly Runtime

Deploy the service equivalent of `r-runtime/anomaly`.

Acceptance:

- `GET /healthz` returns ok.
- `POST /run` writes or clears `output.anomaly`.
- `GET /latest` returns current anomaly evidence.
- Backend anomaly endpoints read the latest run.

## Step 6: Deploy Decision Layer

Create decision schema tables:

- `decision.decision_queue`
- `decision.decision_log`
- `decision.decision_outcomes`
- `decision.notification_log`

Deploy the decision service rules and endpoints.

Acceptance:

- `POST /api/v1/decisions/generate` evaluates current signals.
- Active decisions appear in `GET /api/v1/decisions`.
- State transitions write audit logs.
- Completed decisions can be measured after the observation window.

## Step 7: Deploy Portal

Implement the workspace routes:

- Overview
- Current Status
- Predictions
- Analysis
- Decisions

Acceptance:

- Current status shows real occupancy data.
- Predictions show runtime forecast data.
- Analysis shows native KPI/trend/action visuals and embedded BI if available.
- Decisions show generated decisions or clearly labelled demo fallback.

## Step 8: Deploy BI Dashboard

Create a dashboard using supported visualizations only. For the current OpenCare Superset deployment, avoid unregistered plugins such as bubble, boxplot, and treemap unless the deployment registers them.

Recommended datasets:

- `analytics.fct_bed_pressure_daily_summary`
- `analytics.fct_bed_pressure_latest_snapshot`
- `analytics.fct_bed_pressure_distribution`
- `analytics.fct_bed_pressure_executive_actions`

Acceptance:

- KPI cards render.
- Trend and bar charts render.
- Pressure mix renders with a registered chart type.
- Executive actions board shows colored badges and meters.

## Step 9: Register Governance

Register:

- Source assets.
- dbt models.
- Runtime outputs.
- Decision tables.
- Portal screens.
- BI datasets.

Acceptance:

- Governance workspace lists the Bed Pressure use case.
- Classified assets are populated.
- Freshness, owner, and lineage are visible.

## Step 10: Validate and Promote

Run:

- Source checks.
- dbt build.
- Runtime health and run checks.
- Backend API smoke tests.
- Portal route smoke tests.
- Dashboard render check.
- Governance validation.

Promote only when the use case can be demonstrated from source data through decisions and governance evidence.
