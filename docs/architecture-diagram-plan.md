# Module 01 Generic Architecture Diagram Plan

## Existing implementation

Module 01 is a Next.js 15 and React 19 TypeScript application. Assessment captures are stored as immutable JSON revisions by the Module 01 backend service. The current discovery schema stores architecture `description`, `unknowns`, legacy `nodes` and `edges`, confirmation metadata, and an optional uploaded image. `discovery-editor.tsx` renders these records as a flat component list followed by textual flows. The AI draft route calls AI2 `/v1/grounded-generate`, validates literal source quotes, and returns the same legacy graph. Report HTML and print/PDF use the same React diagram component. Tests are executable Node `.mjs` files that transpile TypeScript with the repository TypeScript dependency.

## Files

- Add `apps/portal/lib/module01/diagram/` for model, lane configuration, validation, migration, completeness, risks, layout, routing, SVG rendering, and self-contained HTML export.
- Add `apps/portal/components/module01/architecture/` for the shared viewer, confirmation editor, legend, and risk table.
- Update `module01Discovery.ts` to retain the legacy fields and add a normalized versioned `diagram` model.
- Update the AI architecture route so new-schema and legacy AI drafts both pass through migration and the common validator.
- Update `discovery-editor.tsx`, its CSS, and report rendering to use the shared SVG implementation.
- Add fixture JSON and `module01ArchitectureDiagram.test.mjs` for validation, migration, lanes, completeness, risks, deterministic rendering, layout invariants, and offline export.

## Migration

Migration is in-memory, deterministic, and idempotent because assessment captures are JSON documents rather than normalized diagram tables. Existing `nodes` and `edges` remain untouched. A `diagram` property is added during normalization and saved on the next assessment revision. Missing scalar fields become `"unknown"`.

Legacy component type inference is intentionally conservative:

- labels containing database, warehouse, lake, store, or SQL become `data_store`;
- dashboard, report, BI, or analytics labels become `consumption_tool`;
- analyst, user, manager, or team labels become `person`;
- workbook, spreadsheet, Excel, or CSV labels become `manual_artifact`;
- integration, API, ETL, pipeline, or gateway labels become `integration`;
- all ambiguous records become `source_system` and are included in `migration_review`.

Legacy edge labels infer method, frequency, and mode only when wording is unambiguous; otherwise the required value is `unknown`. Existing source quotes are preserved in notes and no stored field is deleted or renamed.

## Assumptions

- The current JSON revision store is the system of record, so no SQL migration is required.
- `assessment_id` is supplied by the persisted capture when available and otherwise defaults to `unknown` until the server-assigned assessment is saved.
- Confirmation identity is a short assessor-supplied name; authentication identity can replace this later without changing the model.
- The first release exports the complete deterministic SVG and model. Large-diagram grouping is deterministic in static output; interactive expansion is handled in the viewer and does not alter stored data.
- No runtime dependency is added. Geometry, routing, SVG serialization, and export are implemented with TypeScript and browser primitives already present in the portal.

