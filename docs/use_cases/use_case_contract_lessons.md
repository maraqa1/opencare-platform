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
- Airbyte installation and health verification
- use-case source sync
- Superset sync
- demo proof flow

They should also define the correct phase order for data-bearing use cases:

1. platform bootstrap
2. shared service install
3. Airbyte and ingestion availability
4. source sync or synthetic demo load
5. dbt materialization
6. runtime execution
7. dashboard sync
8. validation

Important lessons:

- Airbyte should be installed after shared infrastructure is healthy, not after runtime side effects
- runtime jobs should never be the reason ingestion fails to happen
- dbt and runtime phases need explicit behavior when upstream raw data is intentionally empty on a fresh install

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

### 10. Fresh VM and bootstrap contract

Future prompts should require that a brand-new VM build is treated as a first-class scenario, not an afterthought.

That contract should explicitly define:

- host bootstrap requirements
- expected `.env` source of truth
- secret rotation or secret replacement behavior
- whether install scripts are allowed to preserve existing cluster secrets
- whether a phase is expected to run on the VM host or inside the cluster
- what "platform installed" means before any use-case data is loaded

Important lessons:

- a fresh VM is the fastest way to expose hidden coupling between install phases
- stale Kubernetes secrets are a major repeatability risk when `.env` changes are expected to take effect
- host-run scripts must not assume Kubernetes service DNS names resolve on the VM itself
- platform install and use-case provisioning are different responsibilities and should not be conflated

### 11. Runtime gating contract

Future prompts must require explicit rules for when runtime jobs are allowed to execute.

That contract should answer:

- which mart or source tables are prerequisites
- what row-count threshold is considered "ready"
- whether empty marts are valid on first install
- whether a runtime miss is fatal or a visible non-fatal skip

Important lessons:

- runtime bootstrap should be gated by mart readiness, not by hope
- a forecast or anomaly refresh against an empty mart is not a useful readiness signal
- install should surface skipped runtime work clearly, but it should not block later ingestion or demo phases

### 12. Use-case factory contract

Future prompts should define each use case as a repeatable module with three explicit steps:

1. platform install
2. use-case provisioning
3. use-case validation

That contract should make it possible to add new use cases with the same pattern every time:

- source contract
- seed or connector configuration
- raw landing schema
- dbt staging and marts
- runtime outputs
- dashboard sync
- governance registration
- acceptance validation

Important lessons:

- a single giant installer is convenient, but it hides whether the platform or the use case actually failed
- explicit provisioning scripts make new use cases easier to add, test, and rerun
- "platform is healthy" and "Bed Pressure or RCM is demo-ready" must be treated as different checkpoints

## Specific Revenue Cycle Management lessons

From this implementation, future use-case prompts should explicitly guard against:

- adding portal routes without defining how the portal image gets deployed
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
- Fresh VM bootstrap assumptions
- Ingestion and Airbyte ordering
- Runtime preconditions and skip behavior

## Demo acceptance checklist

A future use case should not be called complete unless all of the following are true:

- the shared platform is installed successfully on a clean VM
- shared secrets reflect the current `.env` values
- Airbyte or equivalent ingestion infrastructure is deployed and reachable before source sync starts
- synthetic source tables are populated
- ingestion loads those records into the target raw schema
- required marts have non-zero row counts
- dbt tests pass
- runtime jobs only execute after their input marts are populated
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
