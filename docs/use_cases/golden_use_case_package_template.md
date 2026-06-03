# Golden Use-Case Bundle Template

This document defines the canonical OpenCare use-case bundle standard.

It replaces the older idea of a generic dashboard ZIP or an “upload and hope” package.

The golden bundle is the **source contract** for a use case that will be implemented as a native shell on the OpenCare platform.

## Bottom line

The platform is the durable product.

The use case is a governed shell or module that reuses platform capabilities:

- ingestion
- dbt transformation
- backend services
- portal workspace patterns
- governance and trust surfaces
- decision workflows
- notifications where supported

The bundle does **not** pretend to be a mini-platform.

It declares what the use case needs, how the dashboards must behave, what data and runtime artifacts must exist, and what the platform already supports versus what still needs extension.

## Current platform truth

Today, the safest and most honest OpenCare workflow is:

1. define the use case through a golden bundle
2. review the platform capability bindings honestly
3. map the bundle into OpenCare implementation targets
4. build it as a native shell in the repo
5. validate the shell against the bundle

The bundle should therefore be treated as:

- a **canonical source contract**
- a **repeatable implementation pattern**
- a **validation target**

It should not assume that OpenCare already auto-materializes every uploaded ZIP into live routes, dbt assets, dashboards, and workflows.

If a capability is not yet implemented platform-wide, the bundle must say so explicitly.

## Core principles

The golden bundle must follow these principles.

### 1. Platform-first

The bundle describes a use case that runs on top of OpenCare.

It must reuse the platform where possible rather than inventing a parallel execution model.

### 2. Dashboards are canonical

If a dashboard exists in the bundle, it is not a suggestion.

It is a canonical implementation unit.

The implementation must not:

- collapse it into a generic card stack
- substitute it with another shell shape
- flatten the story into looser sections

### 3. Business alignment is structural

Every dashboard component must map back to:

- a business objective
- a KPI
- a decision
- a governed data artifact

No component may exist as decoration only.

### 4. Locale and direction are structural

Every relevant artefact must declare:

- locale
- direction
- bilingual requirements where applicable

Bilingual readiness must be built into the contract, not left for later.

### 5. Human authorization is contractual

Every external action must require explicit human authorization.

This includes:

- approve
- request revision
- escalate
- create ticket
- email owner
- any external workflow side effect

### 6. Capability truthfulness is mandatory

Every capability binding must be classified conservatively as one of:

- `reuse_existing`
- `partially_supported`
- `requires_extension`

The bundle must not imply support the platform does not actually have.

### 7. Single layout authority

Canonical metadata, implementation matrices, and validation must all reference the same layout authority.

The bundle must not keep multiple competing layout models active in canonical documents.

### 8. Single component vocabulary

Canonical routes, bindings, acceptance, and validation must all use the same component vocabulary.

Do not allow a dashboard to be defined by one component language and validated by another.

## What the golden bundle is

The golden bundle is:

- a business contract
- a dashboard contract
- a data contract
- a runtime contract
- a decision and action contract
- a governance contract
- a capability binding contract
- an acceptance contract

It is **not** just:

- a dashboard mockup
- a YAML route list
- a dbt package
- a ZIP upload artifact with vague expectations

## Canonical bundle structure

The canonical structure is:

```text
opencare-usecase-<slug>/
  package.yaml
  README.md
  manifest/
    usecase.yaml
    principles.yaml
    personas.yaml
    navigation.yaml
  business/
    objectives.yaml
    kpis.yaml
    decisions.yaml
    workflows.yaml
  data/
    source_systems.yaml
    pipeline.yaml
    entities.yaml
    joins.yaml
    output_tables.yaml
  dbt/
    model_index.yaml
    tests.yaml
    models/
      staging/
      analytics/
      output/
      decision/
  runtime/
    runtimes.yaml
    images.yaml
    schedules.yaml
    evidence.yaml
  decisions/
    action_buttons.yaml
    decision_states.yaml
    escalations.yaml
    notifications.yaml
    tickets.yaml
    audit.yaml
  screens/
    information_architecture.yaml
    screen_catalog.yaml
    components.yaml
    component_anatomy.yaml
    layout_zones.yaml
    visual_grammar.yaml
    dashboard_implementation_matrix.yaml
    story_flow.yaml
    business_alignment_matrix.yaml
    bilingual_contract.yaml
    visual_traceability.yaml
  bindings/
    routes.yaml
    data_bindings.yaml
    runtime_bindings.yaml
    governance_bindings.yaml
    platform_capabilities.yaml
  governance/
    assets.yaml
    columns.yaml
    classification.yaml
    ownership.yaml
    freshness.yaml
    quality.yaml
    lineage.yaml
  acceptance/
    dashboard_acceptance.yaml
    dashboard_fidelity_contract.yaml
    rendered_dashboard_conformance.yaml
    populated_state_proof.yaml
    promotion_contract.yaml
  validation/
    checks.yaml
    validate_golden_bundle.py
  schemas/
    *.schema.yaml
  assets/
    mockups/
    storyboards/
    i18n/
  legacy/
    ...
```

Rules:

- exactly one canonical root folder
- no dead references in canonical files
- `legacy/` may exist, but must remain reference-only
- no `.git`, `node_modules`, `__pycache__`, build output, or secrets

## Mandatory dashboard-rigid contracts

The following contracts are mandatory for a dashboard-rigid bundle:

- `screens/layout_zones.yaml`
- `screens/visual_grammar.yaml`
- `screens/component_anatomy.yaml`
- `screens/dashboard_implementation_matrix.yaml`
- `screens/story_flow.yaml`
- `screens/business_alignment_matrix.yaml`
- `screens/bilingual_contract.yaml`
- `acceptance/dashboard_fidelity_contract.yaml`
- `acceptance/rendered_dashboard_conformance.yaml`

These files are what prevent a future implementation from degrading into a generic UI approximation.

## What each dashboard-rigid file must do

### `screens/layout_zones.yaml`

Defines:

- dashboard IDs
- routes
- exact zone order
- zone purpose
- width intent
- required components per zone
- flattening and substitution rules

### `screens/visual_grammar.yaml`

Defines:

- density
- status badge rules
- threshold rail requirements
- connector line requirements
- CTA prominence
- bilingual label placement
- visual non-negotiables per dashboard

### `screens/component_anatomy.yaml`

Defines required anatomy for critical components such as:

- KPI threshold card
- active case banner
- decision table
- runtime card
- action audit timeline
- governance evidence panel

### `screens/dashboard_implementation_matrix.yaml`

Defines:

- dashboard identity
- business purpose
- route
- required components
- governance evidence
- runtime dependencies
- action expectations
- forbidden simplifications

### `screens/story_flow.yaml`

Defines:

- why each dashboard exists
- what question it answers
- what the user must learn before moving to the next dashboard

### `screens/business_alignment_matrix.yaml`

Defines:

- objective
- KPI
- dashboard
- component
- source table
- downstream decision
- governance evidence

This is the strongest protection against dashboard/business drift.

### `screens/bilingual_contract.yaml`

Defines:

- required locales
- direction
- which visible dashboard elements must be bilingual
- which can rely on i18n keys only

### `acceptance/dashboard_fidelity_contract.yaml`

Defines:

- required dashboard count
- required dashboard IDs
- dashboard fidelity required
- screen substitution forbidden
- forbidden simplifications
- non-negotiable visual elements

### `acceptance/rendered_dashboard_conformance.yaml`

Defines the rendered proof requirements per dashboard:

- route screenshot
- route component inventory
- zone component inventory
- data binding inventory
- mockup linkage where applicable

## Required business contract

The bundle must define:

- business objectives
- users and personas
- KPI list
- decisions supported
- operational workflows
- success criteria

The dashboard story must emerge from the business contract, not the other way around.

## Required data contract

The bundle must define:

- source systems
- source entities
- raw landing path
- staging expectations
- analytics marts
- output tables
- decision tables
- joins and grain
- ownership and stewardship

No dashboard may bind to undeclared or phantom data.

## Required runtime contract

If the bundle uses prediction, scoring, anomaly detection, or runtime execution, it must explicitly declare:

- runtime IDs
- runtime purpose
- input tables
- output tables
- schedules
- execution evidence
- runtime images

`runtime/images.yaml` is mandatory when predictive/runtime behavior is declared.

It must state:

- runtime ID
- image
- owner
- entrypoint
- inputs
- outputs
- evidence source

## Required decision and action contract

If the bundle supports human decisions, it must declare:

- action buttons
- decision states
- escalation path
- notification behavior
- ticket behavior
- audit events

For each action, define:

- label
- business purpose
- preconditions
- human authorization rule
- audit event
- notification side effect
- ticket side effect

## Required platform capability binding

`bindings/platform_capabilities.yaml` is mandatory.

For each capability, it must define:

- status
- platform binding
- evidence source
- confidence
- limitations
- whether review is still required

Typical capabilities include:

- decision_workflow
- email_notification
- runtime_evidence
- lineage
- record_spec
- governance_registry
- role_based_access
- human_authorised_external_actions

## Required governance contract

The bundle must preserve:

- source to raw to staging to analytics to output to decision to dashboard lineage
- column descriptions
- classification
- ownership and stewardship
- freshness and quality status
- evidence-pack traceability

## Required acceptance and validation

The bundle is not complete if the validator only checks file presence.

Validation must enforce:

- required files exist
- schema refs resolve
- route refs resolve
- dashboard IDs are consistent across contracts
- component vocabulary is consistent across contracts
- layout authority is singular
- no dead canonical refs
- no undeclared data dependencies
- forbidden substitutions are declared
- required dashboards are present

Rendered conformance should be required where the bundle claims dashboard fidelity.

## OpenCare implementation truth

The golden bundle is currently the **contract for native shell implementation**.

That means the standard is aligned to this workflow:

1. author the golden bundle
2. review capability truthfulness
3. create an implementation mapping
4. implement the shell inside OpenCare
5. validate the shell against the bundle

The bundle should not claim that OpenCare already supports full automatic generation of:

- Next.js routes
- FastAPI routes
- dbt models
- runtime jobs
- dashboard materialization

unless those features are truly implemented.

## Repeated pattern for future use cases

Every future use case should follow the same pattern:

1. define the business contract
2. define the dashboard suite and story flow
3. define the governed data path
4. define runtime and action contracts
5. bind capabilities honestly
6. validate the bundle
7. map the bundle into OpenCare
8. implement the native shell
9. validate the implementation against the bundle

What changes from one use case to another:

- business domain
- KPIs
- source systems
- runtime logic
- decisions
- dashboard story

What should stay the same:

- the bundle structure
- the dashboard-rigid rules
- the capability truthfulness rule
- the governance discipline
- the acceptance pattern

## Golden checklist

A bundle is compliant when:

- the canonical structure is present
- the dashboard-rigid contracts exist
- the dashboard story is explicit
- the layout authority is singular
- the component vocabulary is singular
- all canonical refs resolve
- runtime images are declared when needed
- external actions are human-authorized
- bilingual structure is explicit where required
- capability bindings are honest
- validation covers the canonical rules

## Recommended next implementation artifacts

The bundle standard should always be paired with:

- an implementation mapping
- reusable contract templates
- validation utilities

Those are the assets that make the standard repeatable rather than one-off.
