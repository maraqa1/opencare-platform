import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const here = join(process.cwd(), "apps", "portal", "lib");
const tempDir = mkdtempSync(join(tmpdir(), "local-llm-client-"));

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

const policyModule = compileTs(join(here, "mistralNemoInteractionPolicy.ts"), "policy.cjs");
const telemetryModule = {
  logLocalLlmTelemetry: () => undefined,
  preview: (value) => value.slice(0, 80),
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/mistralNemoInteractionPolicy") return policyModule;
  if (request === "@/lib/localLlmTelemetry") return telemetryModule;
  return originalLoad.call(this, request, parent, isMain);
};

let clientModule;
try {
  clientModule = compileTs(join(here, "localLlmClient.ts"), "localLlmClient.cjs");
} finally {
  Module._load = originalLoad;
}

const { callLocalLlm } = clientModule;
const originalFetch = globalThis.fetch;
const calls = [];
const requestBodies = [];

globalThis.fetch = async (url, init) => {
  calls.push(String(url));
  requestBodies.push(init?.body ? JSON.parse(String(init.body)) : null);
  return new Response("CRTVTA has enough diagnostic context to prioritise data quality ownership before scaling AI reporting.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};

try {
  const result = await callLocalLlm({
    taskMode: "narrative_field",
    fieldPath: "boardScorecard.advisoryNarrative",
    prompt: "Write one advisory sentence for CRTVTA.",
    modelConfig: {
      gatewayBaseUrl: "https://ai2.opendatalake.com/v1",
      headers: { "content-type": "application/json" },
      model: "mistral-nemo:12b",
      timeoutMs: 1000,
    },
  });

  assert.equal(result.status, "success");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/api/chat"));
  assert.equal(requestBodies[0].model, "mistral-nemo:12b");
  assert.equal(requestBodies[0].options.temperature, 0.1);
  assert.ok(requestBodies[0].options.stop.includes("Deliverable"));
  assert.ok(requestBodies[0].options.stop.includes("{"));
  assert.ok(requestBodies[0].options.num_predict <= 180);
  assert.ok(result.rawOutput.includes("CRTVTA"));
} finally {
  globalThis.fetch = originalFetch;
}

console.log("local LLM client tests passed");
