# Module 01 AI2 Calls

## Findings From Live Tests

- AI2 health responds, but the dedicated `/api/reports/module01/field-narrative` endpoint currently returns `debug.status: deterministic`. It is not proof of LLM authorship.
- `/v1/grounded-generate` does run the model. Supplying client data only in its separate `facts` property did not reliably ground generation: a live test returned invented scores and a named owner despite upstream `accepted` status.
- Including the complete client facts in `question_or_prompt` produced a valid, client-specific board narrative. A recorded direct call took 44 seconds. The former 8-second field limit was unsuitable for this service.

## Current Contract

The report assembler still owns scores, evidence, rankings, structure and fallbacks. Three fields use AI2: board scorecard, roadmap rationale and overall advisory. The overall advisory runs last with the accepted earlier narratives. Every request has one field task, its complete section-specific facts inside the prompt, plain-text rules and a bounded word count. No `/api/chat` call is used.

The grounded request uses the configured AI2 host, the `module01-ai-assessment-reporting` knowledge pack, keyword retrieval, one retrieved chunk and `regulatory_mode: false`. Retrieved methodology is explicitly not customer evidence. Citations are not requested inside the paragraph. Upstream validation/fallback status is retained but never substitutes for local validation.

Local checks reject unsupported numerical values (one- or two-decimal display rounding is allowed), unprovided named owners with personal titles, invented evidence IDs, persona leakage, improper structure, overstated ad-hoc maturity and field-specific semantic failures. These are conservative checks, not a complete proof of factual entailment. Human content review remains necessary.

Invalid output is retried once with the rejection reason in the prompt. Both attempts share the field's time budget. Upstream deterministic/fallback output can never be labelled `ai_enriched`. Transport failures retain their actual reason, including `field_timeout`, rather than being masked by a fallback's writing-validation result. Credentials are not forwarded to a different fallback origin.

## Browser Delivery

The browser sends `x-module01-stream: 1` to the existing report route. The route immediately returns JSON headers and sends whitespace heartbeats every five seconds, followed by the final JSON object. Leading whitespace is valid JSON, so the existing `response.json()` contract remains intact. No partial report or prompt is streamed.

Streaming requests run fields sequentially to avoid contention on the local model. Default field budget: 100 seconds, including one retry; each individual upstream attempt is capped at 55 seconds. Overall enrichment budget: 300 seconds. Configure `LOCAL_LLM_STREAM_FIELD_TIMEOUT_MS` to adjust the field budget; values above 110 seconds are capped. Reports may therefore take several minutes when retries are needed. Optional full-Markdown generation is disabled by default and is not needed for this flow.

The response sets `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-store, no-transform`. The production ingress must honour streaming and allow the request's overall duration; heartbeats address idle timeouts, not hard platform duration limits. This behaviour has been tested locally, not deployed to the public portal.

Non-streaming API callers retain a bounded JSON response: default 28-second field budgets, 55-second total enrichment budget. They may see more fallback with a slow LLM. Changes to assessment answers abort stale browser generation and propagate cancellation to the field calls.

The standalone local field route also preserves all supplied facts (up to 32, with size validation), accepts `client_name`, caps timeout at 55 seconds and returns generation provenance.

## Tests And Evidence

```powershell
node apps/portal/lib/module01/__tests__/module01FieldNarrative.test.mjs
node apps/portal/lib/module01/__tests__/module01FieldNarrativeRoute.test.mjs
node apps/portal/lib/module01/__tests__/module01JsonStream.test.mjs

# Explicit network test, using only the fictional healthcare fixture:
$env:MODULE01_AI2_LIVE = 'true'
node apps/portal/lib/module01/__tests__/module01FieldNarrative.test.mjs
Remove-Item Env:MODULE01_AI2_LIVE
```

`output/module01-industry-tests/ai2-call-diagnostic.json` records the direct field result. `ai2-streamed-report.json` and `ai2-retest` record intermediate diagnostic runs. `ai2-final` contains the final successful browser-run exports: all three target fields enriched without retry or fallback, approximately 121 seconds total model time. `ai2-unit-results.json` records the regression run. Older industry export bundles should not be used as evidence of current enrichment status.

`ai2-exports` contains regenerated exports from the captured successful response, including the roadmap rationale in shared Markdown/HTML/PDF. Its browser test explicitly records response replay rather than a new AI call.
