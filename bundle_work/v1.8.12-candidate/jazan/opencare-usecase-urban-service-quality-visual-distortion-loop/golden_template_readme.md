# OpenCare Golden Use Case Template v1.8.12 Candidate

This candidate package separates the reusable OpenCare golden template from the Jazan worked example.

## What is reusable
- `golden-template/template_manifest.yaml`
- `golden-template/required_file_tree.yaml`
- `golden-template/naming_conventions.yaml`
- `golden-template/versioning_rules.yaml`
- `golden-template/package_readiness_checklist.yaml`
- `golden-template/patterns/*.yaml`

## What stays worked-example specific
- The Jazan use-case contracts under:
  - `business/`
  - `data/`
  - `dbt/`
  - `decisions/`
  - `manifest/`
  - `runtime/`
  - `screens/`
  - `bindings/`
  - `governance/`
  - `acceptance/`

## Template design rules
- dashboard-rigid contracts remain mandatory
- action lifecycle snapshot plus append-only event stream are mandatory
- bilingual structure is structural, not bolt-on
- external actions are human-authorised and confirmation-gated
- KPI formulas must be explicit and reconciled
- screen catalog metadata must stay specific and screen-true

## Intended outputs
- `golden-use-case-template-v1.8.12-candidate.zip`
- `urban-service-quality-visual-distortion-loop-golden-bundle-v1.8.12-candidate.zip`
