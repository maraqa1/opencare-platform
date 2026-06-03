# v1.8.12 Candidate Changelog

## Scope
- Controlled patch cycle on top of `v1.8.11-recovery-catalog-decision-clean`
- No dashboard-rigid regressions
- No bundle regeneration from scratch

## Batch 1: Action lifecycle
- Added `decision-workflows/action_lifecycle.yaml`
- Added governed `action_lifecycle` and `decision_action_event` entities
- Added `dbt/models/decision/jazan_action_lifecycle.sql`
- Expanded `jazan_decision_action_events.sql` into an append-only event stream contract
- Updated `decisions/action_buttons.yaml`, `decisions/audit.yaml`, `bindings/routes.yaml`, and `bindings/data_bindings.yaml` to require lifecycle linkage

## Batch 2: KPI reconciliation
- Replaced deferred KPI placeholder formulas in `business/kpis.yaml`
- Added explicit reconciliation status and notes for all six dashboard-visible KPIs
- Added `docs/kpi_formula_reconciliation_report_v1_8_12.md`

## Batch 3: Package version cleanup
- Removed contradictory bundle/template version fields from `package.yaml`
- Standardized:
  - `package_version: 1.8.12-candidate`
  - `opencare_golden_template_version: 1.8.12`
  - `compatibility.opencare_golden_template: 1.8.12`

## Batch 3.5: Screen catalog cleanup
- Rewrote canonical screen metadata in `screens/screen_catalog.yaml`
- Preserved `overview` as deprecated metadata only
- Added `real_route: false` to level-3 overview metadata in navigation and IA

## Batch 4: Demo data packaging
- Added deterministic demo-data generator stub location under `demo-data/`
- Added generated CSV package structure under `demo-data/generated/`

## Batch 5: Bilingual audit
- Added `validation/bilingual_audit_checks.yaml`
- Added `docs/bilingual_audit_report.md`

## Batch 6: Golden template extraction
- Added template manifest, file tree, naming, versioning, checklist, and reusable pattern files under `golden-template/`
- Preserved Jazan-specific material only in worked-example context and examples references

## Batch 7: Validator hardening
- Added new required files and lifecycle checks to `validation/checks.yaml`
- Hardened `validation/validate_golden_bundle.py` for:
  - version consistency
  - explicit KPI formulas
  - action lifecycle linkage
  - screen catalog semantic cleanup
  - bilingual audit coverage
  - demo-data referential integrity
