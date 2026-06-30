import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(process.cwd(), "apps", "portal");
const tempDir = mkdtempSync(join(tmpdir(), "module01-field-route-"));
const calls = [];

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

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "next/server") {
    return {
      NextResponse: {
        json: (body, init) => Response.json(body, init),
      },
    };
  }
  if (request === "@/lib/module01/module01FieldNarrative") {
    return {
      generateModule01FieldNarrative: async (args) => {
        calls.push(args);
        return {
          text: `Narrative for ${args.field}`,
          status: "ai_enriched",
          model: args.modelConfig.model,
          durationMs: 5,
          validationStatus: "valid",
          retryAttempted: false,
          fallbackUsed: false,
          responseLength: 24,
          rawResponseLength: 24,
          sanitizedResponseLength: 24,
          generatedAt: "2026-06-30T00:00:00.000Z",
          ai2FieldValidationStatus: "accepted",
          ai2RetrievalMode: "hybrid",
          ai2CitationCount: 2,
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let routeModule;
try {
  routeModule = compileTs(join(root, "app", "api", "reports", "module01", "field-narrative", "route.ts"), "fieldNarrativeRoute.cjs");
} finally {
  Module._load = originalLoad;
}

const { POST } = routeModule;

async function postJson(body) {
  const request = new Request("http://localhost/api/reports/module01/field-narrative", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return {
    status: response.status,
    body: await response.json(),
  };
}

{
  const response = await postJson({
    field: "overallAdvisory.helicopterView",
    facts: ["Client: CRTVTA", "Evidence posture: 75 of 84 items are backed."],
    max_words: 110,
    style: "executive",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.field, "overallAdvisory.helicopterView");
  assert.equal(calls.at(-1).field, "overallAdvisory.helicopterView");
  assert.equal(calls.at(-1).maxWords, 110);
  assert.equal(calls.at(-1).style, "executive");
}

{
  const response = await postJson({
    field: "roadmapNarrative",
    facts: ["Client: CRTVTA", "Priority domains: Data Quality"],
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.field, "roadmap.roadmapNarrative");
  assert.equal(calls.at(-1).field, "roadmap.roadmapNarrative");
  assert.equal(calls.at(-1).fallbackText, "");
}

{
  const response = await postJson({
    field: "unsupported.field",
    facts: ["Client: CRTVTA"],
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Unsupported Module 01 field narrative.");
  assert.ok(response.body.supported_fields.includes("boardScorecard.advisoryNarrative"));
}

{
  const response = await postJson({
    field: "boardScorecard.advisoryNarrative",
    facts: [],
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, "At least one fact is required.");
}

console.log("module01 field narrative route tests passed");
