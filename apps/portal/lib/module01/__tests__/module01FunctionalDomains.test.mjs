import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const portal = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cache = new Map();
const calls = [];
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (name) => {
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name === '@/lib/module01/module01FieldNarrative') return { generateModule01FieldNarrative: async (args) => {
      calls.push(args);
      return { text: args.fallbackText, status: 'fallback', fallbackUsed: true, validationStatus: 'fallback', rejectionReason: 'test_gateway_unavailable' };
    } };
    if (name.startsWith('@/')) return load(resolve(portal, `${name.slice(2)}.ts`));
    if (name.startsWith('.')) return load(resolve(dirname(path), `${name}.ts`));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const functions = load(resolve(portal, 'lib/module01/module01FunctionalDomains.ts'));
const profiles = load(resolve(portal, 'lib/module01/module01IndustryProfiles.ts'));
const assessment = load(resolve(portal, 'lib/module01/module01IndustryAssessment.ts'));
const { POST } = load(resolve(portal, 'app/api/data-ai-diagnostic/report/route.ts'));
const output = resolve('output/module01-functional-tests');
mkdirSync(output, { recursive: true });
process.env.LOCAL_LLM_REPORT_MODE = 'narrative_enrichment';
process.env.LOCAL_LLM_ENABLE_FIELD_ENRICHMENT = 'true';
process.env.LOCAL_LLM_ENABLE_MARKDOWN_GENERATION = 'false';
const results = [];
const post = (payload) => POST(new Request('http://localhost/api/data-ai-diagnostic/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
for (const profile of profiles.industryProfiles) {
  const id = profile.id;
  const available = functions.industryFunctions(id);
  const ids = available.map((f) => f.id);
  const core = profiles.resolveIndustryQuestions(id);
  const questions = profiles.resolveIndustryQuestions(id, ids);
  assert.equal(available.length, 4);
  assert.equal(core.length, 97);
  assert.equal(profiles.resolveIndustryQuestions(id, [ids[0]]).length, 101);
  assert.equal(questions.length, 113);
  assert.equal(new Set(questions.map((q) => q.id)).size, 113);
  assert.deepEqual(questions.slice(0, 97), core);
  assert.deepEqual(functions.normaliseFunctions(id, [ids[0], ids[0], 'invalid']), [ids[0]]);
  for (const q of questions.slice(97)) {
    assert.match(q.questionAr, /[\u0600-\u06ff]/);
    assert.match(q.evidenceRequiredAr, /[\u0600-\u06ff]/);
    assert.ok(q.domainEn && q.functionLabel && q.variantKey);
    assert.doesNotMatch(`${q.questionEn} ${q.evidenceRequired}`, /\btrainees?|\btrainers?|\bprogrammes?|\battendance|\bcertification/i);
    assert.equal(q.score, null);
  }
  for (const level of ['interview-light', 'evidence-enriched', 'board-ready']) {
    const seed = assessment.buildIndustrySeed(id, level, ids);
    assert.equal(Object.keys(seed.answers).length, 113);
    assert.deepEqual(assessment.validateIndustryAnswers(id, seed.answers, ids), seed.answers);
    for (const q of questions.slice(97)) assert.ok(seed.answers[q.id].notes.includes(q.functionLabel));
  }
  const seed = assessment.buildIndustrySeed(id, 'evidence-enriched', ids);
  const responses = questions.map((q) => ({ questionId: q.id, question: q.questionEn, domain: q.domainEn, evidenceId: `E-${q.id}`, ...seed.answers[q.id] }));
  const payload = { industryProfile: profile, selectedFunctions: ids, functionCatalogueVersion: functions.FUNCTION_CATALOGUE_VERSION,
    customerContext: seed.customerContext, responses, overallScore: 2, overallGap: 2, totalQuestions: 113, scoredQuestions: 113, evidenceBackedItems: 113,
    topGapDomains: [{ nameEn: 'Data Quality & Master Data', avgScore: 2, avgGap: 2, scored: 20, total: 20 }], strongestDomains: [], priorityGaps: [] };
  calls.length = 0;
  const response = await post(payload);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, 'ready');
  const findings = functions.functionalFindings(id, ids, responses);
  assert.deepEqual(data.report.functionalFindings, findings);
  assert.deepEqual(data.structuredReport.sections.functionalFindings, findings);
  assert.equal(calls.length, 3);
  assert.equal(calls.at(-1).field, 'overallAdvisory.helicopterView');
  for (const f of available) {
    assert.ok(data.markdownReport.includes(`### ${f.labelEn}`));
    for (const call of calls) assert.ok(call.facts.join(' ').includes(`Function: ${f.labelEn}`));
  }
  assert.match(calls[0].facts.join(' '), /not proof of implementation/);
  for (const call of calls) {
    const functionalText = call.facts.filter((fact) => fact.startsWith('Function:')).join(' ');
    assert.ok(functionalText.length < 2000, 'Functional AI facts must stay bounded');
    assert.doesNotMatch(functionalText, /Who owns|Can .* be traced|Before considering/);
  }
  assert.doesNotMatch(data.markdownReport, /\btrainees?\b|\btrainers?\b|\bprogrammes?\b|\battendance\b|\bcertification\b/i);
  assert.equal((await post({ ...payload, selectedFunctions: ['not-a-function'] })).status, 400);
  assert.equal((await post({ ...payload, functionCatalogueVersion: 'obsolete' })).status, 400);
  assert.equal((await post({ ...payload, selectedFunctions: [], responses })).status, 400);
  assert.equal((await post({ ...payload, responses: [...responses, responses.at(-1)] })).status, 400);
  const first = ids[0];
  const qs = functions.functionalQuestions(id, [first]);
  const rated = (score, strength) => qs.map((q) => ({ questionId: q.id, score, evidenceStrength: strength, evidenceAvailable: strength === 'none' ? '' : 'Owner-reviewed records' }));
  const gate = (rows) => functions.functionalFindings(id, [first], rows)[0];
  assert.equal(gate([]).gate, 'Not assessed');
  assert.equal(gate(rated(4, 'none')).gate, 'Hold');
  assert.equal(gate(rated(4, 'interview')).weightedConfidence, 45);
  assert.equal(gate(rated(4, 'interview')).gate, 'Hold');
  assert.equal(gate(rated(3, 'documented')).gate, 'Pilot with controls');
  assert.equal(gate(rated(3, 'system')).gate, 'Proceed with governed analytics');
  const incomplete = rated(4, 'system').slice(0, 3);
  assert.equal(gate(incomplete).gate, 'Hold');
  const weakAi = rated(4, 'system'); weakAi[3].evidenceStrength = 'interview';
  assert.equal(gate(weakAi).gate, 'Hold');
  assert.deepEqual(functions.functionalFindings(id, [], responses), []);
  writeFileSync(resolve(output, `${id}-request.json`), JSON.stringify(payload, null, 2));
  writeFileSync(resolve(output, `${id}-response.json`), JSON.stringify(data, null, 2));
  writeFileSync(resolve(output, `${id}-report.md`), data.markdownReport);
  results.push({ industry: id, functions: ids, questions: 113, status: 'passed', aiGateway: 'mocked unavailable; verified all three field payloads and fallback output' });
  console.log(`PASS ${id}: catalogue, three seed depths, scores, evidence gates, API, AI inputs and Markdown`);
}
writeFileSync(resolve(output, 'test-results.json'), JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
