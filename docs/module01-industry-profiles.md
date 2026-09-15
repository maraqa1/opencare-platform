# Module 01 Industry Profiles

## User Workflow

1. Open `/use-cases/data-ai-capability-diagnostic`.
2. Select Healthcare, Manufacturing, Banking, Real Estate, Utilities, or Cross-industry.
3. Select the functions in scope. Each selected function adds four bilingual questions. Use **Question scope** to filter to a function.
4. Enter customer context and answers, or choose a dataset depth and select **Seed selected data**.
5. Review the diagnostic, then open **AI report** and select **Generate with local AI**.
6. Download the assessment JSON, Markdown, HTML, or print the report to landscape PDF.

Industry selection is separate from the fictional customer seed. Questions are not shown until an industry is selected. Each profile contains 97 core bilingual questions across 13 common domains, plus four questions per selected function (101, 105, 109 or 113 total). Version 1.0.0 uses a neutral common core with five specialist question/evidence variants for each named industry. Function catalogue 1.0.0 adds conditional questions on record ownership/quality, source-to-decision lineage, decision metrics and AI readiness. It is an initial functional assessment catalogue, not a complete clinical, industrial or regulatory audit.

## Functional Coverage

| Industry | Selectable functions |
| --- | --- |
| Healthcare | Patient Access, Clinical Services, Pharmacy, Revenue Cycle |
| Manufacturing | Production, Quality, Maintenance, Supply Chain |
| Banking | Customer Operations, Credit & Lending, Payments, Risk & Finance |
| Real Estate | Investment, Leasing, Asset Management, Development & Capex |
| Utilities | Network Operations, Metering & Billing, Asset Maintenance, Customer Service |
| Cross-industry | Finance, Workforce, Procurement, Service Delivery |

Deselected function answers are retained locally but excluded from the current question list, scores and report request. Selecting the function again restores them. Switching industry clears selected functions and archives prior answers. Seeding replaces answers for the current selected scope; all three dataset depths support every function.

The report API validates selected function IDs against the industry and catalogue version. Code calculates function findings from canonical question IDs and submitted responses; AI cannot replace those scores. JSON and Markdown contain a functional assessment, which also renders in HTML and PDF. The local strategy handoff carries selected functions and their findings. All three enabled AI2 narrative requests receive bounded functional facts, with helicopter view generated last. Proposed AI use cases in question wording are not treated as implemented client capabilities.

Functional gates are provisional: incomplete assessments, weak evidence, weak AI controls or low maturity hold progression; intermediate ratings allow only a controlled pilot; strong ratings with documented/system evidence permit governed analytics. No gate authorises autonomous deployment, certifies clinical safety or asserts regulatory compliance. Weighted confidence measures supplied evidence strength, not independent assurance.

Seeds have three depths: interview-light, evidence-enriched, and board-ready. All organisations and evidence are fictional. A board-ready seed is a test scenario, not a certification of readiness. Evidence coverage and weighted confidence are distinct measures; the latter uses system 1.0, documented 0.75, interview 0.45, and none 0.0. Empty evidence does not contribute confidence.

## Changing Industry

Changing an answered assessment opens a confirmation dialog. Compatible common-core answers are retained. Answers to changed semantic variants are archived and reset; affected answered questions are marked for review. Existing customer context is retained but must be confirmed for the new industry. Generated reports and the local strategy handoff are invalidated. Cancel preserves the original assessment.

Browser storage key: `module01:industry-assessment:v1`. The saved assessment includes industry/version, resolved question wording, answers, customer context, review flags and prior answer snapshots. Storage is local to the browser, not a multi-user database. Download JSON before moving browsers or clearing storage.

## Implementation

- `apps/portal/lib/module01/module01IndustryProfiles.ts`: immutable catalogue, bilingual wording/evidence and semantic variant keys.
- `apps/portal/lib/module01/module01IndustryAssessment.ts`: seeds, validation and answer migration.
- `apps/portal/lib/module01/module01FunctionalDomains.ts`: versioned functions, bilingual additional questions, evidence-weighted findings and provisional gates.
- `apps/portal/app/use-cases/data-ai-capability-diagnostic/workspace-client.tsx`: selection, confirmation, persistence, generation and exports.
- `apps/portal/app/api/data-ai-diagnostic/report/route.ts`: validates the profile ID/version and canonicalises labels. Legacy callers may omit the profile; the new UI requires it.
- Report facts, structured report headers, Markdown, HTML/PDF and the strategy handoff carry the profile metadata.

The deterministic report owns scores, ranking, evidence and structure. Optional AI narratives retain validation/fallback status. AI2 availability is not assumed; a successfully rendered fallback report is not evidence that the LLM enriched its content. No new industry expert service is invoked at runtime: the reviewed, versioned question catalogue determines the industry profile.

## Repeatable Tests

From the repository root:

```powershell
node apps/portal/lib/module01/__tests__/module01IndustryProfiles.test.mjs
node apps/portal/lib/module01/__tests__/module01IndustryAssessment.test.mjs
node apps/portal/lib/module01/__tests__/module01IndustryReport.test.mjs
node apps/portal/lib/module01/__tests__/module01FunctionalDomains.test.mjs

# Requires a running local portal and Playwright with Microsoft Edge.
$env:MODULE01_TEST_URL = 'http://127.0.0.1:3100'
$env:PLAYWRIGHT_MODULE = '<path to installed playwright>'
$env:MODULE01_TEST_OUTPUT = 'output/module01-industry-tests/live'
$env:MODULE01_TEST_FUNCTIONS = 'all' # omit for the 97-question core-only regression
node apps/portal/lib/module01/__tests__/module01Industry.browser.mjs

# Requires pypdf, Pillow and pdftoppm on PATH.
python apps/portal/lib/module01/__tests__/module01IndustryPdfCheck.py output/module01-industry-tests/live

# Compile the completed test outputs into six self-contained review packs.
node apps/portal/lib/module01/__tests__/module01IndustryReviewPack.mjs
```

Browser tests cover all six profiles, core-only or all-functions scope, bilingual evidence, desktop/mobile layout, reload, retained function answers, filtering, profile-change cancellation/migration, stale-report invalidation, API calls, metadata, local handoff and four export formats. Set MODULE01_REPLAY_DIRECTORY only for explicit replay of captured test responses; replay results are not live AI validation. PDF tests check landscape dimensions, nonblank pages, hidden debug content, narrative equality and functional findings against JSON. They do not replace human review of advisory quality or establish exact pagination for arbitrary long client evidence.

Generated review material and test results are in `output/module01-industry-tests`. The `live` folder contains actual AI2-enabled API runs, including rejection/fallback metadata. Do not publish request/response JSON from real clients without a data-sharing review.
