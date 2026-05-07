# Use-Case Contract Lessons Learned

This document captures the lessons from implementing Revenue Cycle Management so future OpenCare use cases are easier to deliver on the shared platform with less patch churn.

## Bottom line

The shared OpenCare platform architecture held up well.

The recurring problems were not caused by the idea of a shared backend, shared portal, shared dbt project, or shared Superset deployment.

The problems came from an under-specified use-case contract:

- deployment behavior was not explicit enough
- demo data expectations were not explicit enough
- Superset rendering and access requirements were not explicit enough
- validation stopped too early at object creation instead of true runtime readiness
- dashboard quality and dashboard discoverability were not specified strongly enough

## What future use-case prompts must include

### 1. Use-case implementation contract

Every new use case should explicitly declare:

- source tables required
- synthetic demo data requirements
- dbt staging models required
- dbt marts required
- backend endpoints required
- portal routes required
- Superset dashboard slug and chart list
- decision layer behavior, if applicable

The contract should treat the use case as a module spanning all platform layers, not just a UI or analytics addition.

### 2. Deployment contract

The prompt must define how code actually becomes live.

It should answer:

- does `install/install.sh` deploy current repo code or prebuilt images?
- which components require image publication?
- which components can be refreshed with targeted scripts?
- which steps are safe alternatives to a full install for verification?

Future prompts should explicitly separate:

- backend rollout
- portal rollout
- dbt run
- Superset sync
- demo proof flow

Important lesson:

- a green pull-request CI run does not necessarily mean deployable images were published
- if Kubernetes manifests consume `:latest` images, the branch that carries use-case code must either publish those images or merge into a branch that does
- VM rollout scripts that restart deployments only make new code visible after the target image tag has been rebuilt and pushed
- deployment validation must inspect the running pod contents or runtime routes, not only local git state or CI status

### 3. Synthetic data contract

If a use case is expected to demo live values, the prompt must require a non-empty synthetic data path.

That contract must include:

- raw source tables to generate
- realistic entity distributions
- required row-count minimums
- downstream mart population requirements
- truthful empty-state behavior before synthetic data is loaded

Important lesson:

- "feature implemented" is not the same as "demo-ready"
- a live use-case demo requires synthetic records that survive ingestion, dbt, APIs, portal views, and Superset

### 4. dbt contract

Future prompts must specify:

- the schema path where new models materialize
- whether contracts are enforced
- expected data types for timestamp/date fields
- custom test macros needed by the models
- reconciliation or quality tests required for the use case

The prompt should also require that dbt tests pass against the synthetic dataset, not only against empty scaffolds.

### 5. Backend contract

Future use-case prompts should define:

- exact endpoint list
- expected populated response shape
- expected empty response shape
- required semantic rules for `meta.empty`
- acceptable use of `0` versus `null`

Important lesson:

- runtime stability is not enough
- responses also need to be semantically truthful

### 6. Portal navigation contract

Future prompts must require navigation validation from the actual product entry points, not only direct route existence.

That means:

- Home -> Active Use Cases -> Enter Workspace must resolve correctly
- use-case root routes must redirect to the intended default page
- each workspace tab route must exist
- links in the card grid must use a declared default route rather than a guessed shared convention

### 7. Superset dashboard contract

This needs to be much stricter in future prompts.

The prompt must define:

- dashboard slug
- datasets required
- chart list required
- viz types allowed
- intended viewer role
- access model for embedded or public views
- render success criteria

Important lesson:

- "dashboard exists" is not the same as "dashboard works"
- "chart object created" is not the same as "visualization renders"

Future prompts should explicitly require:

- chart types compatible with the deployed Superset image
- dashboard rendering validation in the browser
- a non-error load for the intended viewer role
- an executive-grade information hierarchy rather than a generic BI worksheet
- a visible dashboard entry point from the workspace UI

### 8. Validation contract

Future prompts must require layered validation:

1. synthetic source data exists
2. ingestion lands the source data
3. dbt marts populate
4. dbt tests pass
5. backend endpoints return valid populated data
6. portal pages render live content
7. Superset dashboards render without runtime visualization errors

Validation should be capability-based, not brittle historical assertions.

Bad example:

- exact total metric count in a shared dictionary table

Better example:

- required use-case metrics exist
- required marts have rows
- required dashboard charts render

### 9. Administration and governance parity contract

Future use-case prompts must require explicit review of the Administration surface, not only operational workspaces.

That means every active use case should be checked for:

- governance visibility
- dictionary coverage
- record-spec coverage
- lineage entry points
- configuration metadata visibility
- parity with earlier flagship use cases

Important lessons:

- a use case is not complete if it is operationally visible but administratively invisible
- governance should represent use cases as governed operational products, not as a flat metadata dump
- equal visual weight across active use cases matters, otherwise the platform still feels single-use-case
- Bed Pressure being the first flagship use case created hidden hardcoding that future prompts should explicitly guard against

Future prompts should also allow a phase-1 governance pattern:

- a centralized frontend governance registry is acceptable when live governance metadata services do not yet exist
- that registry must normalize actual repo truth, not invent a parallel truth model
- unknown or not-connected trust evidence is better than fake all-green statuses
- discovery controls such as search, chips, and filters should do real work, not just decorate the page

Governance should remain aligned to the OpenCare workspace model:

- use cases grouped into their own operational workspaces
- governance presented under Administration
- governance views grouped by use case contract, glossary, assets, lineage, quality, and compliance
- business-readable ownership, purpose, consumers, and compliance context shown alongside technical metadata

## Specific Revenue Cycle Management lessons

From this implementation, future use-case prompts should explicitly guard against:

- adding portal routes without defining how the portal image gets deployed
- assuming a PR validation run published backend or portal images
- creating dbt models without specifying their schema materialization path
- using empty scaffold marts where a live demo is expected
- using Superset viz types that are not registered in the deployed image
- widening anonymous or public dashboard access as a quick fix instead of defining the intended access model up front
- declaring dashboard success before browser rendering is checked
- shipping technically correct dashboards that do not meet executive or C-level usability needs
- leaving the Superset dashboard undiscoverable from the portal workspace UX

## Recommended reusable prompt sections

Every future use-case prompt should include these headings:

- Business outcome
- Source systems and synthetic data requirements
- dbt staging and marts
- Backend APIs
- Portal routes and default entry point
- Superset dashboard contract
- Dashboard discoverability in the portal
- Executive dashboard composition standard
- Access and role assumptions
- Empty-state behavior
- Validation and demo acceptance criteria
- Deployment and refresh steps

## Demo acceptance checklist

A future use case should not be called complete unless all of the following are true:

- synthetic source tables are populated
- ingestion loads those records into the target raw schema
- required marts have non-zero row counts
- dbt tests pass
- API endpoints return valid populated responses
- portal workspace pages show live content
- Home navigation enters the workspace correctly
- the workspace exposes a visible path to the executive dashboard where applicable
- Superset dashboards open and render without visualization errors

## Final takeaway

The platform architecture is sound.

What future use cases need is a tighter contract that treats implementation as a full platform workflow:

- data
- transformation
- runtime
- navigation
- analytics
- access
- validation

That is the main lesson to preserve from Revenue Cycle Management.
