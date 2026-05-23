# Use-Case Template Playbook

This playbook turns the current TALEMIA implementation into the recommended reference pattern for future OpenCare use cases.

It is intended to answer one practical question:

"If we want to add a new use case next week, what do we create, where does it live, and how do we prove it works?"

## Bottom line

The best current reference pattern is:

- `config/use_cases.yaml` for manifest metadata
- `docs/use_cases/<use_case>/...` for the contract and dashboard definition
- `dbt/opencare/models/<use_case>/...` for staging, marts, and dictionary models
- `apps/backend/app/routes/<use_case>.py` and `apps/backend/app/services/<use_case>_service.py` for APIs
- `apps/portal/app/use-cases/<slug>/...` and `apps/portal/components/<use_case>/...` for the workspace UI
- `scripts/use_cases/apply_use_case.sh <use_case>` for provisioning
- `scripts/use_cases/validate_use_case.sh <use_case>` for acceptance validation
- `scripts/use_cases/remove_use_case.sh <use_case>` for operational exclusion

TALEMIA is the best current example because it now proves:

- add
- provision
- validate
- include/exclude
- restore

## Required implementation layers

Every new use case should be designed as one module that spans all platform layers.

Required layers:

- business contract
- manifest registration
- source or synthetic demo data path
- dbt staging models
- dbt marts
- dbt dictionary models
- backend APIs
- portal workspace
- governance visibility
- provisioning workflow
- validation workflow
- operational remove or exclude workflow

If one of these layers is skipped, the use case is usually only partially real.

## Canonical folder pattern

Use this layout as the default target:

```text
config/use_cases.yaml
docs/use_cases/<use_case>/
docs/use_cases/<use_case>/use_case_contract.md
docs/use_cases/<use_case>/dashboard_suite_contract.md
docs/use_cases/<use_case>/dashboards/<dashboard>_contract.md
dbt/opencare/macros/<use_case>_raw_relation.sql            # if a custom raw resolver is needed
dbt/opencare/models/<use_case>/schema.yml
dbt/opencare/models/<use_case>/staging/*.sql
dbt/opencare/models/<use_case>/marts/*.sql
dbt/opencare/models/<use_case>/dictionary/*.sql
apps/backend/app/routes/<use_case>.py
apps/backend/app/services/<use_case>_service.py
apps/portal/app/use-cases/<slug>/page.tsx
apps/portal/app/use-cases/<slug>/layout.tsx
apps/portal/app/use-cases/<slug>/[tab]/page.tsx
apps/portal/components/<use_case>/<Workspace>.tsx
scripts/<use_case>/*                                       # raw loaders, generators, helpers
```

## Manifest pattern

Start by adding a manifest entry to `config/use_cases.yaml`.

Use this structure as the reference model:

```yaml
use_cases:
  example_use_case:
    enabled: true
    name: "Example Use Case"
    slug: example-use-case
    domain: operational-intelligence
    description: >
      Short business-readable explanation of the use case.
    owner_team: "Operations"
    portal:
      default_route: /use-cases/example-use-case
      tabs:
        - key: overview
          label: Overview
          route: /use-cases/example-use-case
        - key: governance
          label: Governance
          route: /use-cases/example-use-case/governance
    backend:
      api_prefix: /api/v1/example
      endpoints:
        - /summary
        - /detail
        - /governance/reconciliation
    data:
      raw_schema: raw_demo
      primary_marts:
        - analytics.fct_example_summary
        - analytics.fct_example_detail
      dictionary_tables:
        - dictionary.dict_example_metrics
    workflows:
      apply_script: scripts/use_cases/apply_use_case.sh example_use_case
      validate_script: scripts/use_cases/validate_use_case.sh example_use_case
      remove_script: scripts/use_cases/remove_use_case.sh example_use_case
```

Keep the manifest business-readable.
It should describe the shape of the use case, not hide logic in prose.

## Contract documents

Each use case should have three contract levels:

1. `use_case_contract.md`
- business outcome
- source systems
- data entities
- expected users
- portal routes
- backend endpoints
- success criteria

2. `dashboard_suite_contract.md`
- dashboard list
- dataset dependencies
- KPI groups
- cross-dashboard consistency rules

3. `dashboards/<dashboard>_contract.md`
- chart list
- KPI definitions
- filter behavior
- intended audience
- empty-state behavior

If the dashboard contracts are weak, the use case usually becomes visually inconsistent or semantically vague.

## Data model pattern

For future use cases, follow the TALEMIA split:

- `staging/`
  - raw cleanup
  - typing
  - normalization
  - dimension joins if lightweight

- `marts/`
  - use-case-grain facts
  - executive aggregates
  - reconciliation outputs
  - drilldown outputs

- `dictionary/`
  - KPI definitions
  - glossary terms
  - business-readable metric semantics

Recommended conventions:

- keep staging models raw-shaped but typed
- keep marts audience-shaped
- make one table the primary detail mart
- make one table the primary executive aggregate mart
- add one governance or reconciliation mart if the use case claims controlled metrics

## Backend API pattern

Each use case service should expose a small, explicit endpoint family.

Recommended pattern:

- summary endpoint
- one or more dimensional aggregate endpoints
- detail endpoint
- update or activity endpoint if relevant
- KPI or dictionary endpoint
- governance reconciliation endpoint

Recommended backend rules:

- return `meta.empty` truthfully
- return `data: []` for empty list endpoints
- return a business-readable `message` when data is absent
- include lineage and limitations in `meta` when useful

Do not hide data absence behind fake zeroes unless that is contractually correct.

## Portal workspace pattern

A future use case should ship with:

- a root workspace page
- tabbed navigation
- one layout guard using `UseCaseEnabledLayout`
- a dedicated workspace component under `apps/portal/components/<use_case>/`

Recommended portal conventions:

- one use-case slug
- one workspace component
- one tab registry export
- one route guard layout

That keeps the UI shape consistent even when the actual business visuals differ.

## Provisioning pattern

Provisioning should stay use-case-specific.

The default sequence is:

1. prepare source data
2. load raw data
3. refresh dbt project config in-cluster
4. run dbt for the use case
5. sync dependent analytics surfaces if needed

Recommended `apply_use_case.sh` behavior:

- fail if the manifest entry does not exist
- fail if the use case is disabled in the manifest
- call the use-case-specific raw loader if one exists
- use `DBT_SELECT=tag:<tag>` when the use case has dedicated dbt models
- avoid relying on a global full-project dbt run when a targeted run is safer

## Validation pattern

Validation should prove five things:

1. raw data exists
2. marts exist
3. dictionary tables exist if promised
4. backend endpoints return populated data
5. portal route resolves

Recommended validation checks:

- `select count(*)` > 0 for primary marts
- HTTP checks for all primary APIs
- one portal route check for the workspace root
- one governance or reconciliation check when governance is part of the contract

The validation script should fail on missing core marts, not merely log warnings.

## Remove or exclude pattern

Use `remove_use_case.sh` for operational removal.

That means:

- disable through the same override path as the admin UI
- hide from Home, Use Cases, and public Governance
- block workspace entry routes

This is not the same as deleting the code.

There are two separate concepts:

1. operational remove
- exclude from the running platform

2. repository delete
- remove files, registrations, models, docs, and routes

Future prompts should say explicitly which one is intended.

## Golden checklist for a new use case

Use this checklist before calling a new use case complete.

- manifest entry added to `config/use_cases.yaml`
- contract docs added under `docs/use_cases/<use_case>/`
- raw data path defined
- staging models created
- marts created
- dictionary models created if promised
- backend route created
- backend service created
- portal workspace created
- portal route guard added
- use-case registry entry added
- governance registration added if needed
- provisioning path wired into `apply_use_case.sh`
- validation path wired into `validate_use_case.sh`
- remove or exclude path supported
- VM deployment path tested
- data values visible in the workspace
- exclude and restore tested

## Suggested future enhancement

The next step after this playbook is a real scaffold flow.

Target outcome:

```bash
bash scripts/use_cases/scaffold_use_case.sh example_use_case
```

That scaffold should eventually create:

- manifest skeleton
- docs skeleton
- dbt folder skeleton
- backend route and service stubs
- portal route and workspace stubs
- apply and validate placeholders

Until that exists, TALEMIA should be treated as the reference implementation pattern.
