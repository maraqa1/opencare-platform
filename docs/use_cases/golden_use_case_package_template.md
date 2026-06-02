# Golden Use-Case Package Template

This document defines the canonical OpenCare golden bundle standard for future use cases.

The goal is not just to describe a use case well. The goal is to define a **repeatable shell contract** that can be implemented on the OpenCare platform without ambiguity, fake capability assumptions, or dashboard drift.

## Non-negotiable principles

Every future bundle must obey these rules:

1. Business defines the dashboard.
2. Every screen component binds to governed data, declared runtime output, or explicit empty-state semantics.
3. Every runtime declares its image, inputs, outputs, schedule, and evidence source.
4. Every action declares its audit and notification side effects.
5. Every platform capability is labeled truthfully as `reuse_existing`, `partially_supported`, or `requires_extension`.
6. Every artefact declares locale and direction so bilingual readiness is structural, not bolt-on.
7. Every external action requires human authorization so human-in-the-loop is contractual, not behavioral.
8. If a dashboard contract exists, implementation must render that dashboard directly. It may not silently collapse it into a different shell shape.

## Purpose

The golden bundle exists to support this repeatable workflow:

1. define the business problem
2. fill out the standard bundle structure
3. validate the bundle contracts
4. map the bundle to current OpenCare capabilities
5. implement the use case as a native shell on the platform

The bundle is not a mini-platform. It is a **source contract** for OpenCare implementation.

## Canonical bundle structure

```text
use-case-bundle.zip
  <root-folder>/
    package.yaml
    manifest/
      usecase.yaml
      personas.yaml
      navigation.yaml
      principles.yaml
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
        dictionary/
      macros/
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
      layouts.yaml
      components.yaml
      interactions.yaml
      empty_states.yaml
      visual_traceability.yaml
      business_alignment_matrix.yaml
      dashboard_implementation_matrix.yaml
      story_flow.yaml
    bindings/
      routes.yaml
      data_bindings.yaml
      runtime_bindings.yaml
      governance_bindings.yaml
      platform_capabilities.yaml
    governance/
      ownership.yaml
      freshness_sla.yaml
      dq_rules.yaml
      lineage.yaml
      evidence_pack.yaml
      classification.yaml
    acceptance/
      dashboard_acceptance.yaml
      dashboard_fidelity_contract.yaml
      populated_state_proof.yaml
      promotion_contract.yaml
    validation/
      checks.yaml
      *.sh
      *.py
    schemas/
      *.yaml
    legacy/
      ...
```

Rules:

- the ZIP must contain exactly one root folder
- `legacy/` is reference only and may never override the canonical contract directories
- no path traversal, secrets, `.git`, `node_modules`, or build output folders

## Package identity

`package.yaml` must declare:

- `api_version`
- `kind`
- `package_id`
- `metadata.slug`
- `metadata.name`
- `metadata.version`
- `compatibility`
- `entrypoints`
- `features`

The package identity must match the manifest identity and route identity.

## Dashboard contract

Dashboards are canonical implementation units.

If the bundle declares six dashboards, implementation must render those six dashboards. It may not:

- collapse them into a generic page
- merge them into other screens
- replace them with “similar” sections
- omit required components

Required dashboard contract files:

- `screens/components.yaml`
- `screens/business_alignment_matrix.yaml`
- `screens/dashboard_implementation_matrix.yaml`
- `screens/story_flow.yaml`
- `acceptance/dashboard_acceptance.yaml`
- `acceptance/dashboard_fidelity_contract.yaml`

Required dashboard rules:

- no screen component may exist without a business alignment row
- every dashboard route must appear in the implementation matrix
- every dashboard in the implementation matrix must appear in the fidelity contract
- if visual assets are supplied with structured YAML, the YAML and declared dashboard composition are source of truth

## Runtime contract

Predictive or analytical runtimes must be explicit.

Required runtime files:

- `runtime/runtimes.yaml`
- `runtime/images.yaml`
- `runtime/schedules.yaml`
- `runtime/evidence.yaml`

Each runtime must declare:

- runtime id
- purpose
- image
- entrypoint
- owner
- input tables
- output tables
- schedule
- evidence source

## Platform capability binding contract

Every bundle must contain:

- `bindings/platform_capabilities.yaml`

Each capability must be labeled as:

- `reuse_existing`
- `partially_supported`
- `requires_extension`

Each capability entry should cite:

- platform binding name
- current platform evidence
- known limitation

The bundle must never bind to a phantom interface.

## Validation contract

Minimum validation areas:

1. package structure
2. manifest consistency
3. business and data contract completeness
4. dbt asset readiness
5. backend asset readiness
6. portal asset readiness
7. runtime declaration readiness
8. governance readiness
9. dashboard fidelity readiness
10. locale/direction readiness
11. human-authorization readiness

## Golden compliance checklist

A bundle is golden-template compliant when:

- it follows the canonical structure
- it includes `manifest/principles.yaml`
- it includes `runtime/images.yaml`
- it includes `screens/dashboard_implementation_matrix.yaml`
- it includes `screens/story_flow.yaml`
- it includes `bindings/platform_capabilities.yaml`
- it includes `acceptance/dashboard_fidelity_contract.yaml`
- it labels platform capabilities truthfully
- it preserves dashboard fidelity
- it keeps external actions human-authorized

## Reuse rule

Future use cases should reuse:

- the bundle structure
- the principles
- the fidelity rules
- the runtime declaration pattern
- the capability truth model

Future use cases should customize:

- the business domain
- the KPIs
- the sources
- the runtimes
- the dashboard content
- the governance specifics
