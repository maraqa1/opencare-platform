import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../module01NarrativePrompts.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tempDir = mkdtempSync(join(tmpdir(), "module01-prompts-"));
const tempFile = join(tempDir, "module01NarrativePrompts.cjs");
writeFileSync(tempFile, transpiled);

const {
  buildModule01NarrativePrompt,
  module01NarrativeFieldNames,
  module01NarrativePromptContracts,
} = require(tempFile);

const requiredFields = [
  "executiveSummary.summaryText",
  "boardScorecard.advisoryNarrative",
  "overallAdvisory.helicopterView",
  "materialFindings.findingsNarrative",
  "domainActionPlan.managementNarrative",
  "aiReadinessGate.readinessNarrative",
  "roadmap.roadmapNarrative",
  "recommendedNextSteps.closingNarrative",
];

for (const requiredField of requiredFields) {
  assert.ok(module01NarrativeFieldNames.includes(requiredField));
  assert.equal(module01NarrativePromptContracts[requiredField].fieldName, requiredField);
  assert.ok(module01NarrativePromptContracts[requiredField].fieldTask.length > 20);
}

for (const fieldName of module01NarrativeFieldNames) {
  const facts = { clientName: "Fixture Client", overallMaturity: 1.5, sectionOnlyFact: `${fieldName} fact` };
  const prompt = buildModule01NarrativePrompt({
    fieldName,
    facts,
    maxWords: 120,
  });

  assert.ok(prompt.includes("You are writing one narrative field for a board-ready AI and data diagnostic report."));
  assert.ok(prompt.includes("You are not chatting with the user."));
  assert.ok(prompt.includes("Do not introduce yourself."));
  assert.ok(prompt.includes("Do not mention the model."));
  assert.ok(prompt.includes("Do not describe your capabilities."));
  assert.ok(prompt.includes("Do not ask the user what they want."));
  assert.ok(prompt.includes("Do not write generic advisory text."));
  assert.ok(prompt.includes("Use only the supplied facts."));
  assert.ok(prompt.includes("Do not invent client facts, systems, evidence IDs, scores, dates, owners, use cases, or regulatory claims."));
  assert.ok(prompt.includes("Do not claim official regulatory compliance unless official source evidence is supplied."));
  assert.ok(prompt.includes(`Field: ${fieldName}`));
  assert.ok(prompt.includes(`Field task: ${module01NarrativePromptContracts[fieldName].fieldTask}`));
  assert.ok(prompt.includes("Expected facts for this field:"));
  assert.ok(prompt.includes("Section-specific facts:"));
  assert.ok(prompt.includes(JSON.stringify(facts, null, 2)));
  assert.ok(prompt.includes("Use only the section-specific facts above."));
  assert.ok(prompt.includes("Maximum 120 words."));
  assert.ok(prompt.includes("Return plain text only."));
  assert.ok(prompt.includes("No Markdown headings."));
  assert.ok(prompt.includes("No bullets unless explicitly requested."));
  assert.ok(prompt.includes("SECTION_CONTEXT_MISSING"));
  assert.ok(!prompt.includes("CRTVTA"));
  assert.ok(!prompt.includes("LEDAR"));
  assert.ok(!prompt.includes("Power BI"));
  assert.ok(!prompt.includes("PDPL"));
  assert.ok(!prompt.includes("NDMO"));
  assert.ok(!prompt.includes("Saudi government"));
}

const suppliedFactPrompt = buildModule01NarrativePrompt({
  fieldName: "executiveSummary.summaryText",
  facts: { clientName: "Fixture Client", suppliedTool: "Power BI" },
  maxWords: 80,
});
assert.ok(suppliedFactPrompt.includes("Power BI"));

assert.throws(
  () => buildModule01NarrativePrompt({
    fieldName: "unknown.genericNarrative",
    facts: { clientName: "Fixture Client" },
    maxWords: 100,
  }),
  /Unsupported Module 01 narrative field/,
);

console.log("module01 narrative prompt tests passed");
