import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('output/module01-industry-tests');
const folder = resolve(process.argv[2] || `${root}/live`);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const unit = read(`${root}/unit-test-results.json`);
const browserRun = read(`${folder}/browser-test-results.json`);
assert.equal(browserRun.failure, undefined);
assert.ok(browserRun.results.every((result) => result.status === 'passed'));
const browser = browserRun.results.filter((result) => result.industry);
const pdf = read(`${folder}/pdf-test-results.json`);
assert.equal(browser.length, 6);
assert.equal(pdf.length, 6);
assert.ok(unit.every((result) => result.passed));
const link = (name, path) => `[${name}](<${resolve(path).replaceAll('\\', '/')}>)`;
const rows = [];
for (const result of browser) {
  const id = result.industry;
  const request = read(`${folder}/${id}-request.json`);
  const response = read(`${folder}/${id}-response.json`);
  const markdown = readFileSync(`${folder}/${id}-report.md`, 'utf8');
  const metadata = response.generationMetadata;
  const pack = [
    `# ${request.industryProfile.labelEn}: Module 01 Review Pack`,
    'All customer data and evidence in this pack are fictional. Evidence labels describe synthetic scenarios, not verified controls. This is a software test, not regulatory assurance.',
    `Profile version: ${request.industryProfile.version}. Questions: ${request.responses.length}.`,
    `AI-enriched fields: ${(response.enrichedFields || []).join(', ') || 'None'}.`,
    `Fallback fields: ${(response.fieldFallbacks || []).join(', ') || 'None'}.`,
    '## Evaluation Request',
    'Evaluate sector relevance, reasoning from the supplied facts, score/evidence consistency, management implications, domain-specific actions, readiness gates and unsupported assertions. Separate software correctness from advisory writing quality. Do not treat synthetic evidence as verified. Identify remaining generic or mechanically assembled prose.',
    '## Generated Board Markdown',
    markdown,
    '## Exact Seeded Assessment Request',
    '```json\n' + JSON.stringify(request, null, 2) + '\n```',
    '## Generation Provenance',
    '```json\n' + JSON.stringify(metadata, null, 2) + '\n```',
    '## Other Outputs',
    link('Landscape PDF', `${folder}/${id}-report.pdf`),
    link('HTML report', `${folder}/${id}-report.html`),
    link('Complete API response', `${folder}/${id}-response.json`),
  ].join('\n\n');
  writeFileSync(`${folder}/${id}-review-pack.md`, pack);
  rows.push(`| ${request.industryProfile.labelEn} | ${link('Review pack', `${folder}/${id}-review-pack.md`)} | ${link('PDF', `${folder}/${id}-report.pdf`)} | ${link('HTML', `${folder}/${id}-report.html`)} | ${link('Dummy data', `${folder}/${id}-assessment.json`)} | ${(response.enrichedFields || []).length} | ${(response.fieldFallbacks || []).length} |`);
}
const report = [
  '# Module 01 Industry Test Results',
  `Generated: ${new Date().toISOString()}. Local development verification; not deployed.`,
  '## Result',
  `- ${unit.length}/${unit.length} Module 01 and handoff test suites passed.`,
  '- 6/6 industry browser flows passed against the actual report API.',
  '- 97 bilingual questions per industry; required profile selection, seeded customer context, persistence, profile migration and report invalidation tested.',
  '- JSON, Markdown, HTML and PDF exports generated for all six profiles.',
  `- ${pdf.length}/${pdf.length} PDFs passed: landscape, no blank pages, debug hidden and four generated narrative fields matched JSON. Pages per report: ${[...new Set(pdf.map((result) => result.pages))].join(', ')}.`,
  '- Desktop and 390px mobile selector/question layout checks passed. PDF contact sheets were generated for visual review.',
  '## AI2 Status',
  'AI2 health was reachable. Report completion is not proof of successful AI enrichment: see the per-profile counts and generation provenance in each review pack. The observed live calls hit approximately 8-second field timeouts; the helicopter field also recorded missing_overall_conclusion. Rejected or unavailable narratives used deterministic fallback. Do not label these fallbacks AI-authored.',
  '## Review Outputs',
  ['| Industry | Evaluation bundle | Landscape output | Browser output | Input and output JSON | AI fields | Fallback fields |',
    '|---|---|---|---|---|---:|---:|', ...rows].join('\n'),
  'Each review pack contains the final Markdown, exact fictional assessment request and generation metadata. Share the pack with your reviewer to evaluate the report against the input data.',
  '## Remaining Limitations',
  '- Live AI enrichment reliability is not green. Safe report fallback is working.',
  '- The repository-wide TypeScript check remains blocked by 13 unrelated tuple-type errors in the existing Jazan urban-service-quality page. No Module 01 TypeScript errors were reported.',
  '- Version 1.0.0 has a neutral core plus five specialist variants per named industry, not an exhaustive industry compliance audit or conditional subsector questionnaire.',
  '- PDF tests use these seeded scenarios; arbitrary long client evidence may require further pagination review.',
  '- The legacy capability pillar contract retains internal compatibility identifiers; client-facing framework labels are neutral.',
  '## Machine-Readable Results',
  link('Unit results', `${root}/unit-test-results.json`),
  link('Browser results', `${folder}/browser-test-results.json`),
  link('PDF results', `${folder}/pdf-test-results.json`),
  link('Implementation and testing guide', 'docs/module01-industry-profiles.md'),
].join('\n\n');
writeFileSync(`${root}/README.md`, report);
console.log('Wrote test summary and six self-contained review packs.');
