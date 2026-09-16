# Module 01: business and architecture discovery

## Capture and report flow

The Data capture tab includes four new groups below customer context:

1. Ten platform essentials: platforms, sources, movement/frequency, storage and retention, reports/decisions, manual work, data model, historical reproduction, shared definitions/semantic layer, and ownership.
2. Pain-point checklist with business function, example, impact, priority and evidence reference. Assessor confirmation is distinct from independently verified evidence.
3. Current and future use-case register. Future cases are optional; "None identified" is valid. Registration does not confer readiness approval.
4. Current-state architecture description, unknowns, optional PNG/JPEG attachment, editable components/connections, and confirmation.

These descriptive records do not add to the scored-question denominator or evidence confidence. "Not sure", "No / not in place" and "Not answered" remain separate states.

`discovery` is persisted with the assessment, included in downloaded assessment JSON and seed CSV, passed to the report API, normalized into flat and structured report models, rendered in Markdown, and retained in the strategy handoff. HTML/PDF include the same descriptions and an architecture diagram. Industry changes archive the old discovery and clear the active capture. Edits invalidate generated reports.

Report narrative calls receive bounded client-stated summaries of these records. Unconfirmed architecture is excluded from authoritative narrative facts. Client-registered use cases remain separate from model-suggested candidates. When discovery is present, Markdown is assembled from the structured model rather than rewritten by a whole-report LLM call.

## Diagram generation

`POST /api/reports/module01/architecture` accepts `{ "description": "..." }` (20 to 8,000 characters).

The server calls AI2 `/v1/grounded-generate` with a strict JSON extraction contract. It validates components and connection quotes against the supplied description, retries invalid output once within a shared 55-second deadline, and returns only a draft. No raw SVG or executable diagram language is accepted. Any edit clears confirmation. Uploaded images are limited to PNG/JPEG, 400 KB in the interface.

AI2 failure returns an explicit `not_generated` error; it never labels a deterministic graph as AI-generated. Manual component/connection editing and diagram attachment remain available. Source-quote checks are not semantic proof of a relationship, so human confirmation remains mandatory.

## Seeds

All six industry seeds and all three dataset depths now include ten essentials, two pain points, one current and one future use case, and a small current-state graph. Sector vocabulary changes with the selected industry. Demo evidence is explicitly synthetic and architecture is unconfirmed.

## Verification

From the repository root:

```powershell
node apps/portal/lib/module01/__tests__/module01Discovery.test.mjs
node apps/portal/lib/module01/__tests__/module01IndustryReport.test.mjs
```

`module01Discovery.browser.mjs` tests capture editing, persistence, optional future cases and diagram confirmation using an explicitly mocked architecture response. `module01Industry.browser.mjs` tests live report generation and all exports; set `MODULE01_TEST_PROFILES=healthcare,manufacturing`, `MODULE01_TEST_FUNCTIONS=all`, and `PLAYWRIGHT_MODULE` to the installed Playwright path. `module01IndustryPdfCheck.py` verifies landscape PDFs against report JSON, including discovery content.

Generated review artifacts are under `output/module01-discovery-tests`. Mocked editor results, deterministic seed fixtures and live AI2 report outputs are kept in separate subdirectories. Live AI2 responses can still be rejected or time out; inspect report generation metadata rather than assuming every narrative is AI-authored.
