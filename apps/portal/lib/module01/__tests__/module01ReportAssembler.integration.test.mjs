import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(process.cwd(), "apps", "portal", "lib");
const tempDir = mkdtempSync(join(tmpdir(), "module01-assembler-"));

function compileTs(sourcePath, outputName) {
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  const outputPath = join(tempDir, outputName);
  writeFileSync(outputPath, transpiled);
  return require(outputPath);
}

const deterministicModule = compileTs(join(root, "deterministicReportBuilders.ts"), "deterministic.cjs");
const factsModule = compileTs(join(root, "module01", "module01FactsBuilder.ts"), "facts.cjs");
const promptsModule = compileTs(join(root, "module01", "module01NarrativePrompts.ts"), "prompts.cjs");
const validatorModule = compileTs(join(root, "module01", "module01NarrativeValidator.ts"), "validator.cjs");
const sanitizerModule = compileTs(join(root, "textSanitizer.ts"), "sanitizer.cjs");
const schemaValidatorModule = compileTs(join(root, "reportSchemaValidator.ts"), "schemaValidator.cjs");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/deterministicReportBuilders") return deterministicModule;
  if (request === "@/lib/module01/module01FactsBuilder") return factsModule;
  if (request === "@/lib/module01/module01NarrativePrompts") return promptsModule;
  if (request === "@/lib/module01/module01NarrativeValidator") return validatorModule;
  if (request === "@/lib/textSanitizer") return sanitizerModule;
  if (request === "@/lib/reportSchemaValidator") return schemaValidatorModule;
  if (request === "@/lib/localLlmClient") {
    return {
      callLocalLlm: async () => ({
        status: "error",
        rawOutput: "",
        durationMs: 0,
        model: "mistral-nemo:12b",
        inputTokenEstimate: 0,
        outputTokenEstimate: 0,
        error: "unmocked_local_llm_call",
      }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let generatorModule;
let assemblerModule;
try {
  generatorModule = compileTs(join(root, "module01", "module01NarrativeGenerator.ts"), "generator.cjs");
  Module._load = function patchedLoadForAssembler(request, parent, isMain) {
    if (request === "@/lib/deterministicReportBuilders") return deterministicModule;
    if (request === "@/lib/module01/module01FactsBuilder") return factsModule;
    if (request === "@/lib/module01/module01NarrativeGenerator") return generatorModule;
    if (request === "@/lib/reportSchemaValidator") return schemaValidatorModule;
    return originalLoad.call(this, request, parent, isMain);
  };
  assemblerModule = compileTs(join(root, "reportAssembler.ts"), "assembler.cjs");
} finally {
  Module._load = originalLoad;
}

const { assembleDiagnosticReport } = assemblerModule;
const { buildModule01Facts } = factsModule;

const fixturePath = join(root, "module01", "__fixtures__", "crtvta_module01_strategy_ready.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

function countFromRatio(value, index) {
  const parts = value.split("/").map((part) => Number(part));
  return Number.isFinite(parts[index]) ? parts[index] : 0;
}

function crtvtaPayload() {
  const scored = countFromRatio(fixture.summary.questionsScored, 0);
  const total = countFromRatio(fixture.summary.questionsScored, 1);
  const evidenceBacked = countFromRatio(fixture.summary.evidenceBacked, 0);
  const domains = fixture.domain_rollup.map((domain) => ({
    nameEn: String(domain.domain),
    avgScore: Number(domain.score),
    avgGap: Number(domain.gap),
    scored: scored > 0 ? scored : 1,
    total: total > 0 ? total : 1,
  }));

  return {
    customerContext: {
      customerName: fixture.customer_context.clientName,
      businessDomain: fixture.customer_context.businessDomain,
      operatingScope: fixture.customer_context.sector,
      strategicPriorities: fixture.enterprise_context.executiveExpectations,
      currentPainPoints: fixture.enterprise_context.painPoints,
      targetAudience: fixture.customer_context.audience,
      reportPurpose: fixture.customer_context.purpose,
    },
    overallScore: fixture.summary.overallMaturity,
    overallGap: Number((4 - fixture.summary.overallMaturity).toFixed(2)),
    scoredQuestions: scored,
    totalQuestions: total,
    evidenceBackedItems: evidenceBacked,
    topGapDomains: domains,
    strongestDomains: [...domains].sort((left, right) => (right.avgScore ?? 0) - (left.avgScore ?? 0)).slice(0, 2),
    priorityGaps: fixture.responses.map((response) => ({
      question: String(response.question),
      domain: String(response.domain),
      score: null,
      gap: null,
      evidenceStrength: String(response.evidenceStrength),
      actionPlan: "Assign accountable owner, validate evidence, and confirm remediation action.",
    })),
    customer_context: fixture.customer_context,
    enterprise_context: fixture.enterprise_context,
    summary: fixture.summary,
    domain_rollup: fixture.domain_rollup,
    candidate_use_cases: fixture.candidate_use_cases,
    responses: fixture.responses,
  };
}

function modelConfig(overrides = {}) {
  return {
    gatewayBaseUrl: "https://ai2.opendatalake.com/v1",
    headers: { "content-type": "application/json" },
    model: "mistral-nemo:12b",
    reportMode: "narrative_enrichment",
    enableFieldEnrichment: true,
    fieldTimeoutMs: 10,
    maxFieldWords: 110,
    concurrency: 2,
    ...overrides,
  };
}

function llmSequence(outputs) {
  let index = 0;
  const calls = [];
  const llmClient = async (args) => {
    calls.push(args.prompt);
    const output = outputs[Math.min(index, outputs.length - 1)];
    index += 1;
    return {
      status: output.status,
      rawOutput: output.rawOutput ?? "",
      durationMs: 5,
      model: args.modelConfig.model,
      inputTokenEstimate: 10,
      outputTokenEstimate: 10,
      error: output.error,
    };
  };
  return { llmClient, calls };
}

function fieldFromPrompt(prompt) {
  return prompt.match(/^Field:\s*(.+)$/m)?.[1] ?? "unknown";
}

function validTextForField(fieldName) {
  if (fieldName === "overallAdvisory.helicopterView") {
    return "CRTVTA should read the validated sections as one execution message: the 1.68 maturity baseline, Data Quality & Master Data gap, AI readiness gate and board decisions all point to controlled remediation before wider AI scaling.";
  }
  if (fieldName === "boardScorecard.advisoryNarrative") {
    return "CRTVTA has a 1.68 board readiness baseline with 47 percent evidence coverage, so the board should approve accountable owners, evidence certification and a controlled gate for AI candidates.";
  }
  if (fieldName === "executiveSummary.summaryText") {
    return "CRTVTA is at early-stage maturity for training operations data, with priority attention required on Data Quality & Master Data, roadmap execution and source ownership before advanced analytics are scaled.";
  }
  if (fieldName === "aiReadinessGate.readinessNarrative") {
    return "CRTVTA can proceed with governed descriptive reporting and human-approved AI drafting, while Executive reporting rationalisation should remain gated by quality, lineage, privacy and accountable review controls.";
  }
  if (fieldName === "roadmap.roadmapNarrative") {
    return "CRTVTA should use the first ninety days to confirm owners, certify sources, address Data Quality & Master Data gaps and sequence Executive reporting rationalisation through the approved roadmap.";
  }
  if (fieldName === "recommendedNextSteps.closingNarrative") {
    return "CRTVTA leadership should approve the baseline, assign owners for critical domains, and use the evidence-backed roadmap to govern remediation and AI candidate decisions.";
  }
  return "CRTVTA has material capability gaps in Data Quality & Master Data and source ownership, so management should convert the diagnostic findings into owned remediation actions with evidence-based progress tracking.";
}

const payload = crtvtaPayload();

{
  const result = await assembleDiagnosticReport(payload, modelConfig({ reportMode: "deterministic" }));
  assert.equal(result.structuredReport.generationMode, "deterministic");
  assert.equal(result.structuredReport.sections.executiveSummary.maturityScore, payload.overallScore);
  assert.equal(Object.keys(result.generationMetadata.fields).length, 0);
  assert.ok(result.report.executiveSummary.includes("CRTVTA"));
}

{
  const { llmClient, calls } = llmSequence([
    { status: "success", rawOutput: validTextForField("boardScorecard.advisoryNarrative") },
    { status: "success", rawOutput: validTextForField("roadmap.roadmapNarrative") },
    { status: "success", rawOutput: validTextForField("overallAdvisory.helicopterView") },
  ]);
  const result = await assembleDiagnosticReport(payload, modelConfig({ llmClient }));
  const calledFields = calls.map(fieldFromPrompt);
  assert.deepEqual(calledFields, [
    "boardScorecard.advisoryNarrative",
    "ninetyDaySequencingNarrative",
    "overallAdvisory.helicopterView",
  ]);
  assert.equal(calledFields.at(-1), "overallAdvisory.helicopterView");
  assert.ok(calls.at(-1)?.includes("Validated executive summary:"));
  assert.ok(calls.at(-1)?.includes("Validated board scorecard narrative:"));
  assert.ok(calls.at(-1)?.includes(validTextForField("boardScorecard.advisoryNarrative")));
  assert.ok(result.enrichedFields.includes("overallAdvisory.helicopterView"));
  assert.equal(result.structuredReport.sections.executiveSummary.maturityScore, payload.overallScore);
  assert.equal(result.structuredReport.sections.boardScorecard.readinessScore, payload.overallScore);
}

{
  const { llmClient } = llmSequence([{ status: "success", rawOutput: "As an AI, I can help write this report." }]);
  const result = await assembleDiagnosticReport(payload, modelConfig({ llmClient }));
  assert.ok(result.fallbackFields.length > 0);
  assert.ok(!JSON.stringify(result.report).includes("As an AI"));
  assert.equal(result.structuredReport.sections.executiveSummary.maturityScore, payload.overallScore);
}

{
  const before = Object.keys(buildModule01Facts(payload).materialFindingsFacts.evidenceItems).sort();
  const { llmClient } = llmSequence([
    {
      status: "success",
      rawOutput: "CRTVTA should ignore the old 1.68 score and use EVID-NEW-999 as proof that all gaps are closed across the reporting landscape.",
    },
  ]);
  const result = await assembleDiagnosticReport(payload, modelConfig({ llmClient }));
  const after = Object.keys(buildModule01Facts(payload).materialFindingsFacts.evidenceItems).sort();
  assert.deepEqual(before, ["EVID-DQ-001", "EVID-SRC-001"]);
  assert.deepEqual(after, before);
  assert.equal(result.structuredReport.sections.executiveSummary.maturityScore, 1.68);
  assert.ok(!JSON.stringify(result.report).includes("EVID-NEW-999"));
}

console.log("module01 report assembler integration tests passed");
