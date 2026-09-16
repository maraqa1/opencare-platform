import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const portal = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cache = new Map();
const aiCalls = [];
let routePayload;

// Run the actual route/builders with local-only narrative and HTTP adapters.
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) => {
    if (name === "next/server") return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name === "@/lib/module01/module01FieldNarrative") return {
      generateModule01FieldNarrative: async (args) => {
        aiCalls.push(args);
        return { text: args.fallbackText, status: "fallback", fallbackUsed: true };
      },
    };
    if (name.startsWith("@/")) {
      const loaded = load(resolve(portal, `${name.slice(2)}.ts`));
      if (name === "@/lib/reportAssembler") return {
        ...loaded,
        assembleDiagnosticReport: (payload, config) => {
          routePayload = payload;
          return loaded.assembleDiagnosticReport(payload, config);
        },
      };
      return loaded;
    }
    if (name.startsWith(".")) {
      const target = resolve(dirname(path), name);
      return name.endsWith(".json") ? JSON.parse(readFileSync(target, "utf8")) : load(`${target}.ts`);
    }
    return require(name);
  };
  new Function("require", "module", "exports", source)(localRequire, module, module.exports);
  return module.exports;
}

const builders = load(resolve(portal, "lib/deterministicReportBuilders.ts"));
const discoveryTools = load(resolve(portal, "lib/module01/module01Discovery.ts"));
const factsBuilder = load(resolve(portal, "lib/module01/module01FactsBuilder.ts"));
const profiles = load(resolve(portal, "lib/module01/module01IndustryProfiles.ts"));
const assembler = load(resolve(portal, "lib/reportAssembler.ts"));
const { POST } = load(resolve(portal, "app/api/data-ai-diagnostic/report/route.ts"));
const cases = [
  ["cross-industry", "Aster Services", "service delivery"],
  ["healthcare", "Juniper Health", "clinical care"],
  ["manufacturing", "Cobalt Works", "production scheduling"],
  ["banking", "Meridian Bank", "credit servicing"],
  ["real-estate", "Horizon Properties", "property operations"],
  ["utilities", "Lumen Utilities", "network reliability"],
];
function payloadFor(id, customerName, wording) {
  const p = profiles.getIndustryProfile(id);
  const discovery = discoveryTools.emptyDiscovery();
  discovery.essentials.platforms = { status: "known", details: "Client confirmed Example Reporting Store", evidence: "Interview, not independently validated" };
  discovery.useCases = [{ id: "case-1", name: "Service oversight", horizon: "current", purpose: "Review performance", function: "Management", status: "In use", owner: "Operations manager", data: "Example Reporting Store", output: "Weekly report", benefit: "Visibility", dependencies: "Definition validation", priority: "High", timing: "Current" }];
  return {
    discovery,
    industryProfile: { id: p.id, version: p.version, labelEn: p.labelEn, labelAr: p.labelAr },
    customerContext: { customerName, businessDomain: wording, operatingScope: `Regional ${wording}.`, strategicPriorities: "Improve review turnaround", currentPainPoints: "Customer reports delayed review approvals." },
    overallScore: 3.8, overallGap: 0.2, scoredQuestions: 97, totalQuestions: 97, evidenceBackedItems: 80,
    evidenceWeightedConfidencePct: 75,
    topGapDomains: [{ nameEn: "Data Architecture", avgScore: 3, avgGap: 1, scored: 8, total: 8 }],
    strongestDomains: [{ nameEn: "Governance", avgScore: 4, scored: 8, total: 8 }],
    priorityGaps: [{ question: `Are ${wording} definitions governed?`, domain: "Data Architecture", score: 3, gap: 1, evidenceStrength: "documented", actionPlan: `Validate ${wording} definitions with owners.` }],
    responses: [{ evidenceId: "E-01", domain: wording, evidenceStrength: "documented", question: `Review ${wording}`, evidenceAvailable: "Signed review" }],
    evidence: [{ evidence_id: "E-02", domain: wording, evidenceAvailable: "Owner attestation" }],
  };
}
const previousMode = process.env.LOCAL_LLM_REPORT_MODE;
const previousMarkdown = process.env.LOCAL_LLM_ENABLE_MARKDOWN_GENERATION;
process.env.LOCAL_LLM_REPORT_MODE = "deterministic";
process.env.LOCAL_LLM_ENABLE_MARKDOWN_GENERATION = "false";
const post = (payload) => POST(new Request("http://localhost/api/data-ai-diagnostic/report", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
}));

try {
  for (const [id, client, wording] of cases) {
    const payload = payloadFor(id, client, wording);
    const response = await post({ ...payload, industryProfile: { ...payload.industryProfile, labelEn: "Forged label", labelAr: "Forged label" } });
    assert.equal(response.status, 200);
    const output = await response.json();
    assert.deepEqual(output.report.industryProfile, payload.industryProfile);
    assert.deepEqual(output.report.discovery, payload.discovery);
    assert.deepEqual(output.structuredReport.sections.discovery, payload.discovery);
    assert.ok(output.markdownReport.includes("Example Reporting Store"));
    assert.ok(output.markdownReport.includes("Service oversight"));
    assert.deepEqual(output.structuredReport.reportHeader.industryProfile, payload.industryProfile);
    assert.deepEqual(output.generationMetadata.industryProfile, payload.industryProfile);
    assert.deepEqual(routePayload.responses, payload.responses);
    assert.deepEqual(routePayload.evidence, payload.evidence);
    const facts = factsBuilder.buildModule01Facts(routePayload);
    assert.equal(facts.materialFindingsFacts.evidenceItems["E-01"].evidenceAvailable, "Signed review");
    assert.equal(facts.materialFindingsFacts.evidenceItems["E-02"].evidenceAvailable, "Owner attestation");
    for (const field of Object.values(facts)) assert.deepEqual(field.industryProfile, payload.industryProfile);
    for (const text of [JSON.stringify(output.report), JSON.stringify(output.structuredReport), output.markdownReport]) {
      assert.ok(text.includes(client));
      assert.ok(text.includes(wording));
      assert.ok(text.includes(payload.industryProfile.labelEn));
      assert.ok(text.includes(payload.industryProfile.version));
      assert.ok(!text.includes(".."), "Report text must not contain doubled periods");
      assert.ok(!text.includes("inferred from the industry profile"));
      assert.doesNotMatch(text, /PMS|CRM|ERP|tenant identifiers|occupancy|leasing|valuation|capex|learner|student|curriculum|CRTVTA|LEDAR|Forged label/i);
      for (const [, otherClient, otherWording] of cases.filter((entry) => entry[0] !== id)) {
        assert.ok(!text.includes(otherClient));
        assert.ok(!text.includes(otherWording));
      }
    }
    assert.ok(output.markdownReport.includes(payload.priorityGaps[0].question));
    assert.ok(output.markdownReport.includes(payload.priorityGaps[0].actionPlan));
    assert.match(output.report.headlineAssessment, /optimised maturity/);
    assert.ok(output.report.headlineAssessment.includes(`Customer-stated operating scope: Regional ${wording}. Customer-stated priorities: Improve review turnaround. Customer-reported pain points:`));
    assert.doesNotMatch(output.report.materialFindings[0], /not yet operating/);
    await assembler.assembleDiagnosticReport(payload, { reportMode: "narrative_enrichment", enableFieldEnrichment: true, concurrency: 1, maxFieldWords: 120, fieldTimeoutMs: 50, gatewayBaseUrl: "http://unused", headers: {}, model: "test" });
    for (const call of aiCalls.splice(0)) {
      assert.ok(call.facts.some((fact) => fact.includes(id)));
      assert.ok(call.facts.some((fact) => fact.includes("Sector examples")));
      assert.ok(call.facts.some((fact) => fact.includes("Example Reporting Store")));
      assert.ok(call.facts.some((fact) => fact.includes("Service oversight")));
    }
    const questions = profiles.resolveIndustryQuestions(id);
    assert.equal(questions.length, 97);
    const selected = questions.find((question) => question.variantKey.includes(`:${id}:`)) ?? questions[0];
    const bilingualQuestion = `${selected.questionEn} / ${selected.questionAr}`;
    const bilingualEvidence = `${selected.evidenceRequired} / ${selected.evidenceRequiredAr}`;
    const selectedResponse = await post({ ...payload, priorityGaps: [{ ...payload.priorityGaps[0], question: bilingualQuestion, actionPlan: bilingualEvidence }] });
    assert.equal(selectedResponse.status, 200);
    const selectedOutput = await selectedResponse.json();
    for (const text of [JSON.stringify(selectedOutput.report), selectedOutput.markdownReport]) {
      assert.ok(text.includes(bilingualQuestion));
      assert.ok(text.includes(bilingualEvidence));
    }
    // Sector-specific question examples must not become asserted client facts.
    assert.equal(selectedOutput.report.headlineAssessment, output.report.headlineAssessment);
  }
  const base = payloadFor(...cases[0]);
  for (const industryProfile of [null, {}, { id: "invalid", version: "1" }, { ...base.industryProfile, version: "invalid" }]) {
    assert.equal((await post({ ...base, industryProfile })).status, 400);
  }
  delete base.industryProfile;
  base.overallScore = null;
  base.overallGap = null;
  base.topGapDomains[0].avgScore = null;
  base.topGapDomains[0].score = 4;
  base.topGapDomains[0].avgGap = null;
  base.priorityGaps[0].score = null;
  base.strongestDomains[0].avgScore = null;
  const legacy = await post(base);
  assert.equal(legacy.status, 200);
  const output = await legacy.json();
  assert.equal(output.structuredReport.sections.executiveSummary.maturityScore, null);
  assert.equal(routePayload.topGapDomains[0].avgScore, null);
  assert.equal(routePayload.topGapDomains[0].avgGap, null);
  assert.equal(routePayload.priorityGaps[0].score, null);
  assert.equal(routePayload.strongestDomains[0].avgScore, null);
  assert.equal(output.report.industryProfile, undefined);
  assert.match(output.report.headlineAssessment, /maturity not assessed/);
  for (const [score, expected] of [[null, "not assessed"], [0, "absent"], [0.99, "absent"], [1, "ad hoc"], [1.99, "ad hoc"], [2, "defined"], [2.99, "defined"], [3, "managed"], [3.59, "managed"], [3.6, "optimised"], [4, "optimised"]]) {
    assert.ok(builders.buildDeterministicReport({ ...base, overallScore: score }).headlineAssessment.includes(expected));
    await assembler.assembleDiagnosticReport({ ...base, overallScore: score }, { reportMode: "narrative_enrichment", enableFieldEnrichment: false, concurrency: 1, maxFieldWords: 120, fieldTimeoutMs: 50, gatewayBaseUrl: "http://unused", headers: {}, model: "test" });
    assert.ok(aiCalls.splice(0).some((call) => call.facts.some((fact) => fact.startsWith("Maturity band:") && fact.includes(expected))));
  }
  for (const ending of ["", ".", "...", "!", "?", "\u061f", "\u06d4"]) {
    const headline = builders.buildDeterministicReport({ ...base, customerContext: { operatingScope: `Regional operations${ending}  `, strategicPriorities: `Improve delivery${ending}`, currentPainPoints: `Review delays${ending}` } }).headlineAssessment;
    assert.ok(headline.includes("Customer-stated operating scope: Regional operations. Customer-stated priorities: Improve delivery. Customer-reported pain points: Review delays."));
    assert.ok(!headline.includes(".."));
    assert.ok(!headline.includes("Customer-stated business domain:"));
  }
  const explicit = builders.buildDeterministicReport({ ...base, customerContext: { customerName: "Verified Client", currentPainPoints: "Customer-confirmed ERP reconciliation delays." } });
  assert.match(explicit.headlineAssessment, /Customer-confirmed ERP reconciliation delays/);
  const streamed = await POST(new Request("http://localhost/api/data-ai-diagnostic/report", {
    method: "POST", headers: { "content-type": "application/json", "x-module01-stream": "1" },
    body: JSON.stringify(payloadFor(...cases[1])),
  }));
  assert.equal(streamed.headers.get("x-accel-buffering"), "no");
  const streamedResult = await streamed.json();
  assert.equal(streamedResult.status, "ready");
  assert.equal(streamedResult.report.industryProfile.id, "healthcare");
  assert.ok(streamedResult.markdownReport.includes(streamedResult.report.roadmapPhases[0]));
  console.log("module01 industry report tests passed: six profiles, metadata, wording, evidence, nulls, legacy, and maturity");
} finally {
  if (previousMode === undefined) delete process.env.LOCAL_LLM_REPORT_MODE;
  else process.env.LOCAL_LLM_REPORT_MODE = previousMode;
  if (previousMarkdown === undefined) delete process.env.LOCAL_LLM_ENABLE_MARKDOWN_GENERATION;
  else process.env.LOCAL_LLM_ENABLE_MARKDOWN_GENERATION = previousMarkdown;
}
