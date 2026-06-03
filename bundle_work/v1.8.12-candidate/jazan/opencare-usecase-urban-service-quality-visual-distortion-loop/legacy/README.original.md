# Build bundle — Jazan Urban Service Quality & Visual Distortion Loop v1.1.0

This bundle is the input brief for building an OpenCare use-case package. The package itself does not exist yet; this bundle tells Codex how to build it.

## Read order

1. `00_CODEX_BUILD_PROMPT.md` — master prompt. Start here.
2. `01_information_architecture.md` — three-level navigation model.
3. `customer/01_customer_presentation_brief.md` — business problem the package solves.
4. `customer/02_demo_story_arc.md` — live demo walk-through with two scenarios.
5. `screens/*.md` — six screen specifications, in numerical order.
6. `contracts/*.yaml` — canonical YAML configs to seed the package.
7. `dbt/models/**/*.sql` — real transformation SQL (not stubs).
8. `i18n/*.yaml` — bilingual string tables.
9. `schemas/*.json` — populated-state proof and promotion contract schemas.
10. `governance/POLICIES.md` — governance approach.

## What this bundle is not

Not a complete OpenCare package. Not a runnable artefact. Not the deliverable.

This is the *input* to the build. The deliverable is the ZIP that Codex produces after consuming this bundle: `urban-service-quality-visual-distortion-loop-v1_1_0.zip`, a fully-formed OpenCare package conforming to all the conventions described in `00_CODEX_BUILD_PROMPT.md`.

## Provenance

This bundle was assembled by BBI to direct Codex toward a customer-presentable build of the Jazan use case. It synthesises findings from review of prior package versions (v1.0.7, v1.0.8), customer expectations from the Jazan Performance Management Office, OpenCare platform conventions (v1.7.1 contract), and design decisions made during architecture review.

Customer-facing materials in `customer/*` and the Arabic translations in `i18n/ar.yaml` are drafts. They must be reviewed by a native Arabic speaker familiar with MOMRAH and Emarah Diwan vocabulary before any official customer use.
