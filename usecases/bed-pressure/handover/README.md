# Bed Pressure Intelligence Handover Package

## Handover Purpose

This handover package gives an implementation team enough context to rebuild, validate, demo, and operate the Bed Pressure Intelligence use case on OpenCare or on another platform with similar components.

It should be read with the canonical bundle at `usecases/bed-pressure`. The bundle contains the machine-readable contracts. The docs explain how to implement them.

## Current Status

- Branch: `dev`
- Latest documentation commit: `99e9802 Complete bed pressure implementation documentation`
- Use case package: `usecases/bed-pressure`
- Package standard: `golden-bundle-1.8.12-candidate`
- Use case status: demo-ready pattern, production-portable with source mapping and platform capability review

## What Is Included

- Business objective, KPIs, workflows, personas, and decisions.
- Source data and metadata contracts for wards, patients, and bed events.
- dbt source, staging, analytics, and Superset-facing model documentation.
- R runtime model documentation for forecast and anomaly services.
- Backend API contract for occupancy, forecast, anomaly, and decisions.
- Portal implementation map for overview, current status, predictions, analysis, and decisions.
- Governance and validation requirements covering classified assets, lineage, freshness, ownership, and acceptance.
- Implementation guide for installing the use case on a fresh platform.

## Recommended Reading Order

1. `../README.md`
2. `../docs/architecture.md`
3. `../docs/source_data_and_metadata.md`
4. `../docs/dbt_models.md`
5. `../docs/runtime_models.md`
6. `../docs/backend_api_contract.md`
7. `../docs/portal_implementation.md`
8. `../docs/decision_workflow.md`
9. `../docs/governance_and_validation.md`
10. `../docs/implementation_guide.md`
11. `handover_checklist.md`
12. `file_manifest.md`

## One-Line Implementation Story

Raw ward and bed-event data is normalized by dbt into governed occupancy facts, R runtimes produce forecasts and anomaly evidence, the backend exposes the data and decision actions through APIs, and the portal plus Superset present current pressure, future risk, executive analysis, decisions, audit, and governance.

## Non-Negotiable Constraints

- Do not bypass dbt marts from the portal.
- Do not calculate forecasts or anomalies in the browser.
- Do not allow autonomous external actions.
- Do not hide empty decision queues without a labelled demo fallback.
- Do not promote without governance assets, freshness, lineage, ownership, and validation evidence.
