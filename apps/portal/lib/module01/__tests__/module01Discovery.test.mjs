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
const editorSource = readFileSync(resolve(portal, "app/use-cases/data-ai-capability-diagnostic/discovery-editor.tsx"), "utf8");
assert.ok(editorSource.includes('<section className="architecture-capture"'), "Architecture capture must not require expanding a disclosure");
assert.ok(editorSource.indexOf("<ArchitectureDiagram architecture={d.architecture} />") < editorSource.indexOf("Systems, data flows, storage, models and reports"), "Diagram preview must precede the architecture description editor");
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
    if (industry === "healthcare") {
      assert.equal(seed.discovery.architecture.nodes.length, 5);
      assert.equal(seed.discovery.architecture.edges.length, 5);
      assert.equal(seed.discovery.architecture.diagram.components.length, 5);
      assert.equal(seed.discovery.architecture.diagram.connections.length, 5);
      assert.equal(seed.discovery.architecture.diagram.components.find(item => item.id === "clinical-system").product, "Electronic health record");
      assert.equal(seed.discovery.architecture.diagram.components.find(item => item.id === "reporting-database").owner, "IT Data Services");
      assert.equal(seed.discovery.architecture.diagram.connections.find(item => item.id === "nightly-clinical-feed").method, "file_transfer");
      assert.equal(seed.discovery.architecture.diagram.connections.find(item => item.id === "weekly-reconciliation").frequency, "weekly");
      for (const detail of ["Scope: Outpatient activity reporting", "As of: September 2026", "electronic health record", "SQL Server", "Power BI", "Clinical Informatics", "IT Data Services", "Business Intelligence team", "Performance team", "02:00", "06:00", "SFTP", "Reconciliation workbook", "appointment counts do not match", "fails about twice a month", "previous day's data without warning"]) {
        assert.ok(seed.discovery.architecture.description.includes(detail), detail);
        assert.ok(report.discovery.architecture.description.includes(detail), detail);
        assert.ok(markdown.includes(detail), detail);
      }
      assert.equal(seed.discovery.essentials.model.status, "not_sure");
      assert.equal(seed.discovery.essentials.history.status, "not_sure");
      assert.ok(seed.discovery.essentials.capture.details.includes("02:00"));
      assert.ok(seed.discovery.painPoints.some(p => p.example.includes("twice a month")));
      assert.ok(discovery.discoveryNarrativeFacts(seed.discovery).join("\n").includes("Outpatient activity reporting"));
    } else {
      assert.equal(seed.discovery.architecture.nodes.length, 3);
      assert.equal(seed.discovery.architecture.edges.length, 2);
      assert.ok(!JSON.stringify(seed.discovery).includes("Clinical Informatics"));
    }
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
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("Structured diagrams must not call AI2"); };
  let response = await POST(new Request("http://localhost/api/reports/module01/architecture", { method: "POST", body: JSON.stringify({ description: graph.description, diagram: graph.diagram }) }));
  assert.equal(response.status, 200); let draft = await response.json(); assert.equal(draft.confirmed, false); assert.equal(draft.origin, "manual"); assert.equal(draft.generationMode, "deterministic"); assert.equal(called, false);
  response = await POST(new Request("http://localhost/api/reports/module01/architecture", { method: "POST", body: JSON.stringify({ description: graph.description }) }));
  assert.equal(response.status, 200); draft = await response.json(); assert.equal(draft.generationMode, "deterministic"); assert.ok(draft.diagram.components.length >= 2); assert.ok(draft.diagram.connections.length >= 1);
  const aiDescription = "Alpha source transfers nightly to Beta destination. Alpha source transfers nightly to Beta destination.";
  const aiGraph = { components: [{ id: "alpha", name: "Alpha source", type: "source_system", product: "unknown", owner: "unknown", notes: "Alpha source transfers nightly to Beta destination." }, { id: "beta", name: "Beta destination", type: "data_store", product: "unknown", owner: "unknown", notes: "Alpha source transfers nightly to Beta destination." }], connections: [{ id: "flow", from: "alpha", to: "beta", label: "transfers nightly", mode: "automated", method: "unknown", frequency: "daily" }] };
  let requestSeen;
  globalThis.fetch = async (url, init) => { requestSeen = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ answer: JSON.stringify(aiGraph), model: "test-only" }); };
  response = await POST(new Request("http://localhost/api/reports/module01/architecture", { method: "POST", body: JSON.stringify({ description: aiDescription }) }));
  assert.equal(response.status, 200); draft = await response.json(); assert.equal(draft.origin, "ai_draft"); assert.equal(draft.generationMode, "ai2");
  assert.ok(requestSeen.url.endsWith("/v1/grounded-generate")); assert.equal(requestSeen.body.regulatory_mode, false);
  let attempts = 0;
  globalThis.fetch = async () => ++attempts === 1 ? Response.json({ answer: "Invalid graph" }) : Response.json({ answer: JSON.stringify(aiGraph) });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: aiDescription }) }));
  assert.equal(response.status, 200); assert.equal((await response.json()).retryAttempted, true); assert.equal(attempts, 2);
  globalThis.fetch = async () => Response.json({ answer: "Not a graph" });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: aiDescription }) })); assert.equal(response.status, 502);
  globalThis.fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: aiDescription }) })); assert.equal(response.status, 502); assert.equal((await response.json()).status, "not_generated");
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  response = await POST(new Request("http://localhost/", { method: "POST", body: JSON.stringify({ description: aiDescription }) })); assert.equal(response.status, 502);
} finally { globalThis.fetch = oldFetch; }
writeFileSync(resolve(output, "results.json"), JSON.stringify({ results, architectureValidation: "passed", mockedGateway: "passed", scoreInvariance: "passed" }, null, 2));
console.log(`PASS: ${results.length} industry/depth report fixtures, score invariance, unknown/no, optional future cases, sanitization, grounded graph validation and gateway failure handling. Artifacts: ${output}`);
