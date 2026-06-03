# Codex build prompt — Jazan Urban Service Quality & Visual Distortion Loop

This bundle is the build brief for an OpenCare use-case package. You (Codex) are asked to construct a working shell of this use case on the OpenCare platform, following all conventions established in prior `urban-service-quality-visual-distortion-loop` packages, with the changes described below.

This is the **next iteration** of that package. Prior versions (v1.0.7, v1.0.8) had structural defects that this brief is designed to close. Do not preserve the defects "for backward compatibility". Build clean.

---

## 1. What you are building

A complete OpenCare v1.7.x compatible use-case package for the Jazan Performance Management Office, covering the strategic objective: *Sustain and improve municipal service quality and visual distortion response*.

The package must:
- Cascade one strategic objective into six governed KPIs
- Cover 25 Jazan municipalities
- Integrate three named platform runtimes (RNN forecast, anomaly detection, decision candidate generation)
- Render six distinct screens organised in a three-level navigation hierarchy
- Support bilingual (English + Arabic) presentation
- Comply with PDPL data protection and NDMO classification rules
- Produce evidence packs aligned to MOMRAH reporting

The package is intended to be uploaded and activated on OpenCare, where it must render as a first-class native-BI module — not as a generic fallback workspace.

---

## 2. Scope of this bundle

```
00_CODEX_BUILD_PROMPT.md            ← this file
README.md                            ← bundle navigation
01_information_architecture.md       ← the 3-level navigation hierarchy
customer/
  01_customer_presentation_brief.md  ← business problem, KPIs, value
  02_demo_story_arc.md               ← live demo flow with Sabya + Farasan scenarios
screens/
  01_level1_strategic_landing.md     ← screen spec
  02_level2_kpi_workspace.md         ← screen spec
  03_level3_case_workspace.md        ← screen spec (4 tabs inside)
  04_crosscut_decision_command.md    ← screen spec
  05_crosscut_runtime_evidence.md    ← screen spec
  06_crosscut_decision_audit.md      ← screen spec
contracts/
  kpi.yaml                           ← canonical KPI definitions (bilingual)
  runtimes.yaml                      ← runtime model declarations
  screens.yaml                       ← hierarchical screen IA
  data_bindings.yaml                 ← component → source bindings
  design_tokens.yaml                 ← design system + bilingual policy
  routes.yaml                        ← backend route declarations
  action_buttons.yaml                ← decision action buttons + audit
dbt/models/
  staging/    (2 files, real SQL)
  analytics/  (2 files, real SQL)
  output/     (2 files, real SQL)
  decision/   (2 files, real SQL)
i18n/
  en.yaml                            ← English string table
  ar.yaml                            ← Arabic string table
schemas/
  populated_state_proof.schema.json  ← typed proof schema
  promotion_contract.schema.json     ← typed contract schema
governance/
  POLICIES.md                        ← governance + classification approach
```

---

## 3. Defects from prior versions you must fix

These were called out in review of v1.0.7 and v1.0.8 and remain unresolved. Do not carry any of them forward.

**D1. Version drift.** Pin one canonical version everywhere. README, package.yaml, manifest, codex_build_prompt.txt, golden-template references must all agree. Add `validation/check_version_consistency.py` that fails the build on any disagreement.

**D2. Default mode set to empty state.** Change `default_mode` from `empty_state` to `live` in package.yaml. Empty states are a per-component fallback when no data exists, not the system's default behaviour.

**D3. Fallback to demo encoded in every binding.** Remove the `fallback: demo.*` pattern from `workspace/data_bindings.yaml`. Replace with `empty_state_policy: forbid_when_demo_data_loaded` (default) or `allow_when_genuinely_empty` (only for filter-result tables and optional drawers). The renderer must never silently substitute demo for real.

**D4. Permissive `render_placeholder` in materialization profile.** Remove `render_placeholder` and `preview_only` from `fallback_behavior_values`. Permitted values are exactly: `block_materialization`, `render_empty_state`, `hide_component`.

**D5. Dangling table references.** Every table named in `workspace/data_bindings.yaml` must have a corresponding dbt model in `dbt/models/`. Cross-check is required before package validates. The eight SQL files in this bundle close most of the prior gaps; you may need to add `dim_jazan_municipality`, `stg_jazan_municipalities`, `date_spine`, `jazan_intervention_corpus`, `jazan_decision_action_events`, `jazan_service_rnn_forecast`, `jazan_service_quality_anomaly` as stubs or real models depending on data availability.

**D6. Three parallel dashboard descriptions.** This package has only one dashboard source of truth: the `workspace/*` files described in `contracts/screens.yaml`. Do not create `dashboards/*.dashboard.yaml`, `portal/pages/*.page.yaml`, or any parallel description. If the OpenCare platform compiler requires generated output for those paths, generate them programmatically from `workspace/*` at compile time, never by hand.

**D7. Arabic only at the title layer.** Prior packages had `name_ar` for use case, screens, KPIs — but English-only for component labels, status chips, empty-state messages, action buttons. Use the i18n strategy in `i18n/en.yaml` + `i18n/ar.yaml`: every visible string declares a `label_key`, and the two YAML tables hold the full translations. Validation must fail if any key in `en.yaml` has no Arabic counterpart in `ar.yaml`.

**D8. No populated-state proof.** Add `validation/validate_populated_state.py` that calls every backend route declared in `contracts/routes.yaml`, asserts response shape against schema, asserts non-empty row count, asserts PHI masking under a non-admin role, and writes `proofs/populated_state_proof.yaml` conforming to `schemas/populated_state_proof.schema.json`.

**D9. No promotion contract.** Add `contracts/promotion_contract.yaml` conforming to `schemas/promotion_contract.schema.json`. This is the package's side of the deal with the platform's promoter: what evidence the platform must verify before promoting this package to first-class status.

**D10. Maturity decorative.** Set `metadata.maturity` to `piloted` (not `proposed`). Add a validator that refuses to promote packages with `maturity: proposed`.

---

## 4. Three-level navigation hierarchy

The IA is hierarchical, not flat. Do not produce six parallel top-level screens.

**Level 1 — Strategic landing.** One screen. Shows the strategic objective cascading to six KPIs with threshold bars. This is what the user sees on first load. Specification in `screens/01_level1_strategic_landing.md`.

**Level 2 — KPI workspace.** Six instances (one per KPI). Shows the KPI across all 25 municipalities. Specification in `screens/02_level2_kpi_workspace.md`.

**Level 3 — Case workspace.** N instances (one per active (municipality, KPI) case). Internal tab structure: overview, model intelligence, decision command, outcome recovery. Specification in `screens/03_level3_case_workspace.md`.

**Cross-cutting function views.** Three views accessible from any level: decision command queue, runtime evidence, decision audit & action tracker. Specifications in `screens/04_crosscut_decision_command.md`, `screens/05_crosscut_runtime_evidence.md`, `screens/06_crosscut_decision_audit.md`.

URL design must reflect the hierarchy:
- Level 1: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop`
- Level 2: `/.../kpi/{kpi_slug}`
- Level 3: `/.../kpi/{kpi_slug}/case/{case_id}/{tab}` where tab ∈ {overview, intelligence, decisions, recovery}
- Cross-cut: `/.../decisions`, `/.../runtimes`, `/.../audit`

Every URL must be bookmarkable. URLs are part of the audit trail.

---

## 5. Bilingual policy

Default locale: `ar-SA`. Supported: `ar-SA`, `en-US`. Layout direction: RTL for ar-SA, LTR for en-US. Bilingual display mode at headings is `side_by_side`; at body is `locale_only`.

Strings are not hardcoded in YAML or SQL. Every visible string in the package references an `i18n_key`. The two i18n bundles (`i18n/en.yaml` and `i18n/ar.yaml`) hold the full translations. A validation check fails the build if any key is missing in either language.

Number formatting: Western digits (not Arabic-Indic) — confirmed default for Jazan context. Date calendar: Gregorian by default; Hijri available as user preference.

The Arabic strings in `i18n/ar.yaml` are an initial draft. Before any customer-facing meeting, they must be reviewed by a native speaker familiar with MOMRAH and Emarah Diwan vocabulary. Mark this in the package README so it is not skipped.

---

## 6. Build sequence

Follow this order. Do not skip steps.

1. **Initialise** `package.yaml` and `manifest/usecase.yaml` from the templates implied by `contracts/`. Pin canonical version `1.1.0`. Set `default_mode: live`, `maturity: piloted`, `opencare_contract_version: 1.7.1`.

2. **Author contracts.** Copy or adapt every YAML file from `contracts/` into the package's expected paths. Cross-reference `contracts/kpi.yaml` against `contracts/data_bindings.yaml` against `contracts/routes.yaml` — every KPI must have a binding, every binding must have a route, every route must have a query implementation.

3. **Implement dbt models.** Drop the eight SQL files from `dbt/models/` into the corresponding package paths. Author the stub models named in §3 D5 above. Run `dbt parse` to verify the DAG resolves.

4. **Author screens.** Implement each of the six screens per its spec file. Use the design tokens from `contracts/design_tokens.yaml`. Bind every component to its data source per `contracts/data_bindings.yaml`. Wire every action button per `contracts/action_buttons.yaml`.

5. **Wire i18n.** Reference every `label_key` from the component specs against `i18n/en.yaml` and `i18n/ar.yaml`. Add the bilingual validator.

6. **Author the backend routes** declared in `contracts/routes.yaml`. Each route binds to a query against the curated marts or runtime outputs. **No route may return sample data.** Routes that cannot resolve to real data should return a typed `not_yet_materialised` response, not synthetic payloads.

7. **Author validation checks.** Implement `validation/validate_populated_state.py`, `validation/check_version_consistency.py`, `validation/validate_native_bi.py`. The native-BI validator must cross-check the three-level IA in `workspace/screens.yaml` against the URL structure, the route declarations, and the i18n keys.

8. **Author governance.** Use `governance/POLICIES.md` as the basis for `governance/policies.yaml`, `governance/data_catalog.yaml`, `governance/lineage_detailed.yaml`. Maintain the business trust map and registry mapping conventions from v1.0.8 (which were good).

9. **Generate proofs/.** This is generated at validate time, not authored by hand. Author the schema and the validator; let the validator produce the proof file when run against the platform.

10. **Author docs.** Copy `customer/01_customer_presentation_brief.md` into `docs/`. Copy `customer/02_demo_story_arc.md` into `docs/`. Update `docs/changelog.md` with the v1.1.0 entry summarising every defect from §3 that this build closes.

11. **Update README.md** at the package root. State the canonical version. State the OpenCare contract version. State which prior defects this build closes. Do not state "OpenCare v1.6" anywhere in the package — every prior version did this and it caused identity drift.

12. **Run validators end-to-end.** Every validator must pass before delivery. If any validator emits a warning, decide whether the warning is acceptable or should be escalated to an error; do not silently leave warnings in the build output.

---

## 7. What "first-class shell" means

A first-class shell on OpenCare means: the package activates, the workspace route resolves to a real native-BI module (not a generic fallback), every screen renders with the correct components, governance policies enforce, runtimes are registered with the platform's runtime catalog, and the populated-state proof artefact can be produced when populated data is available. It does NOT mean populated data must be flowing today — the pilot will seed that.

A shell is structurally complete and contract-correct, with empty-state handling for components that don't yet have data. An empty-state-handled component renders an honest "data not yet available" message, not a placeholder pretending to be real.

The visual fidelity target is the six screens documented in `screens/01_*.md` through `screens/06_*.md`. The renderer support required is described in each screen spec.

---

## 8. Hard rules

These are non-negotiable for credibility with the Saudi government customer who will receive this package:

1. **No fake green live status.** Demo-data chips visible on every screen that's rendering seeded data. Live status only when populated-state proof is current.
2. **No placeholder values.** If a component has no data, it shows a typed empty state, never random numbers, never lorem ipsum, never "..."
3. **No silent demo fallback.** A component bound to a real table that returns empty does not silently fall through to demo data. It returns an honest empty state.
4. **Every external action requires human authorisation.** No autonomous ticket creation, escalation, email, or SMS. Every action button is human-clicked and audit-logged.
5. **Arabic must be correct.** Native speaker review before any customer-facing rendering. A mistranslated KPI name in a Saudi government meeting is unrecoverable.
6. **PHI never appears in workspace components.** Aggregated KPIs are Internal classification; individual case identifiers are Restricted and masked.

---

## 9. Customer context

Final destination: a presentation to the Jazan Performance Management Office, anchored to MOMRAH Municipal Performance Index reporting and Vision 2030 Quality of Life Program. The customer audience includes Performance Office leadership, IT/data leadership, MOMRAH liaison, and Emarah Diwan audit. Each persona will ask different questions. The package must hold up to all four.

The customer brief in `customer/01_customer_presentation_brief.md` covers the framing. The demo arc in `customer/02_demo_story_arc.md` covers the live walk-through. Read both before authoring the package — the screens must support the narrative described in the demo arc, especially the Sabya September 2026 scenario.

---

## 10. Deliverable

A single ZIP file named `urban-service-quality-visual-distortion-loop-v1_1_0.zip` containing the full OpenCare package, with:

- Every defect in §3 closed
- Every screen in §4 specified
- Bilingual coverage per §5
- All validators passing per §6 step 12
- README at root stating exactly what changed vs v1.0.8

When you deliver, include a 1-page summary at the top of `docs/changelog.md` headed `## v1.1.0 — Defect closure release` listing each defect closed with its line of evidence.

---

*This brief was authored for Munzer (BBI) to direct Codex toward an OpenCare-compatible build of the Jazan use case. Version 1.0 of brief. May 2026.*
