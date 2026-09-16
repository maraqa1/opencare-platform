import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const portal = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((name) => {
    if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    if (name.startsWith("@/")) return load(resolve(portal, `${name.slice(2)}.ts`));
    if (name.startsWith(".")) return load(resolve(dirname(path), `${name}.ts`));
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const discovery = load(resolve(portal, "lib/module01/module01Discovery.ts"));
const { buildIndustrySeed } = load(resolve(portal, "lib/module01/module01IndustryAssessment.ts"));
const { buildDeterministicReport, buildStructuredReport } = load(resolve(portal, "lib/deterministicReportBuilders.ts"));
const { buildDeterministicMarkdown } = load(resolve(portal, "lib/markdownReportGenerator.ts"));
const { validateArchitecture } = load(resolve(portal, "lib/module01/module01Architecture.ts"));
const { POST } = load(resolve(portal, "app/api/reports/module01/architecture/route.ts"));
const output = resolve(portal, "../../output/module01-discovery-tests"); mkdirSync(output, { recursive: true });
const results = [];
for (const industry of ["healthcare", "manufacturing", "banking", "real-estate", "utilities", "cross-industry"]) {
  for (const level of ["interview-light", "evidence-enriched", "board-ready"]) {
    const seed = buildIndustrySeed(industry, level);
    assert.equal(Object.keys(seed.answers).length, 97);
    assert.equal(Object.keys(seed.discovery.essentials).length, 10);
    assert.equal(seed.discovery.useCases.length, 2);
    assert.equal(seed.discovery.painPoints.length, 2);
    assert.equal(seed.discovery.architecture.confirmed, false);
    const payload = { customerContext: seed.customerContext, discovery: seed.discovery, responses: [], overallScore: 1.5, overallGap: 2.5, scoredQuestions: 97, totalQuestions: 97, evidenceBackedItems: 50, topGapDomains: [], strongestDomains: [], priorityGaps: [] };
    const report = buildDeterministicReport(payload);
    const baseline = buildDeterministicReport({ ...payload, discovery: undefined });
    assert.equal(report.executiveSummary, baseline.executiveSummary, "Unscored discovery must not change maturity or confidence");
    assert.deepEqual(report.domainActionPlan, baseline.domainActionPlan);
    assert.deepEqual(report.discovery, discovery.normaliseDiscovery(seed.discovery));
    const markdown = buildDeterministicMarkdown(payload, report);
    for (const heading of ["Platform and data essentials", "Main pain points", "Current and future use-case register", "Current-state architecture"]) assert.ok(markdown.includes(heading));
    for (const useCase of seed.discovery.useCases) assert.ok(markdown.includes(useCase.name));
    if (industry !== "healthcare") assert.ok(!markdown.includes("Clinical system"));
    validateArchitecture(seed.discovery.architecture, seed.discovery.architecture.description);
    results.push({ industry, level, questions: 97, essentials: 10, useCases: 2, passed: true });
    if (level === "evidence-enriched") {
      writeFileSync(resolve(output, `${industry}-seed.json`), JSON.stringify(seed, null, 2));
      writeFileSync(resolve(output, `${industry}-report.json`), JSON.stringify(report, null, 2));
      writeFileSync(resolve(output, `${industry}-report.md`), markdown);
    }
  }
}
const d = discovery.emptyDiscovery(); d.essentials.model.status = "no"; d.essentials.history.status = "not_sure";
const ids = discovery.normaliseDiscovery({ useCases: [{ id: "custom-42" }, { id: "custom-42" }, { id: "case-2-1" }] }).useCases.map(u => u.id);
assert.equal(ids[0], "custom-42"); assert.equal(new Set(ids).size, 3);
assert.equal(discovery.normaliseDiscovery(d).essentials.model.status, "no");
assert.equal(discovery.normaliseDiscovery(d).essentials.history.status, "not_sure");
d.futureUseCases = "none"; assert.equal(discovery.normaliseDiscovery(d).futureUseCases, "none");
d.painPoints = [{ issue: "Unverified", confirmed: true, evidence: "" }];
assert.equal(discovery.normaliseDiscovery(d).painPoints[0].confirmed, false);
d.architecture.image = "data:image/svg+xml,<script>bad</script>";
assert.equal(discovery.normaliseDiscovery(d).architecture.image, "");
assert.ok(!discovery.discoveryMarkdown({ architecture: { description: "<script>alert(1)</script>" } }).join("\n").includes("<script>"));
const seed = buildIndustrySeed("manufacturing", "evidence-enriched");
const graph = seed.discovery.architecture;
assert.throws(() => validateArchitecture({ nodes: [{ id: "1", label: "Invented platform", sourceQuote: graph.description }], edges: [] }, graph.description), /Ungrounded/);
assert.throws(() => validateArchitecture({ ...graph, edges: [{ ...graph.edges[0], sourceQuote: "Invented connection" }] }, graph.description), /Ungrounded/);
const oldFetch = globalThis.fetch;
try {
  let called;
  globalThis.fetch = async (url, init) => { called = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ answer: JSON.stringify({ nodes: graph.nodes, edges: graph.edges }), model: "test-only" }); };
  let response = await POST(new Request("http://localhost/api/reports/module01/architecture", { method: "POST", body: JSON.stringify({ description: graph.description }) }));
  assert.equal(response.status, 200); const draft = await response.json(); assert.equal(draft.confirmed, false); assert.equal(draft.origin, "ai_draft");
  assert.ok(called.url.endsWith("/v1/grounded-generate")); assert.equal(called.body.regulatory_mode, false);
  let attempts = 0;
  globalThis.fetch = async () => ++attempts === 1 ? Response.json({ answer: "Invalid graph" }) : Response.json({ answer: JSON.stringify({ nodes: graph.nodes, edges: graph.edges }) });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: graph.description }) }));
  assert.equal(response.status, 200); assert.equal((await response.json()).retryAttempted, true); assert.equal(attempts, 2);
  globalThis.fetch = async () => Response.json({ answer: "Not a graph" });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: graph.description }) })); assert.equal(response.status, 502);
  globalThis.fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: graph.description }) })); assert.equal(response.status, 502); assert.equal((await response.json()).status, "not_generated");
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: graph.description }) })); assert.equal(response.status, 502);
} finally { globalThis.fetch = oldFetch; }
writeFileSync(resolve(output, "results.json"), JSON.stringify({ results, architectureValidation: "passed", mockedGateway: "passed", scoreInvariance: "passed" }, null, 2));
console.log(`PASS: ${results.length} industry/depth report fixtures, score invariance, unknown/no, optional future cases, sanitization, grounded graph validation and gateway failure handling. Artifacts: ${output}`);
