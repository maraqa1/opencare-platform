
## v1.8.7 Dashboard-Rigid Single Layout Reference

This patch closes the final layout-authority ambiguity. Canonical metadata files (`manifest/navigation.yaml`, `screens/information_architecture.yaml`, `screens/screen_catalog.yaml`, and `screens/visual_traceability.yaml`) now point `layout_ref` to `screens/layout_zones.yaml#{dashboard_id}` instead of the deprecated `screens/layouts.yaml`.

`screens/layouts.yaml` remains only as a deprecated compatibility artifact and cannot be referenced as a canonical layout authority. Validator checks now inspect every `layout_ref`, reject deprecated layout references, and require refs to resolve to dashboard IDs declared in `screens/layout_zones.yaml`.

# Urban Service Quality & Visual Distortion Loop — OpenCare Golden Bundle

This bundle was converted from the original `jazan-build` Codex bundle into the permanent OpenCare Golden Bundle structure.

The bundle is business-first and dashboard-safe. Mockups and markdown screen descriptions are retained under `legacy/` and `assets/storyboards/`, but the source of truth is now:

- `business/*`
- `data/*`
- `runtime/images.yaml`
- `decisions/*`
- `screens/*`
- `bindings/platform_capabilities.yaml`
- `governance/*`
- `acceptance/*`

Key additions:

- Mandatory platform capability binding section.
- Runtime image declarations for forecast, anomaly, and decision candidate runtimes.
- Business alignment matrix linking objectives, KPIs, decisions, screens, components, source tables, runtime outputs, and governance evidence.
- Dashboard acceptance proof files so dashboards cannot be accepted from mockups alone.

Validate after extraction:

```bash
python validation/validate_golden_bundle.py .
```


## Golden Bundle Final Refinement Notes

This bundle uses the contract directories as the source of truth. The `legacy/` folder is retained for provenance and reference only.

Mandatory principles:
- Every artefact declares or inherits locale and text direction.
- Every external action requires explicit human authorisation before execution.
- Platform capability statuses are conservative and evidence-based.
- Dashboard components must bind to business objectives, KPIs, decisions, governed data, and acceptance proof.
- Mockups are visual references only and are never the source of truth.

## v1.8.0 Dashboard-Rigid Golden Bundle Update

This bundle now enforces dashboard fidelity as a hard implementation contract.

New canonical files:

- `screens/dashboard_implementation_matrix.yaml`
- `screens/story_flow.yaml`
- `acceptance/dashboard_fidelity_contract.yaml`

Rule:

Declared dashboards are canonical implementation units. They may not be collapsed into another shell, substituted with generic screens, approximated by unrelated layouts, or treated as optional visual inspiration.

Architecture flexibility remains allowed for backend structure, dbt execution order, runtime extension path, and deployment topology. UI fidelity is not flexible for declared dashboards.

The six canonical dashboard surfaces are:

1. `01_strategic_objective_monitoring`
2. `02_kpi_municipality_workspace`
3. `03_case_model_intelligence`
4. `04_decision_command_centre`
5. `05_runtime_evidence_execution_history`
6. `06_decision_action_audit`

Each dashboard now declares:

- dashboard ID
- route
- visible title
- business purpose
- required components
- required data bindings
- actions
- governance evidence
- runtime dependencies
- prohibited omissions
- acceptance evidence

Implementation must render these dashboard contracts directly.


## v1.8.1 Dashboard-Rigid Enforcement Patch

This patch closes the remaining structural gaps in the v1.8.0 dashboard-rigid bundle.

Fixes applied:

- `validation/checks.yaml` and `validation/validate_golden_bundle.py` now hard-require the dashboard anti-drift files:
  - `screens/dashboard_implementation_matrix.yaml`
  - `screens/story_flow.yaml`
  - `acceptance/dashboard_fidelity_contract.yaml`
- Matching schema files are now present under `schemas/` for the new canonical dashboard contracts.
- `bindings/routes.yaml` response schema references now resolve to actual files under `backend/schemas/`.
- `data/entities.yaml` now declares `dim_jazan_municipality_owners`, used by ticket/email workflows as the owner lookup source.
- `human_authorised_external_actions` is now marked `partially_supported`, not `reuse_existing`, until platform enforcement is proven.
- The validator now checks:
  - canonical dashboard files exist;
  - dashboard IDs and routes are consistent across matrix, story flow, and fidelity contract;
  - every dashboard marked `must_show_actions` has declared actions;
  - every dashboard marked `must_show_governance` has governance evidence;
  - every dashboard marked `must_show_runtime_evidence` has runtime dependencies;
  - every `response_schema_ref` resolves;
  - every `options_source` used by action buttons resolves to a declared data entity;
  - human-authorised external actions block materialization and activation until proven.

Result: the anti-drift layer is no longer only documented; it is structurally enforced by the bundle validator.


## v1.8.2 Owner Lookup Materialization and Schema-Enforced Validation Patch

This patch closes the final buildability gap for the external-action owner lookup and upgrades validation from artifact existence to schema enforcement where schemas are shipped.

Fixes applied:

- `dim_jazan_municipality_owners` is now buildable from the bundle, not only declared as an entity.
- `data/source_systems.yaml` declares `jazan_municipality_owner_directory` as the source for municipality owner role assignments.
- `data/pipeline.yaml` maps the owner lookup through `raw.jazan_municipality_owners` -> `stg_jazan_municipality_owners` -> `analytics.dim_jazan_municipality_owners`.
- `dbt/models/staging/stg_jazan_municipality_owners.sql` and `dbt/models/analytics/dim_jazan_municipality_owners.sql` provide the materialization path used by ticket/email action option sources.
- `dbt/model_index.yaml` declares both owner lookup models.
- `validation/validate_golden_bundle.py` now validates YAML contracts against matching schemas under `schemas/`, and hard-fails if required dashboard/data/dbt contracts are not schema-validated.
- The validator now verifies that any action-button `options_source` is declared, sourced, included in the pipeline, materialized by dbt, and backed by SQL files.

Result: ticket/email workflows no longer depend on a phantom lookup, and malformed-but-present dashboard/data contracts can no longer pass only because they are syntactically valid YAML.


## v1.8.3 Dashboard Visual Non-Negotiables

This bundle adds strict dashboard fidelity controls beyond route and data binding checks. The six canonical dashboards now have explicit layout zones, visual grammar, component anatomy, bilingual placement rules, and rendered-dashboard conformance requirements. Implementers must not flatten KPI rails, threshold bars, active-case banners, decision queues, runtime evidence, or action audit timelines into generic card pages.

New reusable golden-template patterns are included under `golden-template/patterns/` for future bundles.


## v1.8.4 Dashboard Zone / Rendered Conformance Enforcement

This version tightens the visual-enforced standard so dashboard fidelity is no longer only matrix-level. It adds explicit zone-to-component binding, per-dashboard rendered conformance evidence, a dashboard gap-register template, and broader bilingual coverage for structurally visible dashboard elements.

Key enforcement changes:

- Every layout zone must declare required components.
- Required zone components must resolve to `screens/components.yaml` or `screens/component_anatomy.yaml`.
- Rendered conformance must be declared per canonical dashboard.
- Each dashboard must provide route screenshot, component inventory, zone component inventory, action button inventory, data binding inventory, governance panel inventory, runtime evidence inventory, and rendered gap register evidence.
- Bilingual composition now covers KPI state strips, golden-thread labels, runtime cards, audit timelines, status badges, threshold rails, confirmation drawers, email/ticket panels, recommendation cards, and model charts.

This prevents the known failure mode where the platform renders the same data in a flatter generic card shell while still passing contract validation.


## v1.8.5 Single Layout Authority Patch

This patch removes ambiguity between legacy screen-level layouts and the zone-rigid dashboard layout contracts. `screens/layouts.yaml` is retained only as a deprecated compatibility pointer and is no longer a canonical layout authority. All canonical dashboard entries now reference `screens/layout_zones.yaml`, and each dashboard implementation matrix `required_components` list is derived exactly from its zone-level required components. Legacy broad component IDs such as `legacy level-one broad component identifiers`, `legacy level-two broad component identifiers`, `legacy level-three broad component identifiers`, and `legacy command-centre broad component identifiers` are forbidden in canonical dashboard implementation matrix requirements.


## v1.8.6 Dashboard-Rigid Single Component Vocabulary

This patch removes the remaining ambiguity between legacy broad component identifiers and zone-rigid component identifiers. Canonical acceptance checks, data bindings, and screen component contracts now use the same component vocabulary derived from `screens/layout_zones.yaml`. Legacy broad IDs are forbidden in canonical acceptance, binding, and component contracts.


## v1.8.9 Decision Surface Scope Enforcement

This version adds the required case-scoped Decision Command Tab (`03_primary_case_decision_command_tab`) and enforces that it is distinct from the cross-cutting Decision Queue & Action Audit dashboard. The case tab is single-case only, forbids queue/list rendering, requires side-by-side bilingual narrative, requires all five action buttons to be visible at once, requires confirmation modals for every external or workflow action, and requires an audit footnote stating human-authorised action, no autonomous external escalation, and append-only action history.


## v1.8.10 Dashboard Design Notes Enforcement

This version treats the dashboard design notes as canonical contract input. It adds explicit enforcement for Saudi government operational dashboard quality: typography weight discipline, state-only colour semantics, render-boundary rounding, structural bilingual composition, honest empty states, and confirmation modals with payload preview for every external-effect action.

The case decision tab remains single-case only. The cross-cutting decision queue/action audit remains separate. The outcome recovery dashboard is now explicit, with recovery measurements, evidence-pack links, and model-feedback semantics.


## v1.8.11 Recovery catalog and decision-surface cleanup

This patch closes three remaining structural ambiguities:

- `SCREEN-L3-CASE-RECOVERY` is now declared in `screens/screen_catalog.yaml` and linked from Level 3 navigation/IA.
- The Level 3 default tab is now `intelligence`; the stale non-canonical `overview` tab is explicitly deprecated and cannot be default.
- `03_case_model_intelligence` is evidence-only and may only navigate to the case decision tab. It cannot own approval, revision, escalation, ticket, or email-owner actions.

Canonical decision authority remains:

- `03_primary_case_decision_command_tab` = single-case authorisation surface.
- `06_decision_action_audit` = cross-case queue and audit surface.
