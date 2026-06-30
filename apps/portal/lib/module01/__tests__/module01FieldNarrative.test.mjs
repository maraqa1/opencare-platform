import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(process.cwd(), "apps", "portal", "lib");
const tempDir = mkdtempSync(join(tmpdir(), "module01-field-narrative-"));

function compileTs(sourcePath, outputName) {
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const outputPath = join(tempDir, outputName);
  writeFileSync(outputPath, transpiled);
  return require(outputPath);
}

const validatorModule = compileTs(join(root, "module01", "module01NarrativeValidator.ts"), "validator.cjs");
const sanitizerModule = compileTs(join(root, "textSanitizer.ts"), "sanitizer.cjs");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/module01/module01NarrativeValidator") return validatorModule;
  if (request === "@/lib/textSanitizer") return sanitizerModule;
  return originalLoad.call(this, request, parent, isMain);
};

let fieldNarrativeModule;
try {
  fieldNarrativeModule = compileTs(join(root, "module01", "module01FieldNarrative.ts"), "fieldNarrative.cjs");
} finally {
  Module._load = originalLoad;
}

const { buildModule01FieldNarrativeFallback, generateModule01FieldNarrative } = fieldNarrativeModule;

const modelConfig = {
  gatewayBaseUrl: "http://local-ai-gateway:8080/v1",
  headers: { "content-type": "application/json" },
  model: "mistral-nemo:12b",
  timeoutMs: 1000,
};

const facts = [
  "Client: CRTVTA",
  "Priority domains: Data Quality & Master Data; Execution Delivery Plan & Value Measurement",
  "Management order: confirm owners and evidence first; remediate largest gaps second; scale only through controls third.",
];

const validText = "CRTVTA should sequence the 90-day roadmap by confirming accountable owners and evidence certification first, then remediating the priority domains with the highest gaps, and finally moving AI-enabled reporting through a control gate that protects quality, lineage and decision accountability.";
const labelledValidText = `BoardScoreNarrative: ${validText}`;

{
  const fallback = buildModule01FieldNarrativeFallback([
    "Client: CRTVTA",
    "Priority domains: Data Quality and Execution Roadmap",
    "Owner types: executive sponsor, data owner, AI governance lead",
    "Management order: certify evidence, assign owners, remediate priority domains",
  ], "", "roadmap.roadmapNarrative");
  assert.match(fallback, /^CRTVTA should sequence the roadmap/i);
  assert.match(fallback, /owners/i);
  assert.match(fallback, /evidence certification/i);
  assert.match(fallback, /control\/readiness gate/i);
  assert.ok(!fallback.includes("Client:"));
  assert.ok(!fallback.includes("Owner types:"));
}

{
  const bodies = [];
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async (url, init) => {
      bodies.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(validText, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    },
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.text, validText);
  assert.equal(result.responseLength, validText.length);
  assert.equal(result.rawResponseLength, validText.length);
  assert.equal(result.sanitizedResponseLength, validText.length);
  assert.ok(bodies[0].url.endsWith("/api/reports/module01/field-narrative"));
  assert.equal(bodies[0].body.field, "roadmap.roadmapNarrative");
  assert.equal(bodies[0].body.client_name, "CRTVTA");
  assert.equal(bodies[0].body.max_words, 90);
  assert.equal(bodies[0].body.style, "board");
  assert.ok(!bodies[0].body.facts.some((fact) => /^Client:/i.test(fact)));
  assert.ok(bodies[0].body.facts.some((fact) => fact.includes("priority domain")));
  assert.ok(!("messages" in bodies[0].body));
  assert.ok(!("options" in bodies[0].body));
}

{
  const bodies = [];
  await generateModule01FieldNarrative({
    field: "overallAdvisory.helicopterView",
    facts,
    maxWords: 110,
    style: "board",
    fallbackText: "Fallback helicopter paragraph.",
    modelConfig,
    fetchFn: async (url, init) => {
      bodies.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response("CRTVTA should treat the diagnostic as an enterprise-level readiness signal, connecting maturity, evidence and priority domains into one management agenda before scaling AI-enabled reporting.", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });
  assert.equal(bodies[0].body.field, "overallAdvisory.helicopterView");
  assert.ok(bodies[0].url.endsWith("/api/reports/module01/field-narrative"));
  assert.equal(bodies[0].body.max_words, 110);
  assert.equal(bodies[0].body.style, "board");
}

{
  const bodies = [];
  await generateModule01FieldNarrative({
    field: "boardScorecard.advisoryNarrative",
    facts: [
      "Client: CRTVTA",
      "Overall score: 1.68",
      "Evidence coverage: 75/84 evidence-backed items",
      "Board asks: approve owner assignment.",
    ],
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback board scorecard paragraph.",
    modelConfig,
    fetchFn: async (url, init) => {
      bodies.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response("CRTVTA has a 1.68 maturity baseline, so the board should treat the score as a readiness signal. The evidence posture supports a provisional baseline, and management should approve owner assignment before scaling AI use cases.", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });
  assert.equal(bodies[0].body.field, "boardScorecard.advisoryNarrative");
  assert.ok(bodies[0].url.endsWith("/api/reports/module01/field-narrative"));
  assert.ok(bodies[0].body.facts.some((fact) => fact.includes("score indicates")));
  assert.ok(bodies[0].body.facts.some((fact) => fact.includes("evidence posture")));
  assert.ok(bodies[0].body.facts.some((fact) => fact.includes("leadership decisions")));
}

{
  let calls = 0;
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async (url) => {
      calls += 1;
      if (String(url).includes("local-ai-gateway")) {
        throw new Error("getaddrinfo ENOTFOUND local-ai-gateway");
      }
      return new Response(validText, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    },
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.fallbackUsed, false);
  assert.ok(calls >= 2);
}

{
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response(JSON.stringify({
      answer: validText,
      field_validation: {
        status: "accepted",
        rejection_reason: null,
        fallback_used: false,
      },
      retrieval_metadata: {
        retrieval_mode: "hybrid",
      },
      citations: [
        { chunk_id: "module01-ai-assessment-reporting:014:0:1" },
        { chunk_id: "module01-ai-assessment-reporting:005:0:2" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.ai2FieldValidationStatus, "accepted");
  assert.equal(result.ai2FallbackUsed, false);
  assert.equal(result.ai2RetrievalMode, "hybrid");
  assert.equal(result.ai2CitationCount, 2);
}

{
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response(labelledValidText, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }),
  });
  assert.equal(result.status, "sanitized");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.text, validText);
  assert.equal(result.responseLength, validText.length);
  assert.equal(result.rawResponseLength, labelledValidText.length);
}

{
  const rawText = `${validText}\n{"deliverable":"full DMO operating model"}`;
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response(rawText, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }),
  });
  assert.equal(result.status, "sanitized");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.responseLength, validText.length);
  assert.equal(result.rawResponseLength, rawText.length);
  assert.equal(result.sanitizedResponseLength, validText.length);
}

{
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response('{"deliverable":"full DMO operating model"}', {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  });
  assert.equal(result.status, "fallback");
  assert.equal(result.validationStatus, "rejected");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.rejectionReason, "json_like_output");
}

{
  const result = await generateModule01FieldNarrative({
    field: "roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response("", { status: 502 }),
  });
  assert.equal(result.status, "fallback");
  assert.equal(result.validationStatus, "gateway_failure");
  assert.equal(result.fallbackUsed, true);
}

{
  const responses = [
    "For CRTVTA, priority domains is Data Quality; Architecture. The largest gaps is Data Quality; Architecture. Owner types is.",
    "CRTVTA should sequence the 90-day roadmap by confirming owners and evidence certification first, then remediating the priority domains with the highest gaps, and finally moving analytics and AI candidates through a control gate before scaling.",
  ];
  const result = await generateModule01FieldNarrative({
    field: "roadmap.roadmapNarrative",
    facts,
    maxWords: 90,
    style: "board",
    fallbackText: "Fallback sequencing paragraph.",
    modelConfig,
    fetchFn: async () => new Response(responses.shift() ?? responses[0], {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.validationStatus, "valid");
  assert.equal(result.retryAttempted, true);
  assert.equal(result.fallbackUsed, false);
  assert.ok(!result.text.includes("owner types is"));
}

{
  const result = await generateModule01FieldNarrative({
    field: "boardScorecard.advisoryNarrative",
    facts: [
      "Client: CRTVTA",
      "Overall score: 1.68",
      "Evidence coverage: 75/84",
      "Board asks: approve owner assignment.",
    ],
    maxWords: 90,
    style: "board",
    fallbackText: "The board scorecard should be read as a readiness signal, not a maturity badge. A 1.7 score means CRTVTA has a provisional baseline. The evidence posture requires certification, and management should approve owners and remediation funding.",
    modelConfig,
    fetchFn: async () => new Response("For CRTVTA, the board scorecard indicates that management attention should focus on overall score is 1.68; maturity band is Not provided in diagnostic input.", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  });
  assert.equal(result.status, "fallback");
  assert.equal(result.validationStatus, "rejected");
  assert.equal(result.retryAttempted, true);
  assert.equal(result.fallbackUsed, true);
  assert.ok(!result.text.includes("Not provided in diagnostic input"));
}

console.log("module01 field narrative tests passed");
