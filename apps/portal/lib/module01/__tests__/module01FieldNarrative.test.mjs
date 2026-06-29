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

const { generateModule01FieldNarrative } = fieldNarrativeModule;

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

const validText = "CRTVTA should start by confirming accountable owners and evidence because the diagnostic shows material gaps in Data Quality & Master Data and execution discipline. Once ownership and evidence are clear, management can remediate the largest weaknesses with less ambiguity, then scale AI-enabled reporting only through controls that protect quality, lineage and decision accountability.";

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
  assert.ok(bodies[0].body.options.stop.includes("{"));
  assert.ok(!bodies[0].body.messages[0].content.includes("DMO operating model"));
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

console.log("module01 field narrative tests passed");
