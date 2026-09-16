import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.MODULE01_TEST_URL || 'http://127.0.0.1:3100';
const output = resolve(process.env.MODULE01_TEST_OUTPUT || 'output/module01-industry-tests');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
const results = [];
const allProfiles = ['healthcare', 'manufacturing', 'banking', 'real-estate', 'utilities', 'cross-industry'];
const profiles = process.env.MODULE01_TEST_PROFILES ? process.env.MODULE01_TEST_PROFILES.split(',') : allProfiles;
assert.ok(profiles.every((id) => allProfiles.includes(id)));
const pageErrors = [];
const includeFunctions = process.env.MODULE01_TEST_FUNCTIONS === 'all';
const expectedQuestions = includeFunctions ? 113 : 97;
async function captureDownload(page, name, filename) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const download = await event;
  await download.saveAs(resolve(output, filename));
  return resolve(output, filename);
}
async function noOverflow(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 3).map((node) => ({ tag: node.tagName, className: node.className, width: node.clientWidth, scroll: node.scrollWidth })));
}
try {
  for (const id of profiles) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    if (process.env.MODULE01_REPLAY_RESPONSE || process.env.MODULE01_REPLAY_DIRECTORY) {
      const recorded = readFileSync(process.env.MODULE01_REPLAY_RESPONSE || resolve(process.env.MODULE01_REPLAY_DIRECTORY, `${id}-response.json`), 'utf8');
      await page.route('**/api/data-ai-diagnostic/report', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: recorded }));
    }
    page.on('pageerror', (error) => pageErrors.push({ id, error: error.message }));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${base}/use-cases/data-ai-capability-diagnostic?debug=1`, { waitUntil: 'networkidle' });
    await page.locator('#industry-profile').waitFor();
    assert.equal(await page.locator('.data-ai-question-card').count(), 0, 'Questionnaire must require industry selection');
    assert.equal(await page.getByRole('button', { name: 'AI report', exact: true }).isDisabled(), true);
    await page.locator('#industry-profile').selectOption(id);
    await page.locator('.data-ai-question-card').first().waitFor();
    assert.equal(await page.locator('.data-ai-question-card').count(), 97);
    assert.equal(await page.locator('input[name="functional-scope"]').count(), 4);
    if (includeFunctions) {
      for (const checkbox of await page.locator('input[name="functional-scope"]').all()) await checkbox.check();
      assert.equal(await page.locator('.data-ai-question-card').count(), 113);
      assert.match(await page.locator('.industry-function-scope').innerText(), /97 core \+ 16 functional = 113 questions/);
    }
    const questions = await page.locator('.data-ai-question-list').innerText();
    assert.doesNotMatch(questions, /\btrainees?\b|\btrainers?\b|professional certification|Ministry of Justice/i);
    assert.equal(await page.locator('.industry-evidence-ar').count(), expectedQuestions);
    await page.getByRole('button', { name: 'Seed selected data', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('module01:industry-assessment:v1')).answers.q001.score !== null);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(expected => document.querySelector('#industry-profile')?.value === expected, id);
    assert.equal(await page.locator('#industry-profile').inputValue(), id);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('module01:industry-assessment:v1')));
    assert.equal(Object.keys(saved.answers).length, expectedQuestions);
    assert.equal(saved.questions.length, expectedQuestions);
    assert.equal(Object.keys(saved.discovery.essentials).length, 10);
    assert.equal(saved.discovery.useCases.length, 2);
    assert.equal(saved.discovery.painPoints.length, 2);
    await page.locator('.discovery-capture').screenshot({ path: resolve(output, `${id}-discovery-desktop.png`) });
    if (includeFunctions) {
      assert.equal(saved.selectedFunctions.length, 4);
      await page.locator('#question-scope').selectOption(saved.selectedFunctions[0]);
      assert.equal(await page.locator('.data-ai-question-card').count(), 4);
      await page.locator('#question-scope').selectOption('all');
      await page.locator('input[name="functional-scope"]').first().uncheck();
      assert.equal(await page.locator('.data-ai-question-card').count(), 109);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelectorAll('.data-ai-question-card').length === 109);
      assert.equal(await page.locator('.data-ai-question-card').count(), 109);
      await page.locator('input[name="functional-scope"]').first().check();
      assert.equal(await page.locator('.data-ai-question-card').count(), 113);
      const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('module01:industry-assessment:v1')));
      assert.deepEqual(restored.answers, saved.answers);
      await page.locator('.industry-function-scope').screenshot({ path: resolve(output, `${id}-functions-desktop.png`) });
    }
    await page.locator('.industry-profile-bar').screenshot({ path: resolve(output, `${id}-selector-desktop.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.industry-profile-bar').screenshot({ path: resolve(output, `${id}-selector-mobile.png`) });
    await page.locator('.industry-function-scope').screenshot({ path: resolve(output, `${id}-functions-mobile.png`) });
    assert.deepEqual(await noOverflow(page, '.industry-function-scope, .industry-function-options label'), []);
    assert.deepEqual(await noOverflow(page, '.industry-profile-bar, .industry-profile-bar select, .data-ai-question-main'), []);
    assert.deepEqual(await noOverflow(page, '.discovery-capture, .discovery-capture fieldset, .discovery-capture textarea'), []);
    await page.locator('.discovery-capture').screenshot({ path: resolve(output, `${id}-discovery-mobile.png`) });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'AI report', exact: true }).click();
    const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/data-ai-diagnostic/report') && request.method() === 'POST');
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/data-ai-diagnostic/report'), { timeout: 120000 });
    await page.getByRole('button', { name: 'Generate with local AI', exact: true }).click();
    const request = await requestPromise;
    const response = await responsePromise;
    const payload = request.postDataJSON();
    const data = await response.json();
    assert.equal(response.status(), 200, JSON.stringify(data));
    assert.equal(data.status, 'ready');
    assert.equal(payload.industryProfile.id, id);
    assert.equal(data.report.industryProfile.id, id);
    assert.equal(data.structuredReport.reportHeader.industryProfile.id, id);
    assert.deepEqual(data.report.discovery, payload.discovery);
    assert.deepEqual(data.structuredReport.sections.discovery, payload.discovery);
    for (const heading of ['Platform and data essentials', 'Main pain points', 'Current and future use-case register', 'Current-state architecture']) assert.ok(data.markdownReport.includes(heading));
    if (includeFunctions) {
      assert.equal(payload.selectedFunctions.length, 4);
      assert.equal(payload.responses.length, 113);
      assert.equal(data.report.functionalFindings.length, 4);
      for (const f of data.report.functionalFindings) assert.ok(data.markdownReport.includes(`### ${f.name}`));
    }
    assert.match(data.markdownReport, new RegExp(payload.industryProfile.labelEn));
    assert.doesNotMatch(data.markdownReport, /\btrainees?\b|\btrainers?\b|Ministry of Justice/);
    if (id !== 'real-estate') assert.doesNotMatch(data.report.headlineAssessment, /\bPMS\b|\bcapex\b|\bleasing\b|\btenant\b/i);
    writeFileSync(resolve(output, `${id}-request.json`), JSON.stringify(payload, null, 2));
    writeFileSync(resolve(output, `${id}-response.json`), JSON.stringify(data, null, 2));
    await page.getByRole('button', { name: 'Download Markdown', exact: true }).waitFor();
    assert.doesNotMatch(await page.locator('.data-ai-report-pack').innerText(), /Gartner/);
    await captureDownload(page, 'Download Markdown', `${id}-report.md`);
    await captureDownload(page, 'Download HTML', `${id}-report.html`);
    await captureDownload(page, 'Download assessment JSON', `${id}-assessment.json`);
    assert.equal(readFileSync(resolve(output, `${id}-report.md`), 'utf8'), data.markdownReport);
    const assessment = JSON.parse(readFileSync(resolve(output, `${id}-assessment.json`), 'utf8'));
    assert.equal(assessment.industryProfile.id, id);
    assert.equal(assessment.report.structuredReport.reportHeader.industryProfile.id, id);
    const handoff = await page.evaluate(() => JSON.parse(localStorage.getItem('opencare:data-ai-diagnostic:latest')));
    assert.equal(handoff.industryProfile.id, id);
    assert.deepEqual(handoff.discovery, data.report.discovery);
    if (includeFunctions) {
      assert.deepEqual(handoff.selectedFunctions, payload.selectedFunctions);
      assert.deepEqual(handoff.functionalFindings, data.report.functionalFindings);
    }
    await page.locator('#data-ai-report-cover').screenshot({ path: resolve(output, `${id}-report-cover.png`) });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.industry-profile-bar').isVisible(), false);
    assert.equal(await page.locator('.industry-function-scope').isVisible(), false);
    const debug = page.locator('.data-ai-enrichment-debug');
    if (await debug.count()) assert.equal(await debug.isVisible(), false);
    await page.pdf({ path: resolve(output, `${id}-report.pdf`), preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    results.push({ industry: id, status: 'passed', questions: expectedQuestions, restored: true, metadata: true, outputs: ['json', 'markdown', 'html', 'pdf'], enrichedFields: data.enrichedFields, fallbackFields: data.fieldFallbacks });
    console.log(`PASS ${id}: UI, persistence, mobile, API, JSON, Markdown, HTML and PDF export`);
    if (id === 'healthcare') {
      await page.locator('#industry-profile').selectOption('banking');
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await page.locator('#industry-profile').inputValue(), 'healthcare');
      await page.locator('#industry-profile').selectOption('banking');
      await page.getByRole('button', { name: 'Apply industry change', exact: true }).click();
      const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('module01:industry-assessment:v1')));
      assert.equal(migrated.answers.q001.score, saved.answers.q001.score);
      assert.equal(migrated.answers.q014.score, null);
      assert.equal(migrated.answers.q014.evidenceAvailable, '');
      assert.equal(migrated.profileHistory[0].industryId, 'healthcare');
      assert.equal(migrated.contextReviewRequired, true);
      assert.deepEqual(migrated.selectedFunctions, []);
      assert.equal(migrated.discovery.useCases.length, 0);
      assert.deepEqual(migrated.profileHistory[0].discovery, saved.discovery);
      if (includeFunctions) assert.equal(Object.keys(migrated.profileHistory[0].answers).length, 113);
      await page.getByRole('button', { name: 'AI report', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Generate with local AI', exact: true }).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Download Markdown', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Confirm customer context', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Generate with local AI', exact: true }).isEnabled(), true);
      results.push({ check: 'profile migration and stale report invalidation', status: 'passed' });
    }
    await context.close();
  }
  assert.deepEqual(pageErrors, []);
  writeFileSync(resolve(output, 'browser-test-results.json'), JSON.stringify({ runAt: new Date().toISOString(), base, replayedResponse: process.env.MODULE01_REPLAY_RESPONSE || process.env.MODULE01_REPLAY_DIRECTORY || null, results, pageErrors }, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'browser-test-results.json'), JSON.stringify({ runAt: new Date().toISOString(), base, results, pageErrors, failure: error.stack }, null, 2));
  throw error;
} finally {
  await browser.close();
}
