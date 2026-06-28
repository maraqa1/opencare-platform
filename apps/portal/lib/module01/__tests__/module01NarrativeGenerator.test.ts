import assert from "node:assert/strict";
import {
  buildModule01DeterministicNarrativeFallback,
  generateModule01NarrativeField,
} from "../module01NarrativeGenerator";

const modelConfig = {
  gatewayBaseUrl: "https://ai2.opendatalake.com/v1",
  headers: { "content-type": "application/json" },
  model: "mistral-nemo:12b",
  timeoutMs: 10,
};

const facts = {
  clientName: "CRTVTA",
  overallMaturity: 1.68,
  topPriorityDomains: [
    { domain: "Data Quality & Master Data", gap: 3.14 },
    { domain: "Execution, Roadmap & Value Measurement", gap: 3.0 },
  ],
  useCases: [{ name: "Executive reporting rationalisation" }],
};

function llmSequence(outputs: Array<{ status: "success" | "timeout" | "error"; rawOutput?: string; error?: string }>) {
  let index = 0;
  const calls: string[] = [];
  const llmClient = async (args: { prompt: string; modelConfig: { model: string } }) => {
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

const validText = "CRTVTA has a 1.68 maturity baseline, so the board should approve accountable ownership, evidence certification and a sequenced remediation backlog before scaling governed AI use cases.";

{
  const { llmClient } = llmSequence([{ status: "success", rawOutput: validText }]);
  const result = await generateModule01NarrativeField({
    fieldName: "boardScorecard.advisoryNarrative",
    facts,
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.text, validText);
}

{
  const { llmClient, calls } = llmSequence([
    { status: "success", rawOutput: "As an AI, I can help write this report." },
    { status: "success", rawOutput: validText },
  ]);
  const result = await generateModule01NarrativeField({
    fieldName: "executiveSummary.summaryText",
    facts,
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "ai_enriched");
  assert.equal(result.text, validText);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes("The previous output was rejected."));
  assert.ok(calls[1].includes("Rejection reason:"));
  assert.ok(calls[1].includes("Do not introduce yourself."));
}

{
  const { llmClient } = llmSequence([
    { status: "success", rawOutput: "As an AI, I can help write this report." },
    { status: "success", rawOutput: "As an AI, I can still help write this report." },
  ]);
  const result = await generateModule01NarrativeField({
    fieldName: "roadmap.roadmapNarrative",
    facts,
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "fallback");
  assert.ok(result.text.includes("CRTVTA"));
  assert.notEqual(result.text, "As an AI, I can still help write this report.");
}

{
  const { llmClient } = llmSequence([
    { status: "timeout", error: "timeout" },
    { status: "timeout", error: "timeout" },
  ]);
  const result = await generateModule01NarrativeField({
    fieldName: "aiReadinessGate.readinessNarrative",
    facts,
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "fallback");
  assert.ok(result.text.includes("CRTVTA"));
}

{
  const { llmClient } = llmSequence([
    { status: "error", error: "gateway 503" },
    { status: "error", error: "gateway 503" },
  ]);
  const result = await generateModule01NarrativeField({
    fieldName: "recommendedNextSteps.closingNarrative",
    facts,
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "fallback");
  assert.ok(result.rejectionReason);
}

{
  const { llmClient, calls } = llmSequence([{ status: "success", rawOutput: validText }]);
  const result = await generateModule01NarrativeField({
    fieldName: "boardScorecard.advisoryNarrative",
    facts: {},
    maxWords: 80,
    modelConfig,
    llmClient,
  });
  assert.equal(result.status, "fallback");
  assert.equal(result.text, "SECTION_CONTEXT_MISSING");
  assert.equal(calls.length, 0);
}

assert.ok(buildModule01DeterministicNarrativeFallback({
  fieldName: "boardScorecard.advisoryNarrative",
  facts,
}).includes("CRTVTA"));
