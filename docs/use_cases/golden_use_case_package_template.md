# Golden Use-Case Package Template

This document defines the canonical OpenCare use-case package template.

It is the template a future generator, cloud workflow, or implementation team should fill out in order to produce a ZIP package that OpenCare can upload, validate, preview, install, include, exclude, remove operationally, and uninstall.

The goal is not just to describe a good use case.

The goal is to define a **complete, reusable, import-ready platform module**.

## Purpose

The golden package template exists to solve this target workflow:

1. define a business problem
2. fill out a standard OpenCare use-case package
3. upload the ZIP into OpenCare
4. let OpenCare validate and stage the package
5. install, apply, include, exclude, remove, or uninstall the package safely

This template should be domain-agnostic.

It must work for:

- clinical operations
- financial operations
- commercial operations
- staffing
- quality
- supply chain
- or any future domain-specific operational intelligence use case

## Reference implementation

The best current reference implementation is TALEMIA Business Intelligence.

TALEMIA is not the golden template itself, but it is the best practical example of the platform pattern because it already exercises:

- manifest registration
- dbt staging and marts
- backend route and service structure
- portal workspace structure
- governance registration
- use-case apply and validate flows
- operational include and exclude behavior

Future use cases should copy the **platform shape** of TALEMIA, not its business domain.

## Package model

A use-case package is a full OpenCare module, not a dashboard upload.

The package is expected to contain:

- package metadata
- use-case manifest data
- business, data, API, dashboard, governance, lifecycle, and validation contracts
- dbt assets
- backend assets
- portal assets
- dashboard assets
- governance assets
- demo or synthetic data assets when required
- lifecycle assets
- checksum assets

## Canonical ZIP structure

The canonical package layout is:

```text
use-case-package.zip
  <root-folder>/
    package.yaml
    manifest/
      usecase.yaml
    contracts/
      business.yaml
      data.yaml
      api.yaml
      dashboard.yaml
      governance.yaml
      demo-data.yaml
      validation.yaml
      lifecycle.yaml
    schemas/
      use_case.schema.yaml
      data_contract.schema.yaml
      api_contract.schema.yaml
      dashboard_contract.schema.yaml
      governance_contract.schema.yaml
      validation_contract.schema.yaml
      domain_model.schema.yaml
    dbt/
      selectors.yml
      sources.yml
      staging/
      marts/
      dictionary/
      macros/
      tests/
    backend/
      routes.yaml
      responses/
      queries/
    portal/
      routes.yaml
      navigation.yaml
      workspace.yaml
      empty-state.yaml
      pages/
      components/
    dashboards/
      dashboards.yaml
      charts/
      sql/
    governance/
      ownership.yaml
      freshness_sla.yaml
      dq_rules.yaml
      lineage.yaml
      evidence_pack.yaml
      classification.yaml
    demo-data/
      seeds/
      generator/
        domain_model.yaml
        *.py
    validation/
      checks.yaml
      *.sh
      *.py
    lifecycle/
      install.yaml
      apply.yaml
      include.yaml
      exclude.yaml
      remove-operational.yaml
      uninstall.yaml
    checksums/
      manifest.sha256
```

Rules:

- the ZIP must contain exactly one root folder
- no path traversal
- no `.git`, `node_modules`, `__pycache__`, `dbt/target`, `.env`, or secret material
- validation and generator scripts are allowed only in declared safe locations

## Mandatory package metadata

The top-level `package.yaml` is the package identity and lifecycle contract.

Required fields:

- `api_version`
- `kind`
- `package_id`
- `metadata.slug`
- `metadata.name`
- `metadata.version`
- `compatibility`
- `entrypoints`
- `registration`
- `features`
- `lifecycle`

### Example `package.yaml`

```yaml
api_version: v1
kind: UseCasePackage
package_id: claims-leakage-management

metadata:
  slug: claims-leakage-management
  name: Claims Leakage Management
  version: 1.0.0
  domain: Financial Operations
  owner: Revenue Cycle

compatibility:
  min_platform_version: 0.1.0

entrypoints:
  portal_route: /use-cases/claims-leakage-management
  api_prefix: /api/v1/claims-leakage

registration:
  mode: staged_only

features:
  dbt: true
  backend: true
  portal: true
  dashboards: true
  governance: true
  demo_data: true

lifecycle:
  install: true
  apply: true
  include: true
  exclude: true
  remove_operational: true
  uninstall: true
```

## Manifest contract

`manifest/usecase.yaml` is the use-case registration view of the package.

It should align cleanly with the platform's `config/use_cases.yaml` shape.

Required fields:

- `slug`
- `name`
- `description`
- `api_prefix`
- `portal_pages`
- `source_tables`
- `record_specs`
- `superset_dashboard_id` if dashboards are promised

Rules:

- manifest slug must match `package.yaml`
- package identity and manifest identity must not drift
- referenced routes, pages, dashboards, and assets must actually exist

## Business contract

The business contract should be structured, not prose-only.

Required sections:

- business problem
- target users/personas
- decisions supported
- value proposition
- KPIs
- operational scenarios
- success criteria

Good use-case prompts should fill this contract before any code is generated.

## Data contract

The data contract defines what the use case needs to function.

Required areas:

- source systems
- raw tables
- primary entities
- entity grain
- staging expectations
- mart expectations
- dictionary expectations
- KPI definitions
- joins and relationship expectations

### Example fact-table shape

```yaml
fact_table:
  name: analytics.fct_claims_leakage_opportunity
  grain: one row per recoverable leakage opportunity
  keys:
    - opportunity_id
    - claim_id
    - encounter_id
  measures:
    - expected_recovery_amount
    - leakage_amount
    - priority_score
    - days_to_deadline
  dimensions:
    - payer_id
    - department_id
    - owner_team
    - issue_type
```

## Dashboard contract

The dashboard contract should define the intended executive and operational experience.

Minimum dashboard groups:

- executive dashboard
- operational dashboard
- governance dashboard

Each dashboard should define:

- intended audience
- questions answered
- KPI cards
- charts
- tables
- filters
- drilldowns
- empty-state behavior

The package should not ship generic BI objects with no contract narrative.

## API contract

The API contract defines the intended backend surface.

Required areas:

- endpoint list
- request parameters
- response shape
- drilldown expectations
- filtering
- empty-state semantics
- lineage or metadata expectations when applicable

### Example API response

```json
{
  "status": "ok",
  "meta": {
    "empty": false,
    "as_of": "2026-05-23T10:00:00Z",
    "message": null
  },
  "summary": {
    "recoverable_cash_7d": 185000.0,
    "cash_at_risk": 42000.0,
    "priority_actions": 14
  }
}
```

## Governance contract

The governance contract defines why the use case can be trusted.

Required areas:

- owner
- steward
- freshness SLA
- data quality checks
- lineage stages
- classification mapping
- evidence pack
- compliance or policy notes

If a package claims governed metrics, it should declare how that governance is represented.

## Demo and synthetic data contract

If the use case is demoable, it must include a real demo-data contract.

Required areas:

- declared entities
- synthetic seed files or generator path
- domain model
- row-count expectations
- expected mart population
- expected dashboard/API readiness

The package should not assume the platform will invent meaningful demo data automatically.

### Domain model expectations

If demo data is included:

- `demo-data/generator/domain_model.yaml` should exist
- `domain.use_case_slug` should match package slug
- each entity should define:
  - `id`
  - `type`
  - `fields`
  - `output_seed` or a generator path
- relationships should reference valid entities

## Validation contract

The validation contract should prove the package works end to end.

Minimum validation areas:

1. package structure
2. manifest consistency
3. contract completeness
4. schema completeness
5. raw/demo data readiness
6. dbt asset readiness
7. backend asset readiness
8. portal asset readiness
9. dashboard asset readiness
10. governance asset readiness
11. lifecycle asset readiness

### Example validation checklist

```text
- package.yaml exists and parses
- manifest/usecase.yaml exists and slug matches package
- required contracts exist
- domain_model.yaml is valid when demo data is declared
- dbt SQL exists and is non-destructive
- backend queries do not read raw.* or staging.*
- dashboard SQL does not read raw.* or staging.* for business dashboards
- lifecycle assets exist
- checksum manifest validates when present
```

## Lifecycle contract

The package should support these lifecycle stages:

- upload
- stage
- validate
- install
- apply
- include
- exclude
- remove-operational
- uninstall

These are not all the same thing.

### Meaning of each stage

`install`
- register the package and move it into installed package storage
- do not claim that dynamic assets are live unless they are actually materialized

`apply`
- refresh installed package state from staged assets

`include`
- mark the package active and visible in active package views

`exclude`
- mark the package inactive while preserving assets and history

`remove-operational`
- disable operational visibility and schedules while preserving audit and evidence

`uninstall`
- unregister the package from the managed package registry
- preserve audit history unless explicitly instructed otherwise

## OpenCare v1 materialization truth

At the current platform maturity level, uploaded packages should be treated honestly.

The platform can safely do these things today:

- upload the ZIP
- store it safely
- extract it safely
- validate it
- preview it
- record it in a package registry
- install it into managed package storage
- apply it into managed package storage
- include and exclude it operationally in the package registry
- remove it operationally
- uninstall it from the registry

The platform should **not** fake these capabilities unless they are explicitly implemented:

- dynamic FastAPI route generation from uploaded package specs
- dynamic Next.js route generation from uploaded package specs
- automatic dbt model materialization from uploaded package files
- automatic Superset dashboard import and publish from uploaded dashboard YAML

If a package is only staged for future materialization, the platform must say so clearly.

## Reusability rules

Future use cases should copy these things from the golden template:

- package folder structure
- package metadata shape
- manifest shape
- contract separation
- validation model
- lifecycle model
- import-readiness expectations

Future use cases should customize:

- business problem
- personas
- source systems
- KPIs
- data entities
- marts
- APIs
- dashboard semantics
- governance specifics

In other words:

- platform structure is reusable
- business domain content is specific

## Golden package checklist

A package is golden-template compliant when:

- it follows the canonical ZIP structure
- it includes `package.yaml`
- it includes `manifest/usecase.yaml`
- all required contract files exist
- all required schema files exist
- dbt assets are present when `has_dbt=true`
- backend assets are present when backend exposure is promised
- portal assets are present when workspace exposure is promised
- dashboard assets are present when dashboards are promised
- governance assets are present when governed metrics are promised
- demo assets are present when demo data is promised
- lifecycle assets exist
- checksums exist or are explicitly omitted by policy
- the package can be uploaded, validated, previewed, installed, included, excluded, and uninstalled without lying about runtime materialization

## Recommended next platform step

This document is the package contract.

The next step after this document is a real generator/import toolchain:

- `scaffold_use_case.sh <slug>`
- `build_use_case_package.sh <slug>`
- `import_use_case_package.sh <zip>`

That would turn this golden template from documentation into a real package factory.
