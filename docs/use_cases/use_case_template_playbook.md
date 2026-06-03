# Use-Case Template Playbook

This playbook explains the repeatable OpenCare pattern for adding a new use case.

For the canonical bundle standard, see:

- [golden_use_case_package_template.md](/C:/R_Home/opencare-platform/docs/use_cases/golden_use_case_package_template.md)

The practical question this playbook answers is:

"If we bring another use case next week, what do we produce first, what do we implement in the repo, and how do we prove the result matches the contract?"

## Bottom line

The repeated pattern is now:

1. define the use case as a **golden bundle**
2. review its platform capability bindings honestly
3. create an implementation mapping
4. implement it as a native shell on OpenCare
5. validate the implementation against the bundle

This is better than starting directly in code because it keeps:

- business meaning
- dashboard fidelity
- governance
- runtime intent
- human authorization

explicit before implementation starts.

## Two artifacts always exist

Every future use case should have two connected artifacts.

### 1. The golden bundle

This is the source contract.

It declares:

- business objectives
- KPI suite
- dashboard story
- data path
- runtime contracts
- decision and action contracts
- governance
- capability bindings
- fidelity and validation rules

### 2. The native OpenCare implementation

This is the working shell in the repository.

It reuses platform layers such as:

- `config/use_cases.yaml`
- `dbt/`
- `apps/backend/`
- `apps/portal/`
- governance surfaces
- shared decision and notification paths where supported

## The implementation sequence

Use this sequence every time.

### 1. Define the bundle

Create or receive a bundle with:

- manifest
- business
- data
- dbt
- runtime
- decisions
- screens
- bindings
- governance
- acceptance
- validation

Do not start from screenshots alone.

### 2. Check capability truthfulness

Before implementation, classify every platform dependency as:

- `reuse_existing`
- `partially_supported`
- `requires_extension`

This prevents a use case from binding to phantom platform capabilities.

### 3. Create the implementation mapping

Map the bundle into repo targets.

Typical mapping targets:

- `config/use_cases.yaml`
- `dbt/opencare/models/<use_case>/...`
- `apps/backend/app/routes/<use_case>.py`
- `apps/backend/app/services/<use_case>_service.py`
- `apps/portal/app/...`
- `apps/portal/components/...`
- governance registry or trust surfaces

### 4. Implement as a native shell

Build the use case on top of the platform.

Do not make it a separate product.

### 5. Validate against the bundle

Validate not only:

- route existence
- API existence

but also:

- dashboard fidelity
- story order
- required components
- governance evidence
- runtime evidence
- action authorization

## What “good” looks like

A good new use case has:

- a strong bundle
- a clear implementation mapping
- a native shell implementation
- honest capability boundaries
- repeatable validation

## What to avoid

Avoid these failure patterns:

- implementing from mockups without a dashboard contract
- treating dashboards as decorative rather than canonical
- inventing unsupported platform behavior
- mixing multiple layout authorities
- mixing multiple component vocabularies
- making human authorization a UI convention instead of a contract

## Repo implementation pattern

The most common repo targets are still:

```text
config/use_cases.yaml
docs/use_cases/<use_case>/...
dbt/opencare/models/<use_case>/...
apps/backend/app/routes/<use_case>.py
apps/backend/app/services/<use_case>_service.py
apps/portal/app/.../<use_case>/...
apps/portal/components/<use_case>/...
```

But now the driving artifact is the bundle, not a loose dashboard brief.

## Required implementation layers

Every use case should still span all of these layers:

- business contract
- manifest registration
- source or synthetic data path
- dbt models
- backend APIs
- portal shell
- governance visibility
- decision and action behavior where relevant
- validation

If one of these is missing, the use case is usually only partially real.

## Repeated dashboard-rigid pattern

For dashboard-rigid use cases, the implementation must specifically honor:

- `layout_zones.yaml`
- `visual_grammar.yaml`
- `component_anatomy.yaml`
- `dashboard_implementation_matrix.yaml`
- `story_flow.yaml`
- `business_alignment_matrix.yaml`
- `dashboard_fidelity_contract.yaml`
- `rendered_dashboard_conformance.yaml`

These are not optional extras.

They are what stop the implementation from flattening into a generic page.

## Suggested workflow for future use cases

### Authoring phase

1. define business outcome
2. define KPI suite
3. define dashboard suite
4. define data and runtime artifacts
5. define decisions and governance
6. define capability bindings

### Mapping phase

1. register the use case
2. define repo targets
3. identify reused capabilities
4. identify required extensions

### Build phase

1. add seeded or connected data path
2. add dbt assets
3. add backend routes and service
4. add portal shell
5. wire governance and evidence

### Validation phase

1. data exists
2. routes resolve
3. dashboards render
4. story order holds
5. required components exist
6. human authorization and audit expectations are visible

## Final takeaway

The repeatable pattern is no longer:

- write some routes
- make a dashboard
- patch until it looks acceptable

The repeatable pattern is:

- define the golden bundle
- map it to OpenCare
- implement the shell
- validate the shell against the bundle
